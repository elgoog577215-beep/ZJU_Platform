const fs = require('fs');

const wechatMpAdminService = require('./wechatMpAdminService');
const { recordWechatParseRun } = require('./wechatParseAuditService');

const DEFAULT_SETTINGS = Object.freeze({
  enabled: false,
  token_health_enabled: true,
  token_health_interval_hours: 12,
  daily_run_time: '03:30',
  timezone: 'Asia/Shanghai',
  query_delay_range: [95, 125],
  page_pause_range: [10, 25],
  page_pause_seconds: 10,
  content_delay_range: [10, 20],
  count_per_page: 20,
  max_pages: 1,
  fetch_content: true,
  auto_parse: true,
});

let activeRun = null;
let schedulerTimer = null;
let schedulerLastKey = '';
let tokenHealthSchedulerTimer = null;
let tokenHealthLastCheckedAt = 0;
let tokenHealthRun = null;

const nowIso = () => new Date().toISOString();

const parseJson = (value, fallback) => {
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on', '启用', '是'].includes(text)) return true;
  if (['0', 'false', 'no', 'n', 'off', '停用', '否'].includes(text)) return false;
  return fallback;
};

const toInt = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const toNumber = (value, fallback, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const normalizeTime = (value, fallback = DEFAULT_SETTINGS.daily_run_time) => {
  const text = String(value || '').trim();
  const match = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const normalizeTimezone = (value) => {
  const timezone = String(value || DEFAULT_SETTINGS.timezone).trim() || DEFAULT_SETTINGS.timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return DEFAULT_SETTINGS.timezone;
  }
};

const normalizeDelayRange = (value, fallback) => {
  const normalized = wechatMpAdminService.normalizeDelayRangeSeconds(value, fallback);
  return normalized.length ? normalized : [];
};

const normalizeSettings = (row = {}) => {
  const pagePauseRange = normalizeDelayRange(
    parseJson(row.page_pause_range ?? row.page_pause_seconds, row.page_pause_range ?? row.page_pause_seconds),
    DEFAULT_SETTINGS.page_pause_range,
  );
  return {
    enabled: toBool(row.enabled, DEFAULT_SETTINGS.enabled),
    token_health_enabled: toBool(row.token_health_enabled, DEFAULT_SETTINGS.token_health_enabled),
    token_health_interval_hours: toInt(
      row.token_health_interval_hours,
      DEFAULT_SETTINGS.token_health_interval_hours,
      1,
      168,
    ),
    daily_run_time: normalizeTime(row.daily_run_time, DEFAULT_SETTINGS.daily_run_time),
    timezone: normalizeTimezone(row.timezone),
    query_delay_range: normalizeDelayRange(
      parseJson(row.query_delay_range, row.query_delay_range),
      DEFAULT_SETTINGS.query_delay_range,
    ),
    page_pause_range: pagePauseRange,
    page_pause_seconds: pagePauseRange[0] || DEFAULT_SETTINGS.page_pause_seconds,
    content_delay_range: normalizeDelayRange(
      parseJson(row.content_delay_range, row.content_delay_range),
      DEFAULT_SETTINGS.content_delay_range,
    ),
    count_per_page: toInt(row.count_per_page, DEFAULT_SETTINGS.count_per_page, 1, 100),
    max_pages: toInt(row.max_pages, DEFAULT_SETTINGS.max_pages, 1, 5),
    fetch_content: toBool(row.fetch_content, DEFAULT_SETTINGS.fetch_content),
    auto_parse: toBool(row.auto_parse, DEFAULT_SETTINGS.auto_parse),
    updated_at: row.updated_at || null,
  };
};

const stringifyArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const ensureWechatMpScheduledIngestSchema = async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER DEFAULT 0,
      token_health_enabled INTEGER DEFAULT 1,
      token_health_interval_hours INTEGER DEFAULT 12,
      daily_run_time TEXT DEFAULT '03:30',
      timezone TEXT DEFAULT 'Asia/Shanghai',
      query_delay_range TEXT DEFAULT '[95,125]',
      page_pause_range TEXT DEFAULT '[10,25]',
      page_pause_seconds REAL DEFAULT 10,
      content_delay_range TEXT DEFAULT '[10,20]',
      count_per_page INTEGER DEFAULT 20,
      max_pages INTEGER DEFAULT 1,
      fetch_content INTEGER DEFAULT 1,
      auto_parse INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      alias TEXT DEFAULT '',
      fakeid TEXT DEFAULT '',
      keywords TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      fetch_content INTEGER DEFAULT 1,
      count_per_page INTEGER DEFAULT 20,
      max_pages INTEGER DEFAULT 1,
      last_checked_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_name
      ON wechat_mp_ingest_accounts(name);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_enabled
      ON wechat_mp_ingest_accounts(enabled);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_accounts_fakeid
      ON wechat_mp_ingest_accounts(fakeid);

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      fakeid TEXT DEFAULT '',
      title TEXT DEFAULT '',
      link TEXT NOT NULL UNIQUE,
      summary TEXT DEFAULT '',
      author TEXT DEFAULT '',
      cover TEXT DEFAULT '',
      create_time TEXT DEFAULT '',
      time_text TEXT DEFAULT '',
      content_text TEXT DEFAULT '',
      content_html TEXT DEFAULT '',
      images_json TEXT DEFAULT '[]',
      content_status TEXT DEFAULT 'not_fetched',
      extraction_status TEXT DEFAULT 'not_started',
      extracted_event_json TEXT DEFAULT '',
      extraction_error TEXT DEFAULT '',
      extracted_at DATETIME,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      fetched_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_articles_account
      ON wechat_mp_ingest_articles(account_id);
    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_articles_first_seen
      ON wechat_mp_ingest_articles(first_seen_at DESC);

    CREATE TABLE IF NOT EXISTS wechat_mp_ingest_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      total_accounts INTEGER DEFAULT 0,
      total_articles INTEGER DEFAULT 0,
      new_articles INTEGER DEFAULT 0,
      fetched_contents INTEGER DEFAULT 0,
      extracted_articles INTEGER DEFAULT 0,
      failed_count INTEGER DEFAULT 0,
      extraction_failed_count INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      options_json TEXT DEFAULT '{}',
      created_by INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_wechat_mp_ingest_runs_started
      ON wechat_mp_ingest_runs(started_at DESC);
  `);
  const columns = await db.all('PRAGMA table_info(wechat_mp_ingest_settings)');
  const hasTokenHealthEnabled = columns.some((column) => column.name === 'token_health_enabled');
  const hasTokenHealthInterval = columns.some((column) => column.name === 'token_health_interval_hours');
  const hasPagePauseRange = columns.some((column) => column.name === 'page_pause_range');
  const hasAutoParse = columns.some((column) => column.name === 'auto_parse');
  if (!hasAutoParse) {
    await db.exec('ALTER TABLE wechat_mp_ingest_settings ADD COLUMN auto_parse INTEGER DEFAULT 1');
  }
  if (!hasTokenHealthEnabled) {
    await db.exec('ALTER TABLE wechat_mp_ingest_settings ADD COLUMN token_health_enabled INTEGER DEFAULT 1');
  }
  if (!hasTokenHealthInterval) {
    await db.exec('ALTER TABLE wechat_mp_ingest_settings ADD COLUMN token_health_interval_hours INTEGER DEFAULT 12');
  }
  if (!hasPagePauseRange) {
    await db.exec(`ALTER TABLE wechat_mp_ingest_settings ADD COLUMN page_pause_range TEXT DEFAULT '[10,25]'`);
    await db.run(`
      UPDATE wechat_mp_ingest_settings
      SET page_pause_range = CASE
            WHEN page_pause_seconds IS NOT NULL
             AND page_pause_seconds > 0
             AND page_pause_seconds != 3
            THEN '[' || page_pause_seconds || ',' || page_pause_seconds || ']'
            ELSE '[10,25]'
          END,
          page_pause_seconds = CASE
            WHEN page_pause_seconds IS NOT NULL
             AND page_pause_seconds > 0
             AND page_pause_seconds != 3
            THEN page_pause_seconds
            ELSE 10
          END
    `);
  }
  await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET query_delay_range = '[95,125]'
    WHERE query_delay_range IS NULL
       OR query_delay_range = ''
       OR replace(query_delay_range, ' ', '') = '[55,120]'
  `);
  await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET page_pause_range = '[10,25]',
        page_pause_seconds = 10
    WHERE page_pause_range IS NULL
       OR page_pause_range = ''
       OR replace(page_pause_range, ' ', '') IN ('[3,3]', '[3]', '3')
  `);
  const articleColumns = await db.all('PRAGMA table_info(wechat_mp_ingest_articles)');
  const articleColumnNames = new Set(articleColumns.map((column) => column.name));
  if (!articleColumnNames.has('extraction_status')) {
    await db.exec("ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extraction_status TEXT DEFAULT 'not_started'");
  }
  if (!articleColumnNames.has('extracted_event_json')) {
    await db.exec("ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extracted_event_json TEXT DEFAULT ''");
  }
  if (!articleColumnNames.has('extraction_error')) {
    await db.exec("ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extraction_error TEXT DEFAULT ''");
  }
  if (!articleColumnNames.has('extracted_at')) {
    await db.exec('ALTER TABLE wechat_mp_ingest_articles ADD COLUMN extracted_at DATETIME');
  }
  const runColumns = await db.all('PRAGMA table_info(wechat_mp_ingest_runs)');
  const runColumnNames = new Set(runColumns.map((column) => column.name));
  if (!runColumnNames.has('extracted_articles')) {
    await db.exec('ALTER TABLE wechat_mp_ingest_runs ADD COLUMN extracted_articles INTEGER DEFAULT 0');
  }
  if (!runColumnNames.has('extraction_failed_count')) {
    await db.exec('ALTER TABLE wechat_mp_ingest_runs ADD COLUMN extraction_failed_count INTEGER DEFAULT 0');
  }
  await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET content_delay_range = '[10,20]'
    WHERE content_delay_range IS NULL
       OR content_delay_range = ''
       OR replace(content_delay_range, ' ', '') = '[3,8]'
  `);
  await db.run(`
    INSERT OR IGNORE INTO wechat_mp_ingest_settings (
      id, enabled, token_health_enabled, token_health_interval_hours, daily_run_time, timezone, query_delay_range,
      page_pause_range, page_pause_seconds, content_delay_range, count_per_page, max_pages, fetch_content, auto_parse
    ) VALUES (1, 0, 1, 12, '03:30', 'Asia/Shanghai', '[95,125]', '[10,25]', 10, '[10,20]', 20, 1, 1, 1)
  `);
};

const getIngestSettings = async (db) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const row = await db.get('SELECT * FROM wechat_mp_ingest_settings WHERE id = 1');
  return normalizeSettings(row || {});
};

const updateIngestSettings = async (db, payload = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const current = await getIngestSettings(db);
  const next = normalizeSettings({ ...current, ...payload });
  await db.run(`
    UPDATE wechat_mp_ingest_settings
    SET enabled = ?,
        token_health_enabled = ?,
        token_health_interval_hours = ?,
        daily_run_time = ?,
        timezone = ?,
        query_delay_range = ?,
        page_pause_range = ?,
        page_pause_seconds = ?,
        content_delay_range = ?,
        count_per_page = ?,
        max_pages = ?,
        fetch_content = ?,
        auto_parse = ?,
        updated_at = datetime('now')
    WHERE id = 1
  `, [
    next.enabled ? 1 : 0,
    next.token_health_enabled ? 1 : 0,
    next.token_health_interval_hours,
    next.daily_run_time,
    next.timezone,
    stringifyArray(next.query_delay_range),
    stringifyArray(next.page_pause_range),
    next.page_pause_seconds,
    stringifyArray(next.content_delay_range),
    next.count_per_page,
    next.max_pages,
    next.fetch_content ? 1 : 0,
    next.auto_parse ? 1 : 0,
  ]);
  return getIngestSettings(db);
};

const normalizeKeywords = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  const parsed = parseJson(value, null);
  if (Array.isArray(parsed)) return parsed.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '')
    .split(/[，,;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeAccount = (row) => ({
  id: row.id,
  name: row.name || '',
  alias: row.alias || '',
  fakeid: row.fakeid || '',
  keywords: normalizeKeywords(row.keywords),
  enabled: Boolean(row.enabled),
  fetch_content: Boolean(row.fetch_content),
  count_per_page: row.count_per_page || DEFAULT_SETTINGS.count_per_page,
  max_pages: row.max_pages || DEFAULT_SETTINGS.max_pages,
  last_checked_at: row.last_checked_at || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const normalizeAccountPayload = (payload = {}) => ({
  name: String(payload.name || payload.account_name || payload.nickname || '').trim(),
  alias: String(payload.alias || '').trim(),
  fakeid: String(payload.fakeid || '').trim(),
  keywords: normalizeKeywords(payload.keywords || payload.keyword || ''),
  enabled: toBool(payload.enabled, true),
  fetch_content: toBool(payload.fetch_content ?? payload.fetchContent, true),
  count_per_page: toInt(payload.count_per_page ?? payload.countPerPage ?? payload.count, DEFAULT_SETTINGS.count_per_page, 1, 100),
  max_pages: toInt(payload.max_pages ?? payload.maxPages, DEFAULT_SETTINGS.max_pages, 1, 5),
});

const listIngestAccounts = async (db, { includeDisabled = true } = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const rows = await db.all(`
    SELECT *
    FROM wechat_mp_ingest_accounts
    ${includeDisabled ? '' : 'WHERE enabled = 1'}
    ORDER BY enabled DESC, updated_at DESC, id DESC
  `);
  return rows.map(serializeAccount);
};

const upsertIngestAccount = async (db, payload = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const account = normalizeAccountPayload(payload);
  if (!account.name && !account.fakeid) {
    const error = new Error('公众号名称或 fakeid 不能为空');
    error.status = 400;
    throw error;
  }
  if (!account.name) account.name = account.fakeid;
  const id = Number.parseInt(payload.id, 10);
  if (Number.isFinite(id) && id > 0) {
    await db.run(`
      UPDATE wechat_mp_ingest_accounts
      SET name = ?, alias = ?, fakeid = ?, keywords = ?, enabled = ?,
          fetch_content = ?, count_per_page = ?, max_pages = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      account.name,
      account.alias,
      account.fakeid,
      stringifyArray(account.keywords),
      account.enabled ? 1 : 0,
      account.fetch_content ? 1 : 0,
      account.count_per_page,
      account.max_pages,
      id,
    ]);
    const row = await db.get('SELECT * FROM wechat_mp_ingest_accounts WHERE id = ?', [id]);
    return serializeAccount(row);
  }

  const existing = await db.get(`
    SELECT *
    FROM wechat_mp_ingest_accounts
    WHERE name = ? OR (fakeid != '' AND fakeid = ?)
    ORDER BY CASE WHEN fakeid != '' AND fakeid = ? THEN 0 ELSE 1 END
    LIMIT 1
  `, [account.name, account.fakeid, account.fakeid]);
  if (existing) {
    return upsertIngestAccount(db, { ...account, id: existing.id });
  }

  const result = await db.run(`
    INSERT INTO wechat_mp_ingest_accounts (
      name, alias, fakeid, keywords, enabled, fetch_content,
      count_per_page, max_pages, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    account.name,
    account.alias,
    account.fakeid,
    stringifyArray(account.keywords),
    account.enabled ? 1 : 0,
    account.fetch_content ? 1 : 0,
    account.count_per_page,
    account.max_pages,
  ]);
  const row = await db.get('SELECT * FROM wechat_mp_ingest_accounts WHERE id = ?', [result.lastID]);
  return serializeAccount(row);
};

const deleteIngestAccount = async (db, id) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const parsedId = Number.parseInt(id, 10);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    const error = new Error('公众号 ID 无效');
    error.status = 400;
    throw error;
  }
  await db.run('DELETE FROM wechat_mp_ingest_accounts WHERE id = ?', [parsedId]);
  return { deleted: true, id: parsedId };
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((char === ',' || char === '\t') && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
};

const parseAccountListContent = (content, fileName = '') => {
  const text = String(content || '').replace(/^\uFEFF/, '').trim();
  if (!text) return [];
  if (fileName.toLowerCase().endsWith('.json') || text.startsWith('[') || text.startsWith('{')) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : parsed.accounts;
    if (!Array.isArray(rows)) return [];
    return rows.map(normalizeAccountPayload).filter((item) => item.name || item.fakeid);
  }

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const firstCells = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const hasHeader = firstCells.some((cell) => ['name', 'account_name', '公众号', '公众号名称', 'fakeid', 'alias', 'keywords'].includes(cell));
  const header = hasHeader ? firstCells : [];
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cells = parseCsvLine(line);
    if (hasHeader) {
      const row = {};
      header.forEach((key, index) => {
        row[key] = cells[index] || '';
      });
      return normalizeAccountPayload({
        name: row.name || row.account_name || row['公众号'] || row['公众号名称'],
        fakeid: row.fakeid,
        alias: row.alias || row['别名'],
        keywords: row.keywords || row.keyword || row['关键词'],
        enabled: row.enabled || row['启用'],
      });
    }
    return normalizeAccountPayload({
      name: cells[0],
      fakeid: cells[1],
      alias: cells[2],
      keywords: cells[3],
    });
  }).filter((item) => item.name || item.fakeid);
};

const importIngestAccountsFromText = async (db, { content, fileName = '' } = {}) => {
  const accounts = parseAccountListContent(content, fileName);
  const imported = [];
  for (const account of accounts) {
    imported.push(await upsertIngestAccount(db, account));
  }
  return {
    imported_count: imported.length,
    accounts: imported,
  };
};

const importIngestAccountsFromFile = async (db, file) => {
  if (!file?.path) {
    const error = new Error('请上传公众号列表文件');
    error.status = 400;
    throw error;
  }
  const content = await fs.promises.readFile(file.path, 'utf8');
  return importIngestAccountsFromText(db, { content, fileName: file.originalname || file.filename || '' });
};

const createRun = async (db, { triggerType, userId, settings }) => {
  const result = await db.run(`
    INSERT INTO wechat_mp_ingest_runs (
      trigger_type, status, started_at, options_json, created_by
    ) VALUES (?, 'running', datetime('now'), ?, ?)
  `, [triggerType, JSON.stringify(settings), userId || null]);
  return result.lastID;
};

const getRun = async (db, id) => db.get('SELECT * FROM wechat_mp_ingest_runs WHERE id = ?', [id]);

const listIngestRuns = async (db, { limit = 20 } = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  return db.all(`
    SELECT *
    FROM wechat_mp_ingest_runs
    ORDER BY started_at DESC, id DESC
    LIMIT ?
  `, [Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)]);
};

const serializeIngestArticle = (row) => ({
  ...row,
  images: parseJson(row.images_json, []),
  extracted_event: parseJson(row.extracted_event_json, null),
});

const listIngestArticles = async (db, { limit = 50 } = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const rows = await db.all(`
    SELECT a.*, acc.name AS account_name
    FROM wechat_mp_ingest_articles a
    LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
    ORDER BY a.first_seen_at DESC, a.id DESC
    LIMIT ?
  `, [Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200)]);
  return rows.map(serializeIngestArticle);
};

const upsertArticle = async (db, { account, article, content }) => {
  const link = String(article.link || '').trim();
  if (!link) return { inserted: false, skipped: true };
  const existing = await db.get('SELECT * FROM wechat_mp_ingest_articles WHERE link = ?', [link]);
  const contentStatus = content?.content_status || article.content_status || 'not_fetched';
  const imagesJson = stringifyArray(content?.images || []);
  const contentText = String(content?.contentText || content?.content_text || '').trim();
  if (existing) {
    if (contentText && !existing.content_text) {
      await db.run(`
        UPDATE wechat_mp_ingest_articles
        SET content_text = ?, content_html = ?, images_json = ?, content_status = ?,
            fetched_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `, [contentText, content?.contentHtml || '', imagesJson, contentStatus, existing.id]);
    }
    return { inserted: false, skipped: false, id: existing.id };
  }

  const result = await db.run(`
    INSERT INTO wechat_mp_ingest_articles (
      account_id, fakeid, title, link, summary, author, cover, create_time,
      time_text, content_text, content_html, images_json, content_status,
      first_seen_at, fetched_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, datetime('now'))
  `, [
    account.id,
    account.fakeid || article.fakeid || '',
    article.title || '',
    link,
    article.summary || '',
    article.author || content?.author || '',
    article.cover || content?.coverImage || '',
    article.create_time || '',
    article.time_text || '',
    contentText,
    content?.contentHtml || '',
    imagesJson,
    contentStatus,
    contentText ? new Date().toISOString() : null,
  ]);
  return { inserted: true, skipped: false, id: result.lastID };
};

const updateArticleExtraction = async (db, articleId, {
  status,
  parsed = null,
  error = '',
} = {}) => {
  await db.run(`
    UPDATE wechat_mp_ingest_articles
    SET extraction_status = ?,
        extracted_event_json = ?,
        extraction_error = ?,
        extracted_at = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `, [
    status,
    parsed ? JSON.stringify(parsed) : '',
    String(error || '').slice(0, 2000),
    status === 'completed' ? new Date().toISOString() : null,
    articleId,
  ]);
};

const extractArticleRecord = async (db, article, {
  parser = null,
  audit = recordWechatParseRun,
  userId = null,
} = {}) => {
  const content = String(article?.content_text || '').trim();
  if (!content) {
    return { status: 'not_started', parsed: null, skipped: true };
  }

  await updateArticleExtraction(db, article.id, { status: 'processing' });
  try {
    const parseArticle = parser || require('../utils/wechat').parseWithLLM;
    const parsed = await parseArticle({
      title: article.title || 'Untitled',
      author: article.author || article.account_name || 'Unknown',
      content,
      coverImage: article.cover || '',
    }, { db });
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('公众号文章信息提取返回为空');
    }

    await updateArticleExtraction(db, article.id, { status: 'completed', parsed });
    await audit({
      status: 'completed',
      userId,
      contentLength: content.length,
      modelUsed: true,
      provider: parsed.aiMeta?.provider,
      model: parsed.aiMeta?.model,
      runtimeTelemetry: parsed.aiMeta?.runtimeTelemetry,
      hasCoverImage: Boolean(article.cover),
      category: parsed.category,
      isCollegeNotice: parsed.is_college_notice,
      noticeType: parsed.notice_type,
      sourceCollege: parsed.source_college,
    }, db);
    return { status: 'completed', parsed, skipped: false };
  } catch (error) {
    const errorMessage = error?.message || String(error);
    await updateArticleExtraction(db, article.id, {
      status: 'failed',
      error: errorMessage,
    });
    await audit({
      status: 'failed',
      userId,
      contentLength: content.length,
      modelUsed: false,
      errorCode: error?.code || errorMessage,
    }, db);
    return { status: 'failed', parsed: null, skipped: false, error: errorMessage };
  }
};

const extractIngestArticle = async (db, articleId, options = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const parsedId = Number.parseInt(articleId, 10);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    const error = new Error('公众号增量文章 ID 无效');
    error.status = 400;
    throw error;
  }
  const article = await db.get(`
    SELECT a.*, acc.name AS account_name
    FROM wechat_mp_ingest_articles a
    LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
    WHERE a.id = ?
  `, [parsedId]);
  if (!article) {
    const error = new Error('公众号增量文章不存在');
    error.status = 404;
    throw error;
  }
  const result = await extractArticleRecord(db, article, options);
  return {
    ...result,
    article: serializeIngestArticle(await db.get('SELECT * FROM wechat_mp_ingest_articles WHERE id = ?', [parsedId])),
  };
};

const executeIngestRun = async (db, {
  runId,
  triggerType = 'manual',
  userId = null,
  settings,
  runtime,
  wechatApi = wechatMpAdminService,
  parser = null,
  audit = recordWechatParseRun,
} = {}) => {
  await ensureWechatMpScheduledIngestSchema(db);
  const effectiveSettings = settings || await getIngestSettings(db);
  const accounts = await listIngestAccounts(db, { includeDisabled: false });
  let totalArticles = 0;
  let newArticles = 0;
  let fetchedContents = 0;
  let extractedArticles = 0;
  let failedCount = 0;
  let extractionFailedCount = 0;
  const createdRunId = runId || await createRun(db, { triggerType, userId, settings: effectiveSettings });

  try {
    for (let index = 0; index < accounts.length; index += 1) {
      const account = accounts[index];
      if (index > 0) {
        await wechatMpAdminService.waitDelayRange(effectiveSettings.query_delay_range, runtime);
      }
      const listResult = await wechatApi.fetchArticles({
        accountName: account.name,
        fakeid: account.fakeid,
        keyword: account.keywords[0] || '',
        count: account.count_per_page || effectiveSettings.count_per_page,
        maxPages: account.max_pages || effectiveSettings.max_pages,
        allowFirst: false,
        pacing: {
          page_pause_seconds: effectiveSettings.page_pause_seconds,
          page_pause_range: effectiveSettings.page_pause_range,
          query_delay_range: effectiveSettings.query_delay_range,
          content_delay_range: effectiveSettings.content_delay_range,
        },
        runtime,
      });
      const articles = listResult.articles || [];
      totalArticles += articles.length;
      for (let articleIndex = 0; articleIndex < articles.length; articleIndex += 1) {
        const article = articles[articleIndex];
        const existing = article.link ? await db.get('SELECT id, content_text FROM wechat_mp_ingest_articles WHERE link = ?', [article.link]) : null;
        let content = null;
        const shouldFetchContent = (account.fetch_content && effectiveSettings.fetch_content && (!existing || !existing.content_text));
        if (shouldFetchContent && article.link) {
          if (articleIndex > 0) await wechatMpAdminService.waitDelayRange(effectiveSettings.content_delay_range, runtime);
          try {
            content = await wechatApi.fetchArticleContent({ url: article.link });
            if (content?.contentText) fetchedContents += 1;
          } catch (error) {
            failedCount += 1;
            content = { content_status: error.message || 'fetch_failed' };
          }
        }
        const saved = await upsertArticle(db, { account, article, content });
        if (saved.inserted) newArticles += 1;
        if (effectiveSettings.auto_parse && saved.id) {
          const storedArticle = await db.get(`
            SELECT a.*, acc.name AS account_name
            FROM wechat_mp_ingest_articles a
            LEFT JOIN wechat_mp_ingest_accounts acc ON acc.id = a.account_id
            WHERE a.id = ?
          `, [saved.id]);
          if (storedArticle?.content_text && storedArticle.extraction_status !== 'completed') {
            const extraction = await extractArticleRecord(db, storedArticle, {
              parser,
              audit,
              userId,
            });
            if (extraction.status === 'completed') extractedArticles += 1;
            if (extraction.status === 'failed') extractionFailedCount += 1;
          }
        }
      }
      await db.run(
        'UPDATE wechat_mp_ingest_accounts SET last_checked_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
        [account.id],
      );
    }

    await db.run(`
      UPDATE wechat_mp_ingest_runs
      SET status = 'completed',
          finished_at = datetime('now'),
          total_accounts = ?,
          total_articles = ?,
          new_articles = ?,
          fetched_contents = ?,
          extracted_articles = ?,
          failed_count = ?,
          extraction_failed_count = ?
      WHERE id = ?
    `, [
      accounts.length,
      totalArticles,
      newArticles,
      fetchedContents,
      extractedArticles,
      failedCount,
      extractionFailedCount,
      createdRunId,
    ]);
  } catch (error) {
    await db.run(`
      UPDATE wechat_mp_ingest_runs
      SET status = 'failed',
          finished_at = datetime('now'),
          total_accounts = ?,
          total_articles = ?,
          new_articles = ?,
          fetched_contents = ?,
          extracted_articles = ?,
          failed_count = ?,
          extraction_failed_count = ?,
          error = ?
      WHERE id = ?
    `, [
      accounts.length,
      totalArticles,
      newArticles,
      fetchedContents,
      extractedArticles,
      failedCount + 1,
      extractionFailedCount,
      error.message || String(error),
      createdRunId,
    ]);
  }

  return getRun(db, createdRunId);
};

const runWechatMpIngestNow = async (db, options = {}) => {
  if (activeRun) {
    const error = new Error('微信 MP 增量采集任务正在运行');
    error.status = 409;
    throw error;
  }
  activeRun = executeIngestRun(db, options).finally(() => {
    activeRun = null;
  });
  return activeRun;
};

const startWechatMpIngestRun = async (db, options = {}) => {
  if (activeRun) {
    const error = new Error('微信 MP 增量采集任务正在运行');
    error.status = 409;
    throw error;
  }
  await ensureWechatMpScheduledIngestSchema(db);
  const settings = options.settings || await getIngestSettings(db);
  const runId = await createRun(db, {
    triggerType: options.triggerType || 'manual',
    userId: options.userId,
    settings,
  });
  activeRun = executeIngestRun(db, { ...options, runId, settings }).finally(() => {
    activeRun = null;
  });
  activeRun.catch((error) => {
    console.error('[WeChat MP Ingest] background run failed:', error);
  });
  return getRun(db, runId);
};

const getZonedDateTimeKey = (date = new Date(), timezone = DEFAULT_SETTINGS.timezone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalizeTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeKey: `${parts.hour}:${parts.minute}`,
  };
};

const startWechatMpIngestScheduler = ({ getDb, intervalMs = 60 * 1000 } = {}) => {
  if (!getDb || schedulerTimer || process.env.WECHAT_MP_INGEST_SCHEDULER_DISABLED === '1') {
    return;
  }
  schedulerTimer = setInterval(async () => {
    try {
      const db = await getDb();
      const settings = await getIngestSettings(db);
      if (!settings.enabled) return;
      const zoned = getZonedDateTimeKey(new Date(), settings.timezone);
      const tickKey = `${zoned.dateKey}:${settings.daily_run_time}`;
      if (zoned.timeKey !== settings.daily_run_time || schedulerLastKey === tickKey) return;
      schedulerLastKey = tickKey;
      await startWechatMpIngestRun(db, {
        triggerType: 'scheduled',
        settings,
      });
    } catch (error) {
      console.error('[WeChat MP Ingest] scheduler tick failed:', error.message || error);
    }
  }, intervalMs);
  if (schedulerTimer.unref) schedulerTimer.unref();
};

const stopWechatMpIngestScheduler = () => {
  if (schedulerTimer) clearInterval(schedulerTimer);
  schedulerTimer = null;
};

const runWechatMpTokenHealthCheck = async ({ getDb } = {}) => {
  if (!getDb) return null;
  if (tokenHealthRun) return tokenHealthRun;
  tokenHealthRun = (async () => {
    const db = await getDb();
    const settings = await getIngestSettings(db);
    if (!settings.token_health_enabled) return null;
    tokenHealthLastCheckedAt = Date.now();
    return wechatMpAdminService.checkTokenHealth({ force: true });
  })().finally(() => {
    tokenHealthRun = null;
  });
  return tokenHealthRun;
};

const startWechatMpTokenHealthScheduler = ({ getDb, intervalMs = 60 * 1000 } = {}) => {
  if (!getDb || tokenHealthSchedulerTimer || process.env.WECHAT_MP_TOKEN_HEALTH_SCHEDULER_DISABLED === '1') {
    return;
  }
  const tick = async () => {
    try {
      const db = await getDb();
      const settings = await getIngestSettings(db);
      if (!settings.token_health_enabled) return;
      const interval = settings.token_health_interval_hours * 60 * 60 * 1000;
      if (!tokenHealthLastCheckedAt || Date.now() - tokenHealthLastCheckedAt >= interval) {
        await runWechatMpTokenHealthCheck({ getDb });
      }
    } catch (error) {
      console.error('[WeChat MP Token Health] scheduler tick failed:', error.message || error);
    }
  };
  void tick();
  tokenHealthSchedulerTimer = setInterval(tick, intervalMs);
  if (tokenHealthSchedulerTimer.unref) tokenHealthSchedulerTimer.unref();
};

const stopWechatMpTokenHealthScheduler = () => {
  if (tokenHealthSchedulerTimer) clearInterval(tokenHealthSchedulerTimer);
  tokenHealthSchedulerTimer = null;
  tokenHealthLastCheckedAt = 0;
  tokenHealthRun = null;
};

module.exports = {
  DEFAULT_SETTINGS,
  deleteIngestAccount,
  ensureWechatMpScheduledIngestSchema,
  executeIngestRun,
  extractArticleRecord,
  extractIngestArticle,
  getIngestSettings,
  getZonedDateTimeKey,
  importIngestAccountsFromFile,
  importIngestAccountsFromText,
  listIngestAccounts,
  listIngestArticles,
  listIngestRuns,
  normalizeAccountPayload,
  normalizeSettings,
  parseAccountListContent,
  runWechatMpIngestNow,
  startWechatMpIngestRun,
  startWechatMpIngestScheduler,
  startWechatMpTokenHealthScheduler,
  stopWechatMpTokenHealthScheduler,
  stopWechatMpIngestScheduler,
  serializeIngestArticle,
  updateIngestSettings,
  upsertIngestAccount,
  runWechatMpTokenHealthCheck,
};
