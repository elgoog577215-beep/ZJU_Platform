/**
 * Error Reporting Utility
 * Captures and reports errors to monitoring service
 */

// Error severity levels
const SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Error categories
const CATEGORY = {
  RUNTIME: 'runtime',
  NETWORK: 'network',
  AUTH: 'auth',
  VALIDATION: 'validation',
  RENDER: 'render',
  PERFORMANCE: 'performance',
  SECURITY: 'security'
};

class ErrorReporter {
  constructor(config = {}) {
    this.config = {
      endpoint: config.endpoint || null,
      apiKey: config.apiKey || null,
      environment: config.environment || 'development',
      release: config.release || 'unknown',
      sampleRate: config.sampleRate || 1.0,
      maxBreadcrumbs: config.maxBreadcrumbs || 100,
      ...config
    };
    
    this.breadcrumbs = [];
    this.user = null;
    this.tags = {};
    this.initialized = false;
    
    this.init();
  }
  
  init() {
    if (this.initialized) return;
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureException(event.error, {
        context: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureException(event.reason, {
        context: 'unhandledrejection'
      });
    });
    
    // React error boundary integration
    this.setupReactErrorBoundary();
    
    this.initialized = true;
  }
  
  setupReactErrorBoundary() {
    // This will be used by React Error Boundary component
    this.reactErrorHandler = (error, errorInfo) => {
      this.captureException(error, {
        context: 'react',
        componentStack: errorInfo?.componentStack
      });
    };
  }
  
  /**
   * Set user context
   */
  setUser(user) {
    this.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      ip_address: user.ip
    };
  }
  
  /**
   * Clear user context
   */
  clearUser() {
    this.user = null;
  }
  
  /**
   * Set tags
   */
  setTags(tags) {
    this.tags = { ...this.tags, ...tags };
  }
  
  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    const crumb = {
      timestamp: new Date().toISOString(),
      type: breadcrumb.type || 'default',
      category: breadcrumb.category,
      message: breadcrumb.message,
      data: breadcrumb.data,
      level: breadcrumb.level || 'info'
    };
    
    this.breadcrumbs.push(crumb);
    
    // Keep only last N breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }
  
  /**
   * Capture exception
   */
  captureException(error, context = {}) {
    if (!error) return;
    
    // Sample rate check
    if (Math.random() > this.config.sampleRate) return;
    
    const event = this.buildEvent(error, context);
    this.sendEvent(event);
    
    // Also log to console in development
    if (this.config.environment === 'development') {
      console.error('[ErrorReporter]', error, context);
    }
  }
  
  /**
   * Capture message
   */
  captureMessage(message, level = 'info', context = {}) {
    const event = this.buildEvent(new Error(message), {
      ...context,
      isMessage: true,
      level
    });
    this.sendEvent(event);
  }
  
  /**
   * Build error event
   */
  buildEvent(error, context = {}) {
    const now = new Date();
    
    return {
      event_id: this.generateId(),
      timestamp: now.toISOString(),
      platform: 'javascript',
      environment: this.config.environment,
      release: this.config.release,
      level: context.level || this.getLevelFromError(error),
      exception: {
        values: [{
          type: error.name || 'Error',
          value: error.message || String(error),
          stacktrace: this.parseStackTrace(error.stack),
          mechanism: {
            type: context.context || 'generic',
            handled: context.handled !== false
          }
        }]
      },
      request: {
        url: window.location.href,
        headers: {
          'User-Agent': navigator.userAgent
        }
      },
      user: this.user,
      tags: { ...this.tags, ...context.tags },
      extra: {
        ...context,
        breadcrumbs: this.breadcrumbs.slice(-20),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        devicePixelRatio: window.devicePixelRatio,
        language: navigator.language,
        online: navigator.onLine,
        memory: performance?.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : undefined
      }
    };
  }
  
  /**
   * Parse stack trace
   */
  parseStackTrace(stack) {
    if (!stack) return { frames: [] };
    
    const lines = stack.split('\n');
    const frames = [];
    
    for (const line of lines) {
      const match = line.match(/at\s+(?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?/);
      if (match) {
        frames.push({
          function: match[1] || '<anonymous>',
          filename: match[2],
          lineno: parseInt(match[3], 10),
          colno: parseInt(match[4], 10)
        });
      }
    }
    
    return { frames: frames.reverse() };
  }
  
  /**
   * Get level from error
   */
  getLevelFromError(error) {
    if (error.name === 'ReferenceError' || error.name === 'TypeError') {
      return 'error';
    }
    return 'error';
  }
  
  /**
   * Send event to endpoint
   */
  sendEvent(event) {
    // If no endpoint configured, just log to console
    if (!this.config.endpoint) {
      console.log('[ErrorReporter] Event:', event);
      return;
    }
    
    // Use sendBeacon for reliability
    const blob = new Blob([JSON.stringify(event)], {
      type: 'application/json'
    });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.config.endpoint, blob);
    } else {
      // Fallback to fetch
      fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey
        },
        body: JSON.stringify(event),
        keepalive: true
      }).catch(() => {
        // Silent fail - don't cause more errors
      });
    }
  }
  
  /**
   * Generate unique ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Performance monitoring
   */
  startPerformanceTransaction(name, op) {
    const startTime = performance.now();
    
    return {
      name,
      op,
      startTime,
      
      finish: (data = {}) => {
        const duration = performance.now() - startTime;
        
        this.addBreadcrumb({
          type: 'transaction',
          category: 'performance',
          message: `${name} completed`,
          data: {
            duration: Math.round(duration),
            ...data
          },
          level: duration > 1000 ? 'warning' : 'info'
        });
        
        return duration;
      }
    };
  }
  
  /**
   * Measure Web Vitals
   */
  measureWebVitals() {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.addBreadcrumb({
        type: 'web-vital',
        category: 'performance',
        message: 'LCP measured',
        data: {
          lcp: lastEntry.startTime,
          element: lastEntry.element?.tagName
        },
        level: lastEntry.startTime > 2500 ? 'warning' : 'info'
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const delay = entry.processingStart - entry.startTime;
        
        this.addBreadcrumb({
          type: 'web-vital',
          category: 'performance',
          message: 'FID measured',
          data: { fid: delay },
          level: delay > 100 ? 'warning' : 'info'
        });
      }
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      
      this.addBreadcrumb({
        type: 'web-vital',
        category: 'performance',
        message: 'CLS updated',
        data: { cls: clsValue },
        level: clsValue > 0.1 ? 'warning' : 'info'
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// Create singleton instance
const errorReporter = new ErrorReporter({
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION || '1.0.0'
});

// React Error Boundary Component
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    errorReporter.reactErrorHandler?.(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  useEffect(() => {
    const transaction = errorReporter.startPerformanceTransaction(
      componentName,
      'component'
    );
    
    return () => {
      transaction.finish();
    };
  }, [componentName]);
};

// Export singleton
export { errorReporter };
export default errorReporter;
export { SEVERITY, CATEGORY };
