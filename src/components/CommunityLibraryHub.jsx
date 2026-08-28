import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    BookOpen,
    Bot,
    ExternalLink,
    GraduationCap,
    MessageCircleQuestion,
    Search,
    Sparkles,
    Upload,
    Users,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

/*
THESIS: 同一组四个入口从沉浸式选择界面收缩为工作区顶部栏目，状态变化不替换用户的空间记忆。
OWN-WORLD: 继承全站深海蓝、生态靛蓝与圆角语义表面，以微光 Dock 呈现 AI 生态的汇聚感。
STORY: 先选择问题域，再在不离开同一页面的情况下搜索、上传、提问和使用真实内容。
FIRST VIEWPORT: 初始首屏只有四个丰富的功能入口；进入后，入口收拢，真实操作与内容接管首屏。
FORM: 生产页面内的渐进式应用 Dock；精确承接用户参考图和已确认交互。
*/

const DOCK_ITEMS = [
    {
        key: "freshman",
        icon: GraduationCap,
        mark: "01",
        titleKey: "freshman_title",
        metaKey: "freshman_meta",
        descriptionKey: "freshman_dock_desc",
    },
    {
        key: "finals",
        icon: BookOpen,
        mark: "02",
        titleKey: "finals_title",
        metaKey: "finals_meta",
        descriptionKey: "finals_dock_desc",
    },
    {
        key: "ai",
        icon: Bot,
        mark: "03",
        titleKey: "ai_title",
        metaKey: "ai_meta",
        descriptionKey: "ai_dock_desc",
    },
    {
        key: "community",
        icon: Users,
        mark: "04",
        titleKey: "community_title",
        metaKey: "community_meta",
        descriptionKey: "community_dock_desc",
    },
];

const isSafeExternalUrl = (value) => {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const DockArtwork = ({ itemKey, isDayMode }) => {
    const lineClass = isDayMode ? "bg-slate-900/10" : "bg-white/10";
    const ringClass = isDayMode ? "border-slate-900/10" : "border-white/10";

    if (itemKey === "freshman") {
        return (
            <div aria-hidden="true" className="relative h-28 w-full">
                <div className="absolute left-2 top-3 h-20 w-20 rotate-[-8deg] rounded-[1.4rem] border border-cyan-300/25 bg-gradient-to-br from-cyan-300/45 to-violet-500/45 shadow-[0_14px_45px_rgba(34,211,238,0.22)]" />
                <div className={`absolute left-24 top-5 h-2 w-28 rounded-full ${lineClass}`} />
                <div className={`absolute left-24 top-12 h-2 w-20 rounded-full ${lineClass}`} />
                <div
                    className={`absolute left-24 top-[4.75rem] h-2 w-24 rounded-full ${lineClass}`}
                />
                <Sparkles className="absolute left-7 top-8 text-white" size={36} />
            </div>
        );
    }

    if (itemKey === "finals") {
        return (
            <div aria-hidden="true" className="relative h-28 w-full">
                <div className="absolute left-4 top-3 h-20 w-24 rounded-[1.35rem] border border-blue-300/20 bg-gradient-to-br from-blue-400/45 to-indigo-600/25 shadow-[0_14px_45px_rgba(59,130,246,0.2)]" />
                {[0, 1, 2].map((index) => (
                    <div
                        key={index}
                        className={`absolute left-10 h-2 rounded-full ${lineClass}`}
                        style={{ top: 31 + index * 17, width: 44 + index * 10 }}
                    />
                ))}
                <div
                    className={`absolute left-36 top-5 h-16 w-16 rounded-full border border-dashed ${ringClass}`}
                />
            </div>
        );
    }

    if (itemKey === "ai") {
        return (
            <div aria-hidden="true" className="relative h-28 w-full">
                <div className="absolute left-4 top-2 grid h-24 w-24 grid-cols-2 gap-2 rounded-[1.5rem] border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-400/30 to-cyan-400/20 p-5 shadow-[0_14px_45px_rgba(217,70,239,0.18)]">
                    <span className="rounded-full bg-amber-300" />
                    <span className="rounded-full bg-pink-400" />
                    <span className="rounded-full bg-cyan-300" />
                    <span className="rounded-full bg-blue-400" />
                </div>
                <div
                    className={`absolute left-28 top-7 h-12 w-24 rotate-6 rounded-2xl border ${ringClass}`}
                />
            </div>
        );
    }

    return (
        <div aria-hidden="true" className="relative h-28 w-full">
            <div className="absolute left-5 top-3 flex h-20 w-24 items-center justify-center rounded-[1.45rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/35 to-cyan-500/20 shadow-[0_14px_45px_rgba(45,212,191,0.18)]">
                <MessageCircleQuestion className="text-white" size={40} />
            </div>
            <div
                className={`absolute left-32 top-4 h-16 w-16 rounded-full border border-dashed ${ringClass}`}
            />
            <div className="absolute left-[9.75rem] top-11 h-2 w-2 rounded-full bg-emerald-300" />
        </div>
    );
};

const ToolbarButton = ({
    icon: Icon,
    label,
    compactLabel,
    isDayMode,
    primary = false,
    ...props
}) => (
    <button
        type="button"
        {...props}
        className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-45 ${
            primary
                ? "bg-violet-600 text-white hover:bg-violet-500"
                : isDayMode
                  ? "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:text-violet-700"
                  : "border border-white/10 bg-white/[0.045] text-slate-200 hover:border-violet-300/35 hover:bg-white/[0.075] hover:text-white"
        }`}
    >
        <Icon aria-hidden="true" size={16} />
        <span className={compactLabel ? "hidden sm:inline" : undefined}>{label}</span>
        {compactLabel ? <span className="sm:hidden">{compactLabel}</span> : null}
    </button>
);

export const CommunityWorkspaceToolbar = ({
    activeKey,
    isDayMode,
    onBack,
    onSearch,
    onUpload,
    onAsk,
}) => {
    const { t } = useTranslation();
    const freshmanUrl = String(import.meta.env.VITE_AI_COMMUNITY_FRESHMAN_IMA_URL || "").trim();
    const hasFreshmanUrl = isSafeExternalUrl(freshmanUrl);

    return (
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-0.5 md:justify-end">
            <ToolbarButton
                icon={ArrowLeft}
                label={t("community_libraries.back_to_dock", "返回入口")}
                compactLabel={t("community_libraries.back_short", "返回")}
                isDayMode={isDayMode}
                onClick={onBack}
            />
            {activeKey === "freshman" ? (
                <a
                    href={hasFreshmanUrl ? freshmanUrl : undefined}
                    target={hasFreshmanUrl ? "_blank" : undefined}
                    rel={hasFreshmanUrl ? "noopener noreferrer" : undefined}
                    aria-disabled={!hasFreshmanUrl}
                    onClick={(event) => {
                        if (!hasFreshmanUrl) event.preventDefault();
                    }}
                    className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        hasFreshmanUrl
                            ? "bg-violet-600 text-white hover:bg-violet-500"
                            : isDayMode
                              ? "cursor-not-allowed bg-slate-200 text-slate-500"
                              : "cursor-not-allowed bg-white/10 text-slate-400"
                    }`}
                >
                    <ExternalLink aria-hidden="true" size={16} />
                    <span className="hidden sm:inline">
                        {hasFreshmanUrl
                            ? t("community_libraries.open_ima", "打开 ima")
                            : t("community_libraries.ima_pending", "ima 链接待配置")}
                    </span>
                    <span className="sm:hidden">
                        {hasFreshmanUrl
                            ? t("community_libraries.open_ima_short", "打开 ima")
                            : t("community_libraries.ima_pending_short", "ima 待配置")}
                    </span>
                </a>
            ) : (
                <ToolbarButton
                    icon={Search}
                    label={t("community_libraries.search_current", "搜索当前内容")}
                    compactLabel={t("community_libraries.search_short", "搜索")}
                    isDayMode={isDayMode}
                    onClick={onSearch}
                />
            )}
            {activeKey === "finals" ? (
                <ToolbarButton
                    icon={Upload}
                    label={t("community_libraries.upload_action", "上传资料")}
                    compactLabel={t("community_libraries.upload_short", "上传")}
                    isDayMode={isDayMode}
                    primary
                    onClick={onUpload}
                />
            ) : null}
            {activeKey === "community" ? (
                <ToolbarButton
                    icon={MessageCircleQuestion}
                    label={t("community_libraries.start_discussion", "发起讨论")}
                    compactLabel={t("community_libraries.discussion_short", "讨论")}
                    isDayMode={isDayMode}
                    primary
                    onClick={onAsk}
                />
            ) : (
                <ToolbarButton
                    icon={MessageCircleQuestion}
                    label={t("community_libraries.ask_action", "提个问题")}
                    compactLabel={t("community_libraries.ask_short", "提问")}
                    isDayMode={isDayMode}
                    onClick={onAsk}
                />
            )}
        </div>
    );
};

export const FreshmanLibraryIntro = ({ isDayMode }) => {
    const { t } = useTranslation();
    const configuredUrl = String(import.meta.env.VITE_AI_COMMUNITY_FRESHMAN_IMA_URL || "").trim();
    const hasValidUrl = isSafeExternalUrl(configuredUrl);

    return (
        <section
            className={`relative overflow-hidden rounded-2xl border p-6 md:p-9 ${
                isDayMode
                    ? "border-violet-200 bg-violet-50/80 text-violet-950"
                    : "border-violet-300/20 bg-violet-400/[0.075] text-white"
            }`}
        >
            <span
                aria-hidden="true"
                className={`absolute -bottom-8 right-2 text-9xl font-black leading-none ${
                    isDayMode ? "text-violet-200/55" : "text-violet-200/[0.045]"
                }`}
            >
                新
            </span>
            <div className="relative z-10 max-w-3xl">
                <h1 className="text-3xl font-black tracking-[-0.03em] md:text-5xl">
                    {t("community_libraries.freshman_title", "新生资料库")}
                </h1>
                <p
                    className={`mt-4 max-w-2xl text-base leading-7 ${
                        isDayMode ? "text-violet-950/75" : "text-violet-100/80"
                    }`}
                >
                    {t(
                        "community_libraries.freshman_intro_short",
                        "入学准备、课程学习与校园生活资料，由 ima 持续维护。"
                    )}
                </p>
                {!hasValidUrl ? (
                    <p
                        role="status"
                        className={`mt-7 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                            isDayMode
                                ? "bg-white/75 text-violet-800"
                                : "bg-white/[0.06] text-violet-200"
                        }`}
                    >
                        <AlertCircle aria-hidden="true" size={17} />
                        {t("community_libraries.ima_missing_note_short", "ima 分享地址尚未配置")}
                    </p>
                ) : null}
            </div>
        </section>
    );
};

const CommunityLibraryDock = ({ activeKey, isExpanded, isDayMode, onSelectLibrary, actionBar }) => {
    const { t } = useTranslation();
    const shouldReduceMotion = useReducedMotion();
    const transition = shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 330, damping: 34, mass: 0.85 };

    return (
        <motion.section
            layout={!shouldReduceMotion}
            transition={transition}
            aria-labelledby="community-dock-title"
            className={`relative z-20 overflow-hidden border shadow-2xl ${
                isExpanded
                    ? "mx-auto w-full max-w-[1480px] rounded-[1.75rem] p-3 md:p-4"
                    : "sticky top-[calc(env(safe-area-inset-top)+3.5rem)] mx-auto w-full max-w-[1480px] rounded-2xl p-2.5 backdrop-blur-xl md:top-20 md:p-3"
            } ${
                isDayMode
                    ? "border-slate-200 bg-white/90 shadow-slate-300/35"
                    : "border-white/10 bg-[#070b16]/90 shadow-black/40"
            }`}
        >
            <h1 id="community-dock-title" className="sr-only">
                {t("community_libraries.dock_title", "AI 社区功能入口")}
            </h1>
            <motion.div
                layout={!shouldReduceMotion}
                transition={transition}
                role="navigation"
                aria-label={t("community_libraries.library_nav", "AI 社区功能入口")}
                className={
                    isExpanded
                        ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                        : "grid grid-cols-4 gap-1.5 md:flex md:gap-2 md:overflow-x-auto md:pb-0.5"
                }
            >
                {DOCK_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeKey === item.key;
                    return (
                        <motion.button
                            layout={!shouldReduceMotion}
                            transition={transition}
                            key={item.key}
                            type="button"
                            onClick={() => onSelectLibrary(item.key)}
                            aria-current={isActive ? "page" : undefined}
                            className={`group relative shrink-0 overflow-hidden border text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                                isExpanded
                                    ? "min-h-[330px] rounded-[1.45rem] p-6 md:min-h-[390px] md:p-7 xl:min-h-[450px]"
                                    : "min-h-16 w-full rounded-xl px-1.5 py-2 md:min-h-14 md:w-[190px] md:px-3.5 md:py-2.5"
                            } ${
                                isActive
                                    ? isDayMode
                                        ? "border-violet-400 bg-violet-50 text-violet-950"
                                        : "border-violet-300/55 bg-violet-400/15 text-white"
                                    : isDayMode
                                      ? "border-slate-200 bg-slate-50/80 text-slate-950 hover:border-violet-300 hover:bg-white"
                                      : "border-white/10 bg-white/[0.04] text-white hover:border-violet-300/35 hover:bg-white/[0.065]"
                            }`}
                        >
                            <motion.div
                                layout="position"
                                transition={transition}
                                className="relative z-10"
                            >
                                {isExpanded ? (
                                    <>
                                        <div className="flex items-center justify-between text-xs font-black tracking-[0.16em] text-slate-400">
                                            <span>{t(`community_libraries.${item.metaKey}`)}</span>
                                            <span>{item.mark}</span>
                                        </div>
                                        <div className="mt-8">
                                            <DockArtwork itemKey={item.key} isDayMode={isDayMode} />
                                        </div>
                                        <h2 className="mt-5 text-3xl font-black tracking-[-0.035em] md:text-4xl">
                                            {t(`community_libraries.${item.titleKey}`)}
                                        </h2>
                                        <p
                                            className={`mt-3 min-h-12 text-sm leading-6 ${
                                                isDayMode ? "text-slate-600" : "text-slate-300"
                                            }`}
                                        >
                                            {t(`community_libraries.${item.descriptionKey}`)}
                                        </p>
                                        <span className="mt-7 inline-flex items-center gap-2 text-sm font-black text-violet-400">
                                            {t("community_libraries.enter_action", "进入")}
                                            <ArrowRight
                                                aria-hidden="true"
                                                size={16}
                                                className="transition-transform group-hover:translate-x-1"
                                            />
                                        </span>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-1.5 text-center md:flex-row md:gap-3 md:text-left">
                                        <span
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg md:h-9 md:w-9 ${
                                                isActive
                                                    ? "bg-violet-600 text-white"
                                                    : isDayMode
                                                      ? "bg-white text-violet-700"
                                                      : "bg-white/[0.07] text-violet-300"
                                            }`}
                                        >
                                            <Icon aria-hidden="true" size={17} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-xs font-black leading-tight md:truncate md:text-sm">
                                                {t(`community_libraries.${item.titleKey}`)}
                                            </span>
                                            <span
                                                className={`mt-0.5 hidden text-xs font-bold tracking-[0.08em] md:block ${
                                                    isDayMode ? "text-slate-500" : "text-slate-400"
                                                }`}
                                            >
                                                {item.mark}
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                            {isExpanded ? (
                                <span
                                    aria-hidden="true"
                                    className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl transition-colors group-hover:bg-violet-400/20"
                                />
                            ) : null}
                        </motion.button>
                    );
                })}
            </motion.div>
            {!isExpanded && actionBar ? (
                <motion.div
                    initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                        duration: shouldReduceMotion ? 0 : 0.24,
                        delay: shouldReduceMotion ? 0 : 0.16,
                    }}
                    className={`mt-2 border-t pt-2.5 ${
                        isDayMode ? "border-slate-200" : "border-white/10"
                    }`}
                >
                    {actionBar}
                </motion.div>
            ) : null}
        </motion.section>
    );
};

export default CommunityLibraryDock;
