/**
 * Performance Monitoring Hooks
 * Track component performance, memory usage, and Web Vitals
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { errorReporter } from '../utils/errorReporting';

/**
 * Hook to measure component render performance
 */
export const useRenderPerformance = (componentName, threshold = 16) => {
  const renderCount = useRef(0);
  const totalRenderTime = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    const now = performance.now();
    const renderTime = now - lastRenderTime.current;
    
    renderCount.current++;
    totalRenderTime.current += renderTime;
    
    // Log slow renders
    if (renderTime > threshold) {
      console.warn(
        `[Performance] ${componentName} rendered slowly: ${renderTime.toFixed(2)}ms ` +
        `(render #${renderCount.current})`
      );
      
      errorReporter.addBreadcrumb({
        type: 'performance',
        category: 'render',
        message: `Slow render detected in ${componentName}`,
        data: {
          componentName,
          renderTime,
          renderCount: renderCount.current
        },
        level: 'warning'
      });
    }
    
    lastRenderTime.current = now;
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderCount.current > 0 
      ? totalRenderTime.current / renderCount.current 
      : 0
  };
};

/**
 * Hook to measure long tasks
 */
export const useLongTaskMonitor = (onLongTask = null) => {
  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          const detail = {
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: entry.attribution?.map(a => ({
              name: a.name,
              entryType: a.entryType,
              startTime: a.startTime,
              duration: a.duration
            }))
          };
          
          console.warn('[Performance] Long task detected:', detail);
          
          errorReporter.addBreadcrumb({
            type: 'performance',
            category: 'long-task',
            message: `Long task: ${entry.duration.toFixed(2)}ms`,
            data: detail,
            level: 'warning'
          });
          
          onLongTask?.(detail);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Browser doesn't support longtask
    }

    return () => observer.disconnect();
  }, [onLongTask]);
};

/**
 * Hook to monitor memory usage
 */
export const useMemoryMonitor = (interval = 30000) => {
  const [memory, setMemory] = useState(null);

  useEffect(() => {
    if (!performance?.memory) return;

    const checkMemory = () => {
      const mem = performance.memory;
      const usage = {
        usedJSHeapSize: formatBytes(mem.usedJSHeapSize),
        totalJSHeapSize: formatBytes(mem.totalJSHeapSize),
        jsHeapSizeLimit: formatBytes(mem.jsHeapSizeLimit),
        usagePercent: ((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100).toFixed(2)
      };
      
      setMemory(usage);
      
      // Warn if memory usage is high
      if (mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.8) {
        console.warn('[Performance] High memory usage:', usage);
        
        errorReporter.addBreadcrumb({
          type: 'performance',
          category: 'memory',
          message: 'High memory usage detected',
          data: usage,
          level: 'warning'
        });
      }
    };

    checkMemory();
    const intervalId = setInterval(checkMemory, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return memory;
};

/**
 * Hook to measure Web Vitals
 */
export const useWebVitals = () => {
  const [vitals, setVitals] = useState({});

  useEffect(() => {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      const lcp = {
        value: lastEntry.startTime,
        rating: lastEntry.startTime < 2500 ? 'good' : lastEntry.startTime < 4000 ? 'needs-improvement' : 'poor'
      };
      
      setVitals(prev => ({ ...prev, lcp }));
      
      errorReporter.addBreadcrumb({
        type: 'web-vital',
        category: 'performance',
        message: 'LCP measured',
        data: lcp,
        level: lcp.rating === 'poor' ? 'warning' : 'info'
      });
    });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const delay = entry.processingStart - entry.startTime;
        
        const fid = {
          value: delay,
          rating: delay < 100 ? 'good' : delay < 300 ? 'needs-improvement' : 'poor'
        };
        
        setVitals(prev => ({ ...prev, fid }));
        
        errorReporter.addBreadcrumb({
          type: 'web-vital',
          category: 'performance',
          message: 'FID measured',
          data: fid,
          level: fid.rating === 'poor' ? 'warning' : 'info'
        });
      }
    });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      const cls = {
        value: clsValue,
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
      };
      
      setVitals(prev => ({ ...prev, cls }));
    });

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          const fcp = {
            value: entry.startTime,
            rating: entry.startTime < 1800 ? 'good' : entry.startTime < 3000 ? 'needs-improvement' : 'poor'
          };
          
          setVitals(prev => ({ ...prev, fcp }));
        }
      }
    });

    // Time to First Byte
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      const ttfb = {
        value: navigation.responseStart - navigation.startTime,
        rating: navigation.responseStart - navigation.startTime < 600 ? 'good' : 'needs-improvement'
      };
      setVitals(prev => ({ ...prev, ttfb }));
    }

    // Start observing
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      fidObserver.observe({ entryTypes: ['first-input'] });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      fcpObserver.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.warn('Some PerformanceObserver types not supported');
    }

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      fcpObserver.disconnect();
    };
  }, []);

  return vitals;
};

/**
 * Hook to measure resource loading
 */
export const useResourceTiming = () => {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    const getResources = () => {
      const entries = performance.getEntriesByType('resource');
      
      const slowResources = entries
        .filter(r => r.duration > 1000)
        .map(r => ({
          name: r.name.split('/').pop(),
          duration: r.duration,
          size: r.transferSize,
          type: r.initiatorType
        }));
      
      if (slowResources.length > 0) {
        setResources(slowResources);
        
        errorReporter.addBreadcrumb({
          type: 'performance',
          category: 'resource',
          message: 'Slow resources detected',
          data: { resources: slowResources },
          level: 'warning'
        });
      }
    };

    // Wait for page to load
    if (document.readyState === 'complete') {
      getResources();
    } else {
      window.addEventListener('load', getResources);
      return () => window.removeEventListener('load', getResources);
    }
  }, []);

  return resources;
};

/**
 * Hook to measure network status
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    type: navigator.connection?.effectiveType || 'unknown',
    downlink: navigator.connection?.downlink || 0,
    rtt: navigator.connection?.rtt || 0
  });

  useEffect(() => {
    const handleOnline = () => setStatus(prev => ({ ...prev, online: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, online: false }));
    
    const handleConnectionChange = () => {
      setStatus({
        online: navigator.onLine,
        type: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || 0,
        rtt: navigator.connection?.rtt || 0
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return status;
};

/**
 * Hook to measure interaction timing
 */
export const useInteractionTiming = () => {
  const startTime = useRef(null);

  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const end = useCallback((label = 'Interaction') => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      
      console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
      
      errorReporter.addBreadcrumb({
        type: 'performance',
        category: 'interaction',
        message: label,
        data: { duration },
        level: duration > 100 ? 'warning' : 'info'
      });
      
      startTime.current = null;
      return duration;
    }
    return 0;
  }, []);

  return { start, end };
};

/**
 * Utility to format bytes
 */
const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Performance Monitor Component
 * Displays performance metrics in development
 */
export const PerformanceMonitor = () => {
  const vitals = useWebVitals();
  const memory = useMemoryMonitor();
  const network = useNetworkStatus();
  
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 backdrop-blur-md text-white text-xs p-4 rounded-lg font-mono">
      <h4 className="font-bold mb-2 text-indigo-400">Performance</h4>
      
      {vitals.lcp && (
        <div className="flex justify-between gap-4">
          <span>LCP:</span>
          <span className={vitals.lcp.rating === 'good' ? 'text-green-400' : 'text-yellow-400'}>
            {Math.round(vitals.lcp.value)}ms
          </span>
        </div>
      )}
      
      {vitals.fid && (
        <div className="flex justify-between gap-4">
          <span>FID:</span>
          <span className={vitals.fid.rating === 'good' ? 'text-green-400' : 'text-yellow-400'}>
            {Math.round(vitals.fid.value)}ms
          </span>
        </div>
      )}
      
      {vitals.cls && (
        <div className="flex justify-between gap-4">
          <span>CLS:</span>
          <span className={vitals.cls.rating === 'good' ? 'text-green-400' : 'text-yellow-400'}>
            {vitals.cls.value.toFixed(3)}
          </span>
        </div>
      )}
      
      {memory && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <div className="flex justify-between gap-4">
            <span>Memory:</span>
            <span className={parseFloat(memory.usagePercent) > 80 ? 'text-red-400' : 'text-green-400'}>
              {memory.usagePercent}%
            </span>
          </div>
        </div>
      )}
      
      <div className="mt-2 pt-2 border-t border-white/20">
        <div className="flex justify-between gap-4">
          <span>Network:</span>
          <span className={network.online ? 'text-green-400' : 'text-red-400'}>
            {network.type}
          </span>
        </div>
      </div>
    </div>
  );
};

export default {
  useRenderPerformance,
  useLongTaskMonitor,
  useMemoryMonitor,
  useWebVitals,
  useResourceTiming,
  useNetworkStatus,
  useInteractionTiming,
  PerformanceMonitor
};
