import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { MusicProvider } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { HelmetProvider } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from './components/ErrorBoundary';
import { ResourceHints } from './components/ResourceHints';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useServiceWorker } from './hooks/useServiceWorker';
import { routeTransition, useReducedMotion } from './utils/animations';
import { getOrCreateSiteVisitorKey } from './utils/visitorKey';
import SEO from './components/SEO';

import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import CustomCursor from './components/CustomCursor';
import ScrollProgress from './components/ScrollProgress';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MobileNavbar from './components/MobileNavbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import PerformancePanel from './components/PerformancePanel';

const CHUNK_RELOAD_KEY = 'zju-platform:chunk-reload-attempted';

const isChunkLoadError = (error) => {
  const message = String(error?.message || error || '');
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|dynamically imported module/i.test(message);
};

const clearClientCaches = async () => {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
    }
  } catch {
    // Cache cleanup is best-effort; reloading still gives the browser a fresh route request.
  }
};

const lazyWithRecovery = (loader) =>
  lazy(() =>
    loader().catch(async (error) => {
      if (isChunkLoadError(error) && typeof window !== 'undefined') {
        const alreadyRetried = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1';
        if (!alreadyRetried) {
          window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1');
          await clearClientCaches();
          window.location.reload();
          return new Promise(() => {});
        }
      }
      throw error;
    }),
  );

const Hero = lazyWithRecovery(() => import('./components/Hero'));
const Gallery = lazyWithRecovery(() => import('./components/Gallery'));
const MediaLibrary = lazyWithRecovery(() => import('./components/MediaLibrary'));
const Music = lazyWithRecovery(() => import('./components/Music'));
const Videos = lazyWithRecovery(() => import('./components/Videos'));
const Articles = lazyWithRecovery(() => import('./components/AICommunity'));
const Events = lazyWithRecovery(() => import('./components/Events'));
const HomeCategories = lazyWithRecovery(() => import('./components/HomeCategories'));
const PlatformStats = lazyWithRecovery(() => import('./components/PlatformStats'));
const About = lazyWithRecovery(() => import('./components/About'));
const HackathonSeasonOne = lazyWithRecovery(() => import('./components/HackathonSeasonOne'));
const HackathonWorks = lazyWithRecovery(() => import('./components/HackathonWorks'));
const FutureLearningCenter = lazyWithRecovery(() => import('./components/FutureLearningCenter'));
const AdminDashboard = lazyWithRecovery(() => import('./components/Admin/AdminDashboard'));
const AdminAccessGate = lazyWithRecovery(() => import('./components/Admin/AdminAccessGate'));
const NotFound = lazyWithRecovery(() => import('./components/NotFound'));
const PublicProfile = lazyWithRecovery(() => import('./components/PublicProfile'));
const SearchPalette = lazyWithRecovery(() => import('./components/SearchPalette'));
const GlobalPlayer = lazyWithRecovery(() => import('./components/GlobalPlayer'));
const BackgroundSystem = lazyWithRecovery(() => import('./components/BackgroundSystem'));

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

  return (
    <motion.div
      variants={routeTransition}
      initial={prefersReducedMotion ? false : 'initial'}
      animate={prefersReducedMotion ? undefined : 'animate'}
      exit={prefersReducedMotion ? undefined : 'exit'}
      className="motion-gpu w-full"
    >
      {children}
    </motion.div>
  );
};

const Home = () => (
  <>
    <SEO
      title="首页"
      description="AI生态团队信息聚合平台，聚合活动、作品与 AI 社区内容。"
    />
    <PlatformStats hero={({ onScrollNext }) => <Hero id="home-hero" onScrollNext={onScrollNext} />} />
  </>
);

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading || !user || user.role !== 'admin') return <AdminAccessGate />;
  return children;
};

const AppContent = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isHomeRoute = location.pathname === '/';
  const isAboutRoute = location.pathname === '/about';
  const isImmersiveRoute = isHomeRoute || isAboutRoute || location.pathname.startsWith('/hackathon');
  const { cursorEnabled, settings, uiMode } = useSettings();
  const hasDesktopPointer = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const shouldMountDeferredUi = useDeferredMount(700);
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);
  const shouldRenderDarkBackground = uiMode !== 'day' && !isAdminRoute && !isImmersiveRoute;

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
    if (settings?.site_title) {
      document.title = settings.site_title;
    }
  }, [settings?.site_title]);

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
    <div className="day-ambient-shell flex flex-col min-h-screen">
      <ResourceHints />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        {t('common.skip_to_main', '跳转到主要内容')}
      </a>
      {(
        <ErrorBoundary variant="inline" silent>
          <Navbar />
        </ErrorBoundary>
      )}
      {shouldRenderDarkBackground && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <BackgroundSystem />
          </Suspense>
        </ErrorBoundary>
      )}
      {!isAdminRoute && cursorEnabled && hasDesktopPointer && !isLowPowerDevice && <CustomCursor />}
      {!isAdminRoute && !isImmersiveRoute && hasDesktopPointer && !isLowPowerDevice && <ScrollProgress />}

      {shouldMountDeferredUi && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <SearchPalette />
          </Suspense>
        </ErrorBoundary>
      )}

      <main id="main-content" className={`flex-grow ${isImmersiveRoute ? 'pb-0' : 'pb-32 md:pb-0'}`} role="main">
        <Suspense fallback={<LoadingScreen />}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Home /></PageTransition>} />
            <Route path="/media" element={<PageTransition><MediaLibrary /></PageTransition>} />
            <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
            <Route path="/music" element={<PageTransition><Music /></PageTransition>} />
            <Route path="/videos" element={<PageTransition><Videos /></PageTransition>} />
            <Route path="/articles" element={<PageTransition><Articles /></PageTransition>} />
            <Route path="/ai-community" element={<Navigate to="/articles" replace />} />
            <Route path="/community" element={<Navigate to="/articles" replace />} />
            <Route path="/community/help" element={<Navigate to="/articles?tab=help" replace />} />
            <Route path="/community/tech" element={<Navigate to="/articles?tab=tech" replace />} />
            <Route path="/community/groups" element={<Navigate to="/articles?tab=groups" replace />} />
            <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
            <Route path="/about" element={<PageTransition><About /></PageTransition>} />
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
            <Route path="/user/:id" element={<PageTransition><PublicProfile /></PageTransition>} />
            <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminRoute && !isImmersiveRoute && <Footer />}

      {!isAdminRoute && shouldMountDeferredUi && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <GlobalPlayer />
          </Suspense>
        </ErrorBoundary>
      )}
      {!isAdminRoute && <MobileNavbar />}
      {!isImmersiveRoute && <ScrollToTop />}
      <PWAInstallPrompt />
      {import.meta.env.DEV && <PerformancePanel />}
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
