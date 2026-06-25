const TOKEN_KEY = 'token';

const storageAvailable = (storage) => {
  try {
    const key = '__zju_storage_probe__';
    storage.setItem(key, '1');
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

const getSessionStorage = () => (typeof window !== 'undefined' ? window.sessionStorage : null);
const getLocalStorage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const getStoredAuthToken = () => {
  const session = getSessionStorage();
  const local = getLocalStorage();
  return session?.getItem(TOKEN_KEY) || local?.getItem(TOKEN_KEY) || '';
};

export const storeAuthToken = (token, { persistent = false } = {}) => {
  const session = getSessionStorage();
  const local = getLocalStorage();

  if (persistent && local && storageAvailable(local)) {
    local.setItem(TOKEN_KEY, token);
    session?.removeItem(TOKEN_KEY);
    return;
  }

  if (session && storageAvailable(session)) {
    session.setItem(TOKEN_KEY, token);
  }
  local?.removeItem(TOKEN_KEY);
};

export const clearStoredAuthToken = () => {
  getSessionStorage()?.removeItem(TOKEN_KEY);
  getLocalStorage()?.removeItem(TOKEN_KEY);
};
