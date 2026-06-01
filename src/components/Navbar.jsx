import { useState, useEffect } from "react";
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
  Music as MusicIcon,
  Film,
  Info,
  Shield,
  Trees,
  UserCircle,
  Wallpaper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { BACKGROUND_SCENES } from "../constants/backgroundScenes";
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
import AuthModal from "./AuthModal";
import NotificationCenter from "./NotificationCenter";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";

const Portal = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Navbar = () => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const location = useLocation();
  const { t } = useTranslation();
  const {
    uiMode,
    changeUiMode,
    backgroundScene,
    changeBackgroundScene,
    showWeatherWidget,
  } = useSettings();
  const { user, logout, isAdmin } = useAuth();
  const isDesktopViewport = useMediaQuery("(min-width: 768px)", true);
  const [time, setTime] = useState(new Date());
  const prefersReducedMotion = useReducedMotion();
  const isDayMode = uiMode === "day";
  const weatherWidgetEnabled = showWeatherWidget && isDesktopViewport;

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

  useBackClose(weatherWidgetEnabled && isWeatherModalOpen, () =>
    setIsWeatherModalOpen(false),
  );
  useBackClose(isThemeOpen, () => setIsThemeOpen(false));
  useBackClose(isMobileMoreOpen, () => setIsMobileMoreOpen(false));

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
    if (code === 0 || code === 1)
      return <Sun size={14} className="text-yellow-400" />;
    if (code === 2 || code === 3)
      return <Cloud size={14} className="text-gray-400" />;
    if (code >= 45 && code <= 48)
      return <CloudFog size={14} className="text-gray-400" />;
    if (code >= 51 && code <= 67)
      return <CloudRain size={14} className="text-blue-400" />;
    if (code >= 71 && code <= 77)
      return <CloudSnow size={14} className="text-white" />;
    if (code >= 80 && code <= 82)
      return <CloudRain size={14} className="text-blue-500" />;
    if (code >= 95 && code <= 99)
      return <CloudLightning size={14} className="text-yellow-500" />;
    return <Cloud size={14} />;
  };

  const navLinks = [
    { key: "home", path: "/" },
    { key: "events", path: "/events" },
    { key: "hackathon", path: "/hackathon", label: "浙客松" },
    { key: "articles", path: "/articles" },
    { key: "music", path: "/music" },
    { key: "media", path: "/media", label: "影像库" },
    { key: "about", path: "/about" },
    ...(isAdmin ? [{ key: "admin", path: "/admin" }] : []),
  ];
  const isNavItemActive = (path) => {
    if (path === "/hackathon") return location.pathname.startsWith("/hackathon");
    if (path === "/media") {
      return (
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
    if (pathname.startsWith("/hackathon")) return "浙客松";
    if (pathname.startsWith("/events")) return t("nav.events");
    if (pathname.startsWith("/future-learning")) return t("nav.future_learning", "未来学习中心");
    if (pathname.startsWith("/articles")) return t("nav.articles");
    if (pathname.startsWith("/music")) return t("nav.music", "播客");
    if (pathname.startsWith("/gallery")) return t("nav.gallery");
    if (pathname.startsWith("/videos")) return t("nav.videos");
    if (pathname.startsWith("/media")) return t("nav.media", "影像库");
    if (pathname.startsWith("/me") || pathname.startsWith("/user/")) {
      return t("nav.me", "我的");
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
    else if (location.pathname === "/music") type = "audio";
    else if (location.pathname === "/videos") type = "video";
    else if (location.pathname === "/articles") type = "article";

    if (type) {
      window.dispatchEvent(
        new CustomEvent("open-upload-modal", { detail: { type } }),
      );
    }
  };

  const uploadablePaths = [
    "/events",
    "/gallery",
    "/media",
    "/music",
    "/videos",
    "/articles",
  ];
  const showUploadButton = uploadablePaths.includes(location.pathname);

  useEffect(() => {
    const openAuthModal = () => setIsAuthOpen(true);

    window.addEventListener("open-auth-modal", openAuthModal);
    return () => window.removeEventListener("open-auth-modal", openAuthModal);
  }, []);

  const shellClasses = isDayMode
    ? "bg-white/[0.82] border-sky-200/45 shadow-[0_10px_28px_rgba(59,130,246,0.07)]"
    : "bg-black/62 border-white/10 shadow-none";
  const desktopPillClasses = isDayMode
    ? "rounded-[6px] bg-white/[0.66] border-sky-200/45 shadow-none"
    : "rounded-[6px] bg-white/[0.035] border-white/10 shadow-none";
  const navLinkClasses = isDayMode
    ? "motion-link relative group whitespace-nowrap rounded-[5px] px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-sky-50/80 hover:text-slate-950 xl:px-4 xl:text-sm"
    : "motion-link relative group whitespace-nowrap rounded-[5px] px-2.5 py-2 text-xs font-medium text-gray-400 hover:bg-white/[0.075] hover:text-white xl:px-4 xl:text-sm";
  const navIndicatorClasses = isDayMode
    ? "absolute inset-0 rounded-[5px] border border-sky-200/70 bg-white/[0.88] shadow-none"
    : "absolute inset-0 rounded-[5px] bg-white/[0.095] border border-white/14";
  const weatherButtonClasses = isDayMode
    ? "motion-press rect-button-secondary flex items-center gap-3 text-xs px-3 py-1.5 hover:text-slate-900 cursor-pointer group"
    : "motion-press rect-button-secondary flex items-center gap-3 text-xs px-3 py-1.5 cursor-pointer group";
  const authButtonClasses = isDayMode
    ? "motion-press rect-button-secondary text-sm font-medium px-4 py-1.5 hover:text-slate-950"
    : "motion-press rect-button-secondary text-sm font-medium px-4 py-1.5";
  const wallpaperModalClasses = isDayMode
    ? "theme-dialog text-slate-900"
    : "bg-[#08111f]/96 backdrop-blur-2xl border border-cyan-300/10 text-white";
  const wallpaperHeaderClasses = isDayMode
    ? "text-slate-700 bg-white/92 border border-slate-200/70"
    : "text-white/84 bg-[#08111f]/92 border border-white/10";
  const weatherModalClasses = isDayMode
    ? "theme-dialog text-slate-900"
    : "bg-[#1a1a1a] border border-white/10 shadow-2xl";
  const showMobileUploadAction = showUploadButton;
  const showMobileSearchAction =
    !location.pathname.startsWith("/me") &&
    !location.pathname.startsWith("/user/");
  const secondaryMobileLinks = [
    { key: "media", path: "/media", icon: Film, label: "影像库" },
    { key: "music", path: "/music", icon: MusicIcon },
    { key: "about", path: "/about", icon: Info },
    ...(isAdmin ? [{ key: "admin", path: "/admin", icon: Shield }] : []),
  ];
  const nextUiMode = isDayMode ? "dark" : "day";
  const themeToggleLabel = t(
    nextUiMode === "day" ? "nav.day_mode" : "nav.night_mode",
  );
  const themeToggleTitle = `${t("nav.theme_settings")} - ${themeToggleLabel}`;
  const activeBackgroundScene =
    BACKGROUND_SCENES.find((scene) => scene.id === backgroundScene) ||
    BACKGROUND_SCENES[0];
  const weatherTemperature = Number(weather?.temperature);
  const weatherTemperatureLabel = Number.isFinite(weatherTemperature)
    ? `${Math.round(weatherTemperature)}°C`
    : "--";

  return (
    <motion.nav
      variants={navEntrance}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? undefined : "animate"}
      className={`motion-gpu fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3 border-b backdrop-blur-sm ${shellClasses}`}
      role="navigation"
      aria-label="主导航"
    >
      <Link
        to="/"
        className="hidden lg:flex items-center gap-3 text-white group z-50"
        aria-label="拓途浙享首页"
      >
        <div className="relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-indigo-400/0 transition-colors duration-300 group-hover:bg-indigo-400/60" />
          <img
            src="/newlogo.png"
            alt="拓途浙享 Logo"
            className="relative h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span
            className={`text-lg font-bold tracking-tighter transition-colors duration-300 ${isDayMode ? "text-slate-950 group-hover:text-indigo-600" : "text-white group-hover:text-indigo-200"}`}
          >
            拓途浙享
          </span>
          <span
            className={`text-[10px] font-medium tracking-widest mt-0.5 transition-colors ${isDayMode ? "text-slate-500 group-hover:text-indigo-500" : "text-gray-400 group-hover:text-indigo-400"}`}
          >
            数字艺术与科技
          </span>
        </div>
      </Link>

      <div
        className={`hidden min-w-0 items-center gap-0.5 border px-1.5 py-1 lg:flex xl:gap-1 xl:px-2 ${desktopPillClasses}`}
        role="menubar"
        aria-label="导航菜单"
      >
        {navLinks.map((item) => (
          <Link
            key={item.key}
            to={item.path}
            className={navLinkClasses}
            role="menuitem"
            aria-current={isNavItemActive(item.path) ? "page" : undefined}
          >
            <span className="relative z-10">{item.label || t(`nav.${item.key}`)}</span>
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

        <div
          className={`w-px h-5 mx-2 ${isDayMode ? "bg-slate-200/80" : "bg-white/10"}`}
          role="separator"
        />

        <button
          onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
          className="btn-icon rect-icon-button"
          title={t("nav.search_title")}
          aria-label={t("nav.search_title", "搜索")}
        >
          <Search size={18} aria-hidden="true" />
        </button>

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
              className={`w-px h-3 transition-colors ${isDayMode ? "bg-slate-200/80 group-hover:bg-indigo-200/80" : "bg-white/10 group-hover:bg-indigo-500/30"}`}
              role="separator"
              aria-hidden="true"
            />
            <div className="flex items-center gap-1 group-hover:text-indigo-300 transition-colors">
              {weather ? (
                getWeatherIcon(weather.weathercode)
              ) : (
                <Cloud size={12} aria-hidden="true" />
              )}
              <span>
                {weather ? weatherTemperatureLabel : "..."}
              </span>
            </div>
            <div
              className={`w-px h-3 transition-colors ${isDayMode ? "bg-slate-200/80 group-hover:bg-indigo-200/80" : "bg-white/10 group-hover:bg-indigo-500/30"}`}
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
          className={`btn-icon rect-icon-button ${isDayMode ? "text-slate-700 hover:text-indigo-600" : "text-white hover:text-yellow-200"}`}
          title={themeToggleTitle}
          aria-label={t("nav.theme_settings", "主题设置")}
        >
          {isDayMode ? (
            <Moon size={18} aria-hidden="true" />
          ) : (
            <Sun size={18} aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsThemeOpen(true)}
          className={`btn-icon rect-icon-button ${isDayMode ? "text-slate-700 hover:text-indigo-600" : "text-cyan-100 hover:text-cyan-50"}`}
          title="动态壁纸"
          aria-label="动态壁纸设置"
        >
          <Wallpaper size={18} aria-hidden="true" />
        </button>

        <NotificationCenter
          enabled={isDesktopViewport}
          onUnreadCountChange={setUnreadNotificationCount}
        />

        <LanguageSwitcher />

        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to={`/user/${user.id}`}
              className={`motion-press rect-button-secondary relative flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${isDayMode ? "text-slate-800 hover:text-indigo-600" : "text-white"}`}
              aria-label={`访问 ${user.username} 的个人主页`}
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
                  {unreadNotificationCount > 99
                    ? "99+"
                    : unreadNotificationCount}
                </span>
              )}
            </Link>
            <button
              onClick={logout}
              className="btn-icon rect-icon-button"
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

      <div className="flex w-full items-center justify-between px-1 lg:hidden z-50">
        <div
          className={`text-base font-bold tracking-wide absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[42vw] truncate ${isDayMode ? "text-slate-800" : "text-white/90"}`}
        >
          {mobileTitle}
        </div>

        <div className="flex items-center">
          <button
            type="button"
            aria-label={t("nav.more", "更多")}
            aria-expanded={isMobileMoreOpen}
            onClick={() => setIsMobileMoreOpen(true)}
             className={`motion-press rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-200 hover:text-white"}`}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center">
          {showMobileSearchAction && (
            <button
              type="button"
              aria-label={t("search.placeholder")}
              onClick={() => window.dispatchEvent(new Event("open-search-palette"))}
              className={`motion-press rect-icon-button p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "text-slate-500 hover:text-slate-900" : "text-gray-200 hover:text-white"}`}
            >
              <Search size={18} />
            </button>
          )}
          {/* Page-level sort and filter live in the mobile content toolbar. */}
          {showMobileUploadAction && (
            <button
              type="button"
              aria-label={t("common.upload", "上传")}
              onClick={handleUploadClick}
              className="motion-press rect-button-primary p-1.5 min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-white ml-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/80"
            >
              <Plus size={16} strokeWidth={3} />
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
              className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm ${isDayMode ? "bg-white/68" : "bg-black/80"}`}
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
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-50 pointer-events-none" />

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
                        className={`w-full border rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-all ${isDayMode ? "bg-white/80 border-slate-200/80 text-slate-900 focus:bg-white" : "bg-black/20 border-white/10 text-white focus:bg-black/40"}`}
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
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/25"
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
                        className={`motion-press w-full text-left p-3 rounded-md flex flex-col group border ${result.isLocal ? (isDayMode ? "bg-indigo-50 border-indigo-200/80" : "bg-indigo-900/20 border-indigo-500/30") : isDayMode ? "bg-white/70 border-slate-200/70 hover:bg-white" : "bg-black/20 border-transparent hover:bg-white/10"}`}
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
                              className={`text-[10px] px-1.5 rounded ${isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/10 text-gray-400"}`}
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
              className={`fixed inset-0 z-[100] flex items-end justify-center p-0 backdrop-blur-sm md:hidden ${isDayMode ? "bg-white/60" : "bg-black/70"}`}
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
                className={`w-full rounded-t-lg border-t p-4 pb-[calc(env(safe-area-inset-bottom)+20px)] shadow-2xl ${isDayMode ? "border-slate-200/80 bg-white/96 text-slate-900" : "border-white/10 bg-[#111827]/96 text-white"}`}
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
                      {t("nav.mobile_more_title", "更多入口")}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={t("common.close", "关闭")}
                    onClick={() => setIsMobileMoreOpen(false)}
                    className={`motion-press min-h-[44px] min-w-[44px] rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70 ${isDayMode ? "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {secondaryMobileLinks.map(({ key, path, icon: Icon, label }) => (
                    <Link
                      key={key}
                      to={path}
                      onClick={() => setIsMobileMoreOpen(false)}
                      className={`motion-press flex min-h-[56px] items-center gap-3 rounded-lg border px-3 ${location.pathname === path ? (isDayMode ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-indigo-400/30 bg-indigo-500/15 text-indigo-200") : isDayMode ? "border-slate-200/80 bg-slate-50/90 text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="text-sm font-semibold">
                        {label || t(`nav.${key}`)}
                      </span>
                    </Link>
                  ))}
                </div>

                <div
                  className={`my-4 h-px ${isDayMode ? "bg-slate-200/80" : "bg-white/10"}`}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => changeUiMode(nextUiMode)}
                    className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left ${isDayMode ? "border-slate-200/80 bg-slate-50/90 text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
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

                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      setIsThemeOpen(true);
                    }}
                    className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 text-left ${isDayMode ? "border-slate-200/80 bg-slate-50/90 text-slate-700 hover:bg-white" : "border-cyan-300/15 bg-cyan-300/[0.06] text-cyan-100 hover:bg-cyan-300/[0.1]"}`}
                  >
                    <Wallpaper size={18} aria-hidden="true" />
                    <span className="text-sm font-semibold">动态壁纸</span>
                  </button>

                  <div
                    className={`col-span-2 flex min-h-[52px] items-center justify-center rounded-lg border px-2 ${isDayMode ? "border-slate-200/80 bg-slate-50/90" : "border-white/10 bg-white/[0.04]"}`}
                  >
                    <LanguageSwitcher />
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2">
                  {user ? (
                    <>
                      <Link
                        to={`/user/${user.id}`}
                        onClick={() => setIsMobileMoreOpen(false)}
                        className={`motion-press flex min-h-[52px] items-center gap-3 rounded-lg border px-3 ${isDayMode ? "border-slate-200/80 bg-slate-50/90 text-slate-700 hover:bg-white" : "border-white/10 bg-white/[0.04] text-gray-200 hover:bg-white/10"}`}
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
                          {t("auth.log_out")}
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
                      className="motion-press flex min-h-[52px] items-center justify-center rounded-lg bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-500"
                    >
                      {t("auth.log_in")}
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
        {isThemeOpen && (
          <Portal>
            <motion.div
              variants={modalBackdrop}
              initial={prefersReducedMotion ? false : "initial"}
              animate={prefersReducedMotion ? undefined : "animate"}
              exit={prefersReducedMotion ? undefined : "exit"}
              className={`fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm ${isDayMode ? "bg-white/68" : "bg-black/80"}`}
              onClick={() => setIsThemeOpen(false)}
            >
              <motion.div
                variants={modalContent}
                initial={prefersReducedMotion ? false : "initial"}
                animate={prefersReducedMotion ? undefined : "animate"}
                exit={prefersReducedMotion ? undefined : "exit"}
                className={`p-4 rounded-t-lg md:rounded-lg shadow-2xl w-full max-w-2xl max-h-[86vh] overflow-y-auto custom-scrollbar relative z-10 pb-[calc(env(safe-area-inset-bottom)+20px)] md:pb-5 ${wallpaperModalClasses}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`mb-4 flex items-center justify-between rounded-lg p-2 backdrop-blur-md ${wallpaperHeaderClasses}`}
                >
                  <div className="flex items-center gap-2">
                    <Wallpaper size={16} />
                    <h3 className="text-sm font-bold uppercase tracking-widest">
                      动态壁纸
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsThemeOpen(false)}
                    className={
                      isDayMode
                        ? "text-slate-400 hover:text-slate-900"
                        : "text-gray-400 hover:text-white"
                    }
                  >
                    <X size={20} />
                  </button>
                </div>

                {isDayMode ? (
                  <div className="mb-4 rounded-lg border border-slate-200/80 bg-white/90 p-4 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-slate-950 p-2 text-white">
                        <Moon size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          动态壁纸仅夜间模式可用
                        </div>
                        <p className="mt-1 leading-6">
                          白天模式保持轻量静态背景，切到夜间后可以更换网站动态背景。
                        </p>
                        <button
                          type="button"
                          onClick={() => changeUiMode("dark")}
                          className="motion-press mt-3 inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800"
                        >
                          <Moon size={16} />
                          切到夜间模式
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex items-center justify-between gap-4 rounded-lg border border-cyan-300/10 bg-cyan-300/[0.055] px-4 py-3">
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200/70">
                          Website Background
                        </div>
                        <div className="mt-1 text-sm font-bold text-white">
                          当前：{activeBackgroundScene.name}
                        </div>
                      </div>
                      <div className="hidden text-right text-xs leading-5 text-white/50 sm:block">
                        立即生效
                        <br />
                        已保存到本机
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {BACKGROUND_SCENES.map((scene) => {
                        const isActiveScene = scene.id === backgroundScene;

                        return (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => changeBackgroundScene(scene.id)}
                            className={`motion-press group flex min-h-[108px] items-stretch overflow-hidden rounded-lg border text-left transition-all ${isActiveScene ? "border-cyan-300/50 bg-cyan-300/[0.12] shadow-[0_18px_44px_rgba(34,211,238,0.12)]" : "border-white/10 bg-white/[0.045] hover:border-cyan-300/30 hover:bg-white/[0.07]"}`}
                            aria-pressed={isActiveScene}
                          >
                            <div className={`w-24 shrink-0 ${scene.preview}`}>
                              <div className="h-full w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(0,0,0,0.26))]" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3">
                              <div className="flex items-center justify-between gap-2">
                                <div className="truncate text-sm font-black text-white">
                                  {scene.name}
                                </div>
                                {isActiveScene ? (
                                  <span className="shrink-0 rounded-md bg-cyan-300 px-2 py-0.5 text-[10px] font-black text-slate-950">
                                    已启用
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/58">
                                {scene.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                <div
                  className={`mb-4 rounded-lg border p-1.5 ${isDayMode ? "border-slate-200/80 bg-slate-50/90" : "border-white/10 bg-white/5"}`}
                >
                  <div
                    className={`mb-2 px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${isDayMode ? "text-slate-500" : "text-gray-500"}`}
                  >
                    {t("nav.appearance_mode")}
                  </div>
                  <div
                    className={`mb-2 px-2 text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                  >
                    日间/夜间影响全站配色与文字对比度
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["dark", "day"].map((mode) => {
                      const isActiveMode = uiMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => changeUiMode(mode)}
                          className={`rounded-md px-3 py-3 text-left transition-all border ${isActiveMode ? "bg-indigo-500/15 border-indigo-400/30 shadow-[0_10px_22px_rgba(99,102,241,0.14)]" : isDayMode ? "bg-transparent border-transparent hover:bg-white/90" : "bg-transparent border-transparent hover:bg-white/10"}`}
                        >
                          <div
                            className={`text-sm font-semibold ${isDayMode ? "text-slate-900" : "text-white"}`}
                          >
                            {t(
                              mode === "day"
                                ? "nav.day_mode"
                                : "nav.night_mode",
                            )}
                          </div>
                          <div
                            className={`mt-1 text-[11px] ${isDayMode ? "text-slate-500" : "text-gray-400"}`}
                          >
                            {t(
                              mode === "day"
                                ? "nav.day_mode_hint"
                                : "nav.night_mode_hint",
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="hidden"
                >
                  首页背景已固定为静态渐变，白天/夜间模式仍会同步切换整体观感。
                </div>
              </motion.div>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </motion.nav>
  );
};

export default Navbar;
