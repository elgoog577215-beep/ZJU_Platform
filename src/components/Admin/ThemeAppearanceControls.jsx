import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    ACCENT_PRESETS,
    THEME_APPEARANCE_DEFAULTS,
    applyThemeAppearance,
} from "../../constants/themeAppearance";

export default function ThemeAppearanceControls({ settings, onChange, mode, disabled }) {
    const { t } = useTranslation();
    const preview = useRef(null);
    useEffect(() => {
        applyThemeAppearance({ settings, uiMode: mode, root: preview.current });
    }, [settings, mode]);
    const value = (key) => settings[key] ?? THEME_APPEARANCE_DEFAULTS[key];
    return (
        <fieldset
            disabled={disabled}
            className="mb-5 space-y-4 border-b border-[var(--theme-border)] pb-5"
        >
            <legend className="mb-3 text-sm font-semibold">{t("admin.theme.title")}</legend>
            {["theme_accent", "theme_bg_color"].map((key) => (
                <div key={key}>
                    <label className="block text-sm" htmlFor={key}>
                        {t(`admin.theme.${key}`)}
                    </label>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                            id={key}
                            type="text"
                            value={value(key)}
                            placeholder={t("admin.theme.default")}
                            pattern="#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|"
                            maxLength={7}
                            onChange={(event) => onChange(key, event.target.value)}
                            className="min-h-11 w-36 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3"
                        />
                        <button
                            type="button"
                            onClick={() => onChange(key, "")}
                            className="min-h-11 px-3 text-xs"
                        >
                            {t("admin.theme.default")}
                        </button>
                    </div>
                    {key === "theme_accent" && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {ACCENT_PRESETS.map((preset) => (
                                <button
                                    type="button"
                                    key={preset.value}
                                    aria-label={t("admin.theme.color", { value: preset.value })}
                                    aria-pressed={value(key) === preset.value}
                                    onClick={() => onChange(key, preset.value)}
                                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--theme-border)]"
                                >
                                    <span
                                        className="h-5 w-5 rounded-full"
                                        style={{ background: preset.value }}
                                    />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {[
                { key: "theme_card_opacity", min: 20, max: 100, unit: "%" },
                { key: "theme_glass_blur", min: 0, max: 40, unit: "px" },
            ].map(({ key, min, max, unit }) => (
                <div key={key}>
                    <label htmlFor={key} className="flex justify-between gap-2 text-sm">
                        <span>{t(`admin.theme.${key}`)}</span>
                        <output>
                            {value(key)}
                            {unit}
                        </output>
                    </label>
                    <input
                        id={key}
                        type="range"
                        min={min}
                        max={max}
                        step="1"
                        value={value(key)}
                        onChange={(event) => onChange(key, event.target.value)}
                        className="theme-appearance-range mt-2 w-full"
                        style={{
                            "--range-progress": `${((Number(value(key)) - min) / (max - min)) * 100}%`,
                        }}
                    />
                </div>
            ))}
            <div
                ref={preview}
                data-testid="theme-appearance-preview"
                className="theme-appearance-preview rounded-xl p-4"
                data-theme={mode}
                style={{
                    background: mode === "day" ? "#f1f5f9" : "var(--theme-bg, #0f172a)",
                    color: mode === "day" ? "#0f172a" : "#f8fafc",
                }}
            >
                <div
                    className="rounded-lg border p-4"
                    style={{
                        background: "var(--theme-surface)",
                        borderColor: "var(--theme-accent)",
                        backdropFilter: "blur(var(--theme-glass-blur))",
                    }}
                >
                    <span style={{ color: "var(--theme-accent)" }}>{t("admin.theme.preview")}</span>
                    <p className="mt-2 text-xs">{t("admin.theme.preview_help")}</p>
                </div>
            </div>
        </fieldset>
    );
}
