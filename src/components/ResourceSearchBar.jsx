import { Command, Search, Sparkles } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const ResourceSearchBar = ({
  label = "全站 AI 搜索",
  placeholder = "搜索活动、AI 社区、影像库与校园资源",
  hint = "语言解析 · 全站召回",
}) => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";

  return (
    <div className="hidden md:block">
      <button
        type="button"
        aria-label={placeholder}
        onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
        className={`group mx-auto mb-6 flex min-h-[58px] w-full max-w-5xl items-center gap-4 border px-4 text-left backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/25 ${
          isDayMode
            ? "border-slate-200/80 bg-white/86 text-slate-950 shadow-[0_18px_56px_rgba(15,23,42,0.08)] hover:border-cyan-300/70"
            : "border-white/10 bg-white/[0.045] text-white shadow-[0_22px_70px_rgba(0,0,0,0.26)] hover:border-cyan-300/36"
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center border ${
            isDayMode
              ? "border-cyan-200 bg-cyan-50 text-cyan-700"
              : "border-cyan-300/24 bg-cyan-300/10 text-cyan-200"
          }`}
        >
          <Search className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] ${isDayMode ? "text-cyan-700" : "text-cyan-200"}`}>
            <Sparkles className="h-3.5 w-3.5" />
            {label}
          </span>
          <span className={`mt-1 block truncate text-base font-black ${isDayMode ? "text-slate-900" : "text-white"}`}>
            {placeholder}
          </span>
        </span>
        <span className={`hidden items-center gap-2 text-xs font-bold lg:flex ${isDayMode ? "text-slate-400" : "text-white/42"}`}>
          {hint}
          <span className={`inline-flex items-center gap-1 border px-2 py-1 font-mono ${isDayMode ? "border-slate-200 bg-slate-50" : "border-white/10 bg-white/[0.04]"}`}>
            <Command className="h-3 w-3" />
            K
          </span>
        </span>
      </button>
    </div>
  );
};

export default ResourceSearchBar;
