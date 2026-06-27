import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

const LoadingScreen = () => {
  const { uiMode } = useSettings();
  const { t } = useTranslation();
  const isDayMode = uiMode === 'day';
  const loadingLabel = t('common.loading', '加载中...');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={loadingLabel}
      className={`flex min-h-[42vh] flex-col items-center justify-center ${
        isDayMode
          ? 'bg-[linear-gradient(180deg,rgba(248,250,252,0.66),rgba(255,255,255,0.42))]'
          : 'bg-transparent'
      }`}
    >
      <div className="motion-gpu relative h-14 w-14">
        <div className={`absolute inset-0 rounded-full border ${isDayMode ? 'border-slate-200/80 bg-white/34 shadow-[0_18px_44px_rgba(100,116,139,0.14)]' : 'border-white/10'}`} />
        <div
          className="motion-gpu absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-purple-500 animate-spin motion-reduce:animate-none"
          style={{ animationDuration: '1.1s' }}
        />
        <div
          className="motion-gpu absolute inset-3 rounded-full border-2 border-transparent border-b-cyan-400 border-l-fuchsia-500 animate-spin motion-reduce:animate-none"
          style={{ animationDuration: '1.6s', animationDirection: 'reverse' }}
        />
        <div className={`absolute inset-[42%] rounded-full ${isDayMode ? 'bg-slate-900/82' : 'bg-white/90'}`} />
      </div>
      
      <p className={`mt-4 text-xs font-semibold uppercase ${isDayMode ? 'text-slate-500' : 'text-white/55'}`}>
        {loadingLabel}
      </p>
    </div>
  );
};

export default LoadingScreen;
