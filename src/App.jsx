import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { MusicProvider, useMusic } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { ResourceHints } from './components/ResourceHints';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useServiceWorker } from './hooks/useServiceWorker';
import { routeTransition, useReducedMotion } from './utils/animations';
import { isAppRuntime as detectAppRuntime } from './utils/displayMode';
import { getOrCreateSiteVisitorKey } from './utils/visitorKey';
import SEO from './components/SEO';

import Navbar from './components/Navbar';
import MobileNavbar from './components/MobileNavbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import HomeSplash from './components/HomeSplash';

const CHUNK_RECOVERY_RELOAD_KEY = 'tuotu:chunk-recovery:reload-attempted';
const STALE_CHUNK_CACHE_NAMES = new Set(['js-chunk-cache', 'css-chunk-cache']);

const isDynamicImportFetchError = (error) => {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Load failed/i.test(message);
};

const clearStaleChunkCaches = () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  window.caches.keys()
    .then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => STALE_CHUNK_CACHE_NAMES.has(cacheName) || cacheName.includes('workbox-precache'))
        .map((cacheName) => window.caches.delete(cacheName)),
    ))
    .catch(() => {});
};

const recoverFromDynamicImportError = (error) => {
  if (!isDynamicImportFetchError(error) || typeof window === 'undefined') {
    return false;
  }

  const recoveryKey = `${CHUNK_RECOVERY_RELOAD_KEY}:${window.location.pathname}`;

  try {
    if (window.sessionStorage.getItem(recoveryKey)) {
      return false;
    }
    window.sessionStorage.setItem(recoveryKey, String(Date.now()));
  } catch {
    return false;
  }

  clearStaleChunkCaches();
  window.setTimeout(() => window.location.reload(), 80);
  return true;
};

const lazyRoute = (loader) => lazy(() => loader().catch((error) => {
  if (recoverFromDynamicImportError(error)) {
    return new Promise(() => {});
  }
  throw error;
}));

const Gallery = lazyRoute(() => import('./components/Gallery'));
const MediaLibrary = lazyRoute(() => import('./components/MediaLibrary'));
const Videos = lazyRoute(() => import('./components/Videos'));
const Articles = lazyRoute(() => import('./components/AICommunity'));
const Events = lazyRoute(() => import('./components/Events'));
const About = lazyRoute(() => import('./components/About'));
const AppDownload = lazyRoute(() => import('./components/AppDownload'));
const HackathonSeasonOne = lazyRoute(() => import('./components/HackathonSeasonOne'));
const HackathonWorks = lazyRoute(() => import('./components/HackathonWorks'));
const FutureLearningCenter = lazyRoute(() => import('./components/FutureLearningCenter'));
const AdminDashboard = lazyRoute(() => import('./components/Admin/AdminDashboard'));
const AdminAccessGate = lazyRoute(() => import('./components/Admin/AdminAccessGate'));
const NotFound = lazyRoute(() => import('./components/NotFound'));
const ProfilePage = lazyRoute(() => import('./components/ProfilePage'));
const PublicProfile = lazyRoute(() => import('./components/PublicProfile'));
const ProfileDirectory = lazyRoute(() => import('./components/ProfileDirectory'));
const ProjectPlaza = lazyRoute(() => import('./components/ProjectPlaza'));
const SearchPalette = lazyRoute(() => import('./components/SearchPalette'));
const CustomCursor = lazyRoute(() => import('./components/CustomCursor'));
const GlobalPlayer = lazyRoute(() => import('./components/GlobalPlayer'));
const BackgroundSystem = lazyRoute(() => import('./components/BackgroundSystem'));
const ScrollProgress = lazyRoute(() => import('./components/ScrollProgress'));
const ScrollToTop = lazyRoute(() => import('./components/ScrollToTop'));
const PWAInstallPrompt = lazyRoute(() => import('./components/PWAInstallPrompt'));
const PerformancePanel = lazyRoute(() => import('./components/PerformancePanel'));

const useDeferredMount = (delay = 0) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mount = () => setMounted(true);

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(mount, { timeout: Math.max(delay, 1200) });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(mount, delay);
    return () => window.clearTimeout(timeoutId);
  }, [delay]);

  return mounted;
};

const PageTransition = ({ children }) => {
  const prefersReducedMotion = useReducedMotion();
  const isMobileViewport = useMediaQuery('(max-width: 767px)');

  if (prefersReducedMotion || isMobileViewport) {
    return <div className="w-full">{children}</div>;
  }

  return (
    <motion.div
      variants={routeTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="motion-gpu w-full"
    >
      {children}
    </motion.div>
  );
};

const Home = () => {
  const { t } = useTranslation();

  return (
    <>
      <SEO
        title={t('home.splash.meta_title')}
        description={t('home.splash.meta_desc')}
      />
      <HomeSplash />
    </>
  );
};

const MusicRedirect = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const legacyId = params.get('id');
  if (legacyId) {
    params.delete('id');
    params.set('music', legacyId);
  }
  const query = params.toString();
  return (
    <Navigate
      to={`/articles${query ? `?${query}` : ''}#community-podcast`}
      replace
    />
  );
};

const hasProfileRouteId = (user) => {
  const id = user?.id;
  return id !== undefined && id !== null && String(id).trim() !== '';
};

const MeRedirect = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const canOpenProfile = hasProfileRouteId(user);

  useEffect(() => {
    if (!loading && !canOpenProfile && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-auth-modal'));
    }
  }, [canOpenProfile, loading]);

  if (loading) return <LoadingScreen />;
  if (canOpenProfile) {
    const target = location.search ? `/user/${user.id}/center${location.search}` : `/user/${user.id}`;
    return <Navigate to={target} replace />;
  }
  return <PageTransition><Home /></PageTransition>;
};

const LegacyUserRedirect = () => {
  const { id } = useParams();
  const location = useLocation();
  if (location.search.includes('tab=') || location.search.includes('settings=')) {
    return <Navigate to={`/user/${id}/center${location.search || ''}`} replace />;
  }
  return <Navigate to={`/u/user-${id}${location.search || ''}`} replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading || !user || user.role !== 'admin') return <AdminAccessGate />;
  return children;
};

const AppContent = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomeRoute = location.pathname === '/';
  const isAboutRoute = location.pathname === '/about';
  const isDownloadRoute = location.pathname === '/download';
  const isImmersiveRoute = isHomeRoute || isAboutRoute || isDownloadRoute || location.pathname.startsWith('/hackathon');
  const hideGlobalShell = isHomeRoute;
  const { cursorEnabled, settings } = useSettings();
  const { currentTrack, isMiniPlayerVisible } = useMusic();
  const hasDesktopPointer = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const shouldMountDeferredUi = useDeferredMount(700);
  const shouldMountLateDebugUi = useDeferredMount(1800);
  const [shouldMountSearchPalette, setShouldMountSearchPalette] = useState(false);
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);
  const [isAppRuntime, setIsAppRuntime] = useState(false);
  const shouldRenderDynamicBackground =
    !isAdminRoute &&
    !isImmersiveRoute &&
    hasDesktopPointer &&
    !prefersReducedMotion &&
    !isLowPowerDevice &&
    !isAppRuntime &&
    shouldMountDeferredUi;
  const shouldMountGlobalPlayer = Boolean(currentTrack && isMiniPlayerVisible);

  useServiceWorker();

  usePerformanceMonitor({
    enabled: import.meta.env.PROD,
    onMetric: (_metric) => {
      if (import.meta.env.PROD && window.location.hostname === 'tuotuzj.com') {
        return;
      }
    },
  });

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const cores = Number(navigator.hardwareConcurrency || 0);
    const memory = Number(navigator.deviceMemory || 0);
    setIsLowPowerDevice((cores > 0 && cores <= 4) || (memory > 0 && memory <= 4));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const standaloneQuery = window.matchMedia?.('(display-mode: standalone)');
    const fullscreenQuery = window.matchMedia?.('(display-mode: fullscreen)');
    const updateDisplayMode = () => setIsAppRuntime(detectAppRuntime());

    updateDisplayMode();
    standaloneQuery?.addEventListener?.('change', updateDisplayMode);
    fullscreenQuery?.addEventListener?.('change', updateDisplayMode);

    return () => {
      standaloneQuery?.removeEventListener?.('change', updateDisplayMode);
      fullscreenQuery?.removeEventListener?.('change', updateDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (settings?.site_title) {
      document.title = settings.site_title;
    }
  }, [settings?.site_title]);

  useEffect(() => {
    const mountSearchPalette = () => setShouldMountSearchPalette(true);
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        mountSearchPalette();
      }
    };

    window.addEventListener('open-search-palette', mountSearchPalette);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-search-palette', mountSearchPalette);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (isAdminRoute || typeof window === 'undefined') return;

    const currentDate = new Date().toISOString().slice(0, 10);
    const sessionVisitKey = `site-visit:${currentDate}:${location.pathname}`;

    if (window.sessionStorage.getItem(sessionVisitKey)) {
      return;
    }

    getOrCreateSiteVisitorKey();

    window.sessionStorage.setItem(sessionVisitKey, '1');
  }, [isAdminRoute, location.pathname]);

  return (
    <div
      className={`day-ambient-shell flex min-h-screen flex-col ${
        shouldRenderDynamicBackground ? 'dynamic-background-active' : ''
      }`}
    >
      <ResourceHints />
      {shouldRenderDynamicBackground && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <BackgroundSystem />
          </Suspense>
        </ErrorBoundary>
      )}
      <div className="relative z-10 flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
        >
          {t('common.skip_to_main')}
        </a>
        {!hideGlobalShell && (
          <ErrorBoundary variant="inline" silent>
            <Navbar />
          </ErrorBoundary>
        )}
        {!hideGlobalShell && !isAdminRoute && cursorEnabled && hasDesktopPointer && !prefersReducedMotion && !isLowPowerDevice && shouldMountDeferredUi && (
          <ErrorBoundary variant="inline" silent>
            <Suspense fallback={null}>
              <CustomCursor />
            </Suspense>
          </ErrorBoundary>
        )}
        {!isAdminRoute && !isImmersiveRoute && hasDesktopPointer && !prefersReducedMotion && !isLowPowerDevice && shouldMountDeferredUi && (
          <ErrorBoundary variant="inline" silent>
            <Suspense fallback={null}>
              <ScrollProgress />
            </Suspense>
          </ErrorBoundary>
        )}

        {shouldMountSearchPalette && (
          <ErrorBoundary variant="inline" silent>
            <Suspense fallback={null}>
              <SearchPalette initialOpen />
            </Suspense>
          </ErrorBoundary>
        )}

        <main id="main-content" className={`flex-grow ${isImmersiveRoute ? 'pb-0' : 'pb-[var(--mobile-content-bottom-padding)] md:pb-0'}`} role="main">
          <Suspense fallback={<LoadingScreen />}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/media" element={<PageTransition><MediaLibrary /></PageTransition>} />
              <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
              <Route path="/music" element={<MusicRedirect />} />
              <Route path="/videos" element={<PageTransition><Videos /></PageTransition>} />
              <Route path="/articles" element={<PageTransition><Articles /></PageTransition>} />
              <Route path="/ai-community" element={<Navigate to="/articles" replace />} />
              <Route path="/community" element={<Navigate to="/articles" replace />} />
              <Route path="/community/help" element={<Navigate to="/articles?postTab=help" replace />} />
              <Route path="/community/tech" element={<Navigate to="/articles?postTab=tech" replace />} />
              <Route path="/community/groups" element={<Navigate to="/articles" replace />} />
              <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
              <Route path="/about" element={<PageTransition><About /></PageTransition>} />
              <Route path="/download" element={<PageTransition><AppDownload /></PageTransition>} />
              <Route path="/app" element={<Navigate to="/download" replace />} />
              <Route path="/hackathon" element={<PageTransition><HackathonSeasonOne /></PageTransition>} />
              <Route path="/hackathon/showcase" element={<PageTransition><HackathonSeasonOne /></PageTransition>} />
              <Route path="/hackathon/works" element={<PageTransition><HackathonWorks /></PageTransition>} />
              <Route path="/future-learning" element={<PageTransition><FutureLearningCenter /></PageTransition>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route path="/me" element={<MeRedirect />} />
              <Route path="/profiles" element={<PageTransition><ProfileDirectory /></PageTransition>} />
              <Route path="/u/:handle" element={<PageTransition><ProfilePage /></PageTransition>} />
              <Route path="/org/:handle" element={<PageTransition><ProfilePage /></PageTransition>} />
              <Route path="/user/:id/center" element={<PageTransition><PublicProfile /></PageTransition>} />
              <Route path="/user/:id" element={<LegacyUserRedirect />} />
              <Route path="/projects" element={<PageTransition><ProjectPlaza /></PageTransition>} />
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Routes>
          </Suspense>
        </main>

        {!hideGlobalShell && !isAdminRoute && !isImmersiveRoute && <Footer />}

        {!hideGlobalShell && !isAdminRoute && shouldMountGlobalPlayer && (
          <ErrorBoundary variant="inline" silent>
            <Suspense fallback={null}>
              <GlobalPlayer />
            </Suspense>
          </ErrorBoundary>
        )}
        {!hideGlobalShell && !isAdminRoute && <MobileNavbar />}
        {!isImmersiveRoute && hasDesktopPointer && shouldMountDeferredUi && (
          <ErrorBoundary variant="inline" silent>
            <Suspense fallback={null}>
              <ScrollToTop />
            </Suspense>
          </ErrorBoundary>
        )}
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <PWAInstallPrompt />
          </Suspense>
        </ErrorBoundary>
        {import.meta.env.DEV && shouldMountLateDebugUi && (
          <Suspense fallback={null}>
            <PerformancePanel />
          </Suspense>
        )}
      </div>
    </div>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SettingsProvider>
          <MusicProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Toaster
                position="top-center"
                toastOptions={{
                  className: '',
                  style: {
                    background: 'rgba(10, 10, 10, 0.8)',
                    color: '#fff',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    fontSize: '14px',
                  },
                  success: {
                    iconTheme: {
                      primary: '#6366f1',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <AppContent />
            </Router>
          </MusicProvider>
        </SettingsProvider>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;
