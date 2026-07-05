const WECHAT_JSSDK_URL = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js';

let jssdkLoadPromise = null;

const hasMiniProgramBridge = () =>
  typeof window !== 'undefined' &&
  Boolean(window.wx?.miniProgram?.navigateTo);

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

export const buildWechatLoginBridgeUrl = (redirectPath = '/events') =>
  `/pages/login/index?redirect=${encodeURIComponent(redirectPath || '/events')}`;

export const navigateToMiniProgramPage = async (url) => {
  await loadWechatJssdk();

  if (!hasMiniProgramBridge()) {
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
