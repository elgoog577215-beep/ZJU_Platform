/**
 * 生产环境安全的日志工具
 * 自动根据环境过滤日志输出
 */

const isDevelopment = process.env.NODE_ENV === "development";

/**
 * 日志级别
 */
const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
};

// 生产环境使用 ERROR 级别，开发环境使用 DEBUG 级别
const currentLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;

/**
 * 创建日志函数
 * @param {string} type - 日志类型
 * @param {number} level - 日志级别
 * @returns {Function} 日志函数
 */
const createLog = (type, level) => {
    if (level < currentLevel) {
        return (...args) => {
            const prefix = `[${new Date().toISOString()}] [${type.toUpperCase()}]`;

            if (type === "error") {
                console.error(prefix, ...args);
            } else if (type === "warn") {
                console.warn(prefix, ...args);
            } else if (type === "debug" && isDevelopment) {
                console.debug(prefix, ...args);
            } else {
                console.log(prefix, ...args);
            }
        };
    }

    // 空函数，生产环境会被 tree-shaking 移除
    return () => {};
};

export const logger = {
    /**
     * 调试日志（仅开发环境）
     */
    debug: createLog("debug", LogLevel.DEBUG),

    /**
     * 信息日志
     */
    info: createLog("info", LogLevel.INFO),

    /**
     * 警告日志
     */
    warn: createLog("warn", LogLevel.WARN),

    /**
     * 错误日志（始终输出）
     */
    error: createLog("error", LogLevel.ERROR),

    /**
     * 成功日志
     */
    success: createLog("success", LogLevel.INFO),

    /**
     * 性能日志（仅开发环境）
     */
    perf: createLog("perf", LogLevel.DEBUG),
};

/**
 * 性能计时器
 */
export const createTimer = (label) => {
    if (!isDevelopment) return { end: () => {} };

    console.time(`[PERF] ${label}`);
    return {
        end: (message) => {
            console.timeEnd(`[PERF] ${label}`);
            if (message) {
                logger.perf(message);
            }
        },
    };
};

/**
 * 分组日志
 */
export const group = (label, callback) => {
    if (!isDevelopment) {
        callback();
        return;
    }

    console.group(`[GROUP] ${label}`);
    callback();
    console.groupEnd();
};

/**
 * 表格日志
 */
export const table = (data) => {
    if (!isDevelopment) return;
    console.table(data);
};

export default logger;
