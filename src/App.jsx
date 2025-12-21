import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { MusicProvider } from './context/MusicContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { Loader } from 'lucide-react';
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

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-black text-white">
    <Loader className="animate-spin" size={48} />
  </div>
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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/music" element={<Music />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/events" element={<Events />} />
            <Route path="/about" element={<About />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

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
