import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { MusicProvider } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from './components/ErrorBoundary';

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

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, filter: 'blur(5px)' }}
    animate={{ opacity: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, filter: 'blur(5px)' }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    className="w-full"
  >
    {children}
  </motion.div>
);

const Home = () => {
    return (
        <>
            <Hero />
            <HomeCategories />
            <About />
        </>
    )
}

const AppContent = () => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { cursorEnabled, settings } = useSettings();

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
    <>
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

      <main className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
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
              <Route path="/admin" element={<AdminDashboard />} />
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
    </>
  );
};

const App = () => {
  return (
    <HelmetProvider>
      <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <MusicProvider>
            <Router>
              <AppContent />
              <Toaster 
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#333',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                  },
                }}
              />
            </Router>
          </MusicProvider>
        </SettingsProvider>
      </AuthProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

export default App;
