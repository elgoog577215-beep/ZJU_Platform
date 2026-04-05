import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 自定义 React Hooks 集合
 */

/**
 * 防抖 Hook
 * @param {Function} callback - 回调函数
 * @param {number} delay - 延迟时间 (ms)
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

/**
 * 节流 Hook
 * @param {Function} callback - 回调函数
 * @param {number} limit - 时间限制 (ms)
 */
export const useThrottle = (callback, limit) => {
  const lastRunRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastRunRef.current >= limit) {
      lastRunRef.current = now;
      callback(...args);
    }
  }, [callback, limit]);
};

/**
 * 本地存储 Hook
 * @param {string} key - 存储键
 * @param {any} initialValue - 初始值
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('[useLocalStorage] Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('[useLocalStorage] Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

/**
 * 窗口大小 Hook
 */
export const useWindowSize = () => {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};

/**
 * 网络状态 Hook
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

/**
 * 可见性 Hook
 */
export const useVisibility = () => {
  const [isVisible, setIsVisible] = useState(
    typeof document !== 'undefined' ? !document.hidden : true
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
};

/**
 * 长按 Hook
 * @param {Function} callback - 回调函数
 * @param {number} duration - 长按持续时间 (ms)
 */
export const useLongPress = (callback, duration = 500) => {
  const timeoutRef = useRef(null);
  const isLongPressingRef = useRef(false);

  const start = useCallback(() => {
    isLongPressingRef.current = false;
    timeoutRef.current = setTimeout(() => {
      isLongPressingRef.current = true;
      callback();
    }, duration);
  }, [callback, duration]);

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isLongPressingRef.current = false;
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop
  };
};

/**
 * 复制文本 Hook
 */
export const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState(null);

  const copy = useCallback(async (text) => {
    if (!navigator.clipboard) {
      console.warn('[useCopyToClipboard] Clipboard API not supported');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      console.error('[useCopyToClipboard] Failed to copy:', error);
      return false;
    }
  }, []);

  return { copiedText, copy };
};

/**
 * 暗色模式 Hook
 */
export const useDarkMode = () => {
  const [isDark, setIsDark] = useLocalStorage('darkMode', false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggle = useCallback(() => {
    setIsDark((prev) => !prev);
  }, [setIsDark]);

  return { isDark, toggle };
};

/**
 * 表单 Hook
 * @param {Object} initialValues - 初始值
 * @param {Function} validate - 验证函数
 */
export const useForm = (initialValues = {}, validate) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleBlur = useCallback((e) => {
    const { name } = e.target;
    setTouched((prev) => ({
      ...prev,
      [name]: true
    }));

    if (validate) {
      const validationErrors = validate({ ...values, [name]: e.target.value });
      setErrors(validationErrors);
    }
  }, [values, validate]);

  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length === 0) {
        await onSubmit(values);
      }
    } else {
      await onSubmit(values);
    }
    
    setIsSubmitting(false);
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setValues,
    setErrors
  };
};

/**
 * 无限滚动 Hook
 * @param {Function} onLoadMore - 加载更多回调
 * @param {number} threshold - 触发阈值
 */
export const useInfiniteScroll = (onLoadMore, threshold = 100) => {
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const observerRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    
    setIsLoading(true);
    try {
      await onLoadMore();
    } finally {
      setIsLoading(false);
    }
  }, [onLoadMore, isLoading, hasMore]);

  const observe = useCallback((element) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (element) {
      observerRef.current.observe(element);
    }
  }, [loadMore, threshold]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { observe, isLoading, hasMore, setHasMore };
};

export default {
  useDebounce,
  useThrottle,
  useLocalStorage,
  useWindowSize,
  useNetworkStatus,
  useVisibility,
  useLongPress,
  useCopyToClipboard,
  useDarkMode,
  useForm,
  useInfiniteScroll
};
