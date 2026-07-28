import { useEffect } from "react";
import { isMiniProgramWebView } from "../utils/miniProgramEnv";

/**
 * Service Worker 注册 Hook
 * 用于注册 PWA Service Worker
 */
export const useServiceWorker = ({ enabled = true } = {}) => {
    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (!("serviceWorker" in navigator)) {
            return;
        }

        let registration;
        let isReloading = false;
        const hadController = Boolean(navigator.serviceWorker.controller);

        const handleControllerChange = () => {
            if (!hadController || isReloading) return;
            isReloading = true;
            window.location.reload();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                registration?.update().catch(() => {});
            }
        };

        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const registerSW = async () => {
            if (isMiniProgramWebView()) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
                return;
            }

            if (import.meta.env.DEV) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map((registration) => registration.unregister()));
                if ("caches" in window) {
                    const cacheKeys = await caches.keys();
                    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
                }
                return;
            }

            try {
                registration = await navigator.serviceWorker.register("/sw.js", {
                    scope: "/",
                    updateViaCache: "none",
                });
                await registration.update();
            } catch (error) {
                console.error(error);
            }
        };

        registerSW();

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [enabled]);
};

/**
 * 检查网络状态 Hook
 */
export const useNetworkStatus = () => {
    useEffect(() => {
        const handleOnline = () => {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready.then((registration) => {
                    if ("sync" in registration) {
                        registration.sync.register("sync-data");
                    }
                });
            }
        };

        const handleOffline = () => {};

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);
};

export default useServiceWorker;
