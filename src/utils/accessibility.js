/**
 * 可访问性工具函数
 * 提升网站的无障碍体验
 */

/**
 * 管理焦点
 */

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getFocusableElements = (container) => {
  if (!container) return [];

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
};

/**
 * 将焦点设置到指定元素
 * @param {HTMLElement} element - 目标元素
 */
export const focusElement = (element) => {
  if (!element) return;
  
  element.focus();
  
  // 如果是可点击元素，添加可见的焦点样式
  if (element.tabIndex >= 0) {
    element.classList.add('focus-visible:outline-none', 'focus-visible:ring-2', 'focus-visible:ring-indigo-500');
  }
};

/**
 * 将焦点设置到第一个可聚焦元素
 * @param {HTMLElement} container - 容器元素
 */
export const focusFirstElement = (container) => {
  if (!container) return;
  
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
};

/**
 * 将焦点设置到最后一个可聚焦元素
 * @param {HTMLElement} container - 容器元素
 */
export const focusLastElement = (container) => {
  if (!container) return;
  
  const focusableElements = getFocusableElements(container);
  
  if (focusableElements.length > 0) {
    focusableElements[focusableElements.length - 1].focus();
  }
};

/**
 * 陷阱焦点在容器内（用于模态框）
 * @param {HTMLElement} container - 容器元素
 * @returns {Function} 清理函数
 */
export const trapFocus = (container) => {
  if (!container) return () => {};
  
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return () => {};
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  container.addEventListener('keydown', handleKeyDown);
  
  // 初始聚焦到第一个元素
  firstElement?.focus();
  
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
};

/**
 * 生成唯一的 ID（用于 ARIA 标签）
 */
let idCounter = 0;
export const generateId = (prefix = 'id') => {
  return `${prefix}-${++idCounter}`;
};

/**
 * 检查元素是否可见
 * @param {HTMLElement} element - 要检查的元素
 * @returns {boolean} 是否可见
 */
export const isElementVisible = (element) => {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetParent !== null
  );
};

/**
 * 为屏幕阅读器创建实时区域
 * @param {string} message - 要宣布的消息
 * @param {string} priority - 'polite' 或 'assertive'
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // 清理
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * 键盘导航工具
 */

/**
 * 处理键盘导航
 * @param {KeyboardEvent} e - 键盘事件
 * @param {Object} handlers - 处理函数对象
 */
export const handleKeyboardNavigation = (e, handlers = {}) => {
  const keyHandlers = {
    Enter: handlers.onEnter,
    Space: handlers.onSpace,
    Escape: handlers.onEscape,
    Tab: handlers.onTab,
    ArrowUp: handlers.onArrowUp,
    ArrowDown: handlers.onArrowDown,
    ArrowLeft: handlers.onArrowLeft,
    ArrowRight: handlers.onArrowRight,
    Home: handlers.onHome,
    End: handlers.onEnd,
    ...handlers
  };
  
  const handler = keyHandlers[e.key] || keyHandlers[e.code];
  if (handler) {
    e.preventDefault();
    handler(e);
  }
};

/**
 * 创建可访问的按钮
 * @param {React.ReactNode} children - 按钮内容
 * @param {Object} props - 按钮属性
 * @returns {Object} 可访问的按钮属性
 */
export const getAccessibleButtonProps = (props = {}) => ({
  role: 'button',
  tabIndex: 0,
  'aria-pressed': props['aria-pressed'],
  'aria-disabled': props['aria-disabled'],
  'aria-label': props['aria-label'],
  'aria-labelledby': props['aria-labelledby'],
  ...props
});

/**
 * 颜色对比度工具
 */

/**
 * 计算颜色对比度
 * @param {string} color1 - 第一个颜色（hex）
 * @param {string} color2 - 第二个颜色（hex）
 * @returns {number} 对比度比率
 */
export const getContrastRatio = (color1, color2) => {
  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    
    const a = [r, g, b].map((v) => {
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/**
 * 检查颜色对比度是否符合 WCAG 标准
 * @param {string} color1 - 第一个颜色
 * @param {string} color2 - 第二个颜色
 * @param {string} level - 'AA' 或 'AAA'
 * @returns {boolean} 是否符合标准
 */
export const meetsContrastRequirements = (color1, color2, level = 'AA') => {
  const ratio = getContrastRatio(color1, color2);
  
  const requirements = {
    AA: 4.5, // 普通文本
    AAA: 7, // 增强对比度
    'AA-large': 3, // 大文本
    'AAA-large': 4.5 // 大文本增强
  };
  
  return ratio >= requirements[level];
};

export default {
  focusElement,
  focusFirstElement,
  focusLastElement,
  trapFocus,
  generateId,
  isElementVisible,
  announceToScreenReader,
  handleKeyboardNavigation,
  getAccessibleButtonProps,
  getContrastRatio,
  meetsContrastRequirements
};
