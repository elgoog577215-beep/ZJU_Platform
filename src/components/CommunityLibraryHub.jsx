import {
    ArrowLeft,
    ArrowRight,
    AlertCircle,
    ExternalLink,
    MessageCircleQuestion,
    Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/*
THESIS: AI 社区首先是一座由运营者持续整理的专题书架，不是假装无限供给的信息流。
OWN-WORLD: 继承生态靛蓝、昼夜语义表面和硬朗内容排版，以大字专题封面代替通用图标卡片。
STORY: 用户先判断自己要解决新生、期末还是 AI 学习问题，再进入对应资料库或参与共建。
FIRST VIEWPORT: 左侧新生主专题占据最大面积，右侧期末与 AI 学习纵向承接，次级共建入口置于其后。
FORM: 现有视觉世界内的非对称编辑书架；精确扩展，无 concept seed。
*/

const isSafeExternalUrl = (value) => {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

const LibraryAction = ({ children }) => (
    <span className="mt-7 inline-flex items-center gap-2 text-sm font-black">
        {children}
        <ArrowRight
            aria-hidden="true"
            size={17}
            className="transition-transform duration-200 group-hover:translate-x-1"
        />
    </span>
);

export const CommunityLibraryHome = ({
    isDayMode,
    onSelectLibrary,
    onOpenContribution,
    onOpenDiscussion,
}) => {
    const { t } = useTranslation();

    const surfaceClass = isDayMode
        ? "border-slate-200 bg-white text-slate-950 hover:border-violet-300"
        : "border-white/10 bg-slate-950/70 text-white hover:border-violet-300/45";
    const mutedClass = isDayMode ? "text-slate-600" : "text-slate-300";
    const quietSurfaceClass = isDayMode
        ? "border-slate-200 bg-white/80 text-slate-900 hover:border-violet-300 hover:bg-white"
        : "border-white/10 bg-white/[0.035] text-white hover:border-violet-300/40 hover:bg-white/[0.055]";

    return (
        <div className="mx-auto w-full max-w-[1480px]">
            <header className="flex flex-col gap-5 pb-7 pt-2 md:flex-row md:items-end md:justify-between md:pb-10">
                <div className="max-w-4xl">
                    <p
                        className={`text-xs font-black tracking-[0.18em] ${isDayMode ? "text-violet-700" : "text-violet-300"}`}
                    >
                        {t("community_libraries.kicker", "AI COMMUNITY · CURATED LIBRARIES")}
                    </p>
                    <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.03] tracking-[-0.03em] md:text-6xl">
                        {t("community_libraries.title", "少一点栏目，做三座真正有用的资料库")}
                    </h1>
                    <p className={`mt-4 max-w-2xl text-base leading-7 md:text-lg ${mutedClass}`}>
                        {t(
                            "community_libraries.subtitle",
                            "我们持续筛选、整理和维护真正能解决问题的资料。"
                        )}
                    </p>
                </div>
                <div
                    className={`w-fit border-y py-3 text-sm font-bold ${
                        isDayMode
                            ? "border-slate-300 text-slate-600"
                            : "border-white/15 text-slate-300"
                    }`}
                >
                    {t("community_libraries.topic_count", "3 个长期专题")}
                </div>
            </header>

            <section
                aria-label={t("community_libraries.library_nav", "精选资料库")}
                className="grid gap-3 lg:grid-cols-[1.16fr_0.84fr] lg:grid-rows-2"
            >
                <button
                    type="button"
                    onClick={() => onSelectLibrary("freshman")}
                    className={`group relative min-h-[310px] overflow-hidden rounded-2xl border p-6 text-left transition-[border-color,transform,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 md:min-h-[420px] md:p-9 lg:row-span-2 ${
                        isDayMode
                            ? "border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400 hover:bg-violet-100/75"
                            : "border-violet-300/20 bg-violet-400/[0.09] text-white hover:border-violet-300/45 hover:bg-violet-400/[0.13]"
                    }`}
                    aria-label={t("community_libraries.freshman_open_aria", "查看新生资料库")}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute -bottom-14 right-1 text-[15rem] font-black leading-none tracking-[-0.08em] md:-bottom-20 md:text-[22rem] ${
                            isDayMode ? "text-violet-200/65" : "text-violet-200/[0.055]"
                        }`}
                    >
                        {t("community_libraries.freshman_mark", "新")}
                    </span>
                    <div className="relative z-10 flex h-full max-w-xl flex-col justify-between">
                        <div>
                            <span
                                className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-black ${
                                    isDayMode
                                        ? "border-violet-300 bg-white/70 text-violet-800"
                                        : "border-violet-200/20 bg-white/[0.055] text-violet-200"
                                }`}
                            >
                                {t("community_libraries.freshman_meta", "外部资料库 · ima")}
                            </span>
                            <h2 className="mt-8 text-4xl font-black tracking-[-0.03em] md:text-6xl">
                                {t("community_libraries.freshman_title", "新生资料库")}
                            </h2>
                            <p
                                className={`mt-4 max-w-lg text-base leading-7 md:text-lg ${
                                    isDayMode ? "text-violet-950/75" : "text-violet-100/80"
                                }`}
                            >
                                {t(
                                    "community_libraries.freshman_desc",
                                    "面向刚进入校园的同学，把入学准备、学习与校园生活资料集中整理。"
                                )}
                            </p>
                        </div>
                        <LibraryAction>
                            {t("community_libraries.freshman_action", "先看资料库介绍")}
                        </LibraryAction>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onSelectLibrary("finals")}
                    className={`group relative min-h-[230px] overflow-hidden rounded-2xl border p-6 text-left transition-[border-color,transform,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 md:p-8 ${surfaceClass}`}
                    aria-label={t("community_libraries.finals_open_aria", "打开期末资料库")}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute -bottom-9 right-3 text-[10rem] font-black leading-none tracking-[-0.08em] ${
                            isDayMode ? "text-slate-100" : "text-white/[0.035]"
                        }`}
                    >
                        {t("community_libraries.finals_mark", "考")}
                    </span>
                    <div className="relative z-10 max-w-xl">
                        <span
                            className={`text-xs font-black ${isDayMode ? "text-violet-700" : "text-violet-300"}`}
                        >
                            {t("community_libraries.finals_meta", "站内资料 · 按课程筛选")}
                        </span>
                        <h2 className="mt-4 text-3xl font-black tracking-[-0.025em] md:text-4xl">
                            {t("community_libraries.finals_title", "期末资料库")}
                        </h2>
                        <p className={`mt-3 max-w-lg text-sm leading-6 md:text-base ${mutedClass}`}>
                            {t(
                                "community_libraries.finals_desc",
                                "按课程、教师和学期查找复习资料，也可以把自己的资料留给后来者。"
                            )}
                        </p>
                        <LibraryAction>
                            {t("community_libraries.finals_action", "按课程查资料")}
                        </LibraryAction>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => onSelectLibrary("ai")}
                    className={`group relative min-h-[230px] overflow-hidden rounded-2xl border p-6 text-left transition-[border-color,transform,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 md:p-8 ${surfaceClass}`}
                    aria-label={t("community_libraries.ai_open_aria", "打开 AI 学习库")}
                >
                    <span
                        aria-hidden="true"
                        className={`absolute -bottom-9 right-3 text-[8.5rem] font-black leading-none tracking-[-0.08em] ${
                            isDayMode ? "text-slate-100" : "text-white/[0.035]"
                        }`}
                    >
                        {t("community_libraries.ai_mark", "AI")}
                    </span>
                    <div className="relative z-10 max-w-xl">
                        <span
                            className={`text-xs font-black ${isDayMode ? "text-violet-700" : "text-violet-300"}`}
                        >
                            {t("community_libraries.ai_meta", "站内精选 · 学习路径")}
                        </span>
                        <h2 className="mt-4 text-3xl font-black tracking-[-0.025em] md:text-4xl">
                            {t("community_libraries.ai_title", "AI 学习库")}
                        </h2>
                        <p className={`mt-3 max-w-lg text-sm leading-6 md:text-base ${mutedClass}`}>
                            {t(
                                "community_libraries.ai_desc",
                                "只展示已经整理好的教程、工具和案例，不用空栏目制造内容规模。"
                            )}
                        </p>
                        <LibraryAction>
                            {t("community_libraries.ai_action", "进入学习库")}
                        </LibraryAction>
                    </div>
                </button>
            </section>

            <section className="mt-10 md:mt-14" aria-labelledby="community-contribute-title">
                <div className="flex flex-col gap-2 border-b pb-4 md:flex-row md:items-end md:justify-between">
                    <h2 id="community-contribute-title" className="text-xl font-black md:text-2xl">
                        {t("community_libraries.contribute_title", "一起把资料做得更有用")}
                    </h2>
                    <p className={`text-sm ${mutedClass}`}>
                        {t(
                            "community_libraries.contribute_desc",
                            "资料进入同一套投稿、审核和归属链。"
                        )}
                    </p>
                </div>
                <div className="grid md:grid-cols-2">
                    <button
                        type="button"
                        onClick={onOpenContribution}
                        className={`group flex min-h-24 items-center justify-between gap-5 border-b px-1 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:border-r md:px-5 ${quietSurfaceClass}`}
                    >
                        <span className="flex items-center gap-4">
                            <Upload aria-hidden="true" size={22} />
                            <span>
                                <span className="block font-black">
                                    {t("community_libraries.submit_title", "提交一份资料")}
                                </span>
                                <span className={`mt-1 block text-sm ${mutedClass}`}>
                                    {t(
                                        "community_libraries.submit_desc",
                                        "进入现有资料上传与审核流程"
                                    )}
                                </span>
                            </span>
                        </span>
                        <ArrowRight aria-hidden="true" size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={onOpenDiscussion}
                        className={`group flex min-h-24 items-center justify-between gap-5 border-b px-1 py-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 md:px-5 ${quietSurfaceClass}`}
                    >
                        <span className="flex items-center gap-4">
                            <MessageCircleQuestion aria-hidden="true" size={22} />
                            <span>
                                <span className="block font-black">
                                    {t("community_libraries.discuss_title", "提出问题或交流")}
                                </span>
                                <span className={`mt-1 block text-sm ${mutedClass}`}>
                                    {t("community_libraries.discuss_desc", "进入求助与同伴讨论")}
                                </span>
                            </span>
                        </span>
                        <ArrowRight aria-hidden="true" size={18} />
                    </button>
                </div>
            </section>
        </div>
    );
};

export const FreshmanLibraryIntro = ({ isDayMode, onBack }) => {
    const { t } = useTranslation();
    const configuredUrl = String(import.meta.env.VITE_AI_COMMUNITY_FRESHMAN_IMA_URL || "").trim();
    const hasValidUrl = isSafeExternalUrl(configuredUrl);

    return (
        <div className="mx-auto w-full max-w-6xl">
            <button
                type="button"
                onClick={onBack}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    isDayMode
                        ? "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                        : "text-slate-200 hover:bg-white/[0.06] hover:text-white"
                }`}
            >
                <ArrowLeft aria-hidden="true" size={18} />
                {t("community_libraries.back", "返回资料库首页")}
            </button>

            <div
                className={`relative mt-5 overflow-hidden rounded-2xl border p-6 md:p-10 ${
                    isDayMode
                        ? "border-violet-200 bg-violet-50/90 text-violet-950"
                        : "border-violet-300/20 bg-violet-400/[0.085] text-white"
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`absolute -bottom-16 right-2 text-[16rem] font-black leading-none tracking-[-0.08em] md:text-[24rem] ${
                        isDayMode ? "text-violet-200/60" : "text-violet-200/[0.045]"
                    }`}
                >
                    {t("community_libraries.freshman_mark", "新")}
                </span>
                <div className="relative z-10 max-w-3xl">
                    <span
                        className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-black ${
                            isDayMode
                                ? "border-violet-300 bg-white/70 text-violet-800"
                                : "border-violet-200/20 bg-white/[0.055] text-violet-200"
                        }`}
                    >
                        {t("community_libraries.freshman_meta", "外部资料库 · ima")}
                    </span>
                    <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.03em] md:text-6xl">
                        {t("community_libraries.freshman_title", "新生资料库")}
                    </h1>
                    <p
                        className={`mt-5 max-w-2xl text-base leading-7 md:text-lg ${
                            isDayMode ? "text-violet-950/75" : "text-violet-100/80"
                        }`}
                    >
                        {t(
                            "community_libraries.freshman_intro",
                            "面向刚进入校园的同学，先用一页了解资料范围，再前往 ima 查看持续维护的完整内容。"
                        )}
                    </p>

                    <div
                        className="mt-9 grid gap-3 sm:grid-cols-3"
                        aria-label={t("community_libraries.freshman_scope", "资料范围")}
                    >
                        {["prepare", "study", "campus"].map((scope) => (
                            <div
                                key={scope}
                                className={`border-t pt-3 text-sm font-bold ${
                                    isDayMode
                                        ? "border-violet-300 text-violet-950/80"
                                        : "border-white/15 text-slate-200"
                                }`}
                            >
                                {t(`community_libraries.freshman_scope_${scope}`)}
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex flex-col items-start gap-3">
                        {hasValidUrl ? (
                            <a
                                href={configuredUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 text-sm font-black text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                            >
                                {t("community_libraries.open_ima", "打开 ima 资料库")}
                                <ExternalLink aria-hidden="true" size={18} />
                            </a>
                        ) : (
                            <button
                                type="button"
                                disabled
                                className={`inline-flex min-h-12 cursor-not-allowed items-center justify-center gap-2 rounded-lg px-5 text-sm font-black ${
                                    isDayMode
                                        ? "bg-slate-200 text-slate-500"
                                        : "bg-white/10 text-slate-400"
                                }`}
                            >
                                {t("community_libraries.ima_pending", "资料库链接待配置")}
                                <ExternalLink aria-hidden="true" size={18} />
                            </button>
                        )}
                        <p
                            role={hasValidUrl ? undefined : "status"}
                            className={`inline-flex items-start gap-2 text-sm leading-6 ${
                                isDayMode ? "text-violet-950/70" : "text-violet-100/75"
                            }`}
                        >
                            {!hasValidUrl ? (
                                <AlertCircle
                                    aria-hidden="true"
                                    className="mt-0.5 shrink-0"
                                    size={17}
                                />
                            ) : null}
                            {hasValidUrl
                                ? t(
                                      "community_libraries.ima_external_note",
                                      "将在新标签页打开 ima，当前页面会保留。"
                                  )
                                : t(
                                      "community_libraries.ima_missing_note",
                                      "具体分享地址尚未配置，请稍后再试或返回资料库首页。"
                                  )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CommunityLibraryDetailHeader = ({ isDayMode, title, description, onBack }) => {
    const { t } = useTranslation();

    return (
        <header className="mb-4 flex flex-col gap-4 border-b pb-5 md:mb-6 md:flex-row md:items-end md:justify-between md:pb-6">
            <div>
                <button
                    type="button"
                    onClick={onBack}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                        isDayMode
                            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                    }`}
                >
                    <ArrowLeft aria-hidden="true" size={17} />
                    <span>{t("community_libraries.back", "返回资料库首页")}</span>
                </button>
                <h1 className="mt-3 text-3xl font-black tracking-[-0.03em] md:text-5xl">{title}</h1>
                <p
                    className={`mt-2 max-w-3xl text-sm leading-6 md:text-base ${isDayMode ? "text-slate-600" : "text-slate-300"}`}
                >
                    {description}
                </p>
            </div>
        </header>
    );
};

export default CommunityLibraryHome;
