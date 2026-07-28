import React from "react";
import { AlertCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

/**
 * 统一错误提示组件
 * 提供友好的错误信息展示
 */
const ErrorDisplay = ({ error, title, message, type = "error", onRetry, showRetry = true }) => {
    const config = {
        error: {
            icon: XCircle,
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/20",
            textColor: "text-red-400",
            title: title || "操作失败",
        },
        warning: {
            icon: AlertTriangle,
            bgColor: "bg-yellow-500/10",
            borderColor: "border-yellow-500/20",
            textColor: "text-yellow-400",
            title: title || "注意",
        },
        info: {
            icon: Info,
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            textColor: "text-blue-400",
            title: title || "提示",
        },
    };

    const currentConfig = config[type];
    const Icon = currentConfig.icon;

    // 获取友好的错误消息
    const getFriendlyMessage = (err) => {
        if (!err) return message || "发生了一些问题，请稍后重试";

        // API 错误
        if (err.response) {
            const status = err.response.status;
            const data = err.response.data;

            switch (status) {
                case 400:
                    return data?.message || data?.error || "请求参数错误";
                case 401:
                    return "请先登录";
                case 403:
                    return "无权访问此资源";
                case 404:
                    return "请求的内容不存在";
                case 409:
                    return "资源已存在冲突";
                case 422:
                    return data?.errors?.[0]?.msg || "数据验证失败";
                case 500:
                    return "服务器错误，请稍后重试";
                case 503:
                    return "服务暂时不可用";
                default:
                    return data?.message || data?.error || `错误：${status}`;
            }
        }

        // 网络错误
        if (err.code === "NETWORK_ERROR" || err.message === "Network Error") {
            return "网络连接失败，请检查网络设置";
        }

        // 超时错误
        if (err.code === "ECONNABORTED") {
            return "请求超时，请检查网络连接";
        }

        // 默认消息
        return err.message || message || "发生了一些问题，请稍后重试";
    };

    const friendlyMessage = getFriendlyMessage(error);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`w-full p-6 rounded-2xl border ${currentConfig.bgColor} ${currentConfig.borderColor} backdrop-blur-sm`}
        >
            <div className="flex items-start space-x-4">
                <Icon className={`w-6 h-6 ${currentConfig.textColor} flex-shrink-0 mt-1`} />

                <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-semibold ${currentConfig.textColor} mb-2`}>
                        {currentConfig.title}
                    </h3>

                    <p className="text-gray-400 text-sm leading-relaxed">{friendlyMessage}</p>

                    {error?.stack && process.env.NODE_ENV === "development" && (
                        <details className="mt-4">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                                查看详细错误（仅开发环境）
                            </summary>
                            <pre className="mt-2 p-3 bg-black/30 rounded-lg overflow-x-auto text-xs text-red-300">
                                {error.stack}
                            </pre>
                        </details>
                    )}

                    {showRetry && onRetry && (
                        <button
                            onClick={onRetry}
                            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center"
                        >
                            重试
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default ErrorDisplay;
