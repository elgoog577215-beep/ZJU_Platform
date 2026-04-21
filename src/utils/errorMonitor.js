import api from '../services/api';

/**
 * 错误监控系统
 * 收集并报告前端错误
 */

class ErrorMonitor {
  constructor() {
    this.enabled = import.meta.env.PROD;
    this.endpoint = '/errors';
    this.queue = [];
    this.maxQueueSize = 10;
    this.batchSize = 5;
    this.flushInterval = 30000; // 30 秒
    this.context = {};
    
    this.init();
  }

  /**
   * 初始化错误监控
   */
  init() {
    if (!this.enabled) return;

    // 收集上下文信息
    this.collectContext();

    // 监听全局错误
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // 监听未捕获的 Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unhandledrejection',
        reason: event.reason?.message || event.reason,
        stack: event.reason?.stack
      });
    });

    // 定期发送错误报告
    setInterval(() => this.flush(), this.flushInterval);

    // 页面关闭前发送所有错误
    window.addEventListener('beforeunload', () => this.flush());
  }

  /**
   * 收集上下文信息
   */
  collectContext() {
    this.context = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      network: {
        online: navigator.onLine,
        connection: navigator.connection?.effectiveType
      },
      memory: performance?.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : undefined,
      referrer: document.referrer || undefined
    };
  }

  /**
   * 处理错误
   */
  handleError(error) {
    const errorReport = {
      ...error,
      timestamp: new Date().toISOString(),
      context: { ...this.context },
      metadata: {
        environment: process.env.NODE_ENV,
        version: '1.0.0'
      }
    };

    console.error('[ErrorMonitor] Captured error:', errorReport);

    // 添加到队列
    this.queue.push(errorReport);

    // 如果队列满了，立即发送
    if (this.queue.length >= this.maxQueueSize) {
      this.flush();
    }
  }

  /**
   * 手动报告错误
   */
  report(error, context = {}) {
    const path = context.url || error?.config?.url;
    if (typeof path === 'string' && path.includes('/errors')) {
      return;
    }

    this.handleError({
      type: 'manual',
      error: error?.message || error,
      stack: error?.stack,
      path,
      status: context.status || error?.response?.status,
      method: context.method || error?.config?.method,
      context
    });
  }

  /**
   * 添加面包屑导航
   */
  addBreadcrumb(breadcrumb) {
    console.log('[ErrorMonitor] Breadcrumb:', breadcrumb);
    // 可以在这里实现面包屑记录
  }

  /**
   * 设置用户上下文
   */
  setUser(user) {
    this.context.user = {
      id: user?.id,
      username: user?.username,
      role: user?.role
    };
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue = [];
  }

  /**
   * 发送错误报告
   */
  async flush() {
    if (this.queue.length === 0 || !this.enabled) return;

    const errorsToSend = this.queue.splice(0, this.batchSize);

    try {
      await api.post(this.endpoint, {
        errors: errorsToSend
      }, {
        silent: true // 不触发 API 错误处理
      });
      
      console.log(`[ErrorMonitor] Sent ${errorsToSend.length} errors`);
    } catch (err) {
      console.error('[ErrorMonitor] Failed to send errors:', err);
      // 将错误重新加入队列
      this.queue.unshift(...errorsToSend);
    }
  }

  /**
   * 启用/禁用错误监控
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// 创建单例
const errorMonitor = new ErrorMonitor();

// 导出便捷函数
export const reportError = (error, context) => {
  errorMonitor.report(error, context);
};

export const addBreadcrumb = (breadcrumb) => {
  errorMonitor.addBreadcrumb(breadcrumb);
};

export const setUser = (user) => {
  errorMonitor.setUser(user);
};

export default errorMonitor;
