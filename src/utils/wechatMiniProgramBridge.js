const WECHAT_JSSDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';

let jssdkLoadPromise = null;

const hasMiniProgramBridge = () =>
  typeof window !== 'undefined' &&
  Boolean(window.wx?.miniProgram?.navigateTo || window.wx?.miniProgram?.postMessage);

const hasMiniProgramNavigator = () =>
  typeof window !== 'undefined' &&
  Boolean(window.wx?.miniProgram?.navigateTo);

const hasMiniProgramMessenger = () =>
  typeof window !== 'undefined' &&
  Boolean(window.wx?.miniProgram?.postMessage);

const loadWechatJssdk = () => {
  if (hasMiniProgramBridge()) {
    return Promise.resolve();
  }

  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Document is unavailable'));
  }

  if (jssdkLoadPromise) {
    return jssdkLoadPromise;
  }

  jssdkLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${WECHAT_JSSDK_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = WECHAT_JSSDK_URL;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load WeChat JSSDK'));
    document.head.appendChild(script);
  });

  return jssdkLoadPromise;
};

const buildWechatLoginBridgeUrlWithParams = (params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  return `/pages/login/index?${query.toString()}`;
};

const buildBridgeUrl = (page, params) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).length > 0) {
      query.set(key, String(value));
    }
  });
  return `${page}?${query.toString()}`;
};

const normalizeWebUrl = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (typeof window === 'undefined') return text;

  try {
    return new URL(text, window.location.origin).toString();
  } catch {
    return text;
  }
};

export const buildWechatLoginBridgeUrl = (redirectPath = '/events') =>
  buildWechatLoginBridgeUrlWithParams({
    mode: 'login',
    redirect: redirectPath || '/events',
  });

export const buildWechatBindBridgeUrl = ({ redirectPath = '/events', ticket }) =>
  buildWechatLoginBridgeUrlWithParams({
    mode: 'bind',
    redirect: redirectPath || '/events',
    ticket,
  });

export const buildWechatNativeUploadBridgeUrl = ({
  sessionId,
  uploadToken,
  field = 'file',
  accept = '*/*',
  redirectPath = '/events',
  auto = true,
}) =>
  buildBridgeUrl('/pages/native-upload/index', {
    sessionId,
    uploadToken,
    field,
    accept,
    redirect: redirectPath || '/events',
    auto: auto ? '1' : '',
  });

export const buildWechatNativeShareBridgeUrl = ({
  title,
  text,
  path = '/events',
  imageUrl,
  returnPath,
}) =>
  buildBridgeUrl('/pages/native-share/index', {
    title: title ? String(title).slice(0, 80) : '',
    text: text ? String(text).slice(0, 180) : '',
    path: path || '/events',
    imageUrl: normalizeWebUrl(imageUrl),
    returnPath: returnPath || path || '/events',
  });

export const navigateToMiniProgramPage = async (url) => {
  await loadWechatJssdk();

  if (!hasMiniProgramNavigator()) {
    throw new Error('WeChat mini program bridge is unavailable');
  }

  return new Promise((resolve, reject) => {
    window.wx.miniProgram.navigateTo({
      url,
      success: resolve,
      fail: reject,
    });
  });
};

const normalizeSharePayload = (payload = {}) => {
  const normalized = {};
  ["title", "text", "url", "path", "imageUrl"].forEach((key) => {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      normalized[key] = String(value).trim();
    }
  });
  return normalized;
};

export const postMiniProgramMessage = async (message) => {
  await loadWechatJssdk();

  if (!hasMiniProgramMessenger()) {
    throw new Error('WeChat mini program message bridge is unavailable');
  }

  window.wx.miniProgram.postMessage({
    data: message,
  });
};

export const shareViaMiniProgram = async (payload) =>
  postMiniProgramMessage({
    type: 'tuotu:share',
    payload: normalizeSharePayload(payload),
  });
