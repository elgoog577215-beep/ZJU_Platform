const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const WECHAT_MP_BASE_URL = 'https://mp.weixin.qq.com';
const WECHAT_MP_LOGIN_URL = `${WECHAT_MP_BASE_URL}/?lang=zh_CN`;
const WECHAT_MP_BACKEND_URL = `${WECHAT_MP_BASE_URL}/cgi-bin/`;
const WECHAT_MP_USER_AGENT = (
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/131.0.0.0 Safari/537.36'
);
const SESSION_COOKIE_NAMES = new Set([
  'master_sid',
  'slave_sid',
  'slave_user',
  'master_ticket',
  'bizuin',
  'data_bizuin',
  'data_ticket',
  'slave_bizuin',
  'rand_info',
  'login_type',
  'wxuin',
]);
const DATA_DIR = path.join(__dirname, '../../data/wechat-mp');
const CREDENTIAL_FILE = path.join(DATA_DIR, 'credentials.json');
const BROWSER_PROFILE_DIR = path.join(DATA_DIR, 'browser-profile');
const DEFAULT_LOGIN_WAIT_MS = 5 * 60 * 1000;
const DEFAULT_REQUEST_TIMEOUT_MS = 30 * 1000;
const MIN_LOGIN_WAIT_SECONDS = 30;
const MAX_LOGIN_WAIT_SECONDS = 10 * 60;
const MAX_ARTICLE_RESPONSE_BYTES = 5 * 1024 * 1024;

const STEALTH_JS = `
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en-US'] });
delete window.__playwright;
delete window.__pw_manual;
window.chrome = window.chrome || { runtime: {} };
`;

let loginTask = null;

const nowIso = () => new Date().toISOString();

const ensureDataDir = () => {
  for (const directory of [DATA_DIR, BROWSER_PROFILE_DIR]) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(directory, 0o700);
    } catch {
      // Best-effort only on non-POSIX filesystems.
    }
  }
};

const writePrivateFile = (filePath, content) => {
  ensureDataDir();
  const tmpPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmpPath, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Best-effort only on non-POSIX filesystems.
  }
};

const maskSecret = (value, visible = 4) => {
  const text = String(value || '');
  if (!text) return '';
  if (text.length <= visible * 2) return `${text.slice(0, 1)}***`;
  return `${text.slice(0, visible)}***${text.slice(-visible)}`;
};

const redactCredentials = (message, credentials = {}) => {
  let text = String(message || '');
  for (const secret of [credentials.token, credentials.cookie]) {
    if (secret) text = text.split(secret).join('[REDACTED]');
  }
  text = text.replace(/token=\d+/g, 'token=[REDACTED]');
  text = text.replace(/(Cookie|cookie):\s*[^}\n]+/g, '$1: [REDACTED]');
  return text;
};

const cookieNames = (cookieHeader = '') => (
  String(cookieHeader)
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter(Boolean)
);

const sanitizeCredentials = (credentials) => ({
  present: Boolean(credentials?.token && credentials?.cookie),
  source: credentials?.source || 'missing',
  updated_at: credentials?.updated_at || null,
  token_mask: credentials?.token ? maskSecret(credentials.token) : '',
  cookie_names: credentials?.cookie ? cookieNames(credentials.cookie) : [],
});

const readCredentials = () => {
  if (!fs.existsSync(CREDENTIAL_FILE)) {
    return { source: 'missing' };
  }
  try {
    const stat = fs.statSync(CREDENTIAL_FILE);
    if (!stat.isFile()) return { source: 'invalid' };
    if (os.platform() !== 'win32' && (stat.mode & 0o077)) {
      try {
        fs.chmodSync(CREDENTIAL_FILE, 0o600);
      } catch {
        // Keep reading; deployment filesystems may not support chmod.
      }
    }
    const parsed = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf8'));
    return {
      token: String(parsed.token || '').trim(),
      cookie: String(parsed.cookie || '').trim(),
      source: parsed.source || 'file',
      updated_at: parsed.updated_at || null,
    };
  } catch {
    return { source: 'invalid' };
  }
};

const writeCredentials = (credentials) => {
  if (!credentials?.token || !credentials?.cookie) {
    throw new Error('Cannot persist incomplete WeChat MP credentials');
  }
  const payload = {
    token: credentials.token,
    cookie: credentials.cookie,
    source: credentials.source || 'qr_login',
    updated_at: nowIso(),
  };
  writePrivateFile(CREDENTIAL_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
};

const trustedMpUrl = (url) => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'mp.weixin.qq.com' &&
      (!parsed.port || parsed.port === '443') &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
};

const normalizeHttpsUrl = (value) => {
  const text = String(value || '').trim();
  if (text.startsWith('//')) return `https:${text}`;
  try {
    const parsed = new URL(text);
    const hostname = parsed.hostname.toLowerCase();
    const canUpgrade = (
      parsed.protocol === 'http:' &&
      (!parsed.port || parsed.port === '80') &&
      !parsed.username &&
      !parsed.password &&
      (
        hostname === 'mp.weixin.qq.com' ||
        hostname.endsWith('.qpic.cn') ||
        hostname.endsWith('.qlogo.cn')
      )
    );
    if (canUpgrade) {
      parsed.protocol = 'https:';
      parsed.port = '';
      return parsed.toString();
    }
  } catch {
    return text;
  }
  return text;
};

const trustedWechatAssetUrl = (url) => {
  try {
    const parsed = new URL(normalizeHttpsUrl(url));
    const hostname = parsed.hostname.toLowerCase();
    return (
      parsed.protocol === 'https:' &&
      (!parsed.port || parsed.port === '443') &&
      !parsed.username &&
      !parsed.password &&
      (
        hostname === 'mp.weixin.qq.com' ||
        hostname.endsWith('.qpic.cn') ||
        hostname.endsWith('.qlogo.cn')
      )
    );
  } catch {
    return false;
  }
};

const buildTrustedMpApiUrl = (apiPath) => {
  const url = new URL(String(apiPath || ''), WECHAT_MP_BASE_URL).toString();
  const parsed = new URL(url);
  if (!trustedMpUrl(url) || !parsed.pathname.startsWith('/cgi-bin/')) {
    const error = new Error('微信公众平台 API 地址不受信任');
    error.code = 'WECHAT_MP_UNTRUSTED_API_URL';
    error.status = 500;
    throw error;
  }
  return url;
};

const redirectOptionsUrl = (options = {}) => {
  if (options.href) return options.href;
  const protocol = options.protocol || 'https:';
  const hostname = options.hostname || options.host || '';
  const port = options.port && String(options.port) !== '443' ? `:${options.port}` : '';
  return `${protocol}//${hostname}${port}${options.path || options.pathname || '/'}`;
};

const assertTrustedMpRedirect = (options) => {
  const redirectUrl = redirectOptionsUrl(options);
  if (!trustedMpUrl(redirectUrl)) {
    const error = new Error('微信文章重定向到了不受信任的地址');
    error.code = 'WECHAT_MP_UNTRUSTED_REDIRECT';
    error.status = 400;
    throw error;
  }
};

const extractAuthenticatedToken = (url) => {
  if (!url || !trustedMpUrl(url)) return '';
  const parsed = new URL(url);
  if (!parsed.pathname.startsWith('/cgi-bin/')) return '';
  if (['/cgi-bin/login', '/cgi-bin/bizlogin', '/cgi-bin/scanloginqrcode'].includes(parsed.pathname)) {
    return '';
  }
  const token = parsed.searchParams.get('token') || '';
  return /^\d+$/.test(token) ? token : '';
};

const authenticatedUrlFromLoginPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  const baseResp = payload.base_resp || {};
  if (![0, '0'].includes(baseResp.ret)) return '';
  const redirectUrl = String(payload.redirect_url || '').trim();
  if (!redirectUrl) return '';
  const authenticatedUrl = new URL(redirectUrl, WECHAT_MP_BASE_URL).toString();
  return extractAuthenticatedToken(authenticatedUrl) ? authenticatedUrl : '';
};

const cookiesToHeader = (cookies = []) => (
  [...cookies]
    .sort((left, right) => String(right.path || '/').length - String(left.path || '/').length)
    .map((cookie) => {
      const name = String(cookie.name || '').trim();
      if (!name) return '';
      return `${name}=${cookie.value || ''}`;
    })
    .filter(Boolean)
    .join('; ')
);

const credentialsFromBrowserState = ({ urls = [], cookies = [] }) => {
  const token = urls.map(extractAuthenticatedToken).find(Boolean) || '';
  const cookie = cookiesToHeader(cookies);
  const names = new Set(cookies.map((item) => String(item.name || '').trim()).filter(Boolean));
  const hasSessionCookie = [...names].some((name) => SESSION_COOKIE_NAMES.has(name));
  if (!token || !cookie || !hasSessionCookie) {
    return { source: 'qr_login' };
  }
  return {
    token,
    cookie,
    source: 'qr_login',
    updated_at: nowIso(),
  };
};

const buildLoginState = () => ({
  active: false,
  stage: 'idle',
  message: '',
  qr_data_url: '',
  started_at: null,
  updated_at: null,
  completed_at: null,
  error: '',
});

const publicLoginState = () => {
  if (!loginTask) return buildLoginState();
  return {
    active: Boolean(loginTask.active),
    stage: loginTask.stage,
    message: loginTask.message,
    qr_data_url: loginTask.qrDataUrl || '',
    started_at: loginTask.startedAt,
    updated_at: loginTask.updatedAt,
    completed_at: loginTask.completedAt || null,
    error: loginTask.error || '',
  };
};

const updateLoginTask = (patch) => {
  if (!loginTask) return;
  Object.assign(loginTask, patch, { updatedAt: nowIso() });
};

const finishLoginTask = (patch) => {
  updateLoginTask({
    ...patch,
    active: false,
    qrDataUrl: '',
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeLoginWaitMs = (waitSeconds) => {
  const parsed = Number(waitSeconds);
  const fallbackSeconds = DEFAULT_LOGIN_WAIT_MS / 1000;
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackSeconds;
  return Math.min(MAX_LOGIN_WAIT_SECONDS, Math.max(MIN_LOGIN_WAIT_SECONDS, seconds)) * 1000;
};

const getBrowserRuntimeStatus = () => {
  const executablePath = chromium.executablePath();
  return {
    required: true,
    dependency: 'playwright',
    executable_path: executablePath,
    chromium_installed: Boolean(executablePath && fs.existsSync(executablePath)),
  };
};

const assertBrowserRuntimeReady = () => {
  const status = getBrowserRuntimeStatus();
  if (!status.chromium_installed) {
    const error = new Error('微信 MP 扫码登录强依赖 Playwright Chromium，请先运行 `npx playwright install chromium`。');
    error.code = 'PLAYWRIGHT_CHROMIUM_MISSING';
    error.status = 503;
    error.runtime = status;
    throw error;
  }
  return status;
};

const switchToStandardQr = async (page) => {
  try {
    const qr = page.locator("img[src*='/cgi-bin/scanloginqrcode']");
    const count = await qr.count();
    for (let index = 0; index < count; index += 1) {
      if (await qr.nth(index).isVisible()) return true;
    }
    const links = page.getByText('扫码登录', { exact: true });
    const linkCount = await links.count();
    for (let index = 0; index < linkCount; index += 1) {
      const link = links.nth(index);
      if (await link.isVisible()) {
        await link.click({ timeout: 3000 });
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

const refreshExpiredQr = async (page) => {
  try {
    const links = page.getByText('点击刷新', { exact: true });
    const count = await links.count();
    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      if (await link.isVisible()) {
        await link.click({ timeout: 3000 });
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
};

const saveQrIfChanged = async (page, previousIdentity) => {
  try {
    const qrs = page.locator("img[src*='/cgi-bin/scanloginqrcode']");
    const count = await qrs.count();
    for (let index = 0; index < count; index += 1) {
      const qr = qrs.nth(index);
      if (!(await qr.isVisible())) continue;
      const identity = String(await qr.getAttribute('src') || '');
      if (!identity || identity === previousIdentity) return { identity: previousIdentity, dataUrl: '' };
      const imageBytes = await qr.screenshot();
      return {
        identity,
        dataUrl: `data:image/png;base64,${Buffer.from(imageBytes).toString('base64')}`,
      };
    }
  } catch {
    return { identity: previousIdentity, dataUrl: '' };
  }
  return { identity: previousIdentity, dataUrl: '' };
};

const runLoginTask = async ({ waitMs }) => {
  let context = null;
  let lastUrl = '';
  const capturedUrls = [];
  let qrIdentity = '';

  try {
    assertBrowserRuntimeReady();
    updateLoginTask({
      active: true,
      stage: 'opening',
      message: '正在打开微信公众平台登录页',
    });
    context = await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, {
      headless: true,
      locale: 'zh-CN',
      userAgent: WECHAT_MP_USER_AGENT,
      viewport: { width: 1280, height: 900 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    });
    loginTask.context = context;
    await context.addInitScript(STEALTH_JS);
    await context.addCookies([{ name: 'mm_lang', value: 'zh_CN', url: WECHAT_MP_BASE_URL }]);
    const page = context.pages()[0] || await context.newPage();
    await page.addInitScript(STEALTH_JS);

    page.on('response', async (response) => {
      try {
        const responseUrl = response.url();
        if (!trustedMpUrl(responseUrl)) return;
        const parsed = new URL(responseUrl);
        if (parsed.pathname !== '/cgi-bin/bizlogin') return;
        if (parsed.searchParams.get('action') !== 'login') return;
        const authenticatedUrl = authenticatedUrlFromLoginPayload(await response.json());
        if (authenticatedUrl) capturedUrls.push(authenticatedUrl);
      } catch {
        // Private login response formats may change; page URL remains fallback.
      }
    });

    await page.goto(WECHAT_MP_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    updateLoginTask({
      stage: 'waiting_for_scan',
      message: '请使用微信扫描二维码，并在手机端选择公众号后确认登录',
    });

    const deadline = Date.now() + waitMs;
    let switchedToQr = false;
    while (Date.now() < deadline) {
      if (loginTask.cancelled) {
        finishLoginTask({ stage: 'cancelled', message: '登录已取消' });
        return;
      }
      if (page.isClosed()) {
        throw new Error('登录浏览器已关闭，未获取到微信公众平台登录态');
      }

      lastUrl = page.url();
      const cookies = await context.cookies([WECHAT_MP_BACKEND_URL]);
      const credentials = credentialsFromBrowserState({
        urls: [lastUrl, ...capturedUrls.slice().reverse()],
        cookies,
      });
      if (credentials.token && credentials.cookie) {
        const saved = writeCredentials(credentials);
        finishLoginTask({
          stage: 'saved',
          message: '扫码确认成功，登录态已安全保存',
          completedAt: nowIso(),
          credentials: sanitizeCredentials(saved),
        });
        return;
      }

      if (!switchedToQr) switchedToQr = await switchToStandardQr(page);
      await refreshExpiredQr(page);
      const qr = await saveQrIfChanged(page, qrIdentity);
      if (qr.dataUrl) {
        qrIdentity = qr.identity;
        updateLoginTask({
          stage: 'qr_ready',
          message: '二维码已生成，请扫码确认',
          qrDataUrl: qr.dataUrl,
        });
      }
      await delay(1000);
    }
    throw new Error('等待微信扫码确认超时，请重新发起登录');
  } catch (error) {
    if (loginTask?.cancelled) {
      finishLoginTask({ stage: 'cancelled', message: '登录已取消', error: '' });
      return;
    }
    const safeError = redactCredentials(error.message || error);
    finishLoginTask({
      stage: 'failed',
      message: '微信公众平台登录失败',
      error: safeError,
    });
  } finally {
    if (context) {
      try {
        await context.close();
      } catch {
        // Ignore close failures.
      }
    }
    if (loginTask) loginTask.context = null;
  }
};

const startLogin = ({ waitSeconds } = {}) => {
  ensureDataDir();
  assertBrowserRuntimeReady();
  if (loginTask?.active) return publicLoginState();
  const waitMs = normalizeLoginWaitMs(waitSeconds);
  loginTask = {
    active: true,
    cancelled: false,
    stage: 'starting',
    message: '正在启动微信 MP 登录任务',
    qrDataUrl: '',
    startedAt: nowIso(),
    updatedAt: nowIso(),
    completedAt: null,
    error: '',
    context: null,
  };
  runLoginTask({ waitMs });
  return publicLoginState();
};

const cancelLogin = async () => {
  if (!loginTask) return publicLoginState();
  loginTask.cancelled = true;
  if (loginTask.context) {
    try {
      await loginTask.context.close();
    } catch {
      // Ignore close failures.
    }
  }
  finishLoginTask({ stage: 'cancelled', message: '登录已取消', error: '' });
  return publicLoginState();
};

const requireCredentials = () => {
  const credentials = readCredentials();
  if (!credentials.token || !credentials.cookie) {
    const error = new Error('需要先完成微信公众平台扫码登录');
    error.status = 401;
    error.code = 'WECHAT_MP_AUTH_REQUIRED';
    throw error;
  }
  return credentials;
};

const mpHeaders = (credentials, referer = WECHAT_MP_BASE_URL) => ({
  Cookie: credentials.cookie,
  'User-Agent': WECHAT_MP_USER_AGENT,
  Referer: referer,
  Accept: 'application/json,text/plain,*/*',
});

const raiseForMpError = (payload) => {
  const baseResp = payload?.base_resp || {};
  const ret = baseResp.ret;
  if ([undefined, null, 0, '0', ''].includes(ret)) return;
  const message = baseResp.err_msg || payload.errmsg || `ret=${ret}`;
  const error = new Error(`微信公众平台返回 ${message}`);
  error.code = 'WECHAT_MP_API_ERROR';
  error.status = [200003, '200003', -1, '-1'].includes(ret) ? 401 : 502;
  throw error;
};

const mpGetJson = async ({ path: apiPath, params, referer }) => {
  const credentials = requireCredentials();
  const url = buildTrustedMpApiUrl(apiPath);
  try {
    const response = await axios.get(url, {
      params,
      headers: mpHeaders(credentials, referer),
      timeout: DEFAULT_REQUEST_TIMEOUT_MS,
      maxRedirects: 0,
    });
    raiseForMpError(response.data);
    return response.data;
  } catch (error) {
    const wrapped = new Error(redactCredentials(error.response?.data?.errmsg || error.message, credentials));
    wrapped.code = error.code || 'WECHAT_MP_REQUEST_FAILED';
    wrapped.status = error.status || error.response?.status || 502;
    throw wrapped;
  }
};

const normalizeText = (value) => String(value || '')
  .replace(/\s+/g, '')
  .replace(/[·・|｜:：,，。.!！?？（）()[\]【】《》"'“”‘’]/g, '')
  .toLowerCase();

const chooseAccountCandidate = (query, candidates = [], allowFirst = false) => {
  const normalizedQuery = normalizeText(query);
  for (const candidate of candidates) {
    const nickname = normalizeText(candidate.nickname);
    const alias = normalizeText(candidate.alias);
    if (nickname && (nickname === normalizedQuery || nickname.includes(normalizedQuery) || normalizedQuery.includes(nickname))) {
      return candidate;
    }
    if (alias && (alias === normalizedQuery || alias.includes(normalizedQuery))) {
      return candidate;
    }
  }
  return allowFirst ? candidates[0] : null;
};

const searchAccounts = async ({ query, count = 5 }) => {
  const credentials = requireCredentials();
  const text = String(query || '').trim();
  if (!text) {
    const error = new Error('公众号名称不能为空');
    error.status = 400;
    throw error;
  }
  const payload = await mpGetJson({
    path: '/cgi-bin/searchbiz',
    params: {
      action: 'search_biz',
      token: credentials.token,
      lang: 'zh_CN',
      f: 'json',
      ajax: '1',
      random: `${Date.now() / 1000}`,
      query: text,
      begin: '0',
      count: String(Math.max(1, Math.min(Number(count) || 5, 20))),
    },
  });
  const list = Array.isArray(payload.list) ? payload.list : [];
  return {
    query: text,
    accounts: list.map((item) => ({
      fakeid: String(item.fakeid || ''),
      nickname: String(item.nickname || ''),
      alias: String(item.alias || ''),
      round_head_img: item.round_head_img || item.round_head_img_url || '',
      service_type: item.service_type || null,
      signature: item.signature || '',
    })),
  };
};

const decodeJsonValue = (value) => {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const parseMpArticlesPayload = (payload) => {
  const publishPage = decodeJsonValue(payload.publish_page) || {};
  const total = Number(publishPage.total_count) || 0;
  const publishList = Array.isArray(publishPage.publish_list) ? publishPage.publish_list : [];
  const articles = [];
  for (const publishItem of publishList) {
    const publishInfo = decodeJsonValue(publishItem.publish_info || publishItem.publish_info_str) || {};
    let messages = publishInfo.appmsgex || publishInfo.app_msg_list || [];
    if (messages && !Array.isArray(messages)) messages = [messages];
    for (const message of messages) {
      if (message && typeof message === 'object') articles.push(message);
    }
  }
  return { articles, total };
};

const formatTimestamp = (value) => {
  if (!value) return '';
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return String(value);
  const millis = timestamp > 9999999999 ? timestamp : timestamp * 1000;
  return new Date(millis).toISOString().replace('T', ' ').slice(0, 19);
};

const normalizeMpArticle = (article, { accountName, fakeid, keyword }) => {
  const rawLink = normalizeHttpsUrl(
    String(article.link || article.content_url || '').replace(/&amp;/g, '&').trim(),
  );
  const link = trustedMpUrl(rawLink) ? rawLink : '';
  const rawCover = normalizeHttpsUrl(article.cover || article.cover_url || '');
  return {
    title: String(article.title || '').trim(),
    link,
    summary: String(article.digest || article.summary || '').trim(),
    account: accountName,
    fakeid,
    keyword: keyword || '',
    create_time: article.create_time || article.update_time || '',
    time_text: formatTimestamp(article.create_time || article.update_time),
    cover: trustedWechatAssetUrl(rawCover) ? rawCover : '',
    author: article.author || '',
    content_status: 'not_fetched',
  };
};

const fetchArticles = async ({
  accountName,
  fakeid,
  keyword = '',
  count = 20,
  maxPages = 1,
  allowFirst = false,
}) => {
  const credentials = requireCredentials();
  const name = String(accountName || '').trim();
  let resolvedFakeid = String(fakeid || '').trim();
  let selectedAccount = null;
  if (!resolvedFakeid) {
    const searchResult = await searchAccounts({ query: name, count: 5 });
    selectedAccount = chooseAccountCandidate(name, searchResult.accounts, allowFirst);
    resolvedFakeid = selectedAccount?.fakeid || '';
  }
  if (!resolvedFakeid) {
    const error = new Error('未能定位公众号 fakeid，请从候选账号中选择');
    error.status = 404;
    error.code = 'WECHAT_MP_ACCOUNT_NOT_FOUND';
    throw error;
  }

  const pageSize = Math.max(1, Math.min(Number(count) || 20, 100));
  const pages = Math.max(1, Math.min(Number(maxPages) || 1, 5));
  const articles = [];
  let total = 0;
  for (let pageIndex = 0; pageIndex < pages; pageIndex += 1) {
    const payload = await mpGetJson({
      path: '/cgi-bin/appmsgpublish',
      params: {
        sub: keyword ? 'search' : 'list',
        search_field: keyword ? '7' : 'null',
        begin: String(pageIndex * pageSize),
        count: String(pageSize),
        query: keyword,
        fakeid: resolvedFakeid,
        type: '101_1',
        free_publish_type: '1',
        sub_action: 'list_ex',
        token: credentials.token,
        lang: 'zh_CN',
        f: 'json',
        ajax: '1',
      },
      referer: `${WECHAT_MP_BASE_URL}/cgi-bin/appmsg`,
    });
    const parsed = parseMpArticlesPayload(payload);
    total = parsed.total;
    articles.push(...parsed.articles.map((article) => normalizeMpArticle(article, {
      accountName: selectedAccount?.nickname || name,
      fakeid: resolvedFakeid,
      keyword,
    })));
    if (parsed.articles.length < pageSize || (total && articles.length >= total)) break;
  }

  return {
    account: selectedAccount ? {
      fakeid: selectedAccount.fakeid,
      nickname: selectedAccount.nickname,
      alias: selectedAccount.alias,
    } : { fakeid: resolvedFakeid, nickname: name, alias: '' },
    total,
    articles,
  };
};

const publicArticleHeaders = () => ({
  'User-Agent': WECHAT_MP_USER_AGENT,
  Referer: WECHAT_MP_BASE_URL,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
});

const extractMeta = ($, name) => (
  $(`meta[property="${name}"]`).attr('content') ||
  $(`meta[name="${name}"]`).attr('content') ||
  ''
);

const cleanContentText = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t\r\f\v]+/g, ' ')
  .replace(/\n\s*/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

const extractArticleBody = (html) => {
  const $ = cheerio.load(html);
  const title = extractMeta($, 'og:title') || $('#activity-name').text().trim() || $('h1').first().text().trim() || $('title').text().trim();
  const author = extractMeta($, 'og:article:author') || $('#js_name').text().trim() || $('.profile_nickname').text().trim();
  const summary = extractMeta($, 'description') || extractMeta($, 'og:description');
  let cover = normalizeHttpsUrl(extractMeta($, 'og:image') || extractMeta($, 'twitter:image'));
  if (!trustedWechatAssetUrl(cover)) cover = '';
  let contentRoot = $('#js_content');
  if (!contentRoot.length) contentRoot = $('#js_article');
  if (!contentRoot.length) contentRoot = $('.rich_media_content');
  if (!contentRoot.length) contentRoot = $('article');
  contentRoot.find('script,style,iframe').remove();
  const images = [];
  contentRoot.find('img').each((_index, element) => {
    const imageUrl = normalizeHttpsUrl($(element).attr('data-src') || $(element).attr('src') || '');
    if (!trustedWechatAssetUrl(imageUrl)) return;
    if (imageUrl.includes('emoji') || imageUrl.includes('qrcode')) return;
    if (!images.includes(imageUrl)) images.push(imageUrl);
  });
  if (!cover && images.length) cover = images[0];
  return {
    title: title || 'Untitled',
    author: author || '',
    summary: summary || '',
    coverImage: cover || '',
    contentText: cleanContentText(contentRoot.text() || $('body').text()),
    contentHtml: contentRoot.html() || '',
    images,
  };
};

const fetchArticleContent = async ({ url }) => {
  const articleUrl = String(url || '').trim();
  if (!trustedMpUrl(articleUrl)) {
    const error = new Error('仅支持 mp.weixin.qq.com 文章链接');
    error.status = 400;
    throw error;
  }
  const response = await axios.get(articleUrl, {
    headers: publicArticleHeaders(),
    timeout: DEFAULT_REQUEST_TIMEOUT_MS,
    maxRedirects: 5,
    maxContentLength: MAX_ARTICLE_RESPONSE_BYTES,
    maxBodyLength: MAX_ARTICLE_RESPONSE_BYTES,
    beforeRedirect: assertTrustedMpRedirect,
  });
  const resolvedUrl = response.request?.res?.responseUrl || articleUrl;
  if (!trustedMpUrl(resolvedUrl)) {
    const error = new Error('微信文章最终地址不受信任');
    error.code = 'WECHAT_MP_UNTRUSTED_REDIRECT';
    error.status = 400;
    throw error;
  }
  const parsed = extractArticleBody(response.data || '');
  return {
    url: resolvedUrl,
    ...parsed,
    content_available: Boolean(parsed.contentText),
    content_status: parsed.contentText ? 'fetched' : 'empty',
  };
};

const getStatus = () => ({
  credentials: sanitizeCredentials(readCredentials()),
  login: publicLoginState(),
  runtime: getBrowserRuntimeStatus(),
});

module.exports = {
  WECHAT_MP_BASE_URL,
  assertTrustedMpRedirect,
  authenticatedUrlFromLoginPayload,
  buildTrustedMpApiUrl,
  cancelLogin,
  cookieNames,
  cookiesToHeader,
  credentialsFromBrowserState,
  extractArticleBody,
  extractAuthenticatedToken,
  fetchArticleContent,
  fetchArticles,
  getBrowserRuntimeStatus,
  getStatus,
  maskSecret,
  normalizeLoginWaitMs,
  normalizeMpArticle,
  parseMpArticlesPayload,
  readCredentials,
  redactCredentials,
  sanitizeCredentials,
  searchAccounts,
  startLogin,
  trustedMpUrl,
  trustedWechatAssetUrl,
  writeCredentials,
};
