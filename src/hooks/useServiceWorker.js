import { useEffect } from "react";

/**
 * Service Worker 注册 Hook
 * 用于注册 PWA Service Worker
 */
export const useServiceWorker = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerSW = async () => {
      if (import.meta.env.DEV) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map((registration) => registration.unregister()),
        );
        if ("caches" in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.location.reload();
            }
          });
        });
      } catch (error) {
        console.error(error);
      }
    };

    registerSW();
  }, []);
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
