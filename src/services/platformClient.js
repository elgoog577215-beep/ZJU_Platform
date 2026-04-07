import api from './api';

/**
 * 与参考实现 zju-platform-api.js 一致的结构化结果，便于社区模块统一处理错误 UI。
 */
function structuredError(err) {
  const status = err.response?.status ?? 0;
  const body = err.response?.data ?? null;
  const error =
    (body && (body.error || body.message)) || err.message || `HTTP ${status || 'error'}`;
  return { ok: false, status, body, error };
}

export async function platformHealth() {
  try {
    const res = await api.get('/health');
    return { ok: true, status: res.status, body: res.data };
  } catch (err) {
    return structuredError(err);
  }
}

export async function platformAuthMe() {
  try {
    const res = await api.get('/auth/me');
    return { ok: true, status: res.status, body: res.data };
  } catch (err) {
    return structuredError(err);
  }
}
