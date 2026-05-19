const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const {
  buildErrorResponse,
  recordWechatParseRun,
} = require('../src/controllers/wechatParseController');
const { pool } = require('../src/config/db');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const openMemoryDb = () => open({
  filename: ':memory:',
  driver: sqlite3.Database,
});

const setupSchema = async (db) => {
  await db.exec(`
    CREATE TABLE ai_assistant_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      requested_by INTEGER,
      summary_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const main = async () => {
  const db = await openMemoryDb();
  try {
    await setupSchema(db);

    await recordWechatParseRun({
      status: 'completed',
      userId: 7,
      cacheHit: false,
      contentLength: 1400,
      modelUsed: true,
      provider: 'modelscope',
      model: 'ZhipuAI/GLM-5.1',
      runtimeTelemetry: {
        taskCount: 1,
        tasks: ['wechat_event_parse'],
        totalDurationMs: 120,
        avgDurationMs: 120,
        totalBudgetTokensEstimate: 4200,
        reportedTotalTokens: 3800,
        retryCount: 0,
        taskStats: [
          {
            task: 'wechat_event_parse',
            count: 1,
            durationMs: 120,
            budgetTokensEstimate: 4200,
            reportedTotalTokens: 3800,
            retryCount: 0,
          },
        ],
      },
      hasCoverImage: true,
      category: 'competition',
      rawUrl: 'https://mp.weixin.qq.com/s/secret-sample',
      rawContent: 'This must never be persisted in the summary.',
    }, db);

    await recordWechatParseRun({
      status: 'failed',
      errorCode: 'LLM_RATE_LIMIT',
      rawUrl: 'https://mp.weixin.qq.com/s/another-secret',
    }, db);

    const rows = await db.all(
      "SELECT module, action, status, requested_by, summary_json FROM ai_assistant_runs WHERE module = 'wechat_event_parser' ORDER BY id ASC"
    );

    assert(rows.length === 2, 'Expected WeChat parser runs to be recorded.');
    assert(rows[0].action === 'parse', 'Expected parse action.');
    assert(rows[0].requested_by === 7, 'Expected requester ID when available.');
    assert(rows[1].status === 'failed', 'Expected failed run status.');

    const successSummary = JSON.parse(rows[0].summary_json);
    const failureSummary = JSON.parse(rows[1].summary_json);
    assert(successSummary.modelUsed === true, 'Expected model usage to be recorded.');
    assert(successSummary.provider === 'modelscope', 'Expected provider metadata.');
    assert(successSummary.model === 'ZhipuAI/GLM-5.1', 'Expected model metadata.');
    assert(successSummary.runtimeTelemetry.taskCount === 1, 'Expected runtime telemetry summary.');
    assert(
      successSummary.runtimeTelemetry.tasks.includes('wechat_event_parse'),
      'Expected WeChat telemetry to include parse task.'
    );
    assert(successSummary.contentLength === 1400, 'Expected content length summary.');
    assert(successSummary.category === 'competition', 'Expected normalized category summary.');
    assert(failureSummary.errorCode === 'LLM_RATE_LIMIT', 'Expected failure reason summary.');

    const persistedText = rows.map((row) => row.summary_json).join('\n');
    assert(!persistedText.includes('mp.weixin.qq.com'), 'Run summaries must not store raw WeChat URLs.');
    assert(!persistedText.includes('never be persisted'), 'Run summaries must not store raw article content.');

    const keyError = buildErrorResponse(new Error('LLM_API_KEY_INVALID'));
    assert(keyError.statusCode === 401, 'Expected invalid key to map to 401.');

    const rateLimitError = buildErrorResponse(new Error('LLM_RATE_LIMIT'));
    assert(rateLimitError.statusCode === 429, 'Expected rate limit to map to 429.');

    console.log('WeChat parser agent check passed.');
  } finally {
    await db.close();
    await pool.close();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
