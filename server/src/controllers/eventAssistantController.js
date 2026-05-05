const { getDb } = require('../config/db');
const {
  MAX_QUERY_LENGTH,
  MAX_CLARIFICATION_LENGTH,
  runEventAssistantTurn,
  recordEventAssistantFeedback,
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

const serializePreferenceRow = (row, user) => {
  const parseJson = (value) => {
    try {
      const parsed = JSON.parse(value || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return {
    college: row?.college || user?.organization_cr || user?.organization || '',
    division: row?.division || '',
    grade: row?.grade || '',
    campus: row?.campus || '',
    interestTags: parseJson(row?.interest_tags),
    preferredCategories: parseJson(row?.preferred_categories),
    preferredBenefits: parseJson(row?.preferred_benefits),
    preferredFormat: row?.preferred_format || ''
  };
};

const handleEventAssistant = async (req, res) => {
  const {
    query,
    clarificationAnswer,
    clarificationUsed = false,
    allowScopeExpansion = false,
    allowHistoricalFallback = true,
    rememberPreference = false
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
      userId: req.user?.id || null
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
      reason: req.body?.reason
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

const getEventAssistantPreferences = async (req, res) => {
  try {
    const db = await getDb();
    const row = await db.get('SELECT * FROM user_event_preferences WHERE user_id = ?', [req.user.id]);
    const user = await db.get(
      'SELECT organization, organization_cr FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json(serializePreferenceRow(row, user));
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
    const preference = {
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
    };

    await db.run(
      `
        INSERT INTO user_event_preferences (
          user_id,
          college,
          division,
          grade,
          campus,
          interest_tags,
          preferred_categories,
          preferred_benefits,
          preferred_format,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          college = excluded.college,
          division = excluded.division,
          grade = excluded.grade,
          campus = excluded.campus,
          interest_tags = excluded.interest_tags,
          preferred_categories = excluded.preferred_categories,
          preferred_benefits = excluded.preferred_benefits,
          preferred_format = excluded.preferred_format,
          updated_at = datetime('now')
      `,
      [
        req.user.id,
        preference.college,
        preference.division,
        preference.grade,
        preference.campus,
        JSON.stringify(preference.interestTags),
        JSON.stringify(preference.preferredCategories),
        JSON.stringify(preference.preferredBenefits),
        preference.preferredFormat
      ]
    );

    res.json(preference);
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
  getEventAssistantPreferences,
  updateEventAssistantPreferences
};
