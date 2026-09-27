const crypto = require("crypto");
const axios = require("axios");

const DEFAULT_PROVIDER = "openai-compatible";
const EXACT_TEXT_MODEL = "qwen3.8-27b";
const TEXT_MODEL_ROLES = new Set(["general", "fast", "reasoning"]);
const FORBIDDEN_PROVIDER_DOMAINS = ["modelscope.cn", "deepseek.com"];
const TEST_TIMEOUT_MS = 15000;
const CALL_TIMEOUT_MS = 30000;
const PROVIDER_STOP_STATUSES = new Set([401, 403, 429]);
const MODEL_ROLES = new Set(["general", "fast", "reasoning", "embedding"]);

const toText = (value, maxLength = 500) => {
    if (typeof value !== "string") return "";
    return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
};

const normalizeBaseUrl = (value) => toText(value, 300).replace(/\/+$/, "");

const getExpectedTextBaseUrl = () =>
    normalizeBaseUrl(process.env.ZJU_QWEN_BASE_URL || process.env.LLM_BASE_URL);

const DEFAULT_BASE_URL = getExpectedTextBaseUrl();
const DEFAULT_MODEL = EXACT_TEXT_MODEL;

const normalizeRole = (value) => {
    const role = toText(value, 24).toLowerCase();
    return MODEL_ROLES.has(role) ? role : "general";
};

const createPolicyError = (code, message) => {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = code;
    return error;
};

const parseProviderUrl = (value) => {
    const normalized = normalizeBaseUrl(value);
    if (!normalized) {
        throw createPolicyError("AI_MODEL_BASE_URL_REQUIRED", "AI model base URL is required.");
    }

    try {
        const parsed = new URL(normalized);
        if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) {
            throw new Error("unsupported URL");
        }
        return {
            hostname: parsed.hostname.toLowerCase(),
            normalized: `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`,
        };
    } catch {
        throw createPolicyError("AI_MODEL_BASE_URL_INVALID", "AI model base URL is invalid.");
    }
};

const isForbiddenProviderHost = (hostname) =>
    FORBIDDEN_PROVIDER_DOMAINS.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

const assertAiModelConfigPolicy = (config) => {
    const role = normalizeRole(config?.role);
    const candidate = parseProviderUrl(config?.base_url);

    if (isForbiddenProviderHost(candidate.hostname)) {
        throw createPolicyError(
            "AI_MODEL_PROVIDER_FORBIDDEN",
            "This AI provider is not permitted."
        );
    }

    if (TEXT_MODEL_ROLES.has(role)) {
        const expectedValue = getExpectedTextBaseUrl();
        if (!expectedValue) {
            throw createPolicyError(
                "AI_TEXT_PROVIDER_ANCHOR_MISSING",
                "The private text-model endpoint is not configured."
            );
        }
        const expected = parseProviderUrl(expectedValue);
        if (isForbiddenProviderHost(expected.hostname)) {
            throw createPolicyError(
                "AI_MODEL_PROVIDER_FORBIDDEN",
                "This AI provider is not permitted."
            );
        }
        if (
            candidate.normalized !== expected.normalized ||
            toText(config?.model, 120) !== EXACT_TEXT_MODEL
        ) {
            throw createPolicyError(
                "AI_TEXT_PROVIDER_POLICY_VIOLATION",
                "Text AI must use the approved private Qwen model."
            );
        }
    } else if (role === "embedding" && toText(config?.model, 120) === EXACT_TEXT_MODEL) {
        throw createPolicyError(
            "AI_EMBEDDING_MODEL_REQUIRED",
            "Embedding requires an explicit embedding model."
        );
    }

    return {
        ...config,
        base_url: candidate.normalized,
        model: toText(config?.model, 120),
        role,
    };
};

const isAiModelConfigAllowed = (config) => {
    try {
        assertAiModelConfigPolicy(config);
        return true;
    } catch {
        return false;
    }
};

const isQwen3Model = (value) =>
    toText(value, 160)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .includes("qwen3");

const buildChatCompletionPayload = (config, payload = {}, forceStream = false) => {
    const requestPayload = {
        model: config.model || DEFAULT_MODEL,
        stream: false,
        temperature: 0.2,
        max_tokens: 900,
        ...payload,
    };

    if (forceStream) requestPayload.stream = true;
    if (
        isQwen3Model(config.model) &&
        requestPayload.chat_template_kwargs?.enable_thinking === undefined
    ) {
        requestPayload.chat_template_kwargs = {
            ...(requestPayload.chat_template_kwargs || {}),
            enable_thinking: false,
        };
    }

    return requestPayload;
};

const getEncryptionKey = () => {
    const secret =
        process.env.AI_CONFIG_ENCRYPTION_KEY ||
        process.env.SECRET_KEY ||
        "zju-platform-local-ai-config";
    return crypto.createHash("sha256").update(secret).digest();
};

const encryptApiKey = (plainText) => {
    const value = toText(plainText, 2000);
    if (!value) {
        const error = new Error("API key is required.");
        error.statusCode = 400;
        error.code = "AI_MODEL_KEY_REQUIRED";
        throw error;
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
        "v1",
        iv.toString("base64url"),
        tag.toString("base64url"),
        encrypted.toString("base64url"),
    ].join(":");
};

const decryptApiKey = (encryptedValue) => {
    if (!encryptedValue || typeof encryptedValue !== "string") return "";

    const [version, ivValue, tagValue, encrypted] = encryptedValue.split(":");
    if (version !== "v1" || !ivValue || !tagValue || !encrypted) {
        return "";
    }

    try {
        const decipher = crypto.createDecipheriv(
            "aes-256-gcm",
            getEncryptionKey(),
            Buffer.from(ivValue, "base64url")
        );
        decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
        return Buffer.concat([
            decipher.update(Buffer.from(encrypted, "base64url")),
            decipher.final(),
        ]).toString("utf8");
    } catch {
        return "";
    }
};

const maskApiKey = (encryptedValue) => {
    const plain = decryptApiKey(encryptedValue);
    if (!plain) return "";
    if (plain.length <= 8) return "********";
    return `${plain.slice(0, 3)}***${plain.slice(-4)}`;
};

const serializeConfig = (row) => ({
    id: row.id,
    name: row.name,
    provider: row.provider || DEFAULT_PROVIDER,
    base_url: row.base_url,
    model: row.model,
    role: normalizeRole(row.role),
    priority: Number(row.priority || 100),
    enabled: Boolean(row.enabled),
    masked_api_key: maskApiKey(row.encrypted_api_key),
    has_api_key: Boolean(maskApiKey(row.encrypted_api_key)),
    last_status: row.last_status || null,
    last_error: row.last_error || null,
    last_checked_at: row.last_checked_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
});

const listConfigs = async (db) => {
    const rows = await db.all(`
    SELECT *
    FROM ai_model_configs
    ORDER BY enabled DESC, priority ASC, id ASC
  `);
    return rows.map(serializeConfig);
};

const getConfigById = async (db, id) => {
    const configId = Number(id);
    if (!Number.isInteger(configId)) return null;
    return db.get("SELECT * FROM ai_model_configs WHERE id = ?", [configId]);
};

const createConfig = async (db, payload, userId) => {
    const name = toText(payload.name, 80) || "活动助手模型";
    const provider = toText(payload.provider, 80) || DEFAULT_PROVIDER;
    const baseUrl = normalizeBaseUrl(payload.base_url);
    const model = toText(payload.model, 120) || DEFAULT_MODEL;
    const role = normalizeRole(payload.role);
    const priority = Number.isInteger(Number(payload.priority)) ? Number(payload.priority) : 100;
    const enabled = payload.enabled === false ? 0 : 1;
    const policyConfig = assertAiModelConfigPolicy({ base_url: baseUrl, model, role });
    const encryptedApiKey = encryptApiKey(payload.api_key);

    const result = await db.run(
        `
      INSERT INTO ai_model_configs (
        name,
        provider,
        base_url,
        model,
        role,
        encrypted_api_key,
        priority,
        enabled,
        created_by,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
        [
            name,
            provider,
            policyConfig.base_url,
            policyConfig.model,
            policyConfig.role,
            encryptedApiKey,
            priority,
            enabled,
            userId || null,
        ]
    );

    return serializeConfig(await getConfigById(db, result.lastID));
};

const updateConfig = async (db, id, payload) => {
    const existing = await getConfigById(db, id);
    if (!existing) {
        const error = new Error("Model config not found.");
        error.statusCode = 404;
        error.code = "AI_MODEL_CONFIG_NOT_FOUND";
        throw error;
    }

    const next = {
        name:
            payload.name !== undefined ? toText(payload.name, 80) || existing.name : existing.name,
        provider:
            payload.provider !== undefined
                ? toText(payload.provider, 80) || DEFAULT_PROVIDER
                : existing.provider,
        base_url:
            payload.base_url !== undefined ? normalizeBaseUrl(payload.base_url) : existing.base_url,
        model:
            payload.model !== undefined
                ? toText(payload.model, 120) || existing.model
                : existing.model,
        role:
            payload.role !== undefined ? normalizeRole(payload.role) : normalizeRole(existing.role),
        priority:
            payload.priority !== undefined && Number.isInteger(Number(payload.priority))
                ? Number(payload.priority)
                : existing.priority,
        enabled: payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : existing.enabled,
        encrypted_api_key: payload.api_key
            ? encryptApiKey(payload.api_key)
            : existing.encrypted_api_key,
    };
    const policyConfig = assertAiModelConfigPolicy(next);
    next.base_url = policyConfig.base_url;
    next.model = policyConfig.model;
    next.role = policyConfig.role;

    await db.run(
        `
      UPDATE ai_model_configs
      SET name = ?,
          provider = ?,
          base_url = ?,
          model = ?,
          role = ?,
          encrypted_api_key = ?,
          priority = ?,
          enabled = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `,
        [
            next.name,
            next.provider,
            next.base_url,
            next.model,
            next.role,
            next.encrypted_api_key,
            next.priority,
            next.enabled,
            existing.id,
        ]
    );

    return serializeConfig(await getConfigById(db, existing.id));
};

const deleteConfig = async (db, id) => {
    const existing = await getConfigById(db, id);
    if (!existing) {
        const error = new Error("Model config not found.");
        error.statusCode = 404;
        error.code = "AI_MODEL_CONFIG_NOT_FOUND";
        throw error;
    }

    await db.run("DELETE FROM ai_model_configs WHERE id = ?", [existing.id]);
    return { success: true };
};

const buildEnvConfig = () => {
    const apiKey = process.env.ZJU_QWEN_API_KEY || process.env.LLM_API_KEY;
    const baseUrl = getExpectedTextBaseUrl();
    if (!apiKey || !baseUrl) return null;

    return assertAiModelConfigPolicy({
        id: "env",
        name: "环境变量默认 Key",
        provider: DEFAULT_PROVIDER,
        base_url: baseUrl,
        model: EXACT_TEXT_MODEL,
        role: "general",
        encrypted_api_key: encryptApiKey(apiKey),
        priority: 9999,
        enabled: 1,
        fromEnv: true,
    });
};

const getEnabledConfigs = async (db, includeEnvFallback = true, role = "general") => {
    const rows = await db.all(`
    SELECT *
    FROM ai_model_configs
    WHERE enabled = 1
    ORDER BY priority ASC, id ASC
  `);

    const requestedRole = normalizeRole(role);
    const allowedRows = rows.filter(isAiModelConfigAllowed);
    const roleMatches = allowedRows.filter((row) => normalizeRole(row.role) === requestedRole);
    const generalMatches =
        requestedRole === "general" || requestedRole === "embedding"
            ? []
            : allowedRows.filter((row) => normalizeRole(row.role) === "general");
    const configs = [...roleMatches, ...generalMatches];
    const envConfig = includeEnvFallback && requestedRole !== "embedding" ? buildEnvConfig() : null;
    if (envConfig) configs.push(envConfig);
    return configs;
};

const updateStatus = async (db, config, status, errorMessage = "") => {
    if (config.fromEnv) return;

    await db.run(
        `
      UPDATE ai_model_configs
      SET last_status = ?,
          last_error = ?,
          last_checked_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `,
        [status, toText(errorMessage, 500), config.id]
    );
};

const callChatCompletion = async (config, payload, timeout = CALL_TIMEOUT_MS) => {
    const policyConfig = assertAiModelConfigPolicy(config);
    const apiKey = decryptApiKey(config.encrypted_api_key);
    if (!apiKey) {
        const error = new Error("API key cannot be decrypted.");
        error.code = "AI_MODEL_KEY_DECRYPT_FAILED";
        throw error;
    }

    const response = await axios.post(
        `${policyConfig.base_url}/chat/completions`,
        buildChatCompletionPayload(policyConfig, payload),
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout,
        }
    );

    return response.data;
};

const streamContentToText = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
        return value.map(streamContentToText).join("");
    }
    if (typeof value === "object") {
        return streamContentToText(value.text || value.content || value.value || "");
    }
    return String(value);
};

const getChatResponseText = (data) => {
    const choice = data?.choices?.[0] || {};
    const message = choice.message || choice.delta || {};
    return (
        [
            streamContentToText(message.content),
            streamContentToText(message.reasoning_content),
            streamContentToText(choice.text),
            streamContentToText(data?.output_text),
            streamContentToText(data?.content),
        ].find((item) => item && item.trim()) || ""
    );
};

const parseStreamEvent = (line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return null;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return null;

    try {
        return JSON.parse(payload);
    } catch {
        return null;
    }
};

const callChatCompletionStream = async (config, payload, timeout = CALL_TIMEOUT_MS) => {
    const policyConfig = assertAiModelConfigPolicy(config);
    const apiKey = decryptApiKey(config.encrypted_api_key);
    if (!apiKey) {
        const error = new Error("API key cannot be decrypted.");
        error.code = "AI_MODEL_KEY_DECRYPT_FAILED";
        throw error;
    }

    const response = await axios.post(
        `${policyConfig.base_url}/chat/completions`,
        buildChatCompletionPayload(policyConfig, payload, true),
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            responseType: "stream",
            timeout,
        }
    );

    return new Promise((resolve, reject) => {
        let buffer = "";
        let content = "";
        let reasoningContent = "";
        let lastChunk = null;
        let usage = null;

        const consumeLine = (line) => {
            const event = parseStreamEvent(line);
            if (!event) return;

            lastChunk = event;
            if (event.usage) usage = event.usage;
            const choice = event.choices?.[0] || {};
            const delta = choice.delta || choice.message || {};
            content += streamContentToText(delta.content || choice.text || "");
            reasoningContent += streamContentToText(delta.reasoning_content || "");
        };

        response.data.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";

            for (const line of lines) {
                consumeLine(line);
            }
        });

        response.data.on("end", () => {
            if (buffer.trim()) {
                buffer.split(/\r?\n/).forEach(consumeLine);
            }

            resolve({
                id: lastChunk?.id || "",
                object: lastChunk?.object || "chat.completion",
                created: lastChunk?.created || 0,
                model: lastChunk?.model || policyConfig.model || DEFAULT_MODEL,
                choices: [
                    {
                        message: {
                            role: "assistant",
                            content,
                            reasoning_content: reasoningContent,
                        },
                    },
                ],
                usage: usage || null,
            });
        });

        response.data.on("error", reject);
    });
};

const callChatCompletionWithFailover = async (db, payload, options = {}) => {
    const configs = await getEnabledConfigs(
        db,
        options.includeEnvFallback !== false,
        options.role || "general"
    );
    const primaryConfigs =
        options.skipEnvWhenDbConfigs !== false && configs.some((config) => !config.fromEnv)
            ? configs.filter((config) => !config.fromEnv)
            : configs;
    const attempts = [];

    for (const config of primaryConfigs) {
        try {
            const data =
                options.stream === true
                    ? await callChatCompletionStream(
                          config,
                          payload,
                          options.timeout || CALL_TIMEOUT_MS
                      )
                    : await callChatCompletion(config, payload, options.timeout || CALL_TIMEOUT_MS);
            await updateStatus(db, config, "ok", "");
            return {
                data,
                config: serializeConfig(config),
                attempts,
            };
        } catch (error) {
            const status = error.response?.status;
            const message =
                error.response?.data?.error?.message || error.message || "Model call failed.";
            attempts.push({
                id: config.id,
                name: config.name,
                status,
                message: toText(message, 240),
            });
            await updateStatus(db, config, "failed", message);
            if (PROVIDER_STOP_STATUSES.has(Number(status))) {
                break;
            }
        }
    }

    const error = new Error("No available AI model config succeeded.");
    error.code = "AI_MODEL_ALL_FAILED";
    error.statusCode = 503;
    error.attempts = attempts;
    throw error;
};

const callEmbedding = async (config, input, timeout = CALL_TIMEOUT_MS) => {
    const policyConfig = assertAiModelConfigPolicy(config);
    const apiKey = decryptApiKey(config.encrypted_api_key);
    if (!apiKey) {
        const error = new Error("API key cannot be decrypted.");
        error.code = "AI_MODEL_KEY_DECRYPT_FAILED";
        throw error;
    }

    const response = await axios.post(
        `${policyConfig.base_url}/embeddings`,
        { model: policyConfig.model, input },
        {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            timeout,
        }
    );
    const vector = response.data?.data?.[0]?.embedding;
    if (!Array.isArray(vector) || vector.length === 0) {
        const error = new Error("Embedding model returned no vector.");
        error.code = "AI_EMBEDDING_EMPTY";
        throw error;
    }
    return { data: response.data, vector: vector.map((value) => Number(value) || 0) };
};

const callEmbeddingWithFailover = async (db, input, options = {}) => {
    const configs = await getEnabledConfigs(db, options.includeEnvFallback !== false, "embedding");
    if (configs.length === 0) {
        const error = new Error("No embedding model config is enabled.");
        error.code = "AI_EMBEDDING_NOT_CONFIGURED";
        error.statusCode = 503;
        error.attempts = [];
        throw error;
    }

    const primaryConfigs =
        options.skipEnvWhenDbConfigs !== false && configs.some((config) => !config.fromEnv)
            ? configs.filter((config) => !config.fromEnv)
            : configs;
    const attempts = [];

    for (const config of primaryConfigs) {
        try {
            const result = await callEmbedding(config, input, options.timeout || CALL_TIMEOUT_MS);
            await updateStatus(db, config, "ok", "");
            return { ...result, config: serializeConfig(config), attempts };
        } catch (error) {
            const status = error.response?.status;
            const message =
                error.response?.data?.error?.message || error.message || "Embedding call failed.";
            attempts.push({
                id: config.id,
                name: config.name,
                status,
                message: toText(message, 240),
            });
            await updateStatus(db, config, "failed", message);
            if (PROVIDER_STOP_STATUSES.has(Number(status))) break;
        }
    }

    const error = new Error("No available embedding model config succeeded.");
    error.code = "AI_EMBEDDING_ALL_FAILED";
    error.statusCode = 503;
    error.attempts = attempts;
    throw error;
};

const testConfig = async (db, id) => {
    const config = await getConfigById(db, id);
    if (!config) {
        const error = new Error("Model config not found.");
        error.statusCode = 404;
        error.code = "AI_MODEL_CONFIG_NOT_FOUND";
        throw error;
    }

    assertAiModelConfigPolicy(config);

    try {
        if (normalizeRole(config.role) === "embedding") {
            await callEmbedding(config, "test embedding", TEST_TIMEOUT_MS);
            await updateStatus(db, config, "ok", "");
            return serializeConfig(await getConfigById(db, id));
        }

        const testPayload = {
            messages: [
                { role: "system", content: "Reply with a short JSON object only." },
                { role: "user", content: '{"ping":"ok"}' },
            ],
            max_tokens: 80,
        };

        let data = null;
        let firstError = null;

        try {
            data = await callChatCompletionStream(config, testPayload, TEST_TIMEOUT_MS);
        } catch (error) {
            firstError = error;
        }

        if (!getChatResponseText(data)) {
            try {
                data = await callChatCompletion(config, testPayload, TEST_TIMEOUT_MS);
            } catch (error) {
                if (firstError) {
                    error.message = `${firstError.message}; fallback: ${error.message}`;
                }
                throw error;
            }
        }

        if (!getChatResponseText(data)) {
            const error = new Error("Model test returned empty content.");
            error.code = "AI_MODEL_EMPTY_CONTENT";
            throw error;
        }

        await updateStatus(db, config, "ok", "");
        return serializeConfig(await getConfigById(db, id));
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || "Test failed.";
        await updateStatus(db, config, "failed", message);
        const nextError = new Error(message);
        nextError.statusCode = 502;
        nextError.code = "AI_MODEL_TEST_FAILED";
        throw nextError;
    }
};

module.exports = {
    DEFAULT_BASE_URL,
    DEFAULT_MODEL,
    listConfigs,
    createConfig,
    updateConfig,
    deleteConfig,
    testConfig,
    getEnabledConfigs,
    callChatCompletionWithFailover,
    callEmbeddingWithFailover,
    MODEL_ROLES,
    isQwen3Model,
    buildChatCompletionPayload,
    encryptApiKey,
    decryptApiKey,
    EXACT_TEXT_MODEL,
    getExpectedTextBaseUrl,
    assertAiModelConfigPolicy,
    isAiModelConfigAllowed,
};
