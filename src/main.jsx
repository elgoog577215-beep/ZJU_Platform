import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n'; // Import i18n configuration
import ErrorBoundary from './components/ErrorBoundary';
import { useRegisterSW } from 'virtual:pwa-register/react';

const PWAUpdater = () => {
  useRegisterSW({
    onRegisteredSW() {},
    onNeedRefresh() {},
    onOfflineReady() {}
  });
  return null;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <React.Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">加载中...</div>}>
        <>
          <App />
          <PWAUpdater />
        </>
      </React.Suspense>
    </ErrorBoundary>
  </React.StrictMode>,
)
