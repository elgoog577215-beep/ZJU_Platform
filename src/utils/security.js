import DOMPurify from 'dompurify';

/**
 * 安全工具函数
 * 防止 XSS 和其他安全漏洞
 */

/**
 * 清理 HTML 内容，防止 XSS 攻击
 * @param {string} html - 需要清理的 HTML 字符串
 * @param {Object} options - DOMPurify 配置选项
 * @returns {string} 清理后的 HTML
 */
export const sanitizeHTML = (html, options = {}) => {
  if (!html) return '';
  
  const defaultOptions = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'em', 'b', 'i', 'u', 's',
      'a', 'img', 'video', 'audio',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'class', 'id', 'style',
      'target', 'rel', 'name',
      'width', 'height', 'controls',
      'colspan', 'rowspan'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i,
    ADD_ATTR: ['target'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    ...options
  };

  return DOMPurify.sanitize(html, defaultOptions);
};

/**
 * 清理用户输入的文本（纯文本，不允许 HTML）
 * @param {string} text - 需要清理的文本
 * @returns {string} 清理后的文本
 */
export const sanitizeText = (text) => {
  if (!text) return '';
  
  // 移除 HTML 标签
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * 验证 URL 是否安全
 * @param {string} url - 需要验证的 URL
 * @returns {boolean} URL 是否安全
 */
export const isValidURL = (url) => {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    return allowedProtocols.includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/**
 * 清理 URL，只允许安全的协议
 * @param {string} url - 需要清理的 URL
 * @param {string} fallback - 如果 URL 不安全时的备用值
 * @returns {string} 清理后的 URL
 */
export const sanitizeURL = (url, fallback = '#') => {
  if (!url) return fallback;
  
  return isValidURL(url) ? url : fallback;
};

/**
 * 清理 Markdown 内容
 * @param {string} markdown - Markdown 字符串
 * @returns {string} 清理后的 Markdown
 */
export const sanitizeMarkdown = (markdown) => {
  if (!markdown) return '';
  
  // 移除可能的脚本标签
  let sanitized = markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '');
  
  return sanitized;
};

/**
 * 防止点击劫持的 CSP 配置
 */
export const setCSPHeaders = () => {
  if (typeof document === 'undefined') return;
  
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self' https:;
    frame-ancestors 'self';
    base-uri 'self';
    form-action 'self'
  `.trim().replace(/\s+/g, ' ');
  
  document.head.appendChild(meta);
};

/**
 * 验证文件类型是否安全
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的文件类型
 * @returns {boolean} 文件类型是否安全
 */
export const isValidFileType = (file, allowedTypes = []) => {
  if (!file) return false;
  
  const fileType = file.type || file.name.split('.').pop().toLowerCase();
  
  if (allowedTypes.length === 0) {
    // 默认允许的类型
    allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
  }
  
  return allowedTypes.includes(fileType);
};

/**
 * 验证文件大小
 * @param {number} size - 文件大小（字节）
 * @param {number} maxSize - 最大允许大小（MB）
 * @returns {boolean} 文件大小是否合法
 */
export const isValidFileSize = (size, maxSize = 10) => {
  const maxBytes = maxSize * 1024 * 1024;
  return size <= maxBytes;
};

/**
 * 创建安全的 iframe
 * @param {string} src - iframe 源
 * @param {Object} options - 配置选项
 * @returns {HTMLIFrameElement} 安全的 iframe 元素
 */
export const createSafeIframe = (src, options = {}) => {
  const iframe = document.createElement('iframe');
  
  // 设置安全属性
  iframe.sandbox = options.sandbox || 'allow-same-origin allow-scripts';
  iframe.referrerPolicy = 'no-referrer';
  iframe.loading = 'lazy';
  
  // 验证并设置 src
  if (isValidURL(src)) {
    iframe.src = src;
  }
  
  // 设置样式
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  
  return iframe;
};

/**
 * 防止原型污染
 */
export const preventPrototypePollution = () => {
  if (typeof Object.freeze === 'function') {
    [Object, Function, Array, String, Number, Boolean, RegExp].forEach((constructor) => {
      if (constructor.prototype) {
        Object.freeze(constructor.prototype);
      }
    });
  }
};

export default {
  sanitizeHTML,
  sanitizeText,
  isValidURL,
  sanitizeURL,
  sanitizeMarkdown,
  setCSPHeaders,
  isValidFileType,
  isValidFileSize,
  createSafeIframe,
  preventPrototypePollution
};
