import React, { Suspense, lazy } from 'react';
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

import Navbar from './components/Navbar';
import BackgroundSystem from './components/BackgroundSystem';
import GlobalPlayer from './components/GlobalPlayer';
import ScrollToTop from './components/ScrollToTop';
import CustomCursor from './components/CustomCursor';
import ScrollProgress from './components/ScrollProgress';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import SearchPalette from './components/SearchPalette';
import MobileNavbar from './components/MobileNavbar';
import Footer from './components/Footer';
import LoadingScreen from './components/LoadingScreen';

// Lazy load page components
const Hero = lazy(() => import('./components/Hero'));
const Gallery = lazy(() => import('./components/Gallery'));
const Music = lazy(() => import('./components/Music'));
const Videos = lazy(() => import('./components/Videos'));
const Articles = lazy(() => import('./components/Articles'));
const Events = lazy(() => import('./components/Events'));
const HomeCategories = lazy(() => import('./components/HomeCategories'));
const About = lazy(() => import('./components/About'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));
const NotFound = lazy(() => import('./components/NotFound'));
const PublicProfile = lazy(() => import('./components/PublicProfile'));

const PageTransition = ({ children }) => {
  // Check if we are on a mobile device to disable heavy filters
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  
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
            <Hero />
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

  // Performance monitoring
  usePerformanceMonitor({
    enabled: import.meta.env.PROD,
    onMetric: (metric) => {
      // Log metrics in development
      if (import.meta.env.DEV) {
        console.log('[Performance]', metric);
      }
    }
  });

  React.useEffect(() => {
    if (settings?.site_title) {
      document.title = settings.site_title;
    }
  }, [settings?.site_title]);

  // Scroll to top on route change
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <ResourceHints />
      {!isAdminRoute && (
        <ErrorBoundary variant="inline" silent>
            <Navbar />
        </ErrorBoundary>
      )}
      {!isAdminRoute && (
        <ErrorBoundary variant="inline" silent>
            <BackgroundSystem />
        </ErrorBoundary>
      )}
      {!isAdminRoute && cursorEnabled && <div className="hidden md:block"><CustomCursor /></div>}
      {!isAdminRoute && <ScrollProgress />}
      
      <ErrorBoundary variant="inline" silent>
        <SearchPalette />
      </ErrorBoundary>

      <main className="flex-grow pb-24 md:pb-0">
        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/gallery" element={<PageTransition><Gallery /></PageTransition>} />
              <Route path="/music" element={<PageTransition><Music /></PageTransition>} />
              <Route path="/videos" element={<PageTransition><Videos /></PageTransition>} />
              <Route path="/articles" element={<PageTransition><Articles /></PageTransition>} />
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

      {!isAdminRoute && (
        <ErrorBoundary variant="inline" silent>
            <GlobalPlayer />
        </ErrorBoundary>
      )}
      {!isAdminRoute && <MobileNavbar />}
      <ScrollToTop />
      <PWAInstallPrompt />
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
