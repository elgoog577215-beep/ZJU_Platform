/**
 * 性能监控工具
 * 收集和分析性能指标
 */

class PerformanceMonitor {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
    this.metrics = {
      fp: null, // First Paint
      fcp: null, // First Contentful Paint
      lcp: null, // Largest Contentful Paint
      fid: null, // First Input Delay
      cls: null, // Cumulative Layout Shift
      tti: null, // Time to Interactive
      ttfb: null, // Time to First Byte
      dcl: null, // DOM Content Loaded
      load: null // Window Load
    };
    
    this.observer = null;
    this.init();
  }

  /**
   * 初始化性能监控
   */
  init() {
    if (!this.enabled) return;

    // 监控 Web Vitals
    this.observeWebVitals();
    
    // 监控资源加载
    this.observeResources();
    
    // 监控长任务
    this.observeLongTasks();
    
    // 监控内存使用
    this.observeMemory();
  }

  /**
   * 监控 Web Vitals
   */
  observeWebVitals() {
    // First Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const fcp = entries[entries.length - 1];
      this.metrics.fcp = fcp.startTime;
      console.log('[Performance] FCP:', fcp.startTime.toFixed(2), 'ms');
    }).observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lcp = entries[entries.length - 1];
      this.metrics.lcp = lcp.startTime;
      console.log('[Performance] LCP:', lcp.startTime.toFixed(2), 'ms');
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (通过监听 pointerdown 事件估算)
    let fidEntry;
    const onPointerDown = (e) => {
      fidEntry = e;
      removeEventListeners();
    };
    
    const removeEventListeners = () => {
      ['pointerdown', 'mousedown', 'touchstart'].forEach(type => {
        document.removeEventListener(type, onPointerDown);
      });
    };

    ['pointerdown', 'mousedown', 'touchstart'].forEach(type => {
      document.addEventListener(type, onPointerDown, { once: true, capture: true });
    });

    new PerformanceObserver((entryList) => {
      if (fidEntry) {
        const entries = entryList.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'first-input') {
            this.metrics.fid = entry.processingStart - entry.startTime;
            console.log('[Performance] FID:', this.metrics.fid.toFixed(2), 'ms');
          }
        });
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metrics.cls = clsValue;
          console.log('[Performance] CLS:', clsValue.toFixed(4));
        }
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * 监控资源加载
   */
  observeResources() {
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(r => r.duration > 1000);
      
      if (slowResources.length > 0) {
        console.warn('[Performance] Slow resources (>1s):', slowResources.map(r => ({
          name: r.name,
          duration: r.duration.toFixed(2),
          type: r.initiatorType
        })));
      }
    });
  }

  /**
   * 监控长任务
   */
  observeLongTasks() {
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach(entry => {
        console.warn('[Performance] Long task detected:', {
          duration: entry.duration.toFixed(2),
          startTime: entry.startTime.toFixed(2)
        });
      });
    }).observe({ entryTypes: ['longtask'] });
  }

  /**
   * 监控内存使用
   */
  // FIX: BUG-23 — Store interval ID so it can be cleared via destroy()
  observeMemory() {
    if (performance.memory) {
      this._memoryIntervalId = setInterval(() => {
        const memory = performance.memory;
        const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
        const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);

        console.log('[Performance] Memory:', {
          used: `${usedMB} MB`,
          total: `${totalMB} MB`,
          usage: ((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100).toFixed(2) + '%'
        });
      }, 10000);
    }
  }

  destroy() {
    if (this._memoryIntervalId) {
      clearInterval(this._memoryIntervalId);
      this._memoryIntervalId = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 获取性能报告
   */
  getReport() {
    const report = {
      metrics: this.getMetrics(),
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource'),
      timestamp: new Date().toISOString()
    };

    // 评估性能等级
    report.score = this.evaluatePerformance(report.metrics);
    
    return report;
  }

  /**
   * 评估性能等级
   */
  evaluatePerformance(metrics) {
    let score = 100;

    // LCP 评分
    if (metrics.lcp > 4000) score -= 30;
    else if (metrics.lcp > 2500) score -= 15;

    // FID 评分
    if (metrics.fid > 300) score -= 30;
    else if (metrics.fid > 100) score -= 15;

    // CLS 评分
    if (metrics.cls > 0.25) score -= 30;
    else if (metrics.cls > 0.1) score -= 15;

    // FCP 评分
    if (metrics.fcp > 4000) score -= 10;
    else if (metrics.fcp > 1800) score -= 5;

    return {
      score,
      grade: score >= 90 ? 'A' : score >= 70 ? 'B' : score >= 50 ? 'C' : 'D',
      details: {
        lcp: metrics.lcp ? `${(metrics.lcp / 1000).toFixed(2)}s` : 'N/A',
        fid: metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A',
        cls: metrics.cls ? metrics.cls.toFixed(4) : 'N/A',
        fcp: metrics.fcp ? `${(metrics.fcp / 1000).toFixed(2)}s` : 'N/A'
      }
    };
  }

  /**
   * 发送性能报告
   */
  async sendReport() {
    const report = this.getReport();
    console.log('[Performance] Report:', report);
    
    // 可以在这里发送到后端
    // await api.post('/api/performance', report);
    
    return report;
  }
}

// 创建单例
const performanceMonitor = new PerformanceMonitor();

// 导出便捷函数
export const getPerformanceMetrics = () => performanceMonitor.getMetrics();
export const getPerformanceReport = () => performanceMonitor.getReport();
export const sendPerformanceReport = () => performanceMonitor.sendReport();

export default performanceMonitor;
