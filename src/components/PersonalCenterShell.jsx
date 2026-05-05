import React from 'react';

const PersonalCenterShell = ({ children, isDayMode, maxWidthClass = 'max-w-7xl', showAmbient = false, className = '' }) => (
  <section className={`relative min-h-screen px-4 py-6 md:px-8 md:py-12 ${isDayMode ? 'bg-slate-50/80' : ''} ${className}`}>
    {showAmbient && (
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className={`absolute -top-1/2 -left-1/4 w-[80vw] h-[80vw] rounded-full blur-3xl opacity-10 ${isDayMode ? 'bg-indigo-300' : 'bg-indigo-600'}`} />
      </div>
    )}
    <div className={`mx-auto ${maxWidthClass}`}>{children}</div>
  </section>
);

export default PersonalCenterShell;
