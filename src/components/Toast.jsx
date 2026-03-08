import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Loader2
} from 'lucide-react';

// Toast Context
const ToastContext = createContext(null);

// Toast Types
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  LOADING: 'loading'
};

// Toast Icons
const toastIcons = {
  [TOAST_TYPES.SUCCESS]: CheckCircle,
  [TOAST_TYPES.ERROR]: XCircle,
  [TOAST_TYPES.WARNING]: AlertTriangle,
  [TOAST_TYPES.INFO]: Info,
  [TOAST_TYPES.LOADING]: Loader2
};

// Toast Colors
const toastColors = {
  [TOAST_TYPES.SUCCESS]: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  [TOAST_TYPES.ERROR]: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    glow: 'shadow-red-500/20'
  },
  [TOAST_TYPES.WARNING]: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    glow: 'shadow-amber-500/20'
  },
  [TOAST_TYPES.INFO]: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    glow: 'shadow-blue-500/20'
  },
  [TOAST_TYPES.LOADING]: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    icon: 'text-indigo-400',
    glow: 'shadow-indigo-500/20'
  }
};

// Individual Toast Component
const Toast = ({ id, type, title, message, duration, onRemove, action }) => {
  const Icon = toastIcons[type];
  const colors = toastColors[type];
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (type === TOAST_TYPES.LOADING || duration === Infinity) return;

    let startTime = Date.now();
    let remainingTime = duration;
    let animationFrame;

    const updateProgress = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(newProgress);

        if (newProgress > 0) {
          animationFrame = requestAnimationFrame(updateProgress);
        } else {
          onRemove(id);
        }
      } else {
        remainingTime -= Date.now() - startTime;
        startTime = Date.now();
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };

    animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [id, duration, onRemove, type, isPaused]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ 
        type: 'spring',
        stiffness: 400,
        damping: 30
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        relative w-full max-w-sm overflow-hidden rounded-xl
        backdrop-blur-xl border ${colors.bg} ${colors.border}
        shadow-lg ${colors.glow}
        transition-all duration-300
      `}
    >
      {/* Progress Bar */}
      {duration !== Infinity && type !== TOAST_TYPES.LOADING && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full">
          <motion.div
            className={`h-full ${colors.icon.replace('text-', 'bg-')}`}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      <div className="p-4 flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <Icon 
            size={20} 
            className={type === TOAST_TYPES.LOADING ? 'animate-spin' : ''} 
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-semibold text-white mb-0.5">
              {title}
            </h4>
          )}
          {message && (
            <p className="text-sm text-gray-300 leading-relaxed">
              {message}
            </p>
          )}
          
          {/* Action Button */}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                onRemove(id);
              }}
              className={`
                mt-2 text-xs font-medium
                ${colors.icon} hover:underline
                transition-all duration-200
              `}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onRemove(id)}
          className="flex-shrink-0 text-gray-400 hover:text-white 
                     transition-colors duration-200 p-1 rounded-lg
                     hover:bg-white/10"
          aria-label="关闭通知"
        >
          <X size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// Toast Container Component
export const ToastContainer = ({ position = 'bottom-right' }) => {
  const { toasts } = useToast();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      className={`fixed z-[9999] flex flex-col gap-3 ${positionClasses[position]}`}
      role="region"
      aria-live="polite"
      aria-label="通知"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast Provider
export const ToastProvider = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = {
      id,
      duration: 5000,
      ...toast
    };
    
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id, updates) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, ...updates } : toast
      )
    );
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({ type: TOAST_TYPES.SUCCESS, message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: TOAST_TYPES.ERROR, message, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: TOAST_TYPES.WARNING, message, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: TOAST_TYPES.INFO, message, ...options });
  }, [addToast]);

  const loading = useCallback((message, options = {}) => {
    return addToast({ 
      type: TOAST_TYPES.LOADING, 
      message, 
      duration: Infinity,
      ...options 
    });
  }, [addToast]);

  const promise = useCallback(async (
    promiseFn,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage
    }
  ) => {
    const id = addToast({
      type: TOAST_TYPES.LOADING,
      message: loadingMessage,
      duration: Infinity
    });

    try {
      const result = await promiseFn();
      updateToast(id, {
        type: TOAST_TYPES.SUCCESS,
        message: typeof successMessage === 'function' 
          ? successMessage(result) 
          : successMessage,
        duration: 5000
      });
      return result;
    } catch (err) {
      updateToast(id, {
        type: TOAST_TYPES.ERROR,
        message: typeof errorMessage === 'function' 
          ? errorMessage(err) 
          : errorMessage || err.message,
        duration: 5000
      });
      throw err;
    }
  }, [addToast, updateToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    updateToast,
    success,
    error,
    warning,
    info,
    loading,
    promise
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer position={position} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Standalone toast function for use outside React components
let toastInstance = null;

export const setToastInstance = (instance) => {
  toastInstance = instance;
};

export const toast = {
  success: (message, options) => toastInstance?.success(message, options),
  error: (message, options) => toastInstance?.error(message, options),
  warning: (message, options) => toastInstance?.warning(message, options),
  info: (message, options) => toastInstance?.info(message, options),
  loading: (message, options) => toastInstance?.loading(message, options),
  promise: (promiseFn, messages) => toastInstance?.promise(promiseFn, messages)
};

export default ToastProvider;
