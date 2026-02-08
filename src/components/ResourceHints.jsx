import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component to add resource hints for performance optimization
 * Preconnects to critical domains and preloads critical resources
 */
export const ResourceHints = () => {
  const location = useLocation();

  useEffect(() => {
    // Preconnect to critical domains
    const apiUrl = import.meta.env?.VITE_API_URL || '';
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      apiUrl ? apiUrl.replace('/api', '') : null
    ].filter(Boolean);

    preconnectDomains.forEach(domain => {
      if (!document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);

        // Also add DNS prefetch as fallback
        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = domain;
        document.head.appendChild(dnsLink);
      }
    });

    // Prefetch likely next routes
    const prefetchRoutes = () => {
      const currentPath = location.pathname;
      
      // Define route priorities
      const routeMap = {
        '/': ['/gallery', '/about'],
        '/gallery': ['/videos', '/articles'],
        '/videos': ['/gallery', '/articles'],
        '/articles': ['/resources', '/events'],
        '/resources': ['/articles', '/events'],
        '/events': ['/about'],
        '/about': ['/']
      };

      const routesToPrefetch = routeMap[currentPath] || [];
      
      routesToPrefetch.forEach(route => {
        const fullUrl = `${window.location.origin}${route}`;
        
        // Check if not already prefetched
        if (!document.querySelector(`link[rel="prefetch"][href="${fullUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = fullUrl;
          link.as = 'document';
          document.head.appendChild(link);
        }
      });
    };

    // Delay prefetch to not interfere with current page load
    const prefetchTimeout = setTimeout(prefetchRoutes, 2000);

    return () => {
      clearTimeout(prefetchTimeout);
    };
  }, [location.pathname]);

  return null;
};

/**
 * Preload critical images
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = reject;
    img.src = src;
  });
};

/**
 * Preload critical resources
 */
export const preloadCriticalResources = (resources) => {
  resources.forEach(({ type, src, as }) => {
    if (document.querySelector(`link[rel="preload"][href="${src}"]`)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = src;
    link.as = as || type;
    
    if (type === 'font') {
      link.crossOrigin = 'anonymous';
      link.type = 'font/woff2';
    }
    
    if (type === 'image') {
      link.type = `image/${src.split('.').pop()}`;
    }

    document.head.appendChild(link);
  });
};

export default ResourceHints;
