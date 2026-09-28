const TOKEN_KEY = "token";

const storageAvailable = (storage) => {
    try {
        const key = "__zju_storage_probe__";
        storage.setItem(key, "1");
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
};

const getStorage = (name) => {
    try {
        return typeof window !== "undefined" ? window[name] : null;
    } catch {
        return null;
    }
};

const readToken = (storage) => {
    try {
        return storage?.getItem(TOKEN_KEY) || "";
    } catch {
        return "";
    }
};

const removeToken = (storage) => {
    try {
        storage?.removeItem(TOKEN_KEY);
    } catch {
        // Storage can be blocked independently in embedded/private browsers.
    }
};

export const getStoredAuthToken = () => {
    return readToken(getStorage("sessionStorage")) || readToken(getStorage("localStorage"));
};

export const storeAuthToken = (token, { persistent = false } = {}) => {
    const session = getStorage("sessionStorage");
    const local = getStorage("localStorage");

    if (persistent && local && storageAvailable(local)) {
        local.setItem(TOKEN_KEY, token);
        removeToken(session);
        return;
    }

    if (session && storageAvailable(session)) {
        session.setItem(TOKEN_KEY, token);
    }
    removeToken(local);
};

export const clearStoredAuthToken = () => {
    removeToken(getStorage("sessionStorage"));
    removeToken(getStorage("localStorage"));
};
