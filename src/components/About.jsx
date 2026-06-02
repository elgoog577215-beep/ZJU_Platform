import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Handshake,
  Images,
  Network,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { getPartnerDisplayName, getPartnerLogoSrc } from "../data/partnerLogos";
import { useSettings } from "../context/SettingsContext";
import { useEcosystemPartners } from "../hooks/useEcosystemPartners";
import { useReducedMotion } from "../utils/animations";
import SEO from "./SEO";

const reveal = (enabled, delay = 0) => {
  if (!enabled) return {};

  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.52, delay, ease: [0.22, 1, 0.36, 1] },
    viewport: { once: true, margin: "-12%" },
  };
};

const About = () => {
  const { settings, uiMode } = useSettings();
  const { schoolPartners, organizationPartners, enterpriseLogos } = useEcosystemPartners();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = !prefersReducedMotion;
  const isDayMode = uiMode === "day";

  const palette = isDayMode
    ? {
        page: "bg-[#f6f9fc] text-slate-950",
        hero:
          "bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(236,254,255,0.72)_48%,rgba(248,250,252,0.96))]",
        border: "border-slate-200/80",
        panel: "border-slate-200/80 bg-white/84 shadow-[0_24px_80px_rgba(15,23,42,0.09)]",
        softPanel: "border-slate-200/80 bg-white/68",
        muted: "text-slate-500",
        soft: "text-slate-650",
        label: "text-cyan-700",
        accent: "text-cyan-700",
        primary: "bg-cyan-500 text-white hover:bg-cyan-600",
        secondary: "border-slate-300 bg-white/72 text-slate-800 hover:border-cyan-400 hover:text-cyan-700",
      }
    : {
        page: "bg-[#030405] text-white",
        hero:
          "bg-[radial-gradient(circle_at_70%_14%,rgba(34,211,238,0.18),transparent_28%),linear-gradient(135deg,#020303_0%,#071111_50%,#020303_100%)]",
        border: "border-white/10",
        panel: "border-white/10 bg-white/[0.045] shadow-[0_28px_92px_rgba(0,0,0,0.36)]",
        softPanel: "border-white/10 bg-white/[0.035]",
        muted: "text-white/48",
        soft: "text-white/72",
        label: "text-cyan-200",
        accent: "text-cyan-200",
        primary: "bg-cyan-300 text-slate-950 hover:bg-white",
        secondary: "border-white/16 bg-white/[0.045] text-white hover:border-cyan-300/70 hover:bg-cyan-300/10",
      };

  const introTitle = settings.about_team_title || "我们是谁";
  const introSubtitle =
    settings.about_team_subtitle ||
    "拓途浙享是面向浙江大学校园的 AI 信息共享与实践连接平台。";
  const introCopy = [
    settings.about_team_intro_1 ||
      "我们把分散在学院、社团、企业和项目现场的 AI 活动、真实课题、学习资源与成果记录聚合到同一个入口，减少信息差，让学生更快找到值得参与的机会。",
    settings.about_team_intro_2 ||
      "平台不是单次活动官网，而是一套长期运转的校园 AI 生态基础设施：前端连接信息，社区承接人群，赛事和项目验证能力。",
  ];

  const workItems = [
    {
      title: "活动与机会聚合",
      desc: "统一发布讲座、比赛、项目招募、企业课题与学习资源，让用户先找到可参与的入口。",
      icon: CalendarDays,
      to: "/events",
    },
    {
      title: "AI 社区共建",
      desc: "承接求助、技术分享、资讯、社群与协作，让一次活动后的讨论继续流动。",
      icon: Users,
      to: "/articles",
    },
    {
      title: "影像与成果记录",
      desc: "归档活动照片、视频与成果展示，让校园 AI 实践留下可回看、可传播的证据。",
      icon: Images,
      to: "/media",
    },
    {
      title: "黑客松与真实实践",
      desc: "用限时开发、企业资源和作品评审，让 AI 原生能力在真实场景里被验证。",
      icon: Trophy,
      to: "/hackathon",
    },
  ];

  const supportGroups = [
    {
      title: "学校支持",
      code: "School Support",
      icon: Building2,
      desc: "提供场景、空间、组织机制与长期建设支持。",
      items: schoolPartners.map((partner) => ({
        id: partner.id || partner.name,
        name: partner.name,
        description: partner.description,
      })),
    },
    {
      title: "社团协作",
      code: "Campus Force",
      icon: Network,
      desc: "承接人群组织、活动执行、社群连接与赛后共建。",
      items: organizationPartners.map((partner) => ({
        id: partner.id || partner.name,
        name: partner.name,
        description: partner.description,
      })),
    },
  ];

  return (
    <main className={`min-h-screen overflow-x-hidden ${palette.page}`}>
      <SEO
        title="关于我们"
        description="了解拓途浙享是谁、正在做什么，以及学校、社团和企业支持方如何共同构建校园 AI 生态。"
      />

      <section
        className={`relative isolate overflow-hidden px-4 pb-16 pt-[calc(env(safe-area-inset-top)+96px)] sm:px-6 md:pt-32 lg:px-10 ${palette.hero}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(103,232,249,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.12)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <motion.div {...reveal(shouldAnimate)}>
            <div className={`inline-flex items-center gap-2 border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.24em] ${palette.border} ${palette.label}`}>
              <Sparkles className="h-3.5 w-3.5" />
              ZJU AI Ecosystem
            </div>
            <h1 className="mt-6 max-w-5xl text-[2.55rem] font-black leading-[0.94] tracking-normal sm:text-6xl lg:text-[5.5rem]">
              我们把校园 AI 资源
              <span className={`block ${palette.accent}`}>连接成一张网络。</span>
            </h1>
            <p className={`mt-6 max-w-3xl text-base font-semibold leading-8 sm:text-xl sm:leading-9 ${palette.soft}`}>
              {introSubtitle}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/events"
                className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-300/25 ${palette.primary}`}
              >
                进入活动页
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/articles"
                className={`inline-flex min-h-12 items-center justify-center gap-2 border px-6 text-sm font-black transition focus:outline-none focus:ring-4 focus:ring-cyan-300/20 ${palette.secondary}`}
              >
                查看 AI 社区
              </Link>
            </div>
          </motion.div>

          <motion.aside
            {...reveal(shouldAnimate, 0.08)}
            className={`relative overflow-hidden border p-5 backdrop-blur-xl ${palette.panel}`}
          >
            <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${palette.label}`}>
              Platform Brief
            </div>
            <div className="mt-6 grid gap-px overflow-hidden border border-cyan-300/18 bg-cyan-300/18">
              {[
                ["01", "信息入口", "活动、社区、影像统一触达"],
                ["02", "组织连接", "学校、社团、企业协同"],
                ["03", "实践转化", "从资源发现走向项目成果"],
              ].map(([index, title, desc]) => (
                <div key={index} className={isDayMode ? "bg-white/82 p-4" : "bg-[#071113]/90 p-4"}>
                  <div className={`font-mono text-xs font-black ${palette.accent}`}>{index}</div>
                  <div className="mt-2 text-xl font-black">{title}</div>
                  <p className={`mt-1 text-sm font-semibold ${palette.muted}`}>{desc}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <motion.div {...reveal(shouldAnimate)}>
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              {introTitle}
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              不是展示页，而是校园 AI 资源的连接器。
            </h2>
          </motion.div>
          <div className="grid gap-4 md:grid-cols-2">
            {introCopy.map((paragraph, index) => (
              <motion.p
                key={paragraph}
                {...reveal(shouldAnimate, index * 0.05)}
                className={`border p-5 text-sm font-semibold leading-7 sm:text-base sm:leading-8 ${palette.softPanel} ${palette.soft}`}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal(shouldAnimate)} className="max-w-3xl">
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              What We Do
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              我们在做什么
            </h2>
          </motion.div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  {...reveal(shouldAnimate, index * 0.04)}
                  className={`group flex min-h-[260px] flex-col justify-between border p-5 transition hover:-translate-y-1 ${palette.panel}`}
                >
                  <div>
                    <div className={`flex h-11 w-11 items-center justify-center border ${palette.border} ${palette.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-5 text-2xl font-black leading-tight">{item.title}</h3>
                    <p className={`mt-3 text-sm font-semibold leading-7 ${palette.muted}`}>{item.desc}</p>
                  </div>
                  <Link
                    to={item.to}
                    className={`mt-6 inline-flex items-center gap-2 text-sm font-black ${palette.accent}`}
                  >
                    查看入口
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <motion.div {...reveal(shouldAnimate)} className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
                Support Network
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
                我们的支持方有哪些
              </h2>
            </div>
            <p className={`max-w-2xl text-sm font-semibold leading-7 ${palette.muted}`}>
              学校提供机制，社团承接人群，企业带来真实技术资源。支持方统一由后台“生态伙伴”维护。
            </p>
          </motion.div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {supportGroups.map((group, index) => {
              const Icon = group.icon;
              return (
                <motion.section
                  key={group.title}
                  {...reveal(shouldAnimate, index * 0.05)}
                  className={`border p-5 ${palette.panel}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${palette.label}`}>
                        {group.code}
                      </div>
                      <h3 className="mt-2 text-3xl font-black">{group.title}</h3>
                      <p className={`mt-2 text-sm font-semibold leading-6 ${palette.muted}`}>{group.desc}</p>
                    </div>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center border ${palette.border} ${palette.accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <div key={item.id} className={`min-h-[96px] border p-4 ${palette.softPanel}`}>
                        <div className="text-lg font-black leading-tight">{item.name}</div>
                        <p className={`mt-2 text-xs font-semibold leading-5 ${palette.muted}`}>
                          {item.description || "参与校园 AI 生态共建。"}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.section>
              );
            })}
          </div>

          <motion.section
            {...reveal(shouldAnimate, 0.08)}
            className={`mt-4 border p-5 ${palette.panel}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className={`text-[11px] font-black uppercase tracking-[0.22em] ${palette.label}`}>
                  Enterprise Partners
                </div>
                <h3 className="mt-2 text-3xl font-black">企业生态</h3>
                <p className={`mt-2 max-w-3xl text-sm font-semibold leading-6 ${palette.muted}`}>
                  企业伙伴提供模型、云、工具、真实课题与技术生态支持，让校园实践更接近真实产业现场。
                </p>
              </div>
              <Handshake className={`hidden h-10 w-10 lg:block ${palette.accent}`} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {enterpriseLogos.map((logo) => {
                const logoSrc = getPartnerLogoSrc(logo, isDayMode);
                return (
                  <div
                    key={logo.id || logo.src || logo.name}
                    className={`flex min-h-[74px] items-center justify-center border px-3 py-3 ${palette.softPanel}`}
                  >
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={logo.alt}
                        className={`max-h-8 max-w-full object-contain ${!isDayMode ? logo.darkClassName || "" : ""}`}
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-center text-sm font-black">
                        {getPartnerDisplayName(logo)}
                      </span>
                    )}
                    {logo.text ? (
                      <span className={`ml-2 text-sm font-black ${isDayMode ? "text-slate-950" : "text-white"}`}>
                        {logo.text}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>
      </section>

      <section className="px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:pb-20">
        <motion.div
          {...reveal(shouldAnimate)}
          className={`mx-auto flex max-w-7xl flex-col gap-6 border p-6 md:flex-row md:items-center md:justify-between md:p-8 ${palette.panel}`}
        >
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.24em] ${palette.label}`}>
              Join / Collaborate
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              一起把校园 AI 资源连接得更好。
            </h2>
            <p className={`mt-3 max-w-3xl text-sm font-semibold leading-7 ${palette.muted}`}>
              如果你关注活动合作、社团共建、企业课题、技术支持或成果展示，可以从活动页进入平台，也可以继续浏览社区内容。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
            <Link
              to="/events"
              className={`inline-flex min-h-12 items-center justify-center gap-2 px-6 text-sm font-black transition ${palette.primary}`}
            >
              看近期活动
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`mailto:${settings.contact_email || "service@tuotuzju.com"}`}
              className={`inline-flex min-h-12 items-center justify-center border px-6 text-sm font-black transition ${palette.secondary}`}
            >
              联系合作
            </a>
          </div>
        </motion.div>
      </section>
    </main>
  );
};

export default About;
