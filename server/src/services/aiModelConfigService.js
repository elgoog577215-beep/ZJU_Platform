const crypto = require('crypto');
const axios = require('axios');

const DEFAULT_PROVIDER = 'openai-compatible';
const DEFAULT_BASE_URL = process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const TEST_TIMEOUT_MS = 15000;
const CALL_TIMEOUT_MS = 30000;

const toText = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeBaseUrl = (value) => {
  const trimmed = toText(value, 300).replace(/\/+$/, '');
  return trimmed || DEFAULT_BASE_URL;
};

const getEncryptionKey = () => {
  const secret = process.env.AI_CONFIG_ENCRYPTION_KEY || process.env.SECRET_KEY || 'zju-platform-local-ai-config';
  return crypto.createHash('sha256').update(secret).digest();
};

const encryptApiKey = (plainText) => {
  const value = toText(plainText, 2000);
  if (!value) {
    const error = new Error('API key is required.');
    error.statusCode = 400;
    error.code = 'AI_MODEL_KEY_REQUIRED';
    throw error;
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join(':');
};

const decryptApiKey = (encryptedValue) => {
  if (!encryptedValue || typeof encryptedValue !== 'string') return '';

  const [version, ivValue, tagValue, encrypted] = encryptedValue.split(':');
  if (version !== 'v1' || !ivValue || !tagValue || !encrypted) {
    return '';
  }

  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      Buffer.from(ivValue, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final()
    ]).toString('utf8');
  } catch {
    return '';
  }
};

const maskApiKey = (encryptedValue) => {
  const plain = decryptApiKey(encryptedValue);
  if (!plain) return '';
  if (plain.length <= 8) return '********';
  return `${plain.slice(0, 3)}***${plain.slice(-4)}`;
};

const serializeConfig = (row) => ({
  id: row.id,
  name: row.name,
  provider: row.provider || DEFAULT_PROVIDER,
  base_url: row.base_url,
  model: row.model,
  priority: Number(row.priority || 100),
  enabled: Boolean(row.enabled),
  masked_api_key: maskApiKey(row.encrypted_api_key),
  has_api_key: Boolean(maskApiKey(row.encrypted_api_key)),
  last_status: row.last_status || null,
  last_error: row.last_error || null,
  last_checked_at: row.last_checked_at || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null
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
  return db.get('SELECT * FROM ai_model_configs WHERE id = ?', [configId]);
};

const createConfig = async (db, payload, userId) => {
  const name = toText(payload.name, 80) || '活动助手模型';
  const provider = toText(payload.provider, 80) || DEFAULT_PROVIDER;
  const baseUrl = normalizeBaseUrl(payload.base_url);
  const model = toText(payload.model, 120) || DEFAULT_MODEL;
  const priority = Number.isInteger(Number(payload.priority)) ? Number(payload.priority) : 100;
  const enabled = payload.enabled === false ? 0 : 1;
  const encryptedApiKey = encryptApiKey(payload.api_key);

  const result = await db.run(
    `
      INSERT INTO ai_model_configs (
        name,
        provider,
        base_url,
        model,
        encrypted_api_key,
        priority,
        enabled,
        created_by,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    [name, provider, baseUrl, model, encryptedApiKey, priority, enabled, userId || null]
  );

  return serializeConfig(await getConfigById(db, result.lastID));
};

const updateConfig = async (db, id, payload) => {
  const existing = await getConfigById(db, id);
  if (!existing) {
    const error = new Error('Model config not found.');
    error.statusCode = 404;
    error.code = 'AI_MODEL_CONFIG_NOT_FOUND';
    throw error;
  }

  const next = {
    name: payload.name !== undefined ? toText(payload.name, 80) || existing.name : existing.name,
    provider: payload.provider !== undefined ? toText(payload.provider, 80) || DEFAULT_PROVIDER : existing.provider,
    base_url: payload.base_url !== undefined ? normalizeBaseUrl(payload.base_url) : existing.base_url,
    model: payload.model !== undefined ? toText(payload.model, 120) || existing.model : existing.model,
    priority: payload.priority !== undefined && Number.isInteger(Number(payload.priority))
      ? Number(payload.priority)
      : existing.priority,
    enabled: payload.enabled !== undefined ? (payload.enabled ? 1 : 0) : existing.enabled,
    encrypted_api_key: payload.api_key ? encryptApiKey(payload.api_key) : existing.encrypted_api_key
  };

  await db.run(
    `
      UPDATE ai_model_configs
      SET name = ?,
          provider = ?,
          base_url = ?,
          model = ?,
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
      next.encrypted_api_key,
      next.priority,
      next.enabled,
      existing.id
    ]
  );

  return serializeConfig(await getConfigById(db, existing.id));
};

const deleteConfig = async (db, id) => {
  const existing = await getConfigById(db, id);
  if (!existing) {
    const error = new Error('Model config not found.');
    error.statusCode = 404;
    error.code = 'AI_MODEL_CONFIG_NOT_FOUND';
    throw error;
  }

  await db.run('DELETE FROM ai_model_configs WHERE id = ?', [existing.id]);
  return { success: true };
};

const buildEnvConfig = () => {
  if (!process.env.LLM_API_KEY) return null;

  return {
    id: 'env',
    name: '环境变量默认 Key',
    provider: DEFAULT_PROVIDER,
    base_url: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    encrypted_api_key: encryptApiKey(process.env.LLM_API_KEY),
    priority: 9999,
    enabled: 1,
    fromEnv: true
  };
};

const getEnabledConfigs = async (db, includeEnvFallback = true) => {
  const rows = await db.all(`
    SELECT *
    FROM ai_model_configs
    WHERE enabled = 1
    ORDER BY priority ASC, id ASC
  `);

  const configs = [...rows];
  const envConfig = includeEnvFallback ? buildEnvConfig() : null;
  if (envConfig) configs.push(envConfig);
  return configs;
};

const updateStatus = async (db, config, status, errorMessage = '') => {
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
  const apiKey = decryptApiKey(config.encrypted_api_key);
  if (!apiKey) {
    const error = new Error('API key cannot be decrypted.');
    error.code = 'AI_MODEL_KEY_DECRYPT_FAILED';
    throw error;
  }

  const response = await axios.post(
    `${normalizeBaseUrl(config.base_url)}/chat/completions`,
    {
      model: config.model || DEFAULT_MODEL,
      stream: false,
      temperature: 0.2,
      max_tokens: 900,
      ...payload
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout
    }
  );

  return response.data;
};

const callChatCompletionWithFailover = async (db, payload, options = {}) => {
  const configs = await getEnabledConfigs(db, true);
  const attempts = [];

  for (const config of configs) {
    try {
      const data = await callChatCompletion(config, payload, options.timeout || CALL_TIMEOUT_MS);
      await updateStatus(db, config, 'ok', '');
      return {
        data,
        config: serializeConfig(config),
        attempts
      };
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message || 'Model call failed.';
      attempts.push({
        id: config.id,
        name: config.name,
        status,
        message: toText(message, 240)
      });
      await updateStatus(db, config, 'failed', message);
    }
  }

  const error = new Error('No available AI model config succeeded.');
  error.code = 'AI_MODEL_ALL_FAILED';
  error.statusCode = 503;
  error.attempts = attempts;
  throw error;
};

const testConfig = async (db, id) => {
  const config = await getConfigById(db, id);
  if (!config) {
    const error = new Error('Model config not found.');
    error.statusCode = 404;
    error.code = 'AI_MODEL_CONFIG_NOT_FOUND';
    throw error;
  }

  try {
    await callChatCompletion(
      config,
      {
        messages: [
          { role: 'system', content: 'Reply with a short JSON object only.' },
          { role: 'user', content: '{"ping":"ok"}' }
        ],
        max_tokens: 80
      },
      TEST_TIMEOUT_MS
    );
    await updateStatus(db, config, 'ok', '');
    return serializeConfig(await getConfigById(db, id));
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message || 'Test failed.';
    await updateStatus(db, config, 'failed', message);
    const nextError = new Error(message);
    nextError.statusCode = 502;
    nextError.code = 'AI_MODEL_TEST_FAILED';
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
  encryptApiKey,
  decryptApiKey
};
