const { getDb } = require('../config/db');
const unifiedAiAssistantService = require('../services/unifiedAiAssistantService');

const sendError = (res, error, fallbackCode = 'AI_ASSISTANT_FAILED') => {
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    error: error.code || fallbackCode,
    message: error.message || 'AI assistant request failed.',
  });
};

const getOverview = async (_req, res) => {
  try {
    const db = await getDb();
    const overview = await unifiedAiAssistantService.getAssistantOverview(db);
    const [recentRuns, recentSuggestions] = await Promise.all([
      unifiedAiAssistantService.getRecentRuns(db, 8),
      unifiedAiAssistantService.listRecentGovernanceSuggestions(db, 12),
    ]);
    res.json({
      ...overview,
      recentRuns,
      recentSuggestions,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const scanEventGovernance = async (req, res) => {
  try {
    const db = await getDb();
    const result = await unifiedAiAssistantService.scanEventGovernance(db, {
      ...(req.body || {}),
      userId: req.user?.id,
    });
    res.json(result);
  } catch (error) {
    sendError(res, error, 'AI_ASSISTANT_SCAN_FAILED');
  }
};

const applyEventGovernance = async (req, res) => {
  try {
    const db = await getDb();
    const result = await unifiedAiAssistantService.applyEventGovernanceSuggestions(
      db,
      req.body || {},
      req.user?.id
    );
    res.json(result);
  } catch (error) {
    sendError(res, error, 'AI_ASSISTANT_APPLY_FAILED');
  }
};

module.exports = {
  getOverview,
  scanEventGovernance,
  applyEventGovernance,
};
