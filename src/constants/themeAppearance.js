/**
 * 站点外观个性化：把可调参数映射为 --theme-* CSS 变量。
 *
 * 参数统一存后端 settings 表（key/value），由 SettingsContext 拉取后
 * 在运行时注入 document.documentElement，全站实时生效。
 */

export const THEME_APPEARANCE_DEFAULTS = {
    // 主题强调色（hex），派生 accent / accent-strong / accent-soft
    theme_accent: "",
    // 卡片/面板不透明度百分比：100 = 完全跟随默认主题，数值越低越通透
    theme_card_opacity: "100",
    // 毛玻璃模糊强度（px），作用于 glass-panel 等背板
    theme_glass_blur: "24",
    // 暗色模式下的页面背景色（hex），留空表示使用主题默认
    theme_bg_color: "",
};

export const THEME_APPEARANCE_KEYS = Object.keys(THEME_APPEARANCE_DEFAULTS);

export const ACCENT_PRESETS = [
    { name: "靛蓝", value: "#818cf8" },
    { name: "蔚蓝", value: "#38bdf8" },
    { name: "翡翠", value: "#34d399" },
    { name: "琥珀", value: "#fbbf24" },
    { name: "玫红", value: "#fb7185" },
    { name: "紫罗兰", value: "#a78bfa" },
    { name: "青碧", value: "#2dd4bf" },
    { name: "暖橙", value: "#fb923c" },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseHex = (hex) => {
    if (typeof hex !== "string") return null;
    const normalized = hex.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16),
        };
    }
    if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
        return {
            r: parseInt(normalized[0] + normalized[0], 16),
            g: parseInt(normalized[1] + normalized[1], 16),
            b: parseInt(normalized[2] + normalized[2], 16),
        };
    }
    return null;
};

const toRgba = (rgb, alpha) =>
    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.round(alpha * 1000) / 1000})`;

const darken = (rgb, ratio) => ({
    r: Math.round(rgb.r * (1 - ratio)),
    g: Math.round(rgb.g * (1 - ratio)),
    b: Math.round(rgb.b * (1 - ratio)),
});

/**
 * 应用外观设置到 :root。
 * @param {object} params
 * @param {string} params.uiMode  'dark' | 'day'
 * @param {object} params.settings 后端 settings 键值对（含默认值兜底）
 */
export const applyThemeAppearance = ({
    uiMode = "dark",
    settings = {},
    root = typeof document === "undefined" ? null : document.documentElement,
} = {}) => {
    if (!root) return;
    const isDay = uiMode === "day";

    const accentRaw = settings.theme_accent || THEME_APPEARANCE_DEFAULTS.theme_accent;
    const accent = parseHex(accentRaw);
    if (accent) {
        root.style.setProperty("--theme-accent", accentRaw);
        root.style.setProperty("--theme-accent-strong", toRgba(darken(accent, 0.22), 1));
        root.style.setProperty("--theme-accent-soft", toRgba(accent, isDay ? 0.1 : 0.18));
        root.style.setProperty("--theme-selection", toRgba(accent, isDay ? 0.16 : 0.4));
    } else {
        root.style.removeProperty("--theme-accent");
        root.style.removeProperty("--theme-accent-strong");
        root.style.removeProperty("--theme-accent-soft");
        root.style.removeProperty("--theme-selection");
    }

    const opacityPercent = clamp(
        Number.parseFloat(
            settings.theme_card_opacity ?? THEME_APPEARANCE_DEFAULTS.theme_card_opacity
        ) || 100,
        20,
        100
    );

    if (opacityPercent < 100) {
        if (isDay) {
            root.style.removeProperty("--theme-bg-soft");
            // 亮色模式卡片默认纯白不透明，向下调出半透玻璃感（保留底线避免文字难读）
            const alpha = clamp(0.5 + (opacityPercent / 100) * 0.5, 0.55, 1);
            const rgba = toRgba({ r: 255, g: 255, b: 255 }, alpha);
            root.style.setProperty("--theme-surface", rgba);
            root.style.setProperty("--theme-surface-strong", rgba);
            root.style.setProperty(
                "--theme-surface-muted",
                toRgba({ r: 248, g: 250, b: 252 }, alpha)
            );
            root.style.setProperty(
                "--theme-surface-hover",
                toRgba({ r: 241, g: 245, b: 249 }, alpha)
            );
        } else {
            // 暗色模式以默认 alpha 为基准整体缩放，最高允许略高于默认以增强层次
            const k = clamp(opacityPercent / 100, 0.25, 1.5);
            root.style.setProperty("--theme-surface", toRgba({ r: 255, g: 255, b: 255 }, 0.06 * k));
            root.style.setProperty(
                "--theme-surface-muted",
                toRgba({ r: 255, g: 255, b: 255 }, 0.04 * k)
            );
            root.style.setProperty(
                "--theme-surface-hover",
                toRgba({ r: 255, g: 255, b: 255 }, 0.1 * k)
            );
            root.style.setProperty(
                "--theme-surface-strong",
                toRgba({ r: 15, g: 23, b: 42 }, Math.min(0.82 * k, 0.98))
            );
            root.style.setProperty(
                "--theme-bg-soft",
                toRgba({ r: 15, g: 23, b: 42 }, Math.min(0.72 * k, 0.95))
            );
        }
    } else {
        [
            "--theme-surface",
            "--theme-surface-strong",
            "--theme-surface-muted",
            "--theme-surface-hover",
            "--theme-bg-soft",
        ].forEach((name) => root.style.removeProperty(name));
    }

    const blur = clamp(
        Number.isFinite(Number.parseFloat(settings.theme_glass_blur))
            ? Number.parseFloat(settings.theme_glass_blur)
            : 24,
        0,
        40
    );
    root.style.setProperty("--theme-glass-blur", `${blur}px`);

    const bgRaw = settings.theme_bg_color || THEME_APPEARANCE_DEFAULTS.theme_bg_color;
    const bg = parseHex(bgRaw);
    if (bg && !isDay) {
        root.style.setProperty("--theme-bg", bgRaw);
    } else {
        root.style.removeProperty("--theme-bg");
    }
};
