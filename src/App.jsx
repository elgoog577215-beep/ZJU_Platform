import React, { Suspense, lazy, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { MusicProvider } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { ResourceHints } from './components/ResourceHints';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useServiceWorker } from './hooks/useServiceWorker';
import { routeTransition, useReducedMotion } from './utils/animations';
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

const Hero = lazy(() => import('./components/Hero'));
const Gallery = lazy(() => import('./components/Gallery'));
const Music = lazy(() => import('./components/Music'));
const Videos = lazy(() => import('./components/Videos'));
const Articles = lazy(() => import('./components/AICommunity'));
const Events = lazy(() => import('./components/Events'));
const HomeCategories = lazy(() => import('./components/HomeCategories'));
const PlatformStats = lazy(() => import('./components/PlatformStats'));
const About = lazy(() => import('./components/About'));
const HackathonRegistration = lazy(() => import('./components/HackathonRegistration'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const NotFound = lazy(() => import('./components/NotFound'));
const PublicProfile = lazy(() => import('./components/PublicProfile'));
const SearchPalette = lazy(() => import('./components/SearchPalette'));
const GlobalPlayer = lazy(() => import('./components/GlobalPlayer'));

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
      description="浙江大学 SQTP 项目信息聚合平台，聚合活动、作品与 AI 社区内容。"
    />
    <Hero />
    <PlatformStats />
  </>
);

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
};

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { cursorEnabled, settings } = useSettings();
  const hasDesktopPointer = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)');
  const shouldMountDeferredUi = useDeferredMount(700);
  const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);

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

    let visitorKey = window.localStorage.getItem('site-visitor-key');
    if (!visitorKey) {
      visitorKey =
        window.crypto?.randomUUID?.() ||
        `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem('site-visitor-key', visitorKey);
    }

    window.sessionStorage.setItem(sessionVisitKey, '1');
  }, [isAdminRoute, location.pathname]);

  return (
    <div className="day-ambient-shell flex flex-col min-h-screen">
      <ResourceHints />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-6 focus:py-3 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
      >
        跳转到主要内容
      </a>
      {!isAdminRoute && (
        <ErrorBoundary variant="inline" silent>
          <Navbar />
        </ErrorBoundary>
      )}
      {/* Keep the Hero image background, but disable the fixed page-wide home background. */}
      {!isAdminRoute && cursorEnabled && hasDesktopPointer && !isLowPowerDevice && <CustomCursor />}
      {!isAdminRoute && hasDesktopPointer && !isLowPowerDevice && <ScrollProgress />}

      {shouldMountDeferredUi && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <SearchPalette />
          </Suspense>
        </ErrorBoundary>
      )}

      <main id="main-content" className="flex-grow pb-32 md:pb-0" role="main">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
              <Route path="/music" element={<PageTransition><Music /></PageTransition>} />
              <Route path="/videos" element={<PageTransition><Videos /></PageTransition>} />
              <Route path="/articles" element={<PageTransition><Articles /></PageTransition>} />
              <Route path="/community" element={<Navigate to="/articles" replace />} />
              <Route path="/community/help" element={<Navigate to="/articles?tab=help" replace />} />
              <Route path="/community/tech" element={<Navigate to="/articles?tab=tech" replace />} />
              <Route path="/community/groups" element={<Navigate to="/articles?tab=groups" replace />} />
              <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
              <Route path="/about" element={<PageTransition><About /></PageTransition>} />
              <Route path="/hackathon" element={<PageTransition><HackathonRegistration /></PageTransition>} />
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
          </AnimatePresence>
        </Suspense>
      </main>

      {!isAdminRoute && <Footer />}

      {!isAdminRoute && shouldMountDeferredUi && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <GlobalPlayer />
          </Suspense>
        </ErrorBoundary>
      )}
      {!isAdminRoute && <MobileNavbar />}
      <ScrollToTop />
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
