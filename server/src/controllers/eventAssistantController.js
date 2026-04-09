const { getDb } = require('../config/db');
const {
  MAX_QUERY_LENGTH,
  MAX_CLARIFICATION_LENGTH,
  runEventAssistantTurn,
  createAssistantError
} = require('../utils/eventAssistant');

const handleEventAssistant = async (req, res) => {
  const {
    query,
    clarificationAnswer,
    clarificationUsed = false,
    allowScopeExpansion = false
  } = req.body || {};

  try {
    if (typeof query !== 'string' || query.trim() === '') {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Query is required.', 400);
    }

    if (query.trim().length > MAX_QUERY_LENGTH) {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Query is too long.', 400);
    }

    if (clarificationAnswer && typeof clarificationAnswer !== 'string') {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Clarification answer must be a string.', 400);
    }

    if (typeof clarificationAnswer === 'string' && clarificationAnswer.trim().length > MAX_CLARIFICATION_LENGTH) {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Clarification answer is too long.', 400);
    }

    if (typeof clarificationUsed !== 'boolean' || typeof allowScopeExpansion !== 'boolean') {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Invalid assistant state flags.', 400);
    }

    const db = await getDb();
    const result = await runEventAssistantTurn({
      db,
      query,
      clarificationAnswer,
      clarificationUsed,
      allowScopeExpansion
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'EVENT_ASSISTANT_FAILED';
    const message = error.message || 'The event AI assistant failed to respond.';

    if (process.env.NODE_ENV === 'development') {
      console.error('[EventAssistant]', code, message);
    }

    res.status(statusCode).json({
      error: code,
      message
    });
  }
};

module.exports = {
  handleEventAssistant
};
