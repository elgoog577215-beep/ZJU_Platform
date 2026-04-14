const PersonalCenterShell = ({
  children,
  isDayMode,
  maxWidthClass = "max-w-7xl",
  contentClassName = "",
  showAmbient = true,
}) => {
  return (
    <div
      className={`min-h-screen pt-[calc(env(safe-area-inset-top)+76px)] pb-[calc(env(safe-area-inset-bottom)+88px)] px-3 md:px-8 relative overflow-hidden ${isDayMode ? "bg-transparent" : "bg-[#0a0a0a]"}`}
    >
      {showAmbient && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[130px]" />
        </div>
      )}

      <div className={`${maxWidthClass} mx-auto relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default PersonalCenterShell;
