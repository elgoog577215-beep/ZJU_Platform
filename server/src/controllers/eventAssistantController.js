const { getDb } = require('../config/db');
const userProfileService = require('../services/userProfileService');
const {
  MAX_QUERY_LENGTH,
  MAX_CLARIFICATION_LENGTH,
  runEventAssistantTurn,
  recordEventAssistantFeedback,
  recordEventAssistantDecisionAction,
  createAssistantError
} = require('../utils/eventAssistant');

const sanitizeText = (value, maxLength = 200) => {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const sanitizeArray = (value, maxItems = 12, itemMaxLength = 60) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(String(item || ''), itemMaxLength))
    .filter(Boolean)
    .slice(0, maxItems);
};

const handleEventAssistant = async (req, res) => {
  const {
    query,
    clarificationAnswer,
    clarificationUsed = false,
    allowScopeExpansion = false,
    allowHistoricalFallback = true,
    rememberPreference = false,
    visitorKey = ''
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

    if (
      typeof clarificationUsed !== 'boolean'
      || typeof allowScopeExpansion !== 'boolean'
      || typeof allowHistoricalFallback !== 'boolean'
      || typeof rememberPreference !== 'boolean'
    ) {
      throw createAssistantError('EVENT_ASSISTANT_BAD_REQUEST', 'Invalid assistant state flags.', 400);
    }

    const db = await getDb();
    const result = await runEventAssistantTurn({
      db,
      query,
      clarificationAnswer,
      clarificationUsed,
      allowScopeExpansion,
      allowHistoricalFallback,
      rememberPreference,
      userId: req.user?.id || null,
      visitorKey: sanitizeText(visitorKey, 120)
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

const handleEventAssistantFeedback = async (req, res) => {
  try {
    const db = await getDb();
    const result = await recordEventAssistantFeedback({
      db,
      userId: req.user?.id,
      eventId: req.body?.eventId,
      feedback: req.body?.feedback,
      query: req.body?.query,
      reason: req.body?.reason,
      assistantRunId: req.body?.assistantRunId,
      recommendationRank: req.body?.recommendationRank,
      source: req.body?.source
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'EVENT_ASSISTANT_FEEDBACK_FAILED';
    const message = error.message || 'Failed to record assistant feedback.';

    res.status(statusCode).json({
      error: code,
      message
    });
  }
};

const handleEventAssistantAction = async (req, res) => {
  try {
    const db = await getDb();
    const result = await recordEventAssistantDecisionAction({
      db,
      userId: req.user?.id || null,
      visitorKey: req.body?.visitorKey,
      eventId: req.body?.eventId,
      actionType: req.body?.actionType || req.body?.action,
      assistantRunId: req.body?.assistantRunId,
      source: req.body?.source,
      recommendationRank: req.body?.recommendationRank,
      metadata: req.body?.metadata
    });

    res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'EVENT_ASSISTANT_ACTION_FAILED';
    const message = error.message || 'Failed to record assistant decision action.';

    res.status(statusCode).json({
      error: code,
      message
    });
  }
};

const getEventAssistantPreferences = async (req, res) => {
  try {
    const db = await getDb();
    const preference = await userProfileService.getEventAssistantPreference(db, req.user.id);
    res.json(preference);
  } catch (error) {
    res.status(500).json({
      error: 'EVENT_ASSISTANT_PREFERENCES_FAILED',
      message: 'Failed to load assistant preferences.'
    });
  }
};

const updateEventAssistantPreferences = async (req, res) => {
  try {
    const db = await getDb();
    const preference = userProfileService.normalizePreferencePayload({
      college: sanitizeText(req.body?.college, 120),
      division: sanitizeText(req.body?.division, 80),
      grade: sanitizeText(req.body?.grade, 40),
      campus: sanitizeText(req.body?.campus, 60),
      interestTags: sanitizeArray(req.body?.interestTags, 16, 50),
      preferredCategories: sanitizeArray(req.body?.preferredCategories, 8, 40),
      preferredBenefits: sanitizeArray(req.body?.preferredBenefits, 4, 40),
      preferredFormat: ['online', 'offline', 'hybrid', ''].includes(req.body?.preferredFormat)
        ? req.body.preferredFormat
        : ''
    });
    const savedPreference = await userProfileService.updateEventAssistantPreference(db, req.user.id, preference);
    res.json(savedPreference);
  } catch (error) {
    res.status(500).json({
      error: 'EVENT_ASSISTANT_PREFERENCES_FAILED',
      message: 'Failed to update assistant preferences.'
    });
  }
};

module.exports = {
  handleEventAssistant,
  handleEventAssistantFeedback,
  handleEventAssistantAction,
  getEventAssistantPreferences,
  updateEventAssistantPreferences
};
