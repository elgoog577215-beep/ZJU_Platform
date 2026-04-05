import toast from 'react-hot-toast';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

/**
 * 统一的 Toast 提示系统
 * 提供友好的用户反馈
 */

const toastConfig = {
  duration: 3000,
  position: 'top-right',
  style: {
    background: 'rgba(15, 23, 42, 0.95)',
    color: '#fff',
    borderRadius: '12px',
    padding: '12px 16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
    minWidth: '300px',
    maxWidth: '500px'
  }
};

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info
};

/**
 * 显示成功提示
 */
export const showSuccess = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border border-green-500/20 bg-green-500/10 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-100">{message}</p>
        </div>
      </div>
    ),
    {
      ...toastConfig,
      duration: options.duration || 3000,
      ...options
    }
  );
};

/**
 * 显示错误提示
 */
export const showError = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-100">{message}</p>
          {options.details && (
            <p className="text-xs text-red-300 mt-1">{options.details}</p>
          )}
        </div>
      </div>
    ),
    {
      ...toastConfig,
      duration: options.duration || 5000,
      ...options
    }
  );
};

/**
 * 显示警告提示
 */
export const showWarning = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-100">{message}</p>
        </div>
      </div>
    ),
    {
      ...toastConfig,
      duration: options.duration || 4000,
      ...options
    }
  );
};

/**
 * 显示信息提示
 */
export const showInfo = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-100">{message}</p>
        </div>
      </div>
    ),
    {
      ...toastConfig,
      duration: options.duration || 3000,
      ...options
    }
  );
};

/**
 * 显示加载提示
 */
export const showLoading = (message, options = {}) => {
  return toast.custom(
    (t) => (
      <div
        className={`flex items-center space-x-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-indigo-100">{message}</p>
      </div>
    ),
    {
      ...toastConfig,
      duration: options.duration || undefined, // 不自动关闭
      ...options
    }
  );
};

/**
 * 显示操作确认提示
 */
export const showActionToast = ({
  message,
  actionLabel,
  onAction,
  onCancel,
  type = 'info'
}) => {
  const iconColors = {
    info: 'text-blue-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  return toast.custom(
    (t) => (
      <div
        className={`flex items-start space-x-3 p-4 rounded-xl border border-white/10 bg-gray-800/90 backdrop-blur-sm transition-all duration-300 ${
          t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
        style={toastConfig.style}
      >
        <Info className={`w-5 h-5 ${iconColors[type]} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white mb-3">{message}</p>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                onAction?.();
                toast.dismiss(t.id);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {actionLabel}
            </button>
            {onCancel && (
              <button
                onClick={() => {
                  onCancel?.();
                  toast.dismiss(t.id);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </div>
      </div>
    ),
    {
      ...toastConfig,
      duration: options?.duration || 10000, // 10 秒后自动关闭
      ...options
    }
  );
};

// 导出兼容旧代码的 API
export const notify = {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  action: showActionToast
};

export default {
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  loading: showLoading,
  action: showActionToast
};
