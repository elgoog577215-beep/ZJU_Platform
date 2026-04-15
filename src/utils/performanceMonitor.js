const DEBUG_STORAGE_KEY = "debugPerformance";

const getConnectionInfo = () => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const connection = navigator.connection;
  if (!connection) {
    return null;
  }

  return {
    effectiveType: connection.effectiveType || "unknown",
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData === true,
  };
};

const getDomNodeCount = () => {
  if (typeof document === "undefined") {
    return 0;
  }

  return document.getElementsByTagName("*").length;
};

class PerformanceMonitor {
  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.enabled = false;
    this.observers = [];
    this.memoryIntervalId = null;
  }

  createEmptyMetrics() {
    return {
      fp: null,
      fcp: null,
      lcp: null,
      fid: null,
      cls: 0,
      tti: null,
      ttfb: null,
      dcl: null,
      load: null,
      jsHeapUsed: 0,
      jsHeapTotal: 0,
      domNodes: getDomNodeCount(),
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      connection: getConnectionInfo(),
    };
  }

  shouldEnable() {
    return (
      typeof window !== "undefined" &&
      import.meta.env.DEV &&
      window.localStorage.getItem(DEBUG_STORAGE_KEY) === "true"
    );
  }

  init() {
    if (!this.shouldEnable() || this.enabled) {
      return;
    }

    this.enabled = true;
    this.observeWebVitals();
    this.observeLongTasks();
    this.observeResources();
    this.observeMemory();
    this.captureNavigationMetrics();
  }

  createObserver(entryTypes, onEntries) {
    if (typeof PerformanceObserver === "undefined") {
      return null;
    }

    const observer = new PerformanceObserver((entryList) => {
      onEntries(entryList.getEntries());
    });

    observer.observe({ entryTypes });
    this.observers.push(observer);
    return observer;
  }

  observeWebVitals() {
    this.createObserver(["paint"], (entries) => {
      entries.forEach((entry) => {
        if (entry.name === "first-paint") {
          this.metrics.fp = entry.startTime;
        }
        if (entry.name === "first-contentful-paint") {
          this.metrics.fcp = entry.startTime;
        }
      });
    });

    this.createObserver(["largest-contentful-paint"], (entries) => {
      const lastEntry = entries.at(-1);
      if (lastEntry) {
        this.metrics.lcp = lastEntry.startTime;
      }
    });

    this.createObserver(["first-input"], (entries) => {
      const firstInput = entries.at(0);
      if (firstInput) {
        this.metrics.fid =
          firstInput.processingStart - firstInput.startTime;
      }
    });

    this.createObserver(["layout-shift"], (entries) => {
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          this.metrics.cls += entry.value;
        }
      });
    });
  }

  observeLongTasks() {
    this.createObserver(["longtask"], () => {
      this.metrics.domNodes = getDomNodeCount();
    });
  }

  observeResources() {
    if (typeof window === "undefined") {
      return;
    }

    const refreshNetworkState = () => {
      this.metrics.isOnline = navigator.onLine;
      this.metrics.connection = getConnectionInfo();
    };

    window.addEventListener("online", refreshNetworkState);
    window.addEventListener("offline", refreshNetworkState);
  }

  observeMemory() {
    if (typeof performance === "undefined" || !performance.memory) {
      return;
    }

    const refreshMemory = () => {
      this.metrics.jsHeapUsed = performance.memory.usedJSHeapSize || 0;
      this.metrics.jsHeapTotal = performance.memory.totalJSHeapSize || 0;
      this.metrics.domNodes = getDomNodeCount();
    };

    refreshMemory();
    this.memoryIntervalId = window.setInterval(refreshMemory, 5000);
  }

  captureNavigationMetrics() {
    if (typeof performance === "undefined") {
      return;
    }

    const navigation = performance.getEntriesByType("navigation")[0];
    if (!navigation) {
      return;
    }

    this.metrics.ttfb = navigation.responseStart || null;
    this.metrics.dcl = navigation.domContentLoadedEventEnd || null;
    this.metrics.load = navigation.loadEventEnd || null;
  }

  getMetrics() {
    if (this.shouldEnable() && !this.enabled) {
      this.init();
    }

    return {
      ...this.metrics,
      domNodes: getDomNodeCount(),
      isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
      connection: getConnectionInfo(),
    };
  }

  evaluatePerformance(metrics) {
    let score = 100;

    if (metrics.lcp && metrics.lcp > 4000) score -= 30;
    else if (metrics.lcp && metrics.lcp > 2500) score -= 15;

    if (metrics.fid && metrics.fid > 300) score -= 30;
    else if (metrics.fid && metrics.fid > 100) score -= 15;

    if (metrics.cls > 0.25) score -= 30;
    else if (metrics.cls > 0.1) score -= 15;

    if (metrics.fcp && metrics.fcp > 4000) score -= 10;
    else if (metrics.fcp && metrics.fcp > 1800) score -= 5;

    return {
      score,
      grade: score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : "D",
      details: {
        lcp: metrics.lcp ? `${(metrics.lcp / 1000).toFixed(2)}s` : "N/A",
        fid: metrics.fid ? `${metrics.fid.toFixed(0)}ms` : "N/A",
        cls: metrics.cls ? metrics.cls.toFixed(4) : "0.0000",
        fcp: metrics.fcp ? `${(metrics.fcp / 1000).toFixed(2)}s` : "N/A",
      },
    };
  }

  getReport() {
    const metrics = this.getMetrics();
    return {
      metrics,
      navigation:
        typeof performance !== "undefined"
          ? performance.getEntriesByType("navigation")[0] || null
          : null,
      resources:
        typeof performance !== "undefined"
          ? performance.getEntriesByType("resource")
          : [],
      score: this.evaluatePerformance(metrics),
      timestamp: new Date().toISOString(),
    };
  }

  runPerformanceTest() {
    this.init();
    return this.getReport();
  }

  async sendReport() {
    return this.getReport();
  }

  destroy() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];

    if (this.memoryIntervalId) {
      clearInterval(this.memoryIntervalId);
      this.memoryIntervalId = null;
    }

    this.enabled = false;
  }
}

const performanceMonitor = new PerformanceMonitor();

export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceReport = () => performanceMonitor.getReport();
export const sendPerformanceReport = () => performanceMonitor.sendReport();
export const performanceDebugStorageKey = DEBUG_STORAGE_KEY;

export default performanceMonitor;
