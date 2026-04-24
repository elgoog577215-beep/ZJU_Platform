import { useSettings } from "../context/SettingsContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";

  return (
    <footer
      className={`relative z-10 border-t px-4 pt-9 pb-[calc(1.5rem+4.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 md:pb-12 ${
        isDayMode
          ? "border-slate-200/80 bg-white/70 text-slate-900"
          : "border-white/5 bg-black/40 text-white"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 rounded-[28px] border px-5 py-5 text-center md:flex-row md:px-6 md:text-left ${
          isDayMode
            ? "border-slate-200/70 bg-white/66"
            : "border-white/6 bg-white/[0.03]"
        }`}
      >
        <div className="flex flex-col items-center gap-2.5 md:items-start">
          <div className="flex items-center gap-2">
            <span className="text-[1.05rem] font-bold tracking-tight">
              拓途浙享
            </span>
            <span className={isDayMode ? "text-slate-300" : "text-white/20"}>
              |
            </span>
            <span
              className={`text-xs tracking-[0.24em] sm:text-sm ${
                isDayMode ? "text-slate-500" : "text-gray-400"
              }`}
            >
              TUOTUZJU
            </span>
          </div>
          <p
            className={`max-w-[22rem] text-[11px] leading-5 sm:text-xs ${
              isDayMode ? "text-slate-500" : "text-gray-500"
            }`}
          >
            © {currentYear} 浙江大学 SQTP 项目组. All rights reserved.
          </p>
        </div>

        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full border px-4 py-2.5 text-[11px] font-medium tracking-[0.18em] transition-all sm:text-xs ${
            isDayMode
              ? "border-slate-200/80 bg-white/88 text-slate-500 hover:bg-white hover:text-slate-900"
              : "border-white/5 bg-white/5 text-gray-500 hover:border-white/10 hover:bg-white/10 hover:text-gray-300"
          }`}
        >
          浙ICP备2025221213号
        </a>
      </div>
    </footer>
  );
};

export default Footer;
