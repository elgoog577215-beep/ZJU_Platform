import { useSettings } from "../context/SettingsContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";

  return (
    <footer
      className={`relative z-10 border-t px-6 pt-12 pb-[calc(2rem+4rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:pb-12 ${isDayMode ? "border-slate-200/80 bg-white/65 text-slate-900" : "border-white/5 bg-black/40 text-white"}`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tighter">拓途浙享</span>
            <span className={isDayMode ? "text-slate-300" : "text-white/20"}>
              |
            </span>
            <span
              className={`text-sm tracking-[0.24em] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
            >
              TUOTUZJU
            </span>
          </div>
          <p className={`text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`}>
            © {currentYear} 浙江大学 SQTP 项目组。All rights reserved.
          </p>
        </div>

        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className={`rounded-full border px-4 py-2 text-xs font-medium tracking-wider transition-all ${isDayMode ? "border-slate-200/80 bg-white/80 text-slate-500 hover:bg-white hover:text-slate-900" : "border-white/5 bg-white/5 text-gray-500 hover:bg-white/10 hover:border-white/10 hover:text-gray-300"}`}
        >
          浙ICP备2025221213号
        </a>
      </div>
    </footer>
  );
};

export default Footer;
