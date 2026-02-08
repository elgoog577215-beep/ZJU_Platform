import { useEffect, useRef } from 'react';

/**
 * Hook to monitor and report web vitals and performance metrics
 */
export const usePerformanceMonitor = (options = {}) => {
  const { reportUrl, onMetric, enabled = true } = options;
  const metricsRef = useRef({});

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check if PerformanceObserver is supported
    if (!('PerformanceObserver' in window)) return;

    const observeMetrics = () => {
      // Core Web Vitals
      const vitalsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const metric = {
            name: entry.name,
            value: entry.value,
            rating: entry.rating,
            delta: entry.delta,
            id: entry.id,
            timestamp: Date.now()
          };

          metricsRef.current[entry.name] = metric;

          // Report to callback
          if (onMetric) {
            onMetric(metric);
          }

          // Send to analytics endpoint
          if (reportUrl) {
            sendToAnalytics(metric, reportUrl);
          }
        }
      });

      // Observe web vitals
      try {
        vitalsObserver.observe({ entryTypes: ['web-vitals'] });
      } catch (e) {
        // Fallback: observe individual entry types
        try {
          vitalsObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        } catch (e2) {
          console.warn('PerformanceObserver not supported for web vitals');
        }
      }
    };

    // Resource loading metrics
    const observeResources = () => {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only report slow resources (> 1 second)
          if (entry.duration > 1000) {
            const metric = {
              name: 'slow-resource',
              url: entry.name,
              duration: Math.round(entry.duration),
              type: entry.initiatorType,
              timestamp: Date.now()
            };

            if (onMetric) {
              onMetric(metric);
            }
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource timing not supported');
      }
    };

    // Navigation timing
    const reportNavigationTiming = () => {
      if (performance.timing) {
        const timing = performance.timing;
        const navigationStart = timing.navigationStart;

        const metrics = {
          'navigation-fcp': timing.responseStart - navigationStart,
          'navigation-dom': timing.domContentLoadedEventEnd - navigationStart,
          'navigation-load': timing.loadEventEnd - navigationStart,
          'navigation-ttfb': timing.responseStart - timing.requestStart
        };

        Object.entries(metrics).forEach(([name, value]) => {
          if (value > 0) {
            const metric = { name, value, timestamp: Date.now() };
            if (onMetric) onMetric(metric);
          }
        });
      }
    };

    observeMetrics();
    observeResources();
    
    // Report navigation timing after page load
    if (document.readyState === 'complete') {
      reportNavigationTiming();
    } else {
      window.addEventListener('load', reportNavigationTiming);
    }

    return () => {
      // Cleanup
    };
  }, [enabled, onMetric, reportUrl]);

  return metricsRef.current;
};

/**
 * Send performance metric to analytics endpoint
 */
const sendToAnalytics = (metric, url) => {
  const apiUrl = url || '/api/analytics/performance';
  
  // Use sendBeacon for reliable delivery
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(metric)], { type: 'application/json' });
    navigator.sendBeacon(apiUrl, blob);
  } else {
    // Fallback to fetch with keepalive
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true
    }).catch(() => {
      // Silently fail
    });
  }
};

/**
 * Hook to lazy load images with Intersection Observer
 */
export const useLazyLoad = (options = {}) => {
  const { rootMargin = '50px', threshold = 0.01 } = options;
  const observerRef = useRef(null);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target;
            
            // Handle images
            if (element.tagName === 'IMG' && element.dataset.src) {
              element.src = element.dataset.src;
              element.removeAttribute('data-src');
            }
            
            // Handle background images
            if (element.dataset.bgSrc) {
              element.style.backgroundImage = `url(${element.dataset.bgSrc})`;
              element.removeAttribute('data-bg-src');
            }
            
            // Handle iframes
            if (element.tagName === 'IFRAME' && element.dataset.src) {
              element.src = element.dataset.src;
              element.removeAttribute('data-src');
            }
            
            // Stop observing this element
            observerRef.current.unobserve(element);
            
            // Add loaded class for transitions
            element.classList.add('lazy-loaded');
          }
        });
      },
      { rootMargin, threshold }
    );

    // Observe all lazy-load elements
    const lazyElements = document.querySelectorAll(
      '[data-src], [data-bg-src], .lazy-load'
    );
    
    lazyElements.forEach((el) => observerRef.current.observe(el));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold]);

  return observerRef;
};

/**
 * Hook to debounce function calls
 */
export const useDebounce = (fn, delay = 300) => {
  const timeoutRef = useRef(null);

  const debouncedFn = (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };

  return debouncedFn;
};

/**
 * Hook to throttle function calls
 */
export const useThrottle = (fn, limit = 100) => {
  const inThrottleRef = useRef(false);

  const throttledFn = (...args) => {
    if (!inThrottleRef.current) {
      fn(...args);
      inThrottleRef.current = true;
      setTimeout(() => {
        inThrottleRef.current = false;
      }, limit);
    }
  };

  return throttledFn;
};

export default usePerformanceMonitor;
