import {
    AlertCircle,
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    Bot,
    ExternalLink,
    GraduationCap,
    MessageCircleQuestion,
    Search,
    Upload,
    Users,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

/*
THESIS: 同一组四个入口从沉浸式选择界面收缩为工作区顶部栏目，状态变化不替换用户的空间记忆。
OWN-WORLD: 四类知识流在同一张深海工作台上汇聚，不借用应用商店式等分卡片模板。
STORY: 先选择问题域，再在不离开同一页面的情况下搜索、上传、提问和使用真实内容。
FIRST VIEWPORT: 初始首屏只有四个丰富的功能入口；进入后，入口收拢，真实操作与内容接管首屏。
FORM: 不对称知识汇流台；保留渐进式收拢交互，以任务图形和空间层级建立四个入口的差异。
*/

const DOCK_ITEMS = [
    {
        key: "freshman",
        icon: GraduationCap,
        titleKey: "freshman_title",
        metaKey: "freshman_meta",
        descriptionKey: "freshman_dock_desc",
        layoutClass: "xl:col-span-4",
        toneClass: "community-dock-card--freshman",
    },
    {
        key: "finals",
        icon: BookOpen,
        titleKey: "finals_title",
        metaKey: "finals_meta",
        descriptionKey: "finals_dock_desc",
        layoutClass: "xl:col-span-3",
        toneClass: "community-dock-card--finals",
    },
    {
        key: "ai",
        icon: Bot,
        titleKey: "ai_title",
        metaKey: "ai_meta",
        descriptionKey: "ai_dock_desc",
        layoutClass: "xl:col-span-5 xl:row-span-2",
        toneClass: "community-dock-card--ai",
    },
    {
        key: "community",
        icon: Users,
        titleKey: "community_title",
        metaKey: "community_meta",
        descriptionKey: "community_dock_desc",
        layoutClass: "xl:col-span-7",
        toneClass: "community-dock-card--community",
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

const DockArtwork = ({ itemKey }) => {
    if (itemKey === "freshman") {
        return (
            <div aria-hidden="true" className="community-dock-art community-dock-art--freshman">
                <svg viewBox="0 0 320 168" role="presentation">
                    <path className="dock-route dock-route--muted" d="M20 32H98L138 72H214" />
                    <path className="dock-route" d="M28 132H94L138 88H230" />
                    <path className="dock-route dock-route--muted" d="M72 18V54L118 100V148" />
                    <circle className="dock-node dock-node--soft" cx="20" cy="32" r="6" />
                    <circle className="dock-node" cx="28" cy="132" r="7" />
                    <circle className="dock-node dock-node--soft" cx="72" cy="18" r="5" />
                    <circle className="dock-node dock-node--core" cx="138" cy="80" r="18" />
                    <rect className="dock-terminal" x="208" y="52" width="82" height="58" rx="14" />
                    <path className="dock-terminal-line" d="M226 72H270M226 88H256" />
                </svg>
            </div>
        );
    }

    if (itemKey === "finals") {
        return (
            <div aria-hidden="true" className="community-dock-art community-dock-art--finals">
                <svg viewBox="0 0 260 168" role="presentation">
                    <rect
                        className="exam-sheet exam-sheet--back"
                        x="46"
                        y="20"
                        width="128"
                        height="112"
                        rx="16"
                    />
                    <rect className="exam-sheet" x="68" y="36" width="140" height="112" rx="16" />
                    <path className="exam-line" d="M92 66H176M92 86H162M92 106H184" />
                    <path className="exam-scan" d="M78 118H198" />
                    <circle className="exam-target" cx="208" cy="42" r="17" />
                    <path className="exam-target-line" d="M220 54L238 72" />
                </svg>
            </div>
        );
    }

    if (itemKey === "ai") {
        return (
            <div aria-hidden="true" className="community-dock-art community-dock-art--ai">
                <svg viewBox="0 0 420 320" role="presentation">
                    <circle className="ai-orbit ai-orbit--outer" cx="210" cy="150" r="126" />
                    <circle className="ai-orbit" cx="210" cy="150" r="82" />
                    <path
                        className="ai-link"
                        d="M210 68L292 128M210 68L132 132M132 132L168 224M292 128L258 230M168 224H258"
                    />
                    <circle className="ai-node ai-node--cyan" cx="210" cy="68" r="14" />
                    <circle className="ai-node ai-node--violet" cx="132" cy="132" r="19" />
                    <circle className="ai-node ai-node--blue" cx="292" cy="128" r="17" />
                    <circle className="ai-node ai-node--soft" cx="168" cy="224" r="11" />
                    <circle className="ai-node ai-node--soft" cx="258" cy="230" r="13" />
                    <circle className="ai-core" cx="210" cy="150" r="42" />
                    <path
                        className="ai-core-mark"
                        d="M188 164L210 124L232 164M197 151H223M246 126V174"
                    />
                    <path className="ai-signal" d="M64 270H162M258 270H356" />
                    <circle className="ai-signal-node" cx="210" cy="270" r="5" />
                </svg>
            </div>
        );
    }

    return (
        <div aria-hidden="true" className="community-dock-art community-dock-art--community">
            <svg viewBox="0 0 420 168" role="presentation">
                <path
                    className="community-flow community-flow--one"
                    d="M18 28C100 28 106 76 188 76"
                />
                <path className="community-flow community-flow--two" d="M18 84H188" />
                <path
                    className="community-flow community-flow--three"
                    d="M18 140C100 140 106 92 188 92"
                />
                <circle className="community-source community-source--one" cx="18" cy="28" r="7" />
                <circle className="community-source community-source--two" cx="18" cy="84" r="8" />
                <circle
                    className="community-source community-source--three"
                    cx="18"
                    cy="140"
                    r="6"
                />
                <rect className="community-hub" x="184" y="48" width="112" height="72" rx="24" />
                <path className="community-hub-mark" d="M210 76H270M210 94H252" />
                <path className="community-output" d="M296 84H394" />
                <circle className="community-output-node" cx="394" cy="84" r="10" />
            </svg>
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
            className={`relative z-20 ${
                isExpanded
                    ? "community-dock-shell community-dock-shell--expanded mx-auto w-full max-w-[1480px]"
                    : "community-dock-shell community-dock-shell--compact sticky top-[calc(env(safe-area-inset-top)+3.5rem)] mx-auto w-full max-w-[1480px] overflow-hidden rounded-2xl border p-2.5 backdrop-blur-xl md:top-20 md:p-2.5"
            } ${
                isExpanded
                    ? ""
                    : isDayMode
                      ? "border-slate-200 bg-white/[0.92]"
                      : "border-white/10 bg-[#070b16]/[0.92]"
            }`}
        >
            <h1 id="community-dock-title" className="sr-only">
                {t("community_libraries.dock_title", "AI 社区功能入口")}
            </h1>
            <div className={isExpanded ? undefined : "lg:flex lg:items-center lg:gap-2.5"}>
                <motion.div
                    layout={!shouldReduceMotion}
                    transition={transition}
                    role="navigation"
                    aria-label={t("community_libraries.library_nav", "AI 社区功能入口")}
                    className={
                        isExpanded
                            ? "community-dock-grid grid grid-cols-2 gap-3 xl:grid-cols-12 xl:grid-rows-2"
                            : "grid min-w-0 grid-cols-4 gap-1.5 lg:flex lg:flex-1 lg:gap-1.5"
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
                                className={`group relative shrink-0 overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                                    isExpanded
                                        ? `community-dock-card min-h-[252px] rounded-2xl p-4 sm:min-h-[306px] sm:p-5 md:p-6 xl:min-h-0 ${item.layoutClass} ${item.toneClass}`
                                        : "min-h-16 w-full rounded-xl px-1.5 py-2 md:min-h-12 md:min-w-[118px] md:flex-1 md:px-3 md:py-2"
                                } ${
                                    isExpanded
                                        ? isDayMode
                                            ? "text-slate-950"
                                            : "text-white"
                                        : isActive
                                          ? isDayMode
                                              ? "bg-violet-600 text-white"
                                              : "bg-violet-500/20 text-white"
                                          : isDayMode
                                            ? "text-slate-600 hover:bg-slate-100 hover:text-violet-700"
                                            : "text-slate-400 hover:bg-white/[0.055] hover:text-white"
                                }`}
                            >
                                {isExpanded ? <DockArtwork itemKey={item.key} /> : null}
                                <motion.div
                                    layout="position"
                                    transition={transition}
                                    className={
                                        isExpanded
                                            ? "community-dock-card__content relative z-10 flex h-full flex-col"
                                            : "relative z-10"
                                    }
                                >
                                    {isExpanded ? (
                                        <>
                                            <span className="community-dock-meta inline-flex items-center gap-2 text-xs font-black tracking-[0.13em]">
                                                <span
                                                    aria-hidden="true"
                                                    className="h-1.5 w-1.5 rounded-full bg-current"
                                                />
                                                {t(`community_libraries.${item.metaKey}`)}
                                            </span>
                                            <div className="community-dock-copy mt-auto">
                                                <div className="flex items-end justify-between gap-4">
                                                    <h2 className="text-xl font-black tracking-[-0.035em] sm:text-3xl">
                                                        {t(`community_libraries.${item.titleKey}`)}
                                                    </h2>
                                                    <ArrowUpRight
                                                        aria-hidden="true"
                                                        size={21}
                                                        className="community-dock-arrow mb-1 shrink-0"
                                                    />
                                                </div>
                                                <p className="community-dock-description mt-2 hidden max-w-xl text-sm leading-6 sm:block">
                                                    {t(
                                                        `community_libraries.${item.descriptionKey}`
                                                    )}
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 text-center md:flex-row md:gap-2.5 md:text-left">
                                            <Icon
                                                aria-hidden="true"
                                                className="shrink-0"
                                                size={18}
                                            />
                                            <span className="block min-w-0 text-xs font-black leading-tight md:truncate md:text-sm">
                                                {t(`community_libraries.${item.titleKey}`)}
                                            </span>
                                        </div>
                                    )}
                                </motion.div>
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
                        className={`mt-2 border-t pt-2.5 lg:mt-0 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-2.5 lg:pt-0 ${
                            isDayMode ? "border-slate-200" : "border-white/10"
                        }`}
                    >
                        {actionBar}
                    </motion.div>
                ) : null}
            </div>
        </motion.section>
    );
};

export default CommunityLibraryDock;
