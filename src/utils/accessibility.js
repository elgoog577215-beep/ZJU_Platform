/**
 * Accessibility Utilities
 * ARIA labels, keyboard navigation, focus management, screen reader support
 */

import { useEffect, useRef, useCallback } from 'react';

// ============================================
// ARIA Labels and Roles
// ============================================

export const ariaLabels = {
  // Navigation
  mainNav: '主导航',
  breadcrumb: '面包屑导航',
  skipLink: '跳转到主要内容',
  
  // Actions
  close: '关闭',
  open: '打开',
  expand: '展开',
  collapse: '折叠',
  submit: '提交',
  cancel: '取消',
  delete: '删除',
  edit: '编辑',
  save: '保存',
  search: '搜索',
  filter: '筛选',
  sort: '排序',
  
  // Media
  play: '播放',
  pause: '暂停',
  mute: '静音',
  unmute: '取消静音',
  fullscreen: '全屏',
  exitFullscreen: '退出全屏',
  
  // Gallery
  previousImage: '上一张图片',
  nextImage: '下一张图片',
  zoomIn: '放大',
  zoomOut: '缩小',
  favorite: '收藏',
  unfavorite: '取消收藏',
  
  // Upload
  uploadImage: '上传图片',
  uploadVideo: '上传视频',
  dragDrop: '拖放文件到此处',
  
  // Form
  required: '必填项',
  optional: '选填项',
  error: '错误',
  success: '成功',
  loading: '加载中'
};

// ============================================
// Keyboard Navigation
// ============================================

export const keyCodes = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
};

/**
 * Handle keyboard navigation for lists
 */
export const useListKeyboardNavigation = (itemCount, onSelect) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    switch (event.key) {
      case keyCodes.ARROW_DOWN:
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % itemCount);
        break;
      case keyCodes.ARROW_UP:
        event.preventDefault();
        setFocusedIndex(prev => (prev - 1 + itemCount) % itemCount);
        break;
      case keyCodes.HOME:
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case keyCodes.END:
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case keyCodes.ENTER:
      case keyCodes.SPACE:
        event.preventDefault();
        if (focusedIndex >= 0) {
          onSelect?.(focusedIndex);
        }
        break;
      default:
        break;
    }
  }, [itemCount, focusedIndex, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current) {
      const items = containerRef.current.querySelectorAll('[role="listitem"]');
      items[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  return { containerRef, focusedIndex, setFocusedIndex };
};

// ============================================
// Focus Management
// ============================================

/**
 * Trap focus within a modal or dialog
 */
export const useFocusTrap = (isActive) => {
  const containerRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      // Store current focus
      previousFocusRef.current = document.activeElement;
      
      // Focus first focusable element
      const container = containerRef.current;
      if (container) {
        const focusableElements = container.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }

      // Restore focus on unmount
      return () => {
        previousFocusRef.current?.focus();
      };
    }
  }, [isActive]);

  const handleTabKey = useCallback((event) => {
    if (event.key !== keyCodes.TAB) return;

    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isActive, handleTabKey]);

  return containerRef;
};

/**
 * Announce changes to screen readers
 */
export const useAnnouncer = () => {
  const announce = useCallback((message, priority = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return announce;
};

// ============================================
// Skip Links
// ============================================

export const SkipLink = ({ targetId, children = '跳转到主要内容' }) => {
  const handleClick = (e) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 bg-indigo-600 text-white px-4 py-2 rounded-lg z-50"
    >
      {children}
    </a>
  );
};

// ============================================
// High Contrast Mode Detection
// ============================================

export const useHighContrast = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const handleChange = (e) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isHighContrast;
};

// ============================================
// Reduced Motion
// ============================================

export const usePrefersReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// ============================================
// Color Contrast Utilities
// ============================================

/**
 * Calculate relative luminance of a color
 */
export const getLuminance = (r, g, b) => {
  const [rs, gs, bs] = [r, g, b].map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

/**
 * Calculate contrast ratio between two colors
 */
export const getContrastRatio = (color1, color2) => {
  const lum1 = getLuminance(...color1);
  const lum2 = getLuminance(...color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Check if color combination meets WCAG standards
 */
export const meetsWCAG = (foreground, background, level = 'AA') => {
  const ratio = getContrastRatio(foreground, background);
  const thresholds = {
    'AA': { normal: 4.5, large: 3 },
    'AAA': { normal: 7, large: 4.5 }
  };
  return ratio >= thresholds[level].normal;
};

// ============================================
// Focus Visible
// ============================================

export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        setIsFocusVisible(true);
      }
    };

    const handleMouseDown = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return isFocusVisible;
};

// ============================================
// Screen Reader Only Text
// ============================================

export const VisuallyHidden = ({ children, ...props }) => {
  return (
    <span
      className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0"
      style={{
        clip: 'rect(0, 0, 0, 0)',
        clipPath: 'inset(50%)'
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// ============================================
// Accessible Button
// ============================================

export const AccessibleButton = ({
  children,
  onClick,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  disabled,
  className = '',
  ...props
}) => {
  const handleKeyDown = (e) => {
    if (e.key === keyCodes.ENTER || e.key === keyCodes.SPACE) {
      e.preventDefault();
      onClick?.(e);
    }
  };

  return (
    <button
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      className={`focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 
                  focus-visible:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// Live Region
// ============================================

export const LiveRegion = ({ id, ariaLive = 'polite', children }) => {
  return (
    <div
      id={id}
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  );
};

export default {
  ariaLabels,
  keyCodes,
  useListKeyboardNavigation,
  useFocusTrap,
  useAnnouncer,
  SkipLink,
  useHighContrast,
  usePrefersReducedMotion,
  getLuminance,
  getContrastRatio,
  meetsWCAG,
  useFocusVisible,
  VisuallyHidden,
  AccessibleButton,
  LiveRegion
};
