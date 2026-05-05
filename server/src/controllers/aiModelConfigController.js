const { getDb } = require('../config/db');
const aiModelConfigService = require('../services/aiModelConfigService');

const sendError = (res, error, fallbackCode = 'AI_MODEL_CONFIG_FAILED') => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: error.code || fallbackCode,
    message: error.message || 'AI model config request failed.'
  });
};

const listConfigs = async (_req, res) => {
  try {
    const db = await getDb();
    res.json(await aiModelConfigService.listConfigs(db));
  } catch (error) {
    sendError(res, error);
  }
};

const createConfig = async (req, res) => {
  try {
    const db = await getDb();
    const config = await aiModelConfigService.createConfig(db, req.body || {}, req.user?.id);
    res.status(201).json(config);
  } catch (error) {
    sendError(res, error);
  }
};

const updateConfig = async (req, res) => {
  try {
    const db = await getDb();
    const config = await aiModelConfigService.updateConfig(db, req.params.id, req.body || {});
    res.json(config);
  } catch (error) {
    sendError(res, error);
  }
};

const deleteConfig = async (req, res) => {
  try {
    const db = await getDb();
    res.json(await aiModelConfigService.deleteConfig(db, req.params.id));
  } catch (error) {
    sendError(res, error);
  }
};

const testConfig = async (req, res) => {
  try {
    const db = await getDb();
    const config = await aiModelConfigService.testConfig(db, req.params.id);
    res.json(config);
  } catch (error) {
    sendError(res, error, 'AI_MODEL_TEST_FAILED');
  }
};

module.exports = {
  listConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  testConfig
};
