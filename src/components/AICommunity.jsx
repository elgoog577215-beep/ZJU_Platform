import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import {
    CommunityLibraryDetailHeader,
    CommunityLibraryHome,
    FreshmanLibraryIntro,
} from "./CommunityLibraryHub";
import CommunityPosts from "./CommunityPosts";

const LEGACY_TAB_TO_AREA = {
    tech: "learn",
    featured: "learn",
    materials: "resources",
    help: "discuss",
    news: "learn",
    team: "discuss",
    groups: "discuss",
    project: "learn",
};

const LEGACY_TAB_TO_LESSON = {
    tech: "prompt",
    featured: "prompt",
    news: "launch",
    project: "agent",
};

const LIBRARY_AREAS = {
    freshman: "",
    finals: "resources",
    ai: "learn",
};

const COMMUNITY_STATE_KEYS = [
    "library",
    "source",
    "area",
    "lesson",
    "level",
    "type",
    "id",
    "post",
    "news",
    "group",
    "postTab",
    "tab",
];

const AICommunity = () => {
    const { t } = useTranslation();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const [searchParams, setSearchParams] = useSearchParams();

    const subtitle = useMemo(
        () =>
            t(
                "community_libraries.seo_description",
                "AI 社区资料库：精选新生、期末和 AI 学习资料。"
            ),
        [t]
    );

    const configuredLibrary = searchParams.get("library");
    const requestedArea =
        searchParams.get("area") ||
        LEGACY_TAB_TO_AREA[searchParams.get("postTab") || searchParams.get("tab")] ||
        (searchParams.get("news") ? "learn" : "") ||
        (searchParams.get("group") ? "discuss" : "");
    const expectedLibraryArea = LIBRARY_AREAS[configuredLibrary];
    const activeLibrary =
        Object.prototype.hasOwnProperty.call(LIBRARY_AREAS, configuredLibrary) &&
        (!requestedArea || requestedArea === expectedLibraryArea)
            ? configuredLibrary
            : "";
    const hasDirectCommunityState = ["area", "postTab", "tab", "id", "post", "news", "group"].some(
        (key) => searchParams.has(key)
    );
    const isDiscussionFromHub =
        searchParams.get("source") === "libraries" && requestedArea === "discuss";
    const showLibraryHome = !activeLibrary && !hasDirectCommunityState;

    const migrateLegacyParams = useCallback(() => {
        const legacyTab = searchParams.get("postTab") || searchParams.get("tab");
        if (!legacyTab && !searchParams.get("news") && !searchParams.get("group")) return;

        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                const area =
                    LEGACY_TAB_TO_AREA[legacyTab] ||
                    (searchParams.get("group") ? "discuss" : "learn");
                next.set("area", area);
                if (area === "learn") {
                    next.set("lesson", LEGACY_TAB_TO_LESSON[legacyTab] || "basics");
                } else {
                    next.delete("lesson");
                }
                next.delete("postTab");
                next.delete("tab");
                next.delete("news");
                next.delete("group");
                return next;
            },
            { replace: true }
        );
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        migrateLegacyParams();
    }, [migrateLegacyParams]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [activeLibrary, isDiscussionFromHub, showLibraryHome]);

    const setCommunityView = useCallback(
        (values = {}) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    COMMUNITY_STATE_KEYS.forEach((key) => next.delete(key));
                    Object.entries(values).forEach(([key, value]) => {
                        if (value !== undefined && value !== null && value !== "") {
                            next.set(key, String(value));
                        }
                    });
                    return next;
                },
                { replace: false }
            );
        },
        [setSearchParams]
    );

    const handleSelectLibrary = useCallback(
        (library) => {
            if (library === "freshman") {
                setCommunityView({ library: "freshman" });
                return;
            }
            if (library === "finals") {
                setCommunityView({ library: "finals", area: "resources", type: "course" });
                return;
            }
            if (library === "ai") {
                setCommunityView({ library: "ai", area: "learn" });
            }
        },
        [setCommunityView]
    );

    const handleOpenDiscussion = useCallback(() => {
        setCommunityView({ source: "libraries", area: "discuss" });
    }, [setCommunityView]);

    const handleBackToLibraries = useCallback(() => {
        setCommunityView();
    }, [setCommunityView]);

    const renderCommunityContent = () => {
        if (showLibraryHome) {
            return (
                <CommunityLibraryHome
                    isDayMode={isDayMode}
                    onSelectLibrary={handleSelectLibrary}
                    onOpenContribution={() => handleSelectLibrary("finals")}
                    onOpenDiscussion={handleOpenDiscussion}
                />
            );
        }

        if (activeLibrary === "freshman") {
            return <FreshmanLibraryIntro isDayMode={isDayMode} onBack={handleBackToLibraries} />;
        }

        if (activeLibrary === "finals") {
            return (
                <>
                    <CommunityLibraryDetailHeader
                        isDayMode={isDayMode}
                        title={t("community_libraries.finals_title", "期末资料库")}
                        description={t(
                            "community_libraries.finals_detail_desc",
                            "按课程、教师、学期和资料用途查找，也可以上传自己的资料。"
                        )}
                        onBack={handleBackToLibraries}
                    />
                    <CommunityPosts areaOverride="resources" hideAreaNav />
                </>
            );
        }

        if (activeLibrary === "ai") {
            return (
                <>
                    <CommunityLibraryDetailHeader
                        isDayMode={isDayMode}
                        title={t("community_libraries.ai_title", "AI 学习库")}
                        description={t(
                            "community_libraries.ai_detail_desc",
                            "从已经整理好的内容开始，按主题和难度继续阅读。"
                        )}
                        onBack={handleBackToLibraries}
                    />
                    <CommunityPosts areaOverride="learn" hideAreaNav />
                </>
            );
        }

        if (isDiscussionFromHub) {
            return (
                <>
                    <CommunityLibraryDetailHeader
                        isDayMode={isDayMode}
                        title={t("community_libraries.discuss_title", "提出问题或交流")}
                        description={t(
                            "community_libraries.discuss_detail_desc",
                            "把具体问题、经验或学习卡点放进讨论区。"
                        )}
                        onBack={handleBackToLibraries}
                    />
                    <CommunityPosts areaOverride="discuss" hideAreaNav />
                </>
            );
        }

        return <CommunityPosts />;
    };

    return (
        <section
            className={`relative z-10 min-h-screen overflow-x-clip px-3 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-[calc(env(safe-area-inset-top)+64px)] sm:px-4 md:px-6 md:pb-20 md:pt-20 lg:pt-24 ${
                isDayMode ? "text-slate-950" : "text-white"
            }`}
        >
            <SEO
                title={t("community_libraries.meta_title", "AI 社区资料库")}
                description={subtitle}
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 z-0 hidden h-80 overflow-hidden md:block"
            >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,182,212,0.055),transparent)]" />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-[1680px]">
                {renderCommunityContent()}
            </div>
        </section>
    );
};

export default AICommunity;
