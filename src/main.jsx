import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./i18n"; // Import i18n configuration
import ErrorBoundary from "./components/ErrorBoundary";
import { useRegisterSW } from "virtual:pwa-register/react";
import { isMiniProgramWebView } from "./utils/miniProgramEnv";

const PWAUpdaterRuntime = () => {
    useRegisterSW();
    return null;
};

const ServiceWorkerCleanup = () => {
    React.useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .getRegistrations()
            .then((registrations) =>
                Promise.all(registrations.map((registration) => registration.unregister()))
            )
            .catch(() => {});

        if (import.meta.env.DEV && "caches" in window) {
            window.caches
                .keys()
                .then((cacheNames) =>
                    Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)))
                )
                .catch(() => {});
        }
    }, []);

    return null;
};

const PWAUpdater = () => {
    if (import.meta.env.DEV || isMiniProgramWebView()) return <ServiceWorkerCleanup />;
    return <PWAUpdaterRuntime />;
};

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ErrorBoundary>
            <React.Suspense
                fallback={
                    <div className="min-h-screen bg-black flex items-center justify-center text-white">
                        加载中...
                    </div>
                }
            >
                <>
                    <App />
                    <PWAUpdater />
                </>
            </React.Suspense>
        </ErrorBoundary>
    </React.StrictMode>
);
