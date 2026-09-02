import { useCallback, useEffect, useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import SEO from "./SEO";
import {
    CommunityWorkspaceBackButton,
    CommunityWorkspaceToolbar,
    FreshmanLibraryIntro,
} from "./CommunityLibraryHub";
import CommunityLibraryDock from "./CommunityLibraryHub";
import CommunityPosts from "./CommunityPosts";
import SalonExchange from "./SalonExchange";

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
    freshman: [""],
    finals: ["resources"],
    ai: ["learn", "resources"],
    community: ["discuss"],
    salon: ["salon"],
};

const FINALS_MATERIAL_SCOPE = ["course"];
const AI_MATERIAL_SCOPE = ["ai", "other"];

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
    const shouldReduceMotion = useReducedMotion();

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
    const expectedLibraryAreas = LIBRARY_AREAS[configuredLibrary];
    const activeLibrary =
        Object.prototype.hasOwnProperty.call(LIBRARY_AREAS, configuredLibrary) &&
        (!requestedArea || expectedLibraryAreas.includes(requestedArea))
            ? configuredLibrary
            : "";
    const hasDirectCommunityState = ["area", "postTab", "tab", "id", "post", "news", "group"].some(
        (key) => searchParams.has(key)
    );
    const showLibraryHome = !activeLibrary && !hasDirectCommunityState;
    const selectedDockKey =
        (activeLibrary === "community" ? "" : activeLibrary) ||
        (requestedArea === "resources"
            ? "finals"
            : requestedArea === "learn"
              ? "ai"
              : requestedArea === "salon"
                ? "salon"
                : "");

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
        const requestedType = searchParams.get("type");
        const expectedType =
            activeLibrary === "finals" && requestedArea === "resources"
                ? "course"
                : activeLibrary === "ai" && requestedArea === "resources"
                  ? AI_MATERIAL_SCOPE.includes(requestedType)
                      ? requestedType
                      : "ai"
                  : "";
        if (!expectedType || requestedType === expectedType) return;
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                next.set("type", expectedType);
                return next;
            },
            { replace: true }
        );
    }, [activeLibrary, requestedArea, searchParams, setSearchParams]);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }, [activeLibrary, showLibraryHome]);

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
                return;
            }
            if (library === "salon") {
                setCommunityView({ library: "salon", area: "salon" });
            }
        },
        [setCommunityView]
    );

    const handleBackToLibraries = useCallback(() => {
        setCommunityView();
    }, [setCommunityView]);

    const dispatchComposer = useCallback((boardKey) => {
        window.dispatchEvent(
            new CustomEvent("open-community-composer", {
                detail: { boardKey },
            })
        );
    }, []);

    const handleUpload = useCallback(() => {
        dispatchComposer("materials");
    }, [dispatchComposer]);

    const renderCommunityContent = () => {
        if (showLibraryHome) return null;

        if (activeLibrary === "freshman") {
            return <FreshmanLibraryIntro isDayMode={isDayMode} />;
        }

        if (activeLibrary === "finals") {
            return (
                <CommunityPosts
                    areaOverride="resources"
                    hideAreaNav
                    materialTypeScope={FINALS_MATERIAL_SCOPE}
                />
            );
        }

        if (activeLibrary === "ai") {
            return requestedArea === "resources" ? (
                <CommunityPosts
                    areaOverride="resources"
                    hideAreaNav
                    materialTypeScope={AI_MATERIAL_SCOPE}
                />
            ) : (
                <CommunityPosts areaOverride="learn" hideAreaNav />
            );
        }

        if (activeLibrary === "salon") {
            return <SalonExchange />;
        }

        if (activeLibrary === "community") {
            return <CommunityPosts areaOverride="discuss" hideAreaNav />;
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
                <CommunityLibraryDock
                    activeKey={selectedDockKey}
                    isExpanded={showLibraryHome}
                    isDayMode={isDayMode}
                    onSelectLibrary={handleSelectLibrary}
                    backButton={
                        showLibraryHome ? null : (
                            <CommunityWorkspaceBackButton
                                isDayMode={isDayMode}
                                onBack={handleBackToLibraries}
                            />
                        )
                    }
                    actionBar={
                        !showLibraryHome && ["freshman", "finals"].includes(selectedDockKey) ? (
                            <CommunityWorkspaceToolbar
                                activeKey={selectedDockKey}
                                isDayMode={isDayMode}
                                onUpload={handleUpload}
                            />
                        ) : null
                    }
                />

                <AnimatePresence mode="wait" initial={false}>
                    {!showLibraryHome ? (
                        <motion.div
                            id="community-workspace-content"
                            key={selectedDockKey || requestedArea || "community-content"}
                            initial={
                                shouldReduceMotion
                                    ? false
                                    : { opacity: 0, y: 24, filter: "blur(5px)" }
                            }
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={
                                shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { opacity: 0, y: 12, filter: "blur(3px)" }
                            }
                            transition={{
                                duration: shouldReduceMotion ? 0 : 0.34,
                                delay: shouldReduceMotion ? 0 : 0.1,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="mx-auto mt-4 w-full max-w-[1480px] md:mt-6"
                        >
                            {renderCommunityContent()}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>
        </section>
    );
};

export default AICommunity;
