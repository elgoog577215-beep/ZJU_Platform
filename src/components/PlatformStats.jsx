import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  Film,
  Handshake,
  Music2,
  Network,
  Orbit,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useCachedResource } from "../hooks/useCachedResource";
import api from "../services/api";
import {
  listContainer,
  listItem,
  motionTokens,
  sectionReveal,
  tapPress,
  useReducedMotion,
} from "../utils/animations";

const parseUnits = (raw) =>
  String(raw || "")
    .split(/[,，、/]/)
    .map((item) => item.trim())
    .filter(Boolean);

const LinkButton = ({ children, onClick, isDayMode, variant = "primary" }) => {
  const isPrimary = variant === "primary";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`motion-press inline-flex min-h-11 items-center justify-center gap-2 border px-5 text-sm font-black transition focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/30 ${
        isPrimary
          ? isDayMode
            ? "border-cyan-500 bg-cyan-500 text-white shadow-[0_18px_42px_rgba(6,182,212,0.28)] hover:bg-cyan-600"
            : "border-cyan-300 bg-cyan-300 text-slate-950 shadow-[0_0_42px_rgba(103,232,249,0.28)] hover:bg-white"
          : isDayMode
            ? "border-slate-300 bg-white/72 text-slate-800 hover:border-cyan-400 hover:text-cyan-700"
            : "border-white/16 bg-white/[0.045] text-white hover:border-cyan-300/70 hover:bg-cyan-300/10"
      }`}
    >
      {children}
    </button>
  );
};

const EcosystemRadar = memo(({ isDayMode, shouldAnimate }) => {
  const ringClass = isDayMode ? "border-cyan-500/24" : "border-cyan-300/22";
  const nodeClass = isDayMode
    ? "border-cyan-500/28 bg-white/92 text-slate-950 shadow-[0_16px_48px_rgba(6,182,212,0.16)]"
    : "border-cyan-300/24 bg-[#061013]/88 text-white shadow-[0_0_48px_rgba(103,232,249,0.12)]";

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] overflow-hidden">
      <motion.div
        animate={shouldAnimate ? { rotate: 360 } : undefined}
        transition={
          shouldAnimate
            ? { duration: 32, ease: "linear", repeat: Infinity }
            : undefined
        }
        className={`absolute inset-[9%] rounded-full border ${ringClass}`}
      />
      <motion.div
        animate={shouldAnimate ? { rotate: -360 } : undefined}
        transition={
          shouldAnimate
            ? { duration: 46, ease: "linear", repeat: Infinity }
            : undefined
        }
        className={`absolute inset-[21%] rounded-full border ${ringClass}`}
      />
      <div
        className={`absolute left-[7%] right-[7%] top-1/2 h-px ${
          isDayMode
            ? "bg-gradient-to-r from-transparent via-cyan-500/44 to-transparent"
            : "bg-gradient-to-r from-transparent via-cyan-300/42 to-transparent"
        }`}
      />
      <div
        className={`absolute bottom-[7%] left-1/2 top-[7%] w-px ${
          isDayMode
            ? "bg-gradient-to-b from-transparent via-cyan-500/34 to-transparent"
            : "bg-gradient-to-b from-transparent via-cyan-300/34 to-transparent"
        }`}
      />
      <div
        className={`absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] ${
          isDayMode ? "bg-cyan-200/34" : "bg-cyan-300/12"
        }`}
      />

      <motion.div
        animate={
          shouldAnimate
            ? { scale: [1, 1.035, 1], opacity: [0.92, 1, 0.92] }
            : undefined
        }
        transition={
          shouldAnimate
            ? { duration: 4.6, ease: "easeInOut", repeat: Infinity }
            : undefined
        }
        className={`absolute left-1/2 top-1/2 flex h-[38%] w-[38%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center border ${nodeClass}`}
      >
        <Orbit
          className={`h-8 w-8 ${
            isDayMode ? "text-cyan-600" : "text-cyan-200"
          }`}
        />
        <div className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.2em] opacity-60">
          ZJU AI
        </div>
        <div className="mt-1 text-center text-2xl font-black leading-none tracking-tight sm:text-3xl">
          生态中枢
        </div>
      </motion.div>

      {[
        { title: "活动入口", className: "left-[2%] top-[17%]" },
        { title: "社区关系", className: "right-[2%] top-[17%]" },
        {
          title: "项目爆发",
          className: "bottom-[8%] left-1/2 -translate-x-1/2",
        },
      ].map((item) => (
        <div
          key={item.title}
          className={`absolute ${item.className} min-w-[108px] border px-3 py-3 text-center text-sm font-black ${nodeClass}`}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
});

EcosystemRadar.displayName = "EcosystemRadar";

const PlatformStats = () => {
  const { t } = useTranslation();
  const { settings, uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const { user } = useAuth();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const {
    data: featuredData,
    loading: featuredLoading,
    error: featuredError,
    refresh: refreshFeatured,
  } = useCachedResource(
    "/featured",
    {},
    {
      keyPrefix: "home-featured-mix",
      ttl: 1000 * 60 * 3,
      silent: true,
    },
  );
  const [followingFeed, setFollowingFeed] = useState([]);
  const [followRecommendations, setFollowRecommendations] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState([]);

  const featuredItems = [
    ...(featuredData?.photos || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || "精选图片",
      subtitle: "摄影",
      image: item.url,
      targetPath: `/gallery?id=${item.id}`,
      icon: Camera,
    })),
    ...(featuredData?.articles || []).slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title || "精选文章",
      subtitle: "文章",
      image: item.cover,
      targetPath: `/articles?id=${item.id}`,
      icon: BookOpen,
    })),
    ...(featuredData?.videos || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选视频",
      subtitle: "视频",
      image: item.thumbnail,
      targetPath: `/videos?id=${item.id}`,
      icon: Film,
    })),
    ...(featuredData?.music || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选音频",
      subtitle: "音频",
      image: item.cover,
      targetPath: `/music?id=${item.id}`,
      icon: Music2,
    })),
    ...(featuredData?.events || []).slice(0, 1).map((item) => ({
      id: item.id,
      title: item.title || "精选活动",
      subtitle: "活动",
      image: item.image,
      targetPath: `/events?id=${item.id}`,
      icon: CalendarDays,
    })),
  ]
    .filter((item) => item?.id)
    .slice(0, 7);

  const schoolSupport = parseUnits(
    settings.about_school_support_units || "未来学习中心,AI 联合实验室",
  );
  const studentOrganizations = parseUnits(
    settings.about_student_organizations || "XLAB,ZJUAI,EAI,AIRA,KAB",
  );

  const proofStats = [
    {
      value: settings.about_stat_1_value || "1000+",
      label: settings.about_stat_1_label || "平台用户基础",
      hint: "用户与内容持续涌入",
    },
    {
      value: "3",
      label: "核心运营抓手",
      hint: "活动、社区、赛事同频运转",
    },
    {
      value: settings.about_stat_3_value || "5 小时",
      label: settings.about_stat_3_label || "AI 原生赛事标识",
      hint: "把想法推进到可运行作品",
    },
  ];

  const operatingHandles = [
    {
      index: "01",
      code: "ENTRY",
      title: "活动聚合",
      short: "统一入口",
      loop: "发现机会",
      icon: CalendarDays,
      description: "把校内 AI 活动、机会与资源收拢到一个入口，降低发现成本。",
      route: "/events",
      accent: isDayMode ? "text-emerald-700" : "text-emerald-300",
      iconBg: isDayMode ? "bg-emerald-500" : "bg-emerald-300",
    },
    {
      index: "02",
      code: "LINK",
      title: "AI 社区",
      short: "持续关系",
      loop: "连接人群",
      icon: Users,
      description: "让学习者、建设者和组织者彼此看见，把交流沉淀成关系。",
      route: "/community",
      accent: isDayMode ? "text-cyan-700" : "text-cyan-300",
      iconBg: isDayMode ? "bg-cyan-500" : "bg-cyan-300",
    },
    {
      index: "03",
      code: "BUILD",
      title: "极速黑客松",
      short: "创造爆发",
      loop: "激发项目",
      icon: Trophy,
      description: "用高密度创造验证 AI 原生开发的校园势能，让作品真正跑起来。",
      route: "/hackathon",
      accent: isDayMode ? "text-amber-700" : "text-amber-300",
      iconBg: isDayMode ? "bg-amber-500" : "bg-amber-300",
    },
  ];

  const loopItems = [
    { index: "01", title: "发现", detail: "活动与机会进入统一入口" },
    { index: "02", title: "连接", detail: "社区承接人群关系" },
    { index: "03", title: "创造", detail: "赛事激发真实项目" },
    { index: "04", title: "沉淀", detail: "成果反哺校园生态" },
  ];

  const supportLogos = [
    {
      src: "/images/partner-logos/minimax.png",
      darkSrc: "/images/partner-logos/minimax-dark.png",
      alt: "MiniMax logo",
    },
    {
      src: "/images/partner-logos/modelscope.png",
      darkSrc: "/images/partner-logos/modelscope-dark.png",
      alt: "ModelScope 魔搭社区 logo",
    },
    {
      src: "/images/partner-logos/company-2.png",
      darkSrc: "/images/partner-logos/company-2-dark.png",
      alt: "云江开物 logo",
      size: "h-4 sm:h-5 lg:h-6",
    },
    {
      src: "/images/partner-logos/stepfun.png",
      darkSrc: "/images/partner-logos/stepfun-white.png",
      alt: "阶跃星辰 logo",
    },
  ];

  const palette = isDayMode
    ? {
        page: "bg-[linear-gradient(180deg,#020617_0%,#06131d_4rem,#f6f8fb_13rem,#f7fafc_100%)] text-slate-950",
        textSoft: "text-slate-600",
        textMuted: "text-slate-500",
        label: "text-cyan-700",
        border: "border-slate-200/80",
        panel:
          "border-slate-200 bg-white/88 shadow-[0_28px_90px_rgba(15,23,42,0.12)]",
        panelStrong:
          "border-cyan-500/20 bg-white/92 shadow-[0_36px_110px_rgba(15,23,42,0.14)]",
        card:
          "border-slate-200 bg-white/88 shadow-[0_24px_70px_rgba(15,23,42,0.1)]",
        accent: "text-cyan-700",
        accentBg: "bg-cyan-500",
        divider: "border-slate-200",
        watermark: "text-slate-900/[0.045]",
        grid: "border-cyan-500/18 bg-cyan-500/18",
        cell: "bg-white/88",
        firstText: "text-white",
        firstSoft: "text-white/72",
      }
    : {
        page: "bg-[#020617] text-white",
        textSoft: "text-white/72",
        textMuted: "text-white/48",
        label: "text-cyan-300",
        border: "border-white/10",
        panel:
          "border-white/10 bg-[#101516]/88 shadow-[0_28px_90px_rgba(0,0,0,0.46)]",
        panelStrong:
          "border-cyan-300/24 bg-[#081012]/86 shadow-[0_36px_120px_rgba(0,0,0,0.62)]",
        card:
          "border-white/10 bg-[linear-gradient(180deg,rgba(16,21,22,0.92),rgba(16,21,22,0.64))]",
        accent: "text-cyan-300",
        accentBg: "bg-cyan-300",
        divider: "border-white/10",
        watermark: "text-white/[0.04]",
        grid: "border-cyan-300/18 bg-cyan-300/18",
        cell: "bg-[#071113]/94",
        firstText: "text-white",
        firstSoft: "text-white/72",
      };

  useEffect(() => {
    if (!user) {
      setFollowingFeed([]);
      setFollowRecommendations([]);
      setFollowingIds([]);
      return;
    }
    let cancelled = false;
    setFollowLoading(true);
    Promise.all([
      api.get("/users/following/feed", { params: { limit: 5 } }),
      api.get("/users/recommendations/follow", { params: { limit: 4 } }),
      api.get("/users/following/ids"),
    ])
      .then(([feedRes, recRes, idsRes]) => {
        if (cancelled) return;
        setFollowingFeed(
          Array.isArray(feedRes.data?.data) ? feedRes.data.data : [],
        );
        setFollowRecommendations(Array.isArray(recRes.data) ? recRes.data : []);
        setFollowingIds(Array.isArray(idsRes.data?.ids) ? idsRes.data.ids : []);
      })
      .catch(() => {
        if (cancelled) return;
        setFollowingFeed([]);
        setFollowRecommendations([]);
        setFollowingIds([]);
      })
      .finally(() => {
        if (!cancelled) setFollowLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFollow = async (targetUserId, event) => {
    event?.stopPropagation();
    if (!user || !targetUserId || Number(targetUserId) === Number(user.id)) {
      return;
    }
    const isFollowing = followingIds.includes(Number(targetUserId));
    try {
      await api[isFollowing ? "delete" : "post"](
        `/users/${targetUserId}/follow`,
      );
      setFollowingIds((prev) =>
        isFollowing
          ? prev.filter((id) => id !== Number(targetUserId))
          : [...prev, Number(targetUserId)],
      );
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <section className={`relative overflow-hidden ${palette.page}`}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:52px_52px]" />
      <div
        className={`pointer-events-none absolute -right-[9vw] top-28 select-none text-[16vw] font-black uppercase leading-[0.8] tracking-tight ${palette.watermark}`}
      >
        HOME
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[2140px] px-4 pb-24 pt-16 sm:px-6 sm:pt-24 lg:px-10 lg:pb-28 lg:pt-28 2xl:px-16">
        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="grid items-center gap-8 md:min-h-[64svh] lg:min-h-[72svh] lg:grid-cols-[minmax(0,0.94fr)_minmax(440px,0.76fr)] lg:gap-14"
        >
          <div className={palette.firstText}>
            <div
              className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] ${palette.label} ${
                isDayMode
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-200"
                  : "border-cyan-300/30 bg-cyan-300/[0.07]"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              ZJU AI Ecosystem
            </div>

            <h2 className="mt-7 max-w-5xl text-[2.45rem] font-black leading-[0.96] tracking-tight min-[360px]:text-[2.85rem] sm:text-6xl lg:text-[5.35rem] lg:leading-[0.9] xl:text-[6.05rem] 2xl:text-[6.85rem]">
              <span className="block">三大抓手，</span>
              <span className={`block ${palette.accent}`}>点亮一张</span>
              <span className="block whitespace-nowrap">校园 AI 网络。</span>
            </h2>

            <p
              className={`mt-7 max-w-3xl text-base font-medium leading-8 sm:text-xl sm:leading-9 ${palette.firstSoft}`}
            >
              活动聚合负责发现，AI 社区负责连接，极速黑客松负责爆发。学校、社团与企业伙伴在同一张网络里协同，让机会、人群和作品持续流动。
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton
                isDayMode={isDayMode}
                onClick={() => navigate("/events")}
              >
                看近期活动
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                isDayMode={isDayMode}
                variant="secondary"
                onClick={() => navigate("/about")}
              >
                了解生态团队
              </LinkButton>
            </div>

            <div className={`mt-8 grid grid-cols-3 gap-px border ${palette.grid} sm:mt-10`}>
              {proofStats.map((item) => (
                <div key={item.label} className={`min-h-[108px] p-3 sm:min-h-0 sm:p-6 ${palette.cell}`}>
                  <div className={`text-2xl font-black leading-none tracking-tight min-[360px]:text-3xl sm:text-4xl ${palette.accent}`}>
                    {item.value}
                  </div>
                  <div className="mt-2 text-[11px] font-black leading-4 sm:mt-3 sm:text-sm">
                    {item.label}
                  </div>
                  <p className={`mt-2 hidden text-xs leading-5 sm:block ${palette.textMuted}`}>
                    {item.hint}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`relative hidden border p-4 sm:p-7 md:block ${palette.panelStrong}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(103,232,249,0.18),transparent_36%),linear-gradient(135deg,rgba(103,232,249,0.08),transparent_46%)]" />
            <div
              className={`pointer-events-none absolute -right-8 -top-8 text-[7rem] font-black uppercase leading-none tracking-tight ${palette.watermark}`}
            >
              LIVE
            </div>
            <EcosystemRadar
              isDayMode={isDayMode}
              shouldAnimate={shouldAnimate}
            />
          </div>
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mt-16 sm:mt-20 lg:mt-32"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                Core Engine
              </p>
              <h2 className="mt-3 max-w-5xl text-4xl font-black leading-none tracking-tight text-balance sm:text-6xl lg:text-[clamp(3.5rem,6.6vw,6.5rem)]">
                不是入口很多，
                <br />
                是路径终于清楚。
              </h2>
            </div>
            <p className={`max-w-2xl text-base leading-8 sm:text-lg ${palette.textSoft}`}>
              从看到活动，到加入社区，再到组队做出作品，入口、关系和成果在同一条路径里闭环。
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {operatingHandles.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.code}
                  to={item.route}
                  className={`group relative min-h-[320px] overflow-hidden border border-l-4 p-7 transition duration-300 hover:-translate-y-1 lg:min-h-[420px] ${palette.card} ${
                    isDayMode ? "border-l-cyan-500" : "border-l-cyan-300"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(100deg,rgba(103,232,249,0.10),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div
                    className={`pointer-events-none absolute -bottom-8 -right-5 text-[8rem] font-black uppercase leading-none tracking-tight transition duration-300 group-hover:translate-x-1 ${
                      isDayMode
                        ? "text-slate-900/[0.035]"
                        : "text-white/[0.045]"
                    }`}
                  >
                    {item.code}
                  </div>
                  <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${item.accent}`}>
                        {item.index} / {item.code}
                      </div>
                      <div className={`flex h-12 w-12 items-center justify-center ${item.iconBg} text-slate-950 shadow-[0_0_34px_rgba(103,232,249,0.24)]`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <h3 className="mt-10 text-4xl font-black leading-none tracking-tight sm:text-5xl">
                      {item.title}
                    </h3>
                    <p className={`mt-6 text-sm leading-7 sm:text-base ${palette.textSoft}`}>
                      {item.description}
                    </p>
                    <div className={`mt-auto flex items-end justify-between border-t pt-6 ${palette.divider}`}>
                      <div>
                        <div className={`text-[11px] font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                          Loop Role
                        </div>
                        <div className={`mt-2 text-xl font-black ${item.accent}`}>
                          {item.loop}
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-2 text-sm font-black ${item.accent}`}>
                        {item.short}
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className={`mt-6 grid gap-px overflow-hidden border ${palette.grid} lg:grid-cols-[0.9fr_repeat(4,1fr)]`}>
            <div className={`p-5 ${isDayMode ? "bg-white/76" : "bg-white/[0.035]"}`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${palette.label}`}>
                Operating Loop
              </p>
              <h3 className="mt-2 text-2xl font-black leading-none tracking-tight">
                从热度到沉淀
              </h3>
            </div>
            {loopItems.map((item) => (
              <div key={item.index} className={`p-5 ${palette.cell}`}>
                <div className={`font-mono text-xs font-black ${palette.accent}`}>
                  {item.index}
                </div>
                <h3 className="mt-2 text-2xl font-black">{item.title}</h3>
                <p className={`mt-2 text-xs leading-5 ${palette.textMuted}`}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mt-20 grid gap-6 lg:mt-32 lg:grid-cols-[0.82fr_1.18fr]"
        >
          <div className={`relative min-h-[520px] overflow-hidden border p-7 sm:p-9 ${palette.panelStrong}`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(103,232,249,0.18),transparent_38%)]" />
            <div
              className={`pointer-events-none absolute -right-16 bottom-8 text-[11rem] font-black uppercase leading-none tracking-tight ${palette.watermark}`}
            >
              BASE
            </div>
            <div className={`pointer-events-none absolute left-0 top-0 h-full w-1 ${palette.accentBg}`} />
            <div className="relative z-10 flex min-h-[456px] flex-col justify-between">
              <div>
                <div className={`font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                  01 / Foundation
                </div>
                <h2 className="mt-7 max-w-lg text-5xl font-black leading-none tracking-tight sm:text-6xl lg:text-[5.6rem]">
                  支持网络
                  <br />
                  在这里汇合
                </h2>
                <p className={`mt-6 max-w-lg text-sm leading-7 sm:text-base ${palette.textSoft}`}>
                  学校提供土壤，学生组织连接人群，企业伙伴带来技术与资源，让学生项目从现场继续生长。
                </p>
              </div>

              <div className="grid gap-3">
                {schoolSupport.map((item) => (
                  <div
                    key={item}
                    className={`grid gap-2 border-l-4 px-5 py-4 ${
                      isDayMode
                        ? "border-l-cyan-500 bg-white/76"
                        : "border-l-cyan-300 bg-cyan-300/[0.05]"
                    }`}
                  >
                    <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      <Building2 className="h-3.5 w-3.5" />
                      School Support
                    </div>
                    <div className="text-2xl font-black">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className={`relative overflow-hidden border p-7 sm:p-8 ${palette.card}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={`flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                    <Users className="h-3.5 w-3.5" />
                    Campus Force
                  </div>
                  <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    学生组织
                  </h3>
                </div>
                <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                  People Layer
                </div>
              </div>
              <p className={`mt-4 max-w-2xl text-sm font-bold leading-6 ${palette.textMuted}`}>
                社群、活动、实践人群从这里被组织起来，形成持续流动的校园动能。
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {studentOrganizations.map((item) => (
                  <span
                    key={item}
                    className={`flex min-h-[64px] items-center justify-center border px-4 py-3 text-xl font-black transition duration-300 hover:-translate-y-0.5 ${
                      isDayMode
                        ? "border-slate-200 bg-white/78"
                        : "border-white/10 bg-white/[0.045] hover:border-cyan-300/24"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className={`relative overflow-hidden border p-7 sm:p-8 ${palette.panelStrong}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className={`flex items-center gap-2 font-mono text-xs font-black uppercase tracking-[0.2em] ${palette.accent}`}>
                    <Handshake className="h-3.5 w-3.5" />
                    Technical Backing
                  </div>
                  <h3 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                    企业伙伴
                  </h3>
                </div>
                <div className={`text-sm font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                  Resource Layer
                </div>
              </div>

              <p className={`mt-4 max-w-2xl text-sm font-bold leading-6 ${palette.textMuted}`}>
                模型、云、工具与技术生态进入同一张网络，支撑真实项目从想法走向可运行。
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {supportLogos.map((logo) => (
                  <div
                    key={logo.alt}
                    className={`group flex min-h-[82px] items-center justify-center border px-5 py-4 transition duration-300 hover:-translate-y-0.5 ${
                      isDayMode
                        ? "border-slate-200 bg-white/86 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                        : "border-white/10 bg-white/[0.045] hover:border-cyan-300/30 hover:bg-cyan-300/[0.065]"
                    }`}
                  >
                    <img
                      src={isDayMode ? logo.src : logo.darkSrc || logo.src}
                      alt={logo.alt}
                      className={`w-auto max-w-full object-contain transition duration-300 group-hover:scale-[1.04] ${
                        logo.size || "h-6 sm:h-8"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={sectionReveal}
          initial={prefersReducedMotion ? false : "initial"}
          whileInView={prefersReducedMotion ? undefined : "animate"}
          viewport={motionTokens.viewport}
          className="mt-20 lg:mt-32"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className={`flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                <Zap className="h-3.5 w-3.5" />
                Now Live
              </p>
              <h2 className="mt-3 max-w-5xl text-4xl font-black leading-none tracking-tight text-balance sm:text-6xl lg:text-[clamp(3.5rem,6.4vw,6rem)]">
                正在发生的作品、
                <br />
                活动与观点。
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LinkButton
                isDayMode={isDayMode}
                onClick={() => navigate("/articles")}
              >
                进入发现
                <ArrowRight className="h-4 w-4" />
              </LinkButton>
              <LinkButton
                isDayMode={isDayMode}
                variant="secondary"
                onClick={() => navigate("/hackathon")}
              >
                极速黑客松
              </LinkButton>
            </div>
          </div>

          <div className="mt-9">
            {featuredLoading && featuredItems.length === 0 ? (
              <div className={`min-h-[160px] border px-5 py-6 text-sm ${palette.card}`}>
                {t("common.loading")}
              </div>
            ) : featuredError && featuredItems.length === 0 ? (
              <div className={`border px-5 py-6 text-sm ${palette.card}`}>
                <div>精选内容暂时加载失败</div>
                <button
                  type="button"
                  onClick={() => refreshFeatured()}
                  className={`motion-press mt-4 min-h-10 border px-4 text-xs font-black ${
                    isDayMode
                      ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      : "border-white/10 bg-white/5 text-gray-200 hover:bg-white/10"
                  }`}
                >
                  重新加载
                </button>
              </div>
            ) : featuredItems.length === 0 ? (
              <div className={`border px-5 py-6 text-sm ${palette.card}`}>
                暂无精选内容
              </div>
            ) : (
              <motion.div
                variants={listContainer}
                initial={prefersReducedMotion ? false : "initial"}
                whileInView={prefersReducedMotion ? undefined : "animate"}
                viewport={motionTokens.viewport}
                className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4"
              >
                {featuredItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      variants={listItem}
                      whileTap={prefersReducedMotion ? undefined : tapPress}
                      key={`${item.subtitle}-${item.id}`}
                      type="button"
                      aria-label={`${item.subtitle} ${item.title}`}
                      onClick={() => navigate(item.targetPath)}
                      className={`motion-gpu motion-lift group min-h-[340px] w-[286px] shrink-0 snap-start overflow-hidden border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 md:w-auto ${
                        index === 0 ? "xl:col-span-2" : ""
                      } ${palette.card}`}
                    >
                      <div className={`h-44 ${index === 0 ? "xl:h-56" : ""} ${isDayMode ? "bg-slate-100" : "bg-black/40"}`}>
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Icon
                              size={22}
                              className={isDayMode ? "text-slate-400" : "text-gray-500"}
                            />
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <div className={`mb-3 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] ${palette.textMuted}`}>
                          <Icon size={13} />
                          {item.subtitle}
                        </div>
                        <div className={`line-clamp-2 text-xl font-black leading-7 ${isDayMode ? "text-slate-950" : "text-white"}`}>
                          {item.title}
                        </div>
                        <div className={`mt-5 inline-flex items-center gap-2 text-sm font-black ${palette.accent}`}>
                          查看内容
                          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {user && (
            <motion.div
              variants={sectionReveal}
              initial={prefersReducedMotion ? false : "initial"}
              whileInView={prefersReducedMotion ? undefined : "animate"}
              viewport={motionTokens.viewport}
              className={`mt-8 grid gap-5 border p-5 lg:grid-cols-[minmax(0,1fr)_320px] ${palette.panel}`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 items-center justify-center ${isDayMode ? "bg-indigo-50 text-indigo-500" : "bg-indigo-400/10 text-indigo-300"}`}>
                      <Users size={16} />
                    </div>
                    <span className={`text-xs font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                      关注动态
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/articles")}
                    className={`motion-press inline-flex min-h-9 items-center gap-1 px-3 text-xs font-black ${
                      isDayMode
                        ? "text-indigo-600 hover:bg-indigo-50"
                        : "text-indigo-300 hover:bg-white/5"
                    }`}
                  >
                    查看内容
                    <ArrowRight size={12} />
                  </button>
                </div>

                {followLoading ? (
                  <div className={`text-sm ${palette.textMuted}`}>
                    {t("common.loading")}
                  </div>
                ) : followingFeed.length === 0 ? (
                  <div className={`border px-4 py-5 text-sm ${isDayMode ? "border-slate-200/80 bg-slate-50/80 text-slate-500" : "border-white/10 bg-black/20 text-gray-400"}`}>
                    你关注的作者还没有发布新内容
                  </div>
                ) : (
                  <motion.div
                    variants={listContainer}
                    initial={prefersReducedMotion ? false : "initial"}
                    whileInView={prefersReducedMotion ? undefined : "animate"}
                    viewport={motionTokens.viewport}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    {followingFeed.map((item) => (
                      <motion.button
                        variants={listItem}
                        whileTap={prefersReducedMotion ? undefined : tapPress}
                        key={`${item.resource_type}-${item.id}`}
                        type="button"
                        onClick={() => navigate(item.target_path || "/articles")}
                        className={`motion-gpu motion-lift w-full border px-4 py-4 text-left ${palette.card}`}
                      >
                        <div className={`truncate text-base font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
                          {item.title}
                        </div>
                        <div className={`mt-2 text-xs leading-5 ${palette.textMuted}`}>
                          {[item.author_name, item.resource_type]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>

              <div className={`border p-4 ${isDayMode ? "border-slate-200 bg-white/72" : "border-white/10 bg-black/20"}`}>
                <div className={`mb-3 text-xs font-black uppercase tracking-[0.18em] ${palette.textMuted}`}>
                  推荐关注
                </div>
                <div className="space-y-2">
                  {followRecommendations.slice(0, 4).map((item) => {
                    const followed = followingIds.includes(Number(item.id));
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className={`motion-link truncate text-sm font-bold ${isDayMode ? "text-slate-700" : "text-gray-200"}`}
                          onClick={() => navigate(`/user/${item.id}`)}
                        >
                          {item.nickname || item.username}
                        </button>
                        <button
                          type="button"
                          onClick={(event) => toggleFollow(item.id, event)}
                          className={`motion-press min-h-[34px] border px-3 py-1.5 text-[11px] font-bold ${
                            followed
                              ? isDayMode
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-white bg-white text-black"
                              : isDayMode
                                ? "border-slate-200/80 bg-white text-slate-700"
                                : "border-white/10 bg-white/5 text-gray-200"
                          }`}
                        >
                          {followed ? "已关注" : "关注"}
                        </button>
                      </div>
                    );
                  })}
                  {followRecommendations.length === 0 && (
                    <div className={`text-xs ${palette.textMuted}`}>暂无推荐</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default PlatformStats;
