const DAY_MS = 24 * 60 * 60 * 1000;

const parseJson = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const toIso = (value) => {
  const time = value ? new Date(value) : null;
  return time && !Number.isNaN(time.getTime()) ? time.toISOString() : null;
};

const normalizeWindowDays = (value, fallback = 14) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return Math.min(Math.max(Math.round(number), 1), 60);
};

const toSqliteTimestamp = (value) => (
  value.toISOString().slice(0, 19).replace('T', ' ')
);

const mapStatus = ({ positive, negative, recommendationCount }) => {
  if (negative > 0 && positive === 0) return 'CONTRADICTED';
  if (positive >= 2) return 'OBSERVED';
  if (positive === 1) return 'PARTIALLY_OBSERVED';
  if (recommendationCount > 0) return 'NOT_OBSERVED';
  return 'NO_RECOMMENDATION';
};

const buildSummary = (stats) => {
  const status = mapStatus(stats);
  const confidence = stats.recommendationCount > 0
    ? Math.min(0.95, 0.45 + stats.positive * 0.18 + stats.negative * 0.16 + Math.min(stats.recommendationCount, 5) * 0.04)
    : 0.25;
  const actionRate = stats.recommendationCount > 0
    ? Number((stats.positive / stats.recommendationCount).toFixed(3))
    : 0;

  return {
    status,
    confidence: Number(confidence.toFixed(2)),
    actionRate,
    observedActions: stats.positive,
    contradictedActions: stats.negative,
    recommendationCount: stats.recommendationCount,
    feedbackUpCount: stats.feedbackUp,
    feedbackDownCount: stats.feedbackDown,
    favoriteCount: stats.favorites,
    registrationCount: stats.registrations,
  };
};

const getRecommendationActionEvidence = async (db, options = {}) => {
  if (!db) return buildSummary({
    positive: 0,
    negative: 0,
    recommendationCount: 0,
    feedbackUp: 0,
    feedbackDown: 0,
    favorites: 0,
    registrations: 0,
  });

  const days = normalizeWindowDays(options.days);
  const since = toSqliteTimestamp(new Date(Date.now() - days * DAY_MS));
  const runs = await db.all(
    `
      SELECT id, requested_by, summary_json, created_at
      FROM ai_assistant_runs
      WHERE module = 'event_recommendation'
        AND action = 'turn'
        AND created_at >= ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [since, Math.min(Math.max(Number(options.limit) || 200, 1), 500)]
  ).catch(() => []);

  const eventIds = new Set();
  const userIds = new Set();
  let recommendationCount = 0;
  let modelUsedCount = 0;
  let fallbackUsedCount = 0;
  let lastRunAt = null;

  for (const run of runs) {
    const summary = parseJson(run.summary_json, {});
    const recommendedIds = Array.isArray(summary.recommendedEventIds) ? summary.recommendedEventIds : [];
    recommendationCount += Number(summary.recommendationCount || recommendedIds.length || 0);
    if (summary.modelUsed) modelUsedCount += 1;
    if (summary.fallbackUsed) fallbackUsedCount += 1;
    if (run.requested_by) userIds.add(Number(run.requested_by));
    for (const id of recommendedIds) {
      const eventId = Number(id);
      if (Number.isInteger(eventId)) eventIds.add(eventId);
    }
    lastRunAt = lastRunAt || toIso(run.created_at);
  }

  if (eventIds.size === 0) {
    const summary = buildSummary({
      positive: 0,
      negative: 0,
      recommendationCount,
      feedbackUp: 0,
      feedbackDown: 0,
      favorites: 0,
      registrations: 0,
    });
    return {
      ...summary,
      windowDays: days,
      runCount: runs.length,
      modelUsedCount,
      fallbackUsedCount,
      uniqueRecommendedEventCount: 0,
      uniqueUserCount: userIds.size,
      lastRunAt,
      observedEvidence: recommendationCount > 0
        ? 'Recent recommendation turns did not include event ids in telemetry yet.'
        : 'No recent event recommendation turns were observed.',
      nextAdjustment: 'Keep collecting recommendation telemetry before changing ranking policy.',
    };
  }

  const eventPlaceholders = [...eventIds].map(() => '?').join(',');
  const userFilter = userIds.size > 0
    ? `AND user_id IN (${[...userIds].map(() => '?').join(',')})`
    : '';
  const baseParams = [...eventIds, since, ...userIds];
  const favoriteRow = await db.get(
    `
      SELECT COUNT(*) AS count
      FROM favorites
      WHERE item_type = 'event'
        AND item_id IN (${eventPlaceholders})
        AND created_at >= ?
        ${userFilter}
    `,
    baseParams
  ).catch(() => ({ count: 0 }));
  const registrationRow = await db.get(
    `
      SELECT COUNT(*) AS count
      FROM event_registrations
      WHERE event_id IN (${eventPlaceholders})
        AND created_at >= ?
        ${userFilter}
    `,
    baseParams
  ).catch(() => ({ count: 0 }));
  const feedbackRows = await db.all(
    `
      SELECT feedback, COUNT(*) AS count
      FROM event_recommendation_feedback
      WHERE event_id IN (${eventPlaceholders})
        AND created_at >= ?
        ${userFilter}
      GROUP BY feedback
    `,
    baseParams
  ).catch(() => []);

  const feedbackUp = Number(feedbackRows.find((row) => row.feedback === 'up')?.count || 0);
  const feedbackDown = Number(feedbackRows.find((row) => row.feedback === 'down')?.count || 0);
  const favorites = Number(favoriteRow?.count || 0);
  const registrations = Number(registrationRow?.count || 0);
  const positive = feedbackUp + favorites + registrations;
  const negative = feedbackDown;
  const summary = buildSummary({
    positive,
    negative,
    recommendationCount,
    feedbackUp,
    feedbackDown,
    favorites,
    registrations,
  });

  return {
    ...summary,
    windowDays: days,
    runCount: runs.length,
    modelUsedCount,
    fallbackUsedCount,
    uniqueRecommendedEventCount: eventIds.size,
    uniqueUserCount: userIds.size,
    lastRunAt,
    observedEvidence: [
      `${recommendationCount} recommended slots`,
      `${feedbackUp} positive feedback`,
      `${favorites} favorites`,
      `${registrations} registrations`,
      `${feedbackDown} negative feedback`,
    ].join(', '),
    nextAdjustment: summary.status === 'CONTRADICTED'
      ? 'Lower confidence for similar ranking signals and inspect negative feedback examples.'
      : summary.status === 'NOT_OBSERVED'
        ? 'Keep ranking conservative and ask for clearer preference signals when intent is broad.'
        : 'Reinforce the ranking signals that produced observable favorites, registrations, or positive feedback.',
  };
};

module.exports = {
  getRecommendationActionEvidence,
};
