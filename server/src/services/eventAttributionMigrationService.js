const crypto = require('crypto');

const ORG_PROFILE_TYPES = new Set(['club', 'school', 'enterprise', 'organization']);
const MATCH_LEVEL_ORDER = new Map([
  ['strong', 0],
  ['medium', 1],
  ['weak', 2],
  ['conflict', 3],
]);

const trimText = (value, maxLength = 500) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
};

const normalizeText = (value) =>
  trimText(value, 500)
    .toLowerCase()
    .replace(/\s+/g, '');

const normalizeAlias = (value) => trimText(value, 160).toLowerCase();

const uniqueAliases = (items = []) => {
  const seen = new Set();
  const aliases = [];
  for (const item of items) {
    const alias = trimText(item, 160);
    const key = normalizeAlias(alias);
    if (!alias || seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
  }
  return aliases;
};

const parseJson = (value, fallback = null) => {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const getCertifiedProfile = async (db, profileId) => {
  const id = Number.parseInt(profileId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('target profile is required');
    error.status = 400;
    throw error;
  }

  const profile = await db.get(
    `SELECT *
     FROM profiles
     WHERE id = ?
       AND deleted_at IS NULL
       AND status = 'active'
     LIMIT 1`,
    [id],
  );
  if (!profile || !ORG_PROFILE_TYPES.has(profile.type)) {
    const error = new Error('target profile is not an active certified organization');
    error.status = 404;
    throw error;
  }
  return profile;
};

const getProfileAliases = async (db, profile) => {
  const rows = await db.all(
    `SELECT alias, purpose
     FROM profile_aliases
     WHERE profile_id = ?
       AND purpose IN ('organizer_match', 'search')
     ORDER BY CASE purpose WHEN 'organizer_match' THEN 0 ELSE 1 END, id ASC`,
    [profile.id],
  ).catch(() => []);

  return uniqueAliases([
    ...rows.map((row) => row.alias),
    profile.display_name,
    profile.display_name_en,
  ]);
};

const loadCandidateEvents = (db, limit = 300) => db.all(
  `SELECT id, title, description, organizer, location, link, source_url, status,
          uploader_id, publisher_profile_id, organizer_profile_id, created_at
   FROM events
   WHERE deleted_at IS NULL
   ORDER BY COALESCE(created_at, id) DESC, id DESC
   LIMIT ?`,
  [Math.min(Math.max(Number.parseInt(limit, 10) || 300, 1), 1000)],
);

const containsAlias = (value, aliases) => {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return null;
  return aliases.find((alias) => {
    const normalizedAlias = normalizeText(alias);
    return normalizedAlias && normalizedValue.includes(normalizedAlias);
  }) || null;
};

const exactOrganizerAlias = (organizer, aliases) => {
  const normalizedOrganizer = normalizeAlias(organizer);
  if (!normalizedOrganizer) return null;
  return aliases.find((alias) => normalizeAlias(alias) === normalizedOrganizer) || null;
};

const classifyEventForProfile = (event, profile, aliases) => {
  const organizerAlias = exactOrganizerAlias(event.organizer, aliases);
  const alreadyTarget =
    Number(event.publisher_profile_id || 0) === Number(profile.id) ||
    Number(event.organizer_profile_id || 0) === Number(profile.id);
  const conflicting =
    !alreadyTarget &&
    (
      (event.publisher_profile_id && Number(event.publisher_profile_id) !== Number(profile.id)) ||
      (event.organizer_profile_id && Number(event.organizer_profile_id) !== Number(profile.id))
    );

  if (organizerAlias) {
    return {
      match_level: conflicting ? 'conflict' : 'strong',
      confidence: conflicting ? 0.5 : 1,
      matched_by: 'organizer_alias',
      evidence: `organizer: ${event.organizer}`,
    };
  }

  const contentText = [event.title, event.description, event.link, event.source_url].filter(Boolean).join('\n');
  const contentAlias = containsAlias(contentText, aliases);
  if (contentAlias) {
    return {
      match_level: conflicting ? 'conflict' : 'medium',
      confidence: conflicting ? 0.42 : 0.72,
      matched_by: 'content_text',
      evidence: `content matched: ${contentAlias}`,
    };
  }

  const locationAlias = containsAlias(event.location, aliases);
  if (locationAlias) {
    return {
      match_level: conflicting ? 'conflict' : 'weak',
      confidence: conflicting ? 0.25 : 0.35,
      matched_by: 'location_text',
      evidence: `location matched: ${locationAlias}`,
    };
  }

  return null;
};

const serializeCandidate = (event, profile, match) => ({
  id: `${event.id}:${profile.id}`,
  event_id: event.id,
  target_profile_id: profile.id,
  target_profile: {
    id: profile.id,
    handle: profile.handle,
    display_name: profile.display_name,
    type: profile.type,
    verified: Boolean(profile.verified),
  },
  event: {
    id: event.id,
    title: event.title || '',
    organizer: event.organizer || '',
    location: event.location || '',
    status: event.status || '',
    uploader_id: event.uploader_id || null,
    publisher_profile_id: event.publisher_profile_id || null,
    organizer_profile_id: event.organizer_profile_id || null,
    created_at: event.created_at || '',
  },
  match_level: match.match_level,
  confidence: match.confidence,
  matched_by: match.matched_by,
  evidence: match.evidence,
});

const summarizeCandidates = (candidates) => {
  const summary = {
    total: candidates.length,
    strong: 0,
    medium: 0,
    weak: 0,
    conflict: 0,
  };
  for (const candidate of candidates) {
    summary[candidate.match_level] = (summary[candidate.match_level] || 0) + 1;
  }
  return summary;
};

const scanEventAttributionCandidates = async (db, options = {}) => {
  const profile = await getCertifiedProfile(db, options.profileId);
  const aliases = await getProfileAliases(db, profile);
  const events = await loadCandidateEvents(db, options.limit);
  const levels = new Set(Array.isArray(options.levels) ? options.levels : []);

  const candidates = events
    .map((event) => {
      const match = classifyEventForProfile(event, profile, aliases);
      return match ? serializeCandidate(event, profile, match) : null;
    })
    .filter(Boolean)
    .filter((candidate) => levels.size === 0 || levels.has(candidate.match_level))
    .sort((left, right) => {
      const orderDiff =
        (MATCH_LEVEL_ORDER.get(left.match_level) ?? 99) -
        (MATCH_LEVEL_ORDER.get(right.match_level) ?? 99);
      if (orderDiff !== 0) return orderDiff;
      return right.confidence - left.confidence || right.event_id - left.event_id;
    });

  return {
    profile: {
      id: profile.id,
      handle: profile.handle,
      display_name: profile.display_name,
      type: profile.type,
      verified: Boolean(profile.verified),
    },
    aliases,
    summary: summarizeCandidates(candidates),
    candidates,
  };
};

const makeBatchId = () =>
  `attr-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomBytes(3).toString('hex')}`;

const normalizeCandidateInput = (candidate = {}) => ({
  eventId: Number.parseInt(candidate.eventId ?? candidate.event_id, 10),
  targetProfileId: Number.parseInt(candidate.targetProfileId ?? candidate.target_profile_id, 10),
  matchLevel: trimText(candidate.matchLevel ?? candidate.match_level, 24) || 'strong',
  confidence: Number(candidate.confidence ?? 0),
  matchedBy: trimText(candidate.matchedBy ?? candidate.matched_by, 80) || 'manual',
  evidence: trimText(candidate.evidence, 1000),
});

const logMigration = (db, payload) => db.run(
  `INSERT INTO event_attribution_migration_logs (
     batch_id, event_id, target_profile_id,
     previous_publisher_profile_id, previous_organizer_profile_id,
     next_publisher_profile_id, next_organizer_profile_id,
     match_level, confidence, matched_by, evidence, status, confirmed_by, created_at
   )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  [
    payload.batchId,
    payload.eventId,
    payload.targetProfileId,
    payload.previousPublisherProfileId,
    payload.previousOrganizerProfileId,
    payload.nextPublisherProfileId,
    payload.nextOrganizerProfileId,
    payload.matchLevel,
    payload.confidence,
    payload.matchedBy,
    payload.evidence,
    payload.status,
    payload.confirmedBy,
  ],
);

const applyEventAttributionMigration = async (db, options = {}) => {
  const adminUserId = Number.parseInt(options.adminUserId ?? options.confirmedBy, 10);
  if (!Number.isInteger(adminUserId) || adminUserId <= 0) {
    const error = new Error('admin user is required');
    error.status = 400;
    throw error;
  }

  const candidates = Array.isArray(options.candidates)
    ? options.candidates.map(normalizeCandidateInput).filter((candidate) => candidate.eventId && candidate.targetProfileId)
    : [];
  const batchId = options.batchId || makeBatchId();
  const allowOverwrite = options.allowOverwrite === true;
  const applied = [];
  const skipped = [];

  for (const candidate of candidates) {
    const [event, profile] = await Promise.all([
      db.get(
        `SELECT id, title, uploader_id, publisher_profile_id, organizer_profile_id, created_at
         FROM events
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [candidate.eventId],
      ),
      getCertifiedProfile(db, candidate.targetProfileId),
    ]);

    if (!event) {
      skipped.push({ event_id: candidate.eventId, reason: 'missing_event' });
      continue;
    }

    const hasPublisherConflict =
      event.publisher_profile_id &&
      Number(event.publisher_profile_id) !== Number(profile.id);
    const hasOrganizerConflict =
      event.organizer_profile_id &&
      Number(event.organizer_profile_id) !== Number(profile.id);

    if (!allowOverwrite && (hasPublisherConflict || hasOrganizerConflict)) {
      skipped.push({ event_id: event.id, target_profile_id: profile.id, reason: 'conflict' });
      continue;
    }

    await db.run(
      `UPDATE events
       SET publisher_profile_id = ?,
           organizer_profile_id = ?
       WHERE id = ?`,
      [profile.id, profile.id, event.id],
    );

    await logMigration(db, {
      batchId,
      eventId: event.id,
      targetProfileId: profile.id,
      previousPublisherProfileId: event.publisher_profile_id || null,
      previousOrganizerProfileId: event.organizer_profile_id || null,
      nextPublisherProfileId: profile.id,
      nextOrganizerProfileId: profile.id,
      matchLevel: candidate.matchLevel,
      confidence: candidate.confidence,
      matchedBy: candidate.matchedBy,
      evidence: candidate.evidence,
      status: 'applied',
      confirmedBy: adminUserId,
    });

    applied.push({
      event_id: event.id,
      target_profile_id: profile.id,
      batch_id: batchId,
    });
  }

  return { batch_id: batchId, applied, skipped };
};

const listMigrationLogs = async (db, options = {}) => {
  const limit = Math.min(Math.max(Number.parseInt(options.limit, 10) || 50, 1), 200);
  const rows = await db.all(
    `SELECT log.*, event.title AS event_title, profile.display_name AS target_profile_name
     FROM event_attribution_migration_logs log
     LEFT JOIN events event ON event.id = log.event_id
     LEFT JOIN profiles profile ON profile.id = log.target_profile_id
     ORDER BY log.id DESC
     LIMIT ?`,
    [limit],
  );
  return rows.map((row) => ({
    ...row,
    evidence_json: parseJson(row.evidence, null),
  }));
};

module.exports = {
  applyEventAttributionMigration,
  listMigrationLogs,
  scanEventAttributionCandidates,
};
