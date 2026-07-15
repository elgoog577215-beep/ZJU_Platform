const recordWechatParseRun = async (result = {}, dbOverride = null) => {
  try {
    const db = dbOverride || await require('../config/db').getDb();
    await db.run(
      `
        INSERT INTO ai_assistant_runs (
          module,
          action,
          status,
          requested_by,
          summary_json
        ) VALUES (?, ?, ?, ?, ?)
      `,
      [
        'wechat_event_parser',
        'parse',
        result.status || 'completed',
        result.userId || null,
        JSON.stringify({
          cacheHit: Boolean(result.cacheHit),
          contentLength: result.contentLength || 0,
          modelUsed: result.modelUsed !== false,
          provider: result.provider || null,
          model: result.model || null,
          runtimeTelemetry: result.runtimeTelemetry || { taskCount: 0, tasks: [] },
          hasCoverImage: Boolean(result.hasCoverImage),
          category: result.category || null,
          isCollegeNotice: result.isCollegeNotice ?? null,
          noticeType: result.noticeType || null,
          sourceCollege: result.sourceCollege || null,
          errorCode: result.errorCode || null,
        }),
      ],
    );
  } catch {
    // Parsing must stay available even if older databases do not have AI audit tables.
  }
};

module.exports = { recordWechatParseRun };
