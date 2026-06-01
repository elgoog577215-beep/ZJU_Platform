const PROFILE_STATUS_LABELS = {
  open_chat: '欢迎交流',
  seeking_collab: '寻找合作',
  coffee_chat: '可以约聊',
  team_up: '组队中',
  joining_events: '想参加活动',
  busy: '暂时忙碌',
};

const sanitizeText = (value, maxLength = 500) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const unique = (items) => [...new Set(items.map((item) => sanitizeText(item, 80)).filter(Boolean))];

const uniqueTextArray = (value, maxItems = 16, itemMaxLength = 60) => {
  const list = Array.isArray(value)
    ? value
    : sanitizeText(value, 1200).split(/[,，、;；\s/|]+/);
  return unique(list.map((item) => sanitizeText(item, itemMaxLength))).slice(0, maxItems);
};

const safeAll = async (db, sql, params = []) => {
  try {
    return await db.all(sql, params);
  } catch {
    return [];
  }
};

const safeGet = async (db, sql, params = []) => {
  try {
    return await db.get(sql, params);
  } catch {
    return null;
  }
};

const normalizePreferencePayload = (payload = {}) => ({
  college: sanitizeText(payload.college, 120),
  division: sanitizeText(payload.division, 80),
  grade: sanitizeText(payload.grade, 40),
  campus: sanitizeText(payload.campus, 60),
  interestTags: uniqueTextArray(payload.interestTags, 16, 50),
  preferredCategories: uniqueTextArray(payload.preferredCategories, 8, 40),
  preferredBenefits: uniqueTextArray(payload.preferredBenefits, 4, 40),
  preferredFormat: ['online', 'offline', 'hybrid', ''].includes(payload.preferredFormat)
    ? payload.preferredFormat
    : '',
});

const loadUserProfileFoundation = async (db, userId) => {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId)) return null;

  const user = await safeGet(
    db,
    `
      SELECT
        id,
        username,
        nickname,
        avatar,
        role,
        organization,
        organization_cr,
        gender,
        age,
        profile_slogan,
        profile_status
      FROM users
      WHERE id = ?
    `,
    [normalizedUserId]
  );
  if (!user) return null;

  const [preference, tags, cards, socialLinks, identityClaims] = await Promise.all([
    safeGet(db, 'SELECT * FROM user_event_preferences WHERE user_id = ?', [normalizedUserId]),
    safeAll(
      db,
      `
        SELECT label
        FROM user_profile_tags
        WHERE user_id = ?
        ORDER BY sort_order ASC, id ASC
        LIMIT 24
      `,
      [normalizedUserId]
    ),
    safeAll(
      db,
      `
        SELECT title, body, note, card_type, custom_type, description, tags_json, is_visible
        FROM user_profile_cards
        WHERE user_id = ?
          AND is_visible = 1
        ORDER BY sort_order ASC, id ASC
        LIMIT 20
      `,
      [normalizedUserId]
    ),
    safeAll(
      db,
      `
        SELECT platform, label
        FROM user_social_links
        WHERE user_id = ?
          AND is_visible = 1
        ORDER BY sort_order ASC, id ASC
        LIMIT 12
      `,
      [normalizedUserId]
    ),
    safeAll(
      db,
      `
        SELECT type, display_name, status
        FROM user_identity_claims
        WHERE user_id = ?
          AND status IN ('pending', 'verified')
        ORDER BY
          CASE status WHEN 'verified' THEN 0 ELSE 1 END,
          updated_at DESC,
          id DESC
        LIMIT 12
      `,
      [normalizedUserId]
    ),
  ]);

  const profileTags = tags.map((row) => row.label);
  const cardSignals = cards.flatMap((card) => [
    card.title,
    card.custom_type,
    card.card_type,
    card.description,
    ...parseJsonArray(card.tags_json),
  ]);
  const identitySignals = identityClaims.map((claim) => claim.display_name);
  const profileStatusLabel = PROFILE_STATUS_LABELS[user.profile_status] || '';
  const interestTags = uniqueTextArray([
    ...parseJsonArray(preference?.interest_tags),
    ...profileTags,
    ...cardSignals,
    ...identitySignals,
    user.profile_slogan,
    profileStatusLabel,
  ], 18, 50);

  const college = sanitizeText(
    preference?.college || user.organization_cr || user.organization || identitySignals[0] || '',
    120
  );

  return {
    user,
    explicit: {
      college,
      division: sanitizeText(preference?.division, 80),
      grade: sanitizeText(preference?.grade, 40),
      campus: sanitizeText(preference?.campus, 60),
      interestTags,
      preferredCategories: parseJsonArray(preference?.preferred_categories),
      preferredBenefits: parseJsonArray(preference?.preferred_benefits),
      preferredFormat: sanitizeText(preference?.preferred_format, 40),
    },
    userSystem: {
      source: 'user_system',
      profileStatus: user.profile_status || '',
      profileStatusLabel,
      slogan: user.profile_slogan || '',
      tags: uniqueTextArray(profileTags, 24, 40),
      cards: cards.map((card) => ({
        title: sanitizeText(card.title || card.custom_type || card.card_type, 80),
        type: sanitizeText(card.custom_type || card.card_type, 40),
        description: sanitizeText(card.description || card.note || card.body, 140),
        tags: uniqueTextArray(parseJsonArray(card.tags_json), 8, 40),
      })),
      socialPlatforms: uniqueTextArray(
        socialLinks.map((link) => link.label || link.platform),
        12,
        40
      ),
      identityClaims: identityClaims.map((claim) => ({
        type: claim.type,
        displayName: claim.display_name,
        status: claim.status,
      })),
    },
    preference,
  };
};

const serializeEventAssistantPreference = (foundation) => {
  const explicit = foundation?.explicit || {};
  return {
    college: explicit.college || '',
    division: explicit.division || '',
    grade: explicit.grade || '',
    campus: explicit.campus || '',
    interestTags: explicit.interestTags || [],
    preferredCategories: explicit.preferredCategories || [],
    preferredBenefits: explicit.preferredBenefits || [],
    preferredFormat: explicit.preferredFormat || '',
    source: foundation?.userSystem?.source || 'user_system',
  };
};

const getEventAssistantPreference = async (db, userId) => {
  const foundation = await loadUserProfileFoundation(db, userId);
  return serializeEventAssistantPreference(foundation);
};

const updateEventAssistantPreference = async (db, userId, payload = {}) => {
  const normalizedUserId = Number(userId);
  if (!Number.isInteger(normalizedUserId)) {
    const error = new Error('Valid user id is required.');
    error.statusCode = 400;
    throw error;
  }

  const preference = normalizePreferencePayload(payload);
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
      normalizedUserId,
      preference.college,
      preference.division,
      preference.grade,
      preference.campus,
      JSON.stringify(preference.interestTags),
      JSON.stringify(preference.preferredCategories),
      JSON.stringify(preference.preferredBenefits),
      preference.preferredFormat,
    ]
  );

  const foundation = await loadUserProfileFoundation(db, normalizedUserId);
  return serializeEventAssistantPreference(foundation);
};

const loadRecommendationProfileFoundation = async (db, userId) => loadUserProfileFoundation(db, userId);

module.exports = {
  getEventAssistantPreference,
  loadRecommendationProfileFoundation,
  loadUserProfileFoundation,
  normalizePreferencePayload,
  serializeEventAssistantPreference,
  updateEventAssistantPreference,
};
