import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Film, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useSettings } from "../context/SettingsContext";
import HackathonRegistration from "./HackathonRegistration";
import HackathonShowcase from "./HackathonShowcase";

const viewFromLocation = (location) => {
  const params = new URLSearchParams(location.search);
  const requestedView = params.get("view");

  if (requestedView === "register") {
    return "register";
  }

  if (location.pathname.includes("/showcase") || requestedView === "showcase") {
    return "showcase";
  }

  return "showcase";
};

const HackathonSeasonOne = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [activeView, setActiveView] = useState(() => viewFromLocation(location));

  useEffect(() => {
    setActiveView(viewFromLocation(location));
  }, [location.pathname, location.search]);

  const views = useMemo(
    () => [
      {
        id: "register",
        label: t("hackathon.tabs.register", "赛事报名"),
        title: t("hackathon.brand", "浙客松"),
        icon: CalendarDays,
        path: "/hackathon?view=register",
      },
      {
        id: "showcase",
        label: t("hackathon.tabs.showcase", "比赛成果"),
        title: t("hackathon.tabs.showcase_short", "成果"),
        icon: Film,
        path: "/hackathon?view=showcase",
      },
    ],
    [t],
  );

  const switchView = (view) => {
    if (view.id === activeView) return;
    setActiveView(view.id);
    navigate(view.path);
  };

  const shellClass = isDayMode
    ? "border-emerald-200/80 bg-white/78 text-slate-900 shadow-[0_14px_34px_rgba(15,118,110,0.13)]"
    : "border-cyan-300/16 bg-[#061014]/72 text-white shadow-[0_0_30px_rgba(34,211,238,0.12)]";
  const titleClass = isDayMode ? "text-slate-950" : "text-white";
  const mutedClass = isDayMode ? "text-slate-500" : "text-cyan-100/68";
  const activeClass = isDayMode
    ? "border border-emerald-200/80 bg-emerald-50 text-emerald-700 shadow-[0_10px_24px_rgba(16,185,129,0.16)]"
    : "bg-cyan-300 text-slate-950 shadow-[0_0_22px_rgba(103,232,249,0.34)]";
  const idleClass = isDayMode
    ? "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
    : "text-cyan-100/76 hover:bg-white/8 hover:text-white";

  return (
    <div className="day-page-theme day-page-theme-tech relative min-h-[100svh] max-w-full overflow-x-hidden">
      <div className="pointer-events-none fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+72px)] z-[45] sm:left-5 sm:right-auto sm:top-[calc(env(safe-area-inset-top)+76px)] sm:w-[min(420px,calc(100vw-2.5rem))] min-[1720px]:left-7 min-[1720px]:top-[calc(env(safe-area-inset-top)+78px)]">
        <div
          className={`pointer-events-auto flex items-center gap-1 rounded-[8px] border px-1.5 py-1 backdrop-blur-2xl ${shellClass}`}
          role="tablist"
          aria-label={t("hackathon.tabs.aria", "浙客松页面切换")}
        >
          <div className="hidden min-w-[86px] items-center gap-2 border-r border-current/10 px-2.5 sm:flex">
            <Trophy className={`h-3.5 w-3.5 ${isDayMode ? "text-emerald-500" : "text-cyan-400"}`} />
            <div className="min-w-0">
              <p className={`truncate text-xs font-black leading-none ${titleClass}`}>
                {t("hackathon.brand", "浙客松")}
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${mutedClass}`}>ZHEKESONG</p>
            </div>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
            {views.map((view) => {
              const Icon = view.icon;
              const selected = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => switchView(view)}
                  className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[6px] px-3 text-xs font-black transition duration-200 focus:outline-none focus:ring-4 ${
                    isDayMode ? "focus:ring-emerald-300/24" : "focus:ring-cyan-300/24"
                  } ${
                    selected ? activeClass : idleClass
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{view.label}</span>
                  <span className="sm:hidden">{view.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeView === "showcase" ? <HackathonShowcase /> : <HackathonRegistration />}
    </div>
  );
};

export default HackathonSeasonOne;
