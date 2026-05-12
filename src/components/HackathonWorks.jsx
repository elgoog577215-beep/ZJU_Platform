import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Github, Trophy } from "lucide-react";

import { hackathonWorks, podiumWorks } from "../data/hackathonWorks";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";

const rankTone = {
  "01": "from-amber-300 via-cyan-200 to-white",
  "02": "from-cyan-200 via-sky-300 to-white",
  "03": "from-fuchsia-200 via-cyan-200 to-white",
};

const WorkCover = ({ work, featured = false }) => (
  <div className={`relative overflow-hidden bg-[#061113] ${featured ? "min-h-[310px]" : "min-h-[210px]"}`}>
    <img
      src={work.cover}
      alt={`${work.title} 封面`}
      className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.035]"
      style={{ filter: "brightness(0.62) saturate(1.16) contrast(1.08)" }}
      loading={featured ? "eager" : "lazy"}
    />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.74)),radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.28),transparent_34%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.11)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-28" />
    <span className="absolute right-4 top-2 font-mono text-[96px] font-black leading-none text-white/[0.08]">
      {work.rank}
    </span>
    <div className="absolute left-5 top-5 inline-flex items-center gap-2 border border-cyan-200/32 bg-black/36 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
      <Trophy className="h-4 w-4" />
      {work.award}
    </div>
  </div>
);

const WorkCard = ({ work, featured = false, isDayMode = false }) => {
  const panelClass = isDayMode
    ? "border-cyan-200/70 bg-white/88 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    : "border-cyan-300/[0.18] bg-[#061014]/88 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)]";
  const mutedClass = isDayMode ? "text-slate-600" : "text-white/64";
  const gitLinkClass = isDayMode
    ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-600 hover:bg-cyan-600 hover:text-white"
    : "border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950";
  const rankClass = rankTone[work.rank] || "from-cyan-200 to-white";

  return (
    <article className={`group overflow-hidden border ${panelClass} transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60`}>
      <WorkCover work={work} featured={featured} />
      <div className={featured ? "p-6 lg:p-7" : "p-5"}>
        <div className={`mb-4 h-1 w-full bg-gradient-to-r ${rankClass}`} />
        <h2 className={featured ? "text-3xl font-black leading-tight lg:text-4xl" : "text-2xl font-black leading-tight"}>
          {work.title}
        </h2>
        <p className={`mt-3 text-sm font-bold ${mutedClass}`}>{work.author}</p>
        <a
          href={work.gitUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-black transition ${gitLinkClass}`}
        >
          <Github className="h-4 w-4" />
          Git 链接
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
};

const HackathonWorks = () => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const otherWorks = hackathonWorks.slice(3);
  const chromeClass = isDayMode
    ? "border-cyan-200 bg-white/72 text-cyan-800 hover:border-cyan-500 hover:bg-cyan-600 hover:text-white"
    : "border-cyan-300/20 bg-cyan-300/[0.06] text-cyan-100 hover:border-cyan-300/60 hover:bg-cyan-300 hover:text-slate-950";
  const chipClass = isDayMode
    ? "border-cyan-200 bg-white/72 text-cyan-700"
    : "border-cyan-300/24 bg-cyan-300/[0.06] text-cyan-100";
  const statLabelClass = isDayMode ? "text-slate-600" : "text-white/58";

  return (
    <div
      className={`min-h-screen overflow-hidden ${
        isDayMode ? "bg-[#f5f8fb] text-slate-950" : "bg-[#020405] text-white"
      }`}
      style={{
        fontFamily:
          '"Inter", "HarmonyOS Sans SC", "MiSans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      }}
    >
      <SEO
        title="AI 全栈极速黑客松获奖作品"
        description="集中展示 AI 全栈极速黑客松 20 个获奖作品，包含封面、标题、作者和 Git 链接。"
        image="/images/hero-landscape-day-4k.jpg"
      />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.055)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50" />
        <div className="absolute right-[-12vw] top-16 h-[42vw] w-[42vw] rounded-full bg-cyan-300/12 blur-[120px]" />
        <div className="absolute bottom-[-18vw] left-[-12vw] h-[42vw] w-[42vw] rounded-full bg-indigo-500/12 blur-[120px]" />
        <div className="absolute right-[4vw] top-28 font-mono text-[18vw] font-black leading-none text-white/[0.035]">
          20
        </div>
      </div>

      <main className="relative mx-auto w-full max-w-[1760px] px-4 pb-28 pt-28 sm:px-6 lg:px-10 lg:pt-32 2xl:px-16">
        <div className="flex flex-col gap-6 border-b border-cyan-300/18 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              to="/hackathon/showcase"
              className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-black transition ${chromeClass}`}
            >
              <ArrowLeft className="h-4 w-4" />
              返回比赛成果
            </Link>
            <p className={`mt-8 inline-flex border px-3 py-2 text-xs font-black uppercase ${chipClass}`}>
              Awarded Works / 20 Selected
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-none sm:text-7xl lg:text-8xl">
              获奖作品
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center lg:min-w-[420px]">
            {[
              ["80", "提交作品"],
              ["20", "获奖作品"],
              ["3", "冠亚季"],
            ].map(([value, label]) => (
              <div key={label} className="border border-cyan-300/16 bg-cyan-300/[0.045] px-4 py-4">
                <p className="font-mono text-3xl font-black text-cyan-200">{value}</p>
                <p className={`mt-1 text-xs font-bold ${statLabelClass}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black sm:text-3xl">冠亚季作品</h2>
            <span className="text-xs font-black uppercase text-cyan-200/72">Top 3</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {podiumWorks.map((work) => (
              <WorkCard key={work.id} work={work} featured isDayMode={isDayMode} />
            ))}
          </div>
        </section>

        <section className="border-t border-cyan-300/18 py-10">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-black sm:text-3xl">其余获奖作品</h2>
            <span className="text-xs font-black uppercase text-cyan-200/72">17 Works</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {otherWorks.map((work) => (
              <WorkCard key={work.id} work={work} isDayMode={isDayMode} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HackathonWorks;
