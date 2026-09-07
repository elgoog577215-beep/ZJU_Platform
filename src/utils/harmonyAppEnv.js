const HARMONY_APP_QUERY_KEY = "harmony_app";
const HARMONY_APP_STORAGE_KEY = "tuotu:harmony-app-webview";

const hasHarmonyAppQuery = () => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search || "").get(HARMONY_APP_QUERY_KEY) === "1";
};

const getLocalStorage = () => (typeof window !== "undefined" ? window.localStorage : null);

export const isHarmonyAppWebView = () => {
    const detected = hasHarmonyAppQuery();
    const storage = getLocalStorage();

    try {
        if (detected) {
            storage?.setItem(HARMONY_APP_STORAGE_KEY, "1");
            return true;
        }

        return storage?.getItem(HARMONY_APP_STORAGE_KEY) === "1";
    } catch {
        return detected;
    }
};
