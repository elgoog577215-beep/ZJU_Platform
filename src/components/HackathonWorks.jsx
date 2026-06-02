import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Github,
  RefreshCw,
  Trophy,
  Upload,
  X,
} from "lucide-react";

import api from "../services/api";
import { useSettings } from "../context/SettingsContext";
import CompetitionOutcomeUploadModal from "./CompetitionOutcomeUploadModal";
import SEO from "./SEO";

const fallbackCover = "/images/hero-landscape-day-4k.jpg";

const rankTone = {
  "01": "from-amber-300 via-cyan-200 to-white",
  "02": "from-cyan-200 via-sky-300 to-white",
  "03": "from-fuchsia-200 via-cyan-200 to-white",
};

const normalizeRank = (rank, index) => {
  const value = String(rank || index + 1).trim();
  return /^\d+$/.test(value) ? value.padStart(2, "0") : value;
};

const normalizeWork = (work, index) => ({
  ...work,
  rank: normalizeRank(work.rank, index),
  award: work.award || "优秀作品",
  honorTitle: work.honor_title || work.honorTitle || work.award || "Top 20 获奖成员",
  gitUrl: work.git_url || work.gitUrl || "",
  cover: work.cover_url || work.cover || fallbackCover,
  author: work.author || work.uploader_name || "获奖成员",
  boundIdentityName: work.bound_identity_name || work.boundIdentityName || "",
  boundIdentityType: work.bound_identity_type || work.boundIdentityType || "",
  summary: work.summary || work.description || work.gameDescription || "",
  grade: work.grade || "",
  major: work.major || "",
  highlight: work.highlight || "",
  experience: work.experience || "",
  storyFileUrl: work.story_file_url || work.storyFileUrl || "",
});

const WorkCover = ({ work, featured = false, isDayMode = false, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen?.(work)}
    className={`relative block w-full overflow-hidden bg-[#061113] text-left ${featured ? "aspect-[16/10]" : "aspect-[16/11]"}`}
    aria-label={`查看${work.title}详情`}
  >
    <img
      src={work.cover}
      alt={`${work.title} 封面`}
      className="absolute inset-0 h-full w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.035]"
      style={{ filter: isDayMode ? "brightness(0.88) saturate(1.08) contrast(1.02)" : "brightness(0.66) saturate(1.16) contrast(1.08)" }}
      loading={featured ? "eager" : "lazy"}
    />
    <div
      className={`absolute inset-0 ${
        isDayMode
          ? "bg-[linear-gradient(180deg,rgba(248,251,255,0.02),rgba(15,23,42,0.50)),radial-gradient(circle_at_18%_0%,rgba(8,145,178,0.20),transparent_34%)]"
          : "bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.76)),radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.28),transparent_34%)]"
      }`}
    />
    <span className="absolute right-4 top-2 font-mono text-[clamp(4rem,8vw,7.25rem)] font-black leading-none text-white/[0.10]">
      {work.rank}
    </span>
    <div className="absolute left-4 top-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-2 border border-cyan-200/32 bg-black/42 px-3 py-2 text-xs font-black uppercase text-cyan-100 backdrop-blur">
      <Trophy className="h-4 w-4" />
      <span className="truncate">{work.award}</span>
    </div>
    <div className="absolute bottom-4 left-4 right-4">
      <p className="line-clamp-2 max-w-[85%] text-xl font-black leading-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
        {work.title}
      </p>
      <span className="mt-3 inline-flex min-h-9 items-center border border-white/18 bg-white/12 px-3 text-xs font-black text-white opacity-0 backdrop-blur transition duration-300 group-hover:opacity-100">
        查看详情
      </span>
    </div>
  </button>
);

const WorkCard = ({ work, featured = false, isDayMode = false, onOpen }) => {
  const panelClass = isDayMode
    ? "border-cyan-200/70 bg-white/88 text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.12)]"
    : "border-cyan-300/[0.18] bg-[#061014]/88 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)]";
  const mutedClass = isDayMode ? "text-slate-600" : "text-white/64";
  const actionClass = isDayMode
    ? "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-600 hover:bg-cyan-600 hover:text-white"
    : "border-cyan-300/24 bg-cyan-300/[0.08] text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300 hover:text-slate-950";
  const rankClass = rankTone[work.rank] || "from-cyan-200 to-white";
  const honorClass = isDayMode
    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
    : "border-cyan-300/24 bg-cyan-300/[0.10] text-cyan-100";

  return (
    <article className={`group flex h-full flex-col overflow-hidden border ${panelClass} transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60`}>
      <WorkCover work={work} featured={featured} isDayMode={isDayMode} onOpen={onOpen} />
      <div className={`flex flex-1 flex-col ${featured ? "p-6 lg:p-7" : "p-5"}`}>
        <div className={`mb-4 h-1 w-full bg-gradient-to-r ${rankClass}`} />
        <h2 className={featured ? "text-3xl font-black leading-tight lg:text-4xl" : "line-clamp-2 min-h-[4rem] text-2xl font-black leading-tight"}>
          {work.title}
        </h2>
        <p className={`mt-3 text-sm font-bold ${mutedClass}`}>
          {work.author}
          {work.boundIdentityName ? ` · ${work.boundIdentityName}` : ""}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={`border px-2.5 py-1 text-xs font-black ${honorClass}`}>
            {work.honorTitle}
          </span>
          {[work.grade, work.major].filter(Boolean).map((item) => (
            <span
              key={item}
              className={`border px-2.5 py-1 text-xs font-bold ${isDayMode ? "border-slate-200 text-slate-600" : "border-white/10 text-white/58"}`}
            >
              {item}
            </span>
          ))}
        </div>
        {work.highlight ? (
          <p className={`mt-3 border-l-2 border-cyan-300 pl-3 text-sm font-semibold leading-6 ${isDayMode ? "text-slate-700" : "text-cyan-100/84"}`}>
            {work.highlight}
          </p>
        ) : null}
        {work.summary ? (
          <p className={`mt-3 line-clamp-3 text-sm leading-6 ${mutedClass}`}>{work.summary}</p>
        ) : null}
        <div className="mt-auto grid gap-2 pt-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onOpen?.(work)}
            className={`inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-black transition ${actionClass}`}
          >
            <BookOpen className="h-4 w-4" />
            查看经验
          </button>
          {work.gitUrl ? (
            <a
              href={work.gitUrl}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 border px-4 text-sm font-black transition ${actionClass}`}
            >
              <Github className="h-4 w-4" />
              项目链接
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const WorkDetailModal = ({ work, isDayMode, onClose }) => {
  useEffect(() => {
    if (!work || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [work, onClose]);

  if (!work) return null;

  const shellClass = isDayMode
    ? "border-cyan-200 bg-white text-slate-950 shadow-[0_30px_100px_rgba(15,23,42,0.24)]"
    : "border-cyan-300/18 bg-[#061014] text-white shadow-[0_30px_100px_rgba(0,0,0,0.64)]";
  const mutedClass = isDayMode ? "text-slate-600" : "text-white/64";
  const paragraphClass = isDayMode ? "text-slate-700" : "text-white/76";
  const detailStats = [
    ["名次", work.rank ? `#${work.rank}` : "未标注"],
    ["荣誉", work.honorTitle || work.award || "优秀作品"],
    ["选手", work.author || "获奖成员"],
    ["专业", [work.grade, work.major].filter(Boolean).join(" / ") || "未填写"],
  ];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[170] flex items-end justify-center bg-black/72 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${work.title} 作品详情`}
      onMouseDown={onClose}
    >
      <article
        className={`grid h-[100svh] w-full overflow-hidden border ${shellClass} sm:h-[88svh] sm:max-h-[820px] sm:max-w-6xl sm:rounded-2xl lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative min-h-[34svh] overflow-hidden bg-[#061113] sm:min-h-[420px] lg:min-h-0">
          <img
            src={work.cover}
            alt={`${work.title} 作品预览`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: isDayMode ? "brightness(0.9) saturate(1.06)" : "brightness(0.72) saturate(1.14) contrast(1.04)" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.72)),radial-gradient(circle_at_18%_0%,rgba(103,232,249,0.24),transparent_34%)]" />
          <span className="absolute right-5 top-4 font-mono text-[clamp(5rem,12vw,10rem)] font-black leading-none text-white/[0.10]">
            {work.rank}
          </span>
          <div className="absolute bottom-5 left-5 right-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="border border-cyan-300/24 bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950">
                {work.honorTitle}
              </span>
              {work.award ? <span className="border border-cyan-300/24 bg-black/36 px-3 py-1.5 text-xs font-bold text-cyan-100 backdrop-blur">{work.award}</span> : null}
            </div>
            <h2 className="max-w-3xl text-3xl font-black leading-tight text-white drop-shadow-[0_5px_24px_rgba(0,0,0,0.5)] sm:text-5xl">
              {work.title}
            </h2>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-cyan-300/16 px-5 py-4 sm:px-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Winner Story</p>
              <p className={`mt-2 text-sm font-bold ${mutedClass}`}>
                {[work.author, work.grade, work.major].filter(Boolean).join(" / ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center border transition ${
                isDayMode ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-2">
              {detailStats.map(([label, value]) => (
                <div
                  key={label}
                  className={`border px-3 py-3 ${isDayMode ? "border-slate-200 bg-slate-50/80" : "border-white/10 bg-white/[0.045]"}`}
                >
                  <p className={`text-[11px] font-black uppercase ${isDayMode ? "text-slate-500" : "text-white/42"}`}>{label}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-black leading-5">{value}</p>
                </div>
              ))}
            </div>
            {work.highlight ? (
              <blockquote className="mt-6 border-l-4 border-cyan-300 pl-4 text-lg font-black leading-8">
                {work.highlight}
              </blockquote>
            ) : null}
            <section className="mt-6 grid gap-3">
              <h3 className="text-lg font-black">作品介绍</h3>
              <p className={`whitespace-pre-line text-sm leading-7 ${paragraphClass}`}>{work.summary || "暂无作品介绍"}</p>
            </section>
            <section className="mt-6 grid gap-3">
              <h3 className="text-lg font-black">经验分享</h3>
              <p className={`whitespace-pre-line text-sm leading-7 ${paragraphClass}`}>
                {work.experience || "暂无经验分享，后续可由获奖成员补充。"}
              </p>
            </section>
          </div>
          <div className="flex flex-wrap gap-3 border-t border-cyan-300/16 px-5 py-4 sm:px-6">
            {work.gitUrl ? (
              <a href={work.gitUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-white sm:w-auto">
                <Github className="h-4 w-4" />
                项目链接
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            {work.storyFileUrl ? (
              <a href={work.storyFileUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-cyan-300/24 px-4 text-sm font-black transition hover:border-cyan-300 sm:w-auto">
                <BookOpen className="h-4 w-4" />
                原文附件
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
};

const HackathonWorks = () => {
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [works, setWorks] = useState([]);
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedWork, setSelectedWork] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchWorks = async () => {
    setLoading(true);
    try {
      const response = await api.get("/competitions/current/outcome");
      const nextWorks = Array.isArray(response.data?.works)
        ? response.data.works.map(normalizeWork)
        : [];
      setWorks(nextWorks);
      setCompetition(response.data?.competition || null);
    } catch {
      setWorks([]);
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorks();
  }, []);

  const podiumWorks = useMemo(() => works.slice(0, 3), [works]);
  const otherWorks = useMemo(() => works.slice(3), [works]);
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
        title={`${competition?.title || "比赛"}优秀作品`}
        description="集中展示管理员审核通过的优秀作品、获奖成员荣誉称号、项目链接与赛后经验分享。"
        image="/images/hero-landscape-day-4k.jpg"
      />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.055)_1px,transparent_1px)] bg-[size:72px_72px] opacity-50" />
        <div className="absolute right-[4vw] top-28 font-mono text-[18vw] font-black leading-none text-white/[0.035]">
          {String(works.length || 0).padStart(2, "0")}
        </div>
      </div>

      <main className="relative mx-auto w-full max-w-[1760px] px-4 pb-[calc(env(safe-area-inset-bottom)+9.5rem)] pt-24 sm:px-6 sm:pt-28 md:pb-32 lg:px-10 lg:pt-32 2xl:px-16">
        <div className="flex flex-col gap-6 border-b border-cyan-300/18 pb-8 sm:pb-10 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/hackathon/showcase"
                className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-black transition ${chromeClass}`}
              >
                <ArrowLeft className="h-4 w-4" />
                返回比赛成果
              </Link>
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black transition ${
                  isDayMode
                    ? "bg-cyan-600 text-white hover:bg-slate-950"
                    : "bg-cyan-300 text-slate-950 hover:bg-white"
                }`}
              >
                <Upload className="h-4 w-4" />
                提交作品/经验
              </button>
            </div>
            <p className={`mt-8 inline-flex border px-3 py-2 text-xs font-black uppercase ${chipClass}`}>
              Winner Stories / {works.length} Selected
            </p>
            <h1 className="mt-5 max-w-5xl text-[clamp(3rem,12vw,5rem)] font-black leading-none sm:text-[clamp(4.25rem,8vw,7rem)] lg:text-8xl">
              优秀作品与经验分享
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:gap-3 xl:min-w-[420px]">
            {[
              [String(works.length), "已发布作品"],
              [String(podiumWorks.length), "重点展示"],
              [competition ? "1" : "0", "当前比赛"],
            ].map(([value, label]) => (
              <div key={label} className="border border-cyan-300/16 bg-cyan-300/[0.045] px-3 py-3 sm:px-4 sm:py-4">
                <p className="font-mono text-2xl font-black text-cyan-200 sm:text-3xl">{value}</p>
                <p className={`mt-1 text-xs font-bold ${statLabelClass}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <section className="py-20 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-cyan-200" />
            <p className={`mt-4 text-sm font-bold ${statLabelClass}`}>正在加载优秀作品</p>
          </section>
        ) : works.length === 0 ? (
          <section className="py-20 text-center">
            <Trophy className="mx-auto h-12 w-12 text-cyan-200" />
            <h2 className="mt-5 text-3xl font-black">暂无已审核优秀作品</h2>
            <p className={`mx-auto mt-3 max-w-xl text-sm leading-6 ${statLabelClass}`}>
              外部用户提交后会进入管理员待审核，审核通过后才会出现在这里。
            </p>
          </section>
        ) : (
          <>
            <section className="py-8 sm:py-10 max-md:pb-[calc(env(safe-area-inset-bottom)+8rem)]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black sm:text-3xl">重点作品</h2>
                <span className="text-xs font-black uppercase text-cyan-200/72">Top 3</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 min-[900px]:grid-cols-3">
                {podiumWorks.map((work) => (
                  <WorkCard key={work.id} work={work} featured isDayMode={isDayMode} onOpen={setSelectedWork} />
                ))}
              </div>
            </section>

            <section className="border-t border-cyan-300/18 py-8 sm:py-10 max-md:pb-[calc(env(safe-area-inset-bottom)+9rem)]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black sm:text-3xl">更多作品</h2>
                <span className="text-xs font-black uppercase text-cyan-200/72">{otherWorks.length} Works</span>
              </div>
              {otherWorks.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {otherWorks.map((work) => (
                    <WorkCard key={work.id} work={work} isDayMode={isDayMode} onOpen={setSelectedWork} />
                  ))}
                </div>
              ) : (
                <p className={`text-sm font-bold ${statLabelClass}`}>暂无更多已审核作品。</p>
              )}
            </section>
          </>
        )}
      </main>

      <WorkDetailModal work={selectedWork} isDayMode={isDayMode} onClose={() => setSelectedWork(null)} />
      <CompetitionOutcomeUploadModal
        open={uploadOpen}
        initialType="work"
        onClose={() => setUploadOpen(false)}
        onSubmitted={fetchWorks}
      />
    </div>
  );
};

export default HackathonWorks;
