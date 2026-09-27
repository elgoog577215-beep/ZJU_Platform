const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const TEST_TEXT_BASE_URL = "https://qwen.zju.internal.test/v1";
process.env.ZJU_QWEN_BASE_URL = TEST_TEXT_BASE_URL;
process.env.ZJU_QWEN_API_KEY = "test-zju-qwen-key";

const modelService = require("../src/services/aiModelConfigService");
const aiRuntime = require("../src/services/unifiedAiRuntimeService");
const { EVENT_ASSISTANT_V2_DEADLINE_MS } = require("../src/utils/eventAssistant");

const createDb = async () => {
    const db = await open({ filename: ":memory:", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE ai_model_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT,
            base_url TEXT NOT NULL, model TEXT NOT NULL, role TEXT DEFAULT 'general',
            encrypted_api_key TEXT NOT NULL, priority INTEGER DEFAULT 100,
            enabled INTEGER DEFAULT 1, last_status TEXT, last_error TEXT,
            last_checked_at DATETIME, created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    return db;
};

const textPayload = (name, role, priority) => ({
    name,
    provider: "openai-compatible",
    base_url: TEST_TEXT_BASE_URL,
    model: "qwen3.8-27b",
    role,
    api_key: `sk-${name}`,
    priority,
    enabled: true,
});

const embeddingPayload = (name, priority = 10) => ({
    name,
    provider: "openai-compatible",
    base_url: "https://embedding.zju.internal.test/v1",
    model: "bge-m3",
    role: "embedding",
    api_key: `sk-${name}`,
    priority,
    enabled: true,
});

const insertRawConfig = async (db, config) => {
    const result = await db.run(
        `
        INSERT INTO ai_model_configs (
            name, provider, base_url, model, role, encrypted_api_key, priority, enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            config.name,
            "openai-compatible",
            config.base_url,
            config.model,
            config.role,
            modelService.encryptApiKey("test-key"),
            config.priority || 100,
            config.enabled === false ? 0 : 1,
        ]
    );
    return result.lastID;
};

test("model configs persist roles and use only policy-compliant same-provider fallback", async (t) => {
    const db = await createDb();
    t.after(() => db.close());

    const general = await modelService.createConfig(db, textPayload("general", "general", 50), 1);
    const fast = await modelService.createConfig(db, textPayload("fast", "fast", 10), 1);
    assert.equal(fast.role, "fast");
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "fast")).map((item) => item.id),
        [fast.id, general.id]
    );
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "reasoning")).map((item) => item.id),
        [general.id]
    );
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, true, "reasoning")).map((item) => item.id),
        [general.id, "env"]
    );
    assert.deepEqual(await modelService.getEnabledConfigs(db, true, "embedding"), []);
    await assert.rejects(modelService.callEmbeddingWithFailover(db, "test embedding"), (error) => {
        assert.equal(error.code, "AI_EMBEDDING_NOT_CONFIGURED");
        assert.deepEqual(error.attempts, []);
        return true;
    });

    const embedding = await modelService.createConfig(db, embeddingPayload("embedding"), 1);
    assert.equal(embedding.role, "embedding");
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, true, "embedding")).map((item) => item.id),
        [embedding.id]
    );
});

test("admin writes reject external providers, wrong text models, and text models as embedding", async (t) => {
    const db = await createDb();
    t.after(() => db.close());

    await assert.rejects(
        modelService.createConfig(
            db,
            {
                ...textPayload("external", "general", 10),
                base_url: "https://api-inference.modelscope.cn/v1",
            },
            1
        ),
        { code: "AI_MODEL_PROVIDER_FORBIDDEN" }
    );
    await assert.rejects(
        modelService.createConfig(
            db,
            { ...textPayload("wrong-model", "general", 10), model: "another-chat-model" },
            1
        ),
        { code: "AI_TEXT_PROVIDER_POLICY_VIOLATION" }
    );
    await assert.rejects(
        modelService.createConfig(
            db,
            {
                ...embeddingPayload("external-embedding"),
                base_url: "https://api.deepseek.com/v1",
            },
            1
        ),
        { code: "AI_MODEL_PROVIDER_FORBIDDEN" }
    );
    await assert.rejects(
        modelService.createConfig(
            db,
            {
                ...embeddingPayload("not-an-embedding"),
                model: "qwen3.8-27b",
            },
            1
        ),
        { code: "AI_EMBEDDING_MODEL_REQUIRED" }
    );
    assert.equal((await db.get("SELECT COUNT(*) AS count FROM ai_model_configs")).count, 0);

    const valid = await modelService.createConfig(db, textPayload("valid", "general", 10), 1);
    await assert.rejects(modelService.updateConfig(db, valid.id, { model: "wrong-model" }), {
        code: "AI_TEXT_PROVIDER_POLICY_VIOLATION",
    });
    const persisted = await db.get("SELECT model, base_url FROM ai_model_configs WHERE id = ?", [
        valid.id,
    ]);
    assert.deepEqual(persisted, {
        model: "qwen3.8-27b",
        base_url: TEST_TEXT_BASE_URL,
    });
});

test("runtime filters historical drift configs and never borrows general for embedding", async (t) => {
    const db = await createDb();
    t.after(() => db.close());

    const validGeneralId = await insertRawConfig(db, {
        name: "valid-general",
        base_url: TEST_TEXT_BASE_URL,
        model: "qwen3.8-27b",
        role: "general",
        priority: 30,
    });
    await insertRawConfig(db, {
        name: "drifted-text",
        base_url: "https://other-provider.invalid/v1",
        model: "qwen3.8-27b",
        role: "general",
        priority: 1,
    });
    await insertRawConfig(db, {
        name: "forbidden-embedding",
        base_url: "https://api-inference.modelscope.cn/v1",
        model: "embedding-model",
        role: "embedding",
        priority: 1,
    });
    const validEmbeddingId = await insertRawConfig(db, {
        name: "valid-embedding",
        base_url: "https://embedding.zju.internal.test/v1",
        model: "bge-m3",
        role: "embedding",
        priority: 20,
    });

    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "reasoning")).map((item) => item.id),
        [validGeneralId]
    );
    assert.deepEqual(
        (await modelService.getEnabledConfigs(db, false, "embedding")).map((item) => item.id),
        [validEmbeddingId]
    );
});

test("config test rejects policy violations before any network request", async (t) => {
    const db = await createDb();
    t.after(() => db.close());
    const invalidId = await insertRawConfig(db, {
        name: "forbidden-text",
        base_url: "https://api-inference.modelscope.cn/v1",
        model: "qwen3.8-27b",
        role: "general",
    });

    let requestCount = 0;
    const originalPost = axios.post;
    axios.post = async () => {
        requestCount += 1;
        throw new Error("network should not be reached");
    };
    t.after(() => {
        axios.post = originalPost;
    });

    await assert.rejects(modelService.testConfig(db, invalidId), {
        code: "AI_MODEL_PROVIDER_FORBIDDEN",
    });
    assert.equal(requestCount, 0);
});

test("missing private endpoint never produces a public default", () => {
    const previousZjuBaseUrl = process.env.ZJU_QWEN_BASE_URL;
    const previousLegacyBaseUrl = process.env.LLM_BASE_URL;
    delete process.env.ZJU_QWEN_BASE_URL;
    delete process.env.LLM_BASE_URL;
    try {
        assert.equal(modelService.getExpectedTextBaseUrl(), "");
        assert.throws(
            () =>
                modelService.assertAiModelConfigPolicy({
                    base_url: TEST_TEXT_BASE_URL,
                    model: "qwen3.8-27b",
                    role: "general",
                }),
            { code: "AI_TEXT_PROVIDER_ANCHOR_MISSING" }
        );
    } finally {
        process.env.ZJU_QWEN_BASE_URL = previousZjuBaseUrl;
        if (previousLegacyBaseUrl === undefined) delete process.env.LLM_BASE_URL;
        else process.env.LLM_BASE_URL = previousLegacyBaseUrl;
    }
});

test("self-hosted event recommendation uses bounded runtime budgets", () => {
    const intentPolicy = aiRuntime.resolveTaskRuntimePolicy("event_recommendation_intent");
    const rerankPolicy = aiRuntime.resolveTaskRuntimePolicy("event_recommendation_rerank");
    assert.equal(intentPolicy.timeout, 8000);
    assert.equal(intentPolicy.streamFirst, true);
    assert.equal(rerankPolicy.timeout, 12000);
    assert.equal(rerankPolicy.streamFirst, true);
    assert.equal(EVENT_ASSISTANT_V2_DEADLINE_MS, 25000);
});

test("Qwen3 structured requests disable thinking without changing other models", () => {
    const qwenPayload = modelService.buildChatCompletionPayload(
        { model: "qwen3.8-27b" },
        { messages: [], max_tokens: 520 }
    );
    assert.deepEqual(qwenPayload.chat_template_kwargs, { enable_thinking: false });

    const explicitThinking = modelService.buildChatCompletionPayload(
        { model: "Qwen/Qwen3-8B" },
        { messages: [], chat_template_kwargs: { enable_thinking: true } }
    );
    assert.deepEqual(explicitThinking.chat_template_kwargs, { enable_thinking: true });

    const genericPayload = modelService.buildChatCompletionPayload(
        { model: "generic-chat-model" },
        { messages: [] }
    );
    assert.equal(genericPayload.chat_template_kwargs, undefined);
});
