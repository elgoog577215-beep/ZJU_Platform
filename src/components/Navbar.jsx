import { Suspense, lazy, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Cloud,
    Clock,
    CloudRain,
    Sun,
    Moon,
    CloudLightning,
    CloudSnow,
    CloudFog,
    Search,
    LogOut,
    X,
    MapPin,
    Plus,
    Menu,
    Image as ImageIcon,
    Info,
    Shield,
    Smartphone,
    Trees,
    UserCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useSettings } from "../context/SettingsContext";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useBackClose } from "../hooks/useBackClose";
import { useWeather } from "../hooks/useWeather";
import {
    mobileSheet,
    modalBackdrop,
    modalContent,
    motionTokens,
    navEntrance,
    useReducedMotion,
} from "../utils/animations";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";

const Portal = ({ children }) => {
    return ReactDOM.createPortal(children, document.body);
};

const AuthModal = lazy(() => import("./AuthModal"));
const NotificationCenter = lazy(() => import("./NotificationCenter"));

const Navbar = ({ miniProgramMode = false }) => {
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const location = useLocation();
    const { t } = useTranslation();
    const { uiMode, changeUiMode, showWeatherWidget } = useSettings();
    const { user, logout, isAdmin } = useAuth();
    const isDesktopViewport = useMediaQuery("(min-width: 768px)", true);
    const [time, setTime] = useState(new Date());
    const prefersReducedMotion = useReducedMotion();
    const isDayMode = uiMode === "day";
    const weatherWidgetEnabled = showWeatherWidget && isDesktopViewport;
    const hideMobileTopBar = location.pathname === "/events";

    const {
        weather,
        city,
        isWeatherModalOpen,
        setIsWeatherModalOpen,
        searchQuery,
        setSearchQuery,
        isSearching,
        searchResults,
        handleCitySearch,
        selectCity,
    } = useWeather(undefined, undefined, { enabled: weatherWidgetEnabled });

    useBackClose(weatherWidgetEnabled && isWeatherModalOpen, () => setIsWeatherModalOpen(false));
    useBackClose(isMobileMoreOpen, () => setIsMobileMoreOpen(false));

    useEffect(() => {
        const openMobileMoreMenu = () => setIsMobileMoreOpen(true);
        window.addEventListener("open-mobile-more-menu", openMobileMoreMenu);
        return () => window.removeEventListener("open-mobile-more-menu", openMobileMoreMenu);
    }, []);

    // Clock
    useEffect(() => {
        if (!weatherWidgetEnabled) {
            return undefined;
        }

        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, [weatherWidgetEnabled]);

    useEffect(() => {
        if (!weatherWidgetEnabled && isWeatherModalOpen) {
            setIsWeatherModalOpen(false);
        }
    }, [weatherWidgetEnabled, isWeatherModalOpen, setIsWeatherModalOpen]);

    const getWeatherIcon = (code) => {
        if (code === 0 || code === 1) return <Sun size={14} className="text-yellow-400" />;
        if (code === 2 || code === 3) return <Cloud size={14} className="text-gray-400" />;
        if (code >= 45 && code <= 48) return <CloudFog size={14} className="text-gray-400" />;
        if (code >= 51 && code <= 67) return <CloudRain size={14} className="text-blue-400" />;
        if (code >= 71 && code <= 77) return <CloudSnow size={14} className="text-white" />;
        if (code >= 80 && code <= 82) return <CloudRain size={14} className="text-blue-500" />;
        if (code >= 95 && code <= 99)
            return <CloudLightning size={14} className="text-yellow-500" />;
        return <Cloud size={14} />;
    };

    const navLinks = [
        { key: "events", path: "/events" },
        { key: "articles", path: "/articles" },
        { key: "hackathon", path: "/hackathon" },
        { key: "about", path: "/about" },
        ...(!miniProgramMode && isAdmin ? [{ key: "admin", path: "/admin" }] : []),
    ];
    const isNavItemActive = (path) => {
        if (path === "/hackathon") {
            return (
                location.pathname.startsWith("/hackathon") ||
                location.pathname.startsWith("/projects") ||
                location.pathname.startsWith("/media") ||
                location.pathname.startsWith("/gallery") ||
                location.pathname.startsWith("/videos")
            );
        }
        return location.pathname === path;
    };
    const currentNavLink = navLinks.find((link) => isNavItemActive(link.path));
    const getMobileTitle = (pathname) => {
        if (pathname === "/") return t("nav.home");
        if (pathname.startsWith("/hackathon")) return t("nav.hackathon");
        if (pathname.startsWith("/events")) return t("nav.events");
        if (pathname.startsWith("/future-learning")) return t("nav.future_learning");
        if (pathname.startsWith("/articles")) return t("nav.articles");
        if (pathname.startsWith("/gallery")) return t("nav.gallery");
        if (pathname.startsWith("/videos")) return t("nav.videos");
        if (pathname.startsWith("/media")) return t("nav.media");
        if (pathname.startsWith("/projects")) return t("nav.projects");
        if (pathname.startsWith("/download")) return t("nav.download");
        if (pathname.startsWith("/me") || pathname.startsWith("/user/")) {
            return t("nav.me");
        }
        if (pathname.startsWith("/about")) return t("nav.about");
        if (pathname.startsWith("/admin")) return t("nav.admin");
        return currentNavLink?.key ? t(`nav.${currentNavLink.key}`) : "";
    };
    const mobileTitle = getMobileTitle(location.pathname);

    // Map route to specific upload type, and dispatch custom event
    const handleUploadClick = () => {
        if (!user) {
            toast.error(t("auth.signin_required"));
            setIsAuthOpen(true);
            return;
        }

        let type = "";
        if (location.pathname === "/events") type = "event";
        else if (location.pathname === "/gallery") type = "image";
        else if (location.pathname === "/media") type = "media";
        else if (location.pathname === "/videos") type = "video";

        if (type) {
            window.dispatchEvent(new CustomEvent("open-upload-modal", { detail: { type } }));
        }
    };

    const uploadablePaths = ["/events", "/gallery", "/media", "/videos"];
    const showUploadButton = uploadablePaths.includes(location.pathname);

    useEffect(() => {
        const openAuthModal = () => setIsAuthOpen(true);

        window.addEventListener("open-auth-modal", openAuthModal);
        return () => window.removeEventListener("open-auth-modal", openAuthModal);
    }, []);

    const shellClasses = isDayMode
        ? "bg-white/[0.82] border-slate-900/[0.08] shadow-none"
        : "bg-black/[0.78] border-white/10 shadow-none";
    const desktopNavTrackClasses = `flex shrink-0 items-center gap-0.5 rounded-[12px] border p-1 ${
        isDayMode
            ? "border-slate-200/80 bg-slate-950/[0.025]"
            : "border-white/[0.08] bg-white/[0.035]"
    }`;
    const navLinkClasses = (active) =>
        `motion-link relative group inline-flex min-h-8 items-center whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-xs font-semibold transition-[background,color,box-shadow] xl:px-3.5 xl:text-sm ${
            isDayMode
                ? active
                    ? "bg-white text-slate-950 shadow-[0_2px_8px_rgba(15,23,42,0.07)]"
                    : "text-slate-500 hover:bg-white/70 hover:text-slate-950"
                : active
                  ? "bg-white/[0.075] text-white shadow-[0_2px_10px_rgba(0,0,0,0.16)]"
                  : "text-slate-400 hover:bg-white/[0.045] hover:text-white"
        }`;
    const navIndicatorClasses = isDayMode
        ? "absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-violet-700"
        : "absolute inset-x-3 bottom-0 h-0.5 rounded-t-full bg-indigo-400";
    const desktopActionButtonBaseClasses =
        "motion-press inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] border px-3 text-xs font-extrabold transition-[background,border-color,color,transform,box-shadow] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70";
    const desktopSearchButtonClasses = `${desktopActionButtonBaseClasses} ${
        isDayMode
            ? "border-slate-200/90 bg-white text-slate-700 shadow-[0_2px_8px_rgba(15,23,42,0.06)] hover:border-violet-300 hover:bg-violet-50 hover:text-violet-800"
            : "border-white/[0.12] bg-white/[0.055] text-slate-200 hover:border-indigo-400/40 hover:bg-indigo-400/10 hover:text-white"
    }`;
    const desktopDownloadButtonClasses = `${desktopActionButtonBaseClasses} border-transparent ${
        isDayMode
            ? "bg-violet-700 text-white hover:bg-violet-800"
            : "bg-indigo-400 text-slate-950 hover:bg-indigo-300"
    }`;
    const desktopUtilityButtonClasses = `motion-press relative inline-flex h-9 w-9 items-center justify-center border-b border-transparent bg-transparent transition-[border-color,color,opacity] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
        isDayMode
            ? "text-slate-500 hover:border-violet-500/55 hover:text-slate-950"
            : "text-slate-400 hover:border-indigo-400/70 hover:text-white"
    }`;
    const weatherButtonClasses = `motion-press group flex items-center gap-3 border-b border-transparent bg-transparent px-2 py-2 text-xs transition-[border-color,color] ${
        isDayMode
            ? "text-slate-500 hover:border-violet-500/55 hover:text-slate-950"
            : "text-slate-400 hover:border-indigo-400/70 hover:text-white"
    }`;
    const authButtonClasses = `motion-press border-b border-transparent bg-transparent px-3 py-2 text-sm font-medium transition-[border-color,color] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${
        isDayMode
            ? "text-slate-600 hover:border-violet-500/55 hover:text-violet-800"
            : "text-slate-300 hover:border-indigo-400/70 hover:text-white"
    }`;
    const weatherModalClasses = isDayMode
        ? "theme-dialog text-slate-900"
        : "bg-[#1a1a1a] border border-white/10 shadow-2xl";
    const showMobileUploadAction = showUploadButton;
    const showMobileSearchAction =
        !location.pathname.startsWith("/me") && !location.pathname.startsWith("/user/");
    const secondaryMobileLinks = [
        { key: "about", path: "/about", icon: Info },
        ...(!miniProgramMode ? [{ key: "download", path: "/download", icon: Smartphone }] : []),
        ...(!miniProgramMode && isAdmin ? [{ key: "admin", path: "/admin", icon: Shield }] : []),
    ];
    const nextUiMode = isDayMode ? "dark" : "day";
    const themeToggleLabel = t(nextUiMode === "day" ? "nav.day_mode" : "nav.night_mode");
    const themeToggleTitle = `${t("nav.theme_settings")} - ${themeToggleLabel}`;
    const weatherTemperature = Number(weather?.temperature);
    const weatherTemperatureLabel = Number.isFinite(weatherTemperature)
        ? `${Math.round(weatherTemperature)}°C`
        : "--";

    return (
        <motion.nav
            variants={navEntrance}
            initial={prefersReducedMotion ? false : "initial"}
            animate={prefersReducedMotion ? undefined : "animate"}
            className={`motion-gpu fixed top-0 left-0 right-0 z-50 items-center justify-between px-3 md:px-6 pt-[calc(env(safe-area-inset-top)+0.625rem)] pb-2.5 md:py-3 border-b ${hideMobileTopBar ? "hidden md:flex" : "flex"} backdrop-blur-xl ${shellClasses}`}
            role="navigation"
            aria-label={t("nav.main_aria")}
        >
            <Link
                to="/"
                className="group z-50 hidden items-center gap-0 text-white lg:flex xl:gap-3"
                aria-label={t("nav.home_aria")}
            >
                <>
                    <div className="relative">
                        <div className="absolute inset-x-0 bottom-0 h-px bg-indigo-400/0 transition-colors duration-300 group-hover:bg-indigo-400/60" />
                        <img
                            src="/newlogo.png"
                            alt={t("nav.logo_alt")}
                            className="relative h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                    <div className="hidden flex-col items-start leading-none xl:flex">
                        <span
                            className={`text-lg font-bold tracking-tighter transition-colors duration-300 ${isDayMode ? "text-slate-950 group-hover:text-violet-800" : "text-white group-hover:text-indigo-200"}`}
                        >
                            {t("nav.site_brand")}
                        </span>
                        <span
                            className={`text-[10px] font-medium tracking-widest mt-0.5 transition-colors ${isDayMode ? "text-slate-500 group-hover:text-violet-700" : "text-gray-400 group-hover:text-indigo-400"}`}
                        >
                            {t("nav.site_tagline")}
                        </span>
                    </div>
                </>
            </Link>

            <div className="hidden min-w-0 items-center gap-1.5 lg:flex xl:gap-2">
                <div
                    className={desktopNavTrackClasses}
                    role="menubar"
                    aria-label={t("nav.menu_aria")}
                >
                    {navLinks.map((item) => (
                        <Link
                            key={item.key}
                            to={item.path}
                            className={navLinkClasses(isNavItemActive(item.path))}
                            role="menuitem"
                            aria-current={isNavItemActive(item.path) ? "page" : undefined}
                        >
                            <span className="relative z-10">
                                {item.label || t(`nav.${item.key}`)}
                            </span>
                            {isNavItemActive(item.path) &&
                                (prefersReducedMotion ? (
                                    <div className={navIndicatorClasses} />
                                ) : (
                                    <motion.div
                                        layoutId="navbar-indicator"
                                        className={navIndicatorClasses}
                                        transition={motionTokens.spring.tab}
                                    />
                                ))}
                        </Link>
                    ))}
                </div>

                <div className="ml-1 flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
                        className={desktopSearchButtonClasses}
                        title={t("nav.ai_search", "AI 搜索")}
                        aria-label={t("nav.ai_search", "AI 搜索")}
                    >
                        <Search size={15} aria-hidden="true" />
                        <span>{t("nav.ai_search", "AI 搜索")}</span>
                    </button>

                    {!miniProgramMode ? (
                        <Link
                            to="/download"
                            className={desktopDownloadButtonClasses}
                            aria-label={t("nav.download")}
                        >
                            <Smartphone size={15} aria-hidden="true" />
                            <span>{t("nav.download")}</span>
                        </Link>
                    ) : null}
                </div>

                <div
                    className={`mx-1.5 h-5 w-px ${isDayMode ? "bg-slate-200/80" : "bg-white/10"}`}
                    role="separator"
                />

                {showWeatherWidget && (
                    <button
                        onClick={() => setIsWeatherModalOpen(true)}
                        className={weatherButtonClasses}
                        aria-label={`天气信息：${city}，${weather ? weatherTemperatureLabel : "加载中"}`}
                    >
                        <div className="flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                            <Clock size={12} aria-hidden="true" />
                            <span>
                                {time.toLocaleTimeString("zh-CN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,
                                })}
                            </span>
                        </div>
                        <div
                            className={`w-px h-3 transition-colors ${isDayMode ? "bg-violet-100/80 group-hover:bg-violet-200/80" : "bg-white/10 group-hover:bg-indigo-500/30"}`}
                            role="separator"
                            aria-hidden="true"
                        />
                        <div className="flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
                            {weather ? (
                                getWeatherIcon(weather.weathercode)
                            ) : (
                                <Cloud size={12} aria-hidden="true" />
                            )}
                            <span>{weather ? weatherTemperatureLabel : "..."}</span>
                        </div>
                        <div
                            className={`w-px h-3 transition-colors ${isDayMode ? "bg-violet-100/80 group-hover:bg-violet-200/80" : "bg-white/10 group-hover:bg-indigo-500/30"}`}
                            role="separator"
                            aria-hidden="true"
                        />
                        <span
                            className={`truncate max-w-[60px] transition-colors ${isDayMode ? "group-hover:text-slate-900" : "group-hover:text-white"}`}
                        >
                            {city}
                        </span>
                    </button>
                )}

                <button
                    onClick={() => changeUiMode(nextUiMode)}
                    className={`${desktopUtilityButtonClasses} ${isDayMode ? "hover:text-violet-800" : "hover:text-yellow-200"}`}
                    title={themeToggleTitle}
                    aria-label={t("nav.theme_settings", "主题设置")}
                >
                    {isDayMode ? (
                        <Moon size={18} aria-hidden="true" />
                    ) : (
                        <Sun size={18} aria-hidden="true" />
                    )}
                </button>

                {isDesktopViewport && (
                    <Suspense fallback={null}>
                        <NotificationCenter
                            enabled
                            onUnreadCountChange={setUnreadNotificationCount}
                            triggerClassName={desktopUtilityButtonClasses}
                        />
                    </Suspense>
                )}

                <LanguageSwitcher variant="nav" />

                {user ? (
                    <div className="flex items-center gap-3">
                        <Link
                            to={`/user/${user.id}/center`}
                            className={`motion-press relative flex items-center gap-2 border-b border-transparent bg-transparent px-2 py-2 text-sm font-medium transition-[border-color,color] ${isDayMode ? "text-slate-700 hover:border-violet-500/55 hover:text-violet-700" : "text-slate-200 hover:border-indigo-400/70 hover:text-white"}`}
                            aria-label={t("nav.profile")}
                        >
                            <div
                                className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white"
                                aria-hidden="true"
                            >
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                            {unreadNotificationCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-[0_8px_20px_rgba(239,68,68,0.35)]">
                                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                </span>
                            )}
                        </Link>
                        <button
                            onClick={logout}
                            className={desktopUtilityButtonClasses}
                            title={t("auth.log_out")}
                            aria-label={t("auth.log_out", "退出登录")}
                        >
                            <LogOut size={18} aria-hidden="true" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsAuthOpen(true)}
                        className={authButtonClasses}
                        aria-label={t("auth.log_in", "登录")}
                    >
                        {t("auth.log_in")}
                    </button>
                )}
            </div>

            <div className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-1 lg:hidden z-50">
                <div className="flex items-center">
                    <button
                        type="button"
                        aria-label={t("nav.more", "更多")}
                        aria-expanded={isMobileMoreOpen}
                        onClick={() => setIsMobileMoreOpen(true)}
                        className={`motion-press rect-icon-button inline-flex h-9 w-9 items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-200 hover:text-white"}`}
                    >
                        <Menu size={18} aria-hidden="true" />
                    </button>
                </div>

                <div
                    className={`min-w-0 truncate text-center text-base font-bold tracking-wide ${isDayMode ? "text-slate-800" : "text-white/90"}`}
                >
                    {mobileTitle}
                </div>

                <div className="flex items-center">
                    {showMobileSearchAction && (
                        <button
                            type="button"
                            aria-label={t("search.placeholder")}
                            onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
                            className={`motion-press rect-icon-button inline-flex h-9 w-9 items-center justify-center p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-200 hover:text-white"}`}
                        >
                            <Search size={18} />
                        </button>
                    )}
                    {/* Page-level sort and filter live in the mobile content toolbar. */}
                    {showMobileUploadAction && (
                        <button
                            type="button"
                            aria-label={t("common.upload", "上传")}
                            data-testid="mobile-upload-action"
                            onClick={handleUploadClick}
                            className="motion-press rect-button-primary ml-1 inline-flex h-9 w-9 items-center justify-center p-0 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80"
                        >
                            <Plus size={19} strokeWidth={3} />
                        </button>
                    )}
                    {!showMobileSearchAction && !showMobileUploadAction && (
                        <div className="min-h-[44px] min-w-[44px]" aria-hidden="true" />
                    )}
                </div>
            </div>

            <AnimatePresence initial={false}>
                {showWeatherWidget && isWeatherModalOpen && (
                    <Portal>
                        <motion.div
                            variants={modalBackdrop}
                            initial={prefersReducedMotion ? false : "initial"}
                            animate={prefersReducedMotion ? undefined : "animate"}
                            exit={prefersReducedMotion ? undefined : "exit"}
                            className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 ${isDayMode ? "bg-transparent" : "bg-black/80 backdrop-blur-sm"}`}
                            onClick={() => setIsWeatherModalOpen(false)}
                        >
                            <motion.div
                                variants={modalContent}
                                initial={prefersReducedMotion ? false : "initial"}
                                animate={prefersReducedMotion ? undefined : "animate"}
                                exit={prefersReducedMotion ? undefined : "exit"}
                                className={`rounded-t-lg md:rounded-lg w-full max-w-sm overflow-hidden p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] md:pb-6 relative z-10 ${weatherModalClasses}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="absolute inset-0 bg-indigo-500/5 opacity-50 pointer-events-none" />

                                <div className="flex justify-between items-center mb-6 relative z-10">
                                    <h3
                                        className={`text-xl font-bold flex items-center gap-2 ${isDayMode ? "text-slate-900" : "text-white"}`}
                                    >
                                        <MapPin size={24} className="text-indigo-400" />{" "}
                                        {t("weather.location")}
                                    </h3>
                                    <button
                                        onClick={() => setIsWeatherModalOpen(false)}
                                        className={`motion-press ${isDayMode ? "text-slate-400 hover:text-slate-900" : "text-gray-400 hover:text-white"}`}
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form
                                    onSubmit={handleCitySearch}
                                    className="space-y-4 relative z-10"
                                >
                                    <div>
                                        <label
                                            className={`block text-sm font-medium mb-2 ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                        >
                                            {t("weather.city_label")}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder={t("weather.placeholder")}
                                                className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-all ${isDayMode ? "bg-white border-slate-200/80 text-slate-900 focus:bg-white" : "bg-black/20 border-white/10 text-white focus:bg-black/40"}`}
                                                autoFocus
                                            />
                                            <Search
                                                className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDayMode ? "text-slate-400" : "text-gray-500"}`}
                                                size={18}
                                            />
                                        </div>
                                        <p
                                            className={`text-xs mt-2 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                        >
                                            {t("weather.search_help")}
                                        </p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSearching}
                                        className={`w-full text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 ${isDayMode ? "bg-violet-700 hover:bg-violet-800 shadow-none" : "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/25"}`}
                                    >
                                        {isSearching
                                            ? t("weather.searching")
                                            : t("weather.search_btn")}
                                    </button>
                                </form>

                                {searchResults.length > 0 && (
                                    <div
                                        className={`mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2 border-t pt-4 relative z-10 ${isDayMode ? "border-slate-200/80" : "border-white/10"}`}
                                    >
                                        <p
                                            className={`text-xs mb-2 ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                                        >
                                            {t("weather.select")}
                                        </p>
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => selectCity(result)}
                                                className={`motion-press w-full text-left p-3 rounded-md flex flex-col group border ${result.isLocal ? (isDayMode ? "bg-white border-indigo-200/80" : "bg-indigo-900/20 border-indigo-500/30") : isDayMode ? "bg-white border-slate-200/70 hover:bg-white" : "bg-black/20 border-transparent hover:bg-white/10"}`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span
                                                        className={`font-bold transition-colors ${result.isLocal ? (isDayMode ? "text-indigo-600" : "text-indigo-400") : isDayMode ? "text-slate-900 group-hover:text-indigo-500" : "text-white group-hover:text-indigo-400"}`}
                                                    >
                                                        {result.name}
                                                    </span>
                                                    {result.country_code ? (
                                                        <img
                                                            src={`https://flagcdn.com/16x12/${result.country_code.toLowerCase()}.png`}
                                                            alt={result.country}
                                                            className="opacity-50 group-hover:opacity-100 transition-opacity"
                                                        />
                                                    ) : (
                                                        <span
                                                            className={`text-[10px] px-1.5 rounded ${isDayMode ? "bg-white text-slate-500" : "bg-white/10 text-gray-400"}`}
                                                        >
                                                            {result.country}
                                                        </span>
                                                    )}
                                                </div>
                                                <span
                                                    className={`text-xs ${isDayMode ? "text-slate-500 group-hover:text-slate-700" : "text-gray-400 group-hover:text-gray-300"}`}
                                                >
                                                    {[result.admin1, result.country]
                                                        .filter(Boolean)
                                                        .join(", ")}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
                {isMobileMoreOpen && (
                    <Portal>
                        <motion.div
                            variants={modalBackdrop}
                            initial={prefersReducedMotion ? false : "initial"}
                            animate={prefersReducedMotion ? undefined : "animate"}
                            exit={prefersReducedMotion ? undefined : "exit"}
                            className={`fixed inset-0 z-[100] flex items-end justify-center p-0 md:hidden ${isDayMode ? "bg-transparent" : "bg-black/70 backdrop-blur-sm"}`}
                            onClick={() => setIsMobileMoreOpen(false)}
                        >
                            <motion.div
                                variants={mobileSheet}
                                initial={prefersReducedMotion ? false : "initial"}
                                animate={prefersReducedMotion ? undefined : "animate"}
                                exit={prefersReducedMotion ? undefined : "exit"}
                                role="dialog"
                                aria-modal="true"
                                aria-label={t("nav.more", "更多")}
                                className={`w-full rounded-t-lg border-t p-4 pb-[calc(env(safe-area-inset-bottom)+20px)] ${isDayMode ? "border-slate-200/80 bg-white text-slate-900 shadow-none" : "border-white/10 bg-[#111827]/96 text-white shadow-2xl"}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <div
                                            className={`text-xs font-semibold uppercase tracking-[0.18em] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                                        >
                                            {t("nav.more", "更多")}
                                        </div>
                                        <div className="mt-1 text-lg font-bold">
                                            {t("nav.mobile_more_title")}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        aria-label={t("common.close", "关闭")}
                                        onClick={() => setIsMobileMoreOpen(false)}
                                        className={`motion-press min-h-[44px] min-w-[44px] rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "bg-white text-slate-500 hover:bg-white hover:text-slate-900" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                                    >
                                        <X size={20} aria-hidden="true" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {secondaryMobileLinks.map(
                                        ({ key, path, icon: Icon, label }) => (
                                            <Link
                                                key={key}
                                                to={path}
                                                onClick={() => setIsMobileMoreOpen(false)}
                                                className={`motion-press flex min-h-[56px] items-center gap-3 rounded-lg border px-3 ${location.pathname === path ? (isDayMode ? "border-slate-300 bg-white text-slate-950" : "border-indigo-400/30 bg-indigo-500/15 text-indigo-200") : isDayMode ? "border-slate-200/80 bg-white text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
                                            >
                                                <Icon size={18} aria-hidden="true" />
                                                <span className="text-sm font-semibold">
                                                    {label || t(`nav.${key}`)}
                                                </span>
                                            </Link>
                                        )
                                    )}
                                </div>

                                <div
                                    className={`my-4 h-px ${isDayMode ? "bg-slate-200/80" : "bg-white/10"}`}
                                />

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => changeUiMode(nextUiMode)}
                                        className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left ${isDayMode ? "border-slate-200/80 bg-white text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
                                    >
                                        {isDayMode ? (
                                            <Moon size={18} aria-hidden="true" />
                                        ) : (
                                            <Sun size={18} aria-hidden="true" />
                                        )}
                                        <span className="text-sm font-semibold">
                                            {themeToggleLabel}
                                        </span>
                                    </button>

                                    <div
                                        className={`col-span-2 flex min-h-[52px] items-center justify-center rounded-lg border px-2 ${isDayMode ? "border-slate-200/80 bg-white" : "border-white/10 bg-white/[0.04]"}`}
                                    >
                                        <LanguageSwitcher />
                                    </div>
                                </div>

                                <div className="mt-2 grid grid-cols-1 gap-2">
                                    {user ? (
                                        <>
                                            <Link
                                                to={`/user/${user.id}/center`}
                                                onClick={() => setIsMobileMoreOpen(false)}
                                                className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 ${isDayMode ? "border-slate-200/80 bg-white text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
                                            >
                                                <UserCircle size={18} aria-hidden="true" />
                                                <span className="text-sm font-semibold">
                                                    {user.username}
                                                </span>
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsMobileMoreOpen(false);
                                                    logout();
                                                }}
                                                className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left ${isDayMode ? "border-red-200/80 bg-red-50/80 text-red-600 hover:bg-red-50" : "border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/15"}`}
                                            >
                                                <LogOut size={18} aria-hidden="true" />
                                                <span className="text-sm font-semibold">
                                                    {t("auth.log_out", "退出登录")}
                                                </span>
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsMobileMoreOpen(false);
                                                setIsAuthOpen(true);
                                            }}
                                            className={`motion-press flex min-h-[52px] items-center justify-center rounded-lg px-3 text-sm font-bold text-white ${isDayMode ? "bg-violet-700 hover:bg-violet-800" : "bg-indigo-600 hover:bg-indigo-500"}`}
                                        >
                                            {t("auth.log_in")}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    </Portal>
                )}
            </AnimatePresence>

            {isAuthOpen && (
                <Suspense fallback={null}>
                    <AuthModal isOpen onClose={() => setIsAuthOpen(false)} />
                </Suspense>
            )}
        </motion.nav>
    );
};

export default Navbar;
