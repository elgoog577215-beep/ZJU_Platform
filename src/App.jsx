import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { MusicProvider } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';
import { ResourceHints } from './components/ResourceHints';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { useServiceWorker } from './hooks/useServiceWorker';
import api from './services/api';
import SEO from './components/SEO';
import errorMonitor from './utils/errorMonitor';
import performanceMonitor from './utils/performanceMonitor';

import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import CustomCursor from './components/CustomCursor';
import ScrollProgress from './components/ScrollProgress';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import MobileNavbar from './components/MobileNavbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';
import PerformancePanel from './components/PerformancePanel';

// Lazy load page components
const Hero = lazy(() => import('./components/Hero'));
const Gallery = lazy(() => import('./components/Gallery'));
const Music = lazy(() => import('./components/Music'));
const Videos = lazy(() => import('./components/Videos'));
const Articles = lazy(() => import('./components/Articles'));
const Events = lazy(() => import('./components/Events'));
const HomeCategories = lazy(() => import('./components/HomeCategories'));
const PlatformStats = lazy(() => import('./components/PlatformStats'));
const About = lazy(() => import('./components/About'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const NotFound = lazy(() => import('./components/NotFound'));
const PublicProfile = lazy(() => import('./components/PublicProfile'));
const BackgroundSystem = lazy(() => import('./components/BackgroundSystem'));
const SearchPalette = lazy(() => import('./components/SearchPalette'));
const GlobalPlayer = lazy(() => import('./components/GlobalPlayer'));
const CommunityLayout = lazy(() => import('./community/CommunityLayout'));
const CommunitySectionPage = lazy(() => import('./community/CommunitySectionPage'));

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
  // Check if we are on a mobile device to disable heavy filters
  // Use useState to avoid hydration mismatch
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: isMobile ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: isMobile ? 0 : -10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

const Home = () => {
    return (
        <>
            <SEO 
              title="首页"
              description="探索数字艺术与科技的边界 - 浙江大学 SQTP 项目组官方平台，展示摄影、音乐、视频、文章等多元创作内容"
            />
            <Hero />
            <PlatformStats />
            <HomeCategories />
            <About />
        </>
    )
}

// 路由守卫：仅 admin 可访问，否则重定向到首页
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
  const shouldMountDeferredUi = useDeferredMount(700);
  const shouldMountHeavyBackground = useDeferredMount(100);
  const [canRenderHeavyEffects, setCanRenderHeavyEffects] = useState(true);
  const allowBackgroundEffects = !isAdminRoute && settings?.backgroundEnabled !== false;
  const shouldUseThreeBackground = location.pathname === '/';
  
  // 注册 Service Worker
  useServiceWorker();

  // 调试：强制启用 3D 背景渲染
  // useEffect(() => {
  //   if (typeof window === 'undefined') return undefined;
  //   const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  //   const isSmallScreen = window.innerWidth < 1024;
  //   const saveDataEnabled = navigator.connection?.saveData === true;
  //   // 调试日志已移除
  //   setCanRenderHeavyEffects(!prefersReducedMotion && !isSmallScreen && !saveDataEnabled);
  // }, []);

  // Performance monitoring
  usePerformanceMonitor({
    enabled: import.meta.env.PROD,
    onMetric: (metric) => {
      // 仅在生产环境记录性能指标
      if (import.meta.env.PROD && window.location.hostname === 'tuotuzj.com') {
        // 发送到分析服务
        // analytics.track('performance', metric);
      }
    }
  });

  useEffect(() => {
    if (settings?.site_title) {
      document.title = settings.site_title;
    }
  }, [settings?.site_title]);

  // 背景渲染条件调试已移除

  // Scroll to top on route change
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
      visitorKey = window.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem('site-visitor-key', visitorKey);
    }

    window.sessionStorage.setItem(sessionVisitKey, '1');

    api.post('/site-metrics/visit', {
      visitorKey,
      pagePath: location.pathname
    }).catch(() => {
      window.sessionStorage.removeItem(sessionVisitKey);
    });
  }, [isAdminRoute, location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <ResourceHints />
      {/* 跳过链接 - 无障碍功能 */}
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
      {allowBackgroundEffects && shouldUseThreeBackground && canRenderHeavyEffects && shouldMountHeavyBackground && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <BackgroundSystem />
          </Suspense>
        </ErrorBoundary>
      )}
      {!isAdminRoute && cursorEnabled && <div className="hidden md:block"><CustomCursor /></div>}
      {!isAdminRoute && <ScrollProgress />}
      
      {shouldMountDeferredUi && (
        <ErrorBoundary variant="inline" silent>
          <Suspense fallback={null}>
            <SearchPalette />
          </Suspense>
        </ErrorBoundary>
      )}

      <main id="main-content" className="flex-grow pb-24 md:pb-0" role="main">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
              <Route path="/music" element={<PageTransition><Music /></PageTransition>} />
              <Route path="/videos" element={<PageTransition><Videos /></PageTransition>} />
              <Route path="/articles" element={<PageTransition><Articles /></PageTransition>} />
              <Route path="/community" element={<PageTransition><CommunityLayout /></PageTransition>}>
                <Route index element={<Navigate to="help" replace />} />
                <Route path=":section" element={<CommunitySectionPage />} />
              </Route>
              <Route path="/events" element={<PageTransition><Events /></PageTransition>} />
              <Route path="/about" element={<PageTransition><About /></PageTransition>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
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
      <PerformancePanel />
    </div>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <SettingsProvider>
          <MusicProvider>
            <Router>
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
