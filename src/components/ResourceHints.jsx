import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component to add resource hints for performance optimization
 * Preconnects to critical domains and preloads critical resources
 */
export const ResourceHints = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      return undefined;
    }

    const apiUrl = import.meta.env?.VITE_API_URL || '';
    const preconnectDomains = [apiUrl ? apiUrl.replace('/api', '') : null].filter(Boolean);

    preconnectDomains.forEach(domain => {
      if (!document.querySelector(`link[rel="preconnect"][href="${domain}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);

        const dnsLink = document.createElement('link');
        dnsLink.rel = 'dns-prefetch';
        dnsLink.href = domain;
        document.head.appendChild(dnsLink);
      }
    });

    const connection = navigator.connection;
    const saveDataEnabled = connection?.saveData === true;
    const effectiveType = connection?.effectiveType || '';
    const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';

    if (saveDataEnabled || slowConnection || document.visibilityState === 'hidden') {
      return undefined;
    }

    const prefetchRoutes = () => {
      const routeMap = {
        '/': ['/gallery', '/events'],
        '/gallery': ['/videos'],
        '/music': ['/events'],
        '/videos': ['/gallery'],
        '/articles': ['/events'],
        '/events': ['/about'],
        '/about': ['/']
      };

      const routesToPrefetch = routeMap[location.pathname] || [];
      
      routesToPrefetch.forEach(route => {
        const fullUrl = `${window.location.origin}${route}`;
        
        if (!document.querySelector(`link[rel="prefetch"][href="${fullUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = fullUrl;
          link.as = 'document';
          document.head.appendChild(link);
        }
      });
    };

    let timeoutId;
    let idleId;

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(prefetchRoutes, { timeout: 2500 });
    } else {
      timeoutId = window.setTimeout(prefetchRoutes, 2200);
    }

    return () => {
      if (idleId) {
        window.cancelIdleCallback?.(idleId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
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
