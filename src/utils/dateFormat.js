/**
 * 国际化日期格式工具
 * 支持多语言、本地化日期和时间格式
 */

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境 (zh-CN, en-US 等)
 * @param {object} options - 格式化选项
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date, locale = "zh-CN", options = {}) => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        console.error("Invalid date:", date);
        return "";
    }

    const defaultOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境
 * @param {object} options - 格式化选项
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (date, locale = "zh-CN", options = {}) => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return "";
    }

    const defaultOptions = {
        hour: "2-digit",
        minute: "2-digit",
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * 格式化日期和时间
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境
 * @param {object} options - 格式化选项
 * @returns {string} 格式化后的日期时间字符串
 */
export const formatDateTime = (date, locale = "zh-CN", options = {}) => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return "";
    }

    const defaultOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    };

    return new Intl.DateTimeFormat(locale, { ...defaultOptions, ...options }).format(dateObj);
};

/**
 * 格式化相对时间 (如：3 天前)
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境
 * @returns {string} 相对时间字符串
 */
export const formatRelativeTime = (date, locale = "zh-CN") => {
    const dateObj = new Date(date);
    const now = new Date();

    if (isNaN(dateObj.getTime())) {
        return "";
    }

    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

    if (diffInSeconds < 60) {
        return rtf.format(-diffInSeconds, "second");
    } else if (diffInMinutes < 60) {
        return rtf.format(-diffInMinutes, "minute");
    } else if (diffInHours < 24) {
        return rtf.format(-diffInHours, "hour");
    } else if (diffInDays < 30) {
        return rtf.format(-diffInDays, "day");
    } else if (diffInMonths < 12) {
        return rtf.format(-diffInMonths, "month");
    } else {
        return rtf.format(-diffInYears, "year");
    }
};

/**
 * 格式化数字 (带千分位)
 * @param {number} number - 数字
 * @param {string} locale - 语言环境
 * @param {object} options - 格式化选项
 * @returns {string} 格式化后的数字字符串
 */
export const formatNumber = (number, locale = "zh-CN", options = {}) => {
    if (typeof number !== "number" || isNaN(number)) {
        return "";
    }

    const defaultOptions = {
        useGrouping: true,
    };

    return new Intl.NumberFormat(locale, { ...defaultOptions, ...options }).format(number);
};

/**
 * 格式化货币
 * @param {number} amount - 金额
 * @param {string} currency - 货币代码 (CNY, USD, EUR 等)
 * @param {string} locale - 语言环境
 * @returns {string} 格式化后的货币字符串
 */
export const formatCurrency = (amount, currency = "CNY", locale = "zh-CN") => {
    if (typeof amount !== "number" || isNaN(amount)) {
        return "";
    }

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
    }).format(amount);
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {string} locale - 语言环境
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes, locale = "zh-CN") => {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
        new Intl.NumberFormat(locale, {
            maximumFractionDigits: 2,
        }).format(bytes / Math.pow(k, i)) +
        " " +
        sizes[i]
    );
};

/**
 * 获取星期几
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境
 * @param {'long'|'short'|'narrow'} format - 格式
 * @returns {string} 星期几
 */
export const getWeekday = (date, locale = "zh-CN", format = "short") => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(locale, { weekday: format }).format(dateObj);
};

/**
 * 判断是否是今天
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @returns {boolean}
 */
export const isToday = (date) => {
    const dateObj = new Date(date);
    const today = new Date();

    return (
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate()
    );
};

/**
 * 判断是否是昨天
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @returns {boolean}
 */
export const isYesterday = (date) => {
    const dateObj = new Date(date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return (
        dateObj.getFullYear() === yesterday.getFullYear() &&
        dateObj.getMonth() === yesterday.getMonth() &&
        dateObj.getDate() === yesterday.getDate()
    );
};

/**
 * 智能格式化日期
 * 根据时间自动选择最合适的格式 (今天显示时间，昨天显示"昨天",更早显示日期)
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} locale - 语言环境
 * @returns {string} 智能格式化后的日期字符串
 */
export const formatSmartDate = (date, locale = "zh-CN") => {
    const dateObj = new Date(date);

    if (isNaN(dateObj.getTime())) {
        return "";
    }

    if (isToday(dateObj)) {
        return formatTime(dateObj, locale);
    }

    if (isYesterday(dateObj)) {
        return locale === "zh-CN" ? "昨天" : "Yesterday";
    }

    const now = new Date();
    const diffInDays = Math.floor((now - dateObj) / (1000 * 60 * 60 * 24));

    if (diffInDays < 7) {
        return getWeekday(dateObj, locale, "long");
    }

    if (dateObj.getFullYear() === now.getFullYear()) {
        return formatDate(dateObj, locale, { month: "long", day: "numeric" });
    }

    return formatDate(dateObj, locale);
};
