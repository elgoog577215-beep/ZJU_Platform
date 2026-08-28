import React, { useEffect, useMemo, useState } from "react";
import { Check, FileText, Globe, Key, Moon, RotateCcw, Save, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";
import {
    AdminButton,
    AdminInlineNote,
    AdminLoadingState,
    AdminPageShell,
    AdminPanel,
    FilterChip,
    useAdminTheme,
} from "./AdminUI";

const ABOUT_GROUPS = [
    {
        id: "identity",
        fields: [
            { key: "about_team_title" },
            { key: "about_team_subtitle" },
            { key: "about_team_intro_1", multiline: true, wide: true },
            { key: "about_team_intro_2", multiline: true, wide: true },
            { key: "about_support_units" },
        ],
    },
    {
        id: "proof",
        fields: [
            { key: "about_stat_1_value" },
            { key: "about_stat_1_label" },
            { key: "about_stat_2_value" },
            { key: "about_stat_2_label" },
            { key: "about_stat_3_value" },
            { key: "about_stat_3_label" },
        ],
    },
    {
        id: "community",
        fields: [
            { key: "about_community_title" },
            { key: "about_community_tagline" },
            { key: "about_community_desc", multiline: true, wide: true },
            { key: "about_community_bullets", multiline: true, wide: true },
        ],
    },
    {
        id: "hackathon",
        fields: [
            { key: "about_hackathon_title" },
            { key: "about_hackathon_tagline" },
            { key: "about_hackathon_desc", multiline: true, wide: true },
            { key: "about_hackathon_bullets", multiline: true, wide: true },
            { key: "about_flagship_title", wide: true },
            { key: "about_flagship_note", multiline: true, wide: true },
        ],
    },
    {
        id: "network",
        fields: [
            { key: "about_support_title" },
            { key: "about_support_desc", multiline: true, wide: true },
            { key: "about_support_positioning" },
            { key: "about_support_method" },
            { key: "about_support_result" },
        ],
    },
    {
        id: "closing",
        fields: [
            { key: "about_final_title" },
            { key: "about_final_desc", multiline: true, wide: true },
            { key: "about_final_note" },
        ],
    },
];

const APPEARANCE_FIELDS = [
    {
        key: "background_brightness",
        min: 0.5,
        max: 1.4,
        step: 0.05,
        recommended: 1,
    },
    {
        key: "background_opacity",
        min: 0.25,
        max: 1,
        step: 0.05,
        recommended: 1,
    },
    {
        key: "background_bloom",
        min: 0,
        max: 1.5,
        step: 0.05,
        recommended: 0.8,
    },
    {
        key: "background_vignette",
        min: 0,
        max: 1,
        step: 0.05,
        recommended: 0.5,
    },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readAppearanceValue = (settings, field) => {
    const parsed = Number.parseFloat(settings[field.key]);
    return clamp(Number.isFinite(parsed) ? parsed : field.recommended, field.min, field.max);
};

const formatAppearanceValue = (value) => `${Math.round(value * 100)}%`;

const AppearanceSettingsWorkspace = ({
    appearancePreviewMode,
    appearanceValues,
    dirtyCount,
    isDayMode,
    onChange,
    onPreviewModeChange,
    onReset,
    onSave,
    saving,
    t,
}) => {
    const labelClassName = `block text-sm font-medium ${
        isDayMode ? "text-slate-600" : "text-gray-300"
    }`;
    const helpClassName = `mt-2 text-xs leading-5 ${
        isDayMode ? "text-slate-500" : "text-gray-500"
    }`;

    return (
        <div className="grid overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="border-b border-[var(--theme-border)] p-4 lg:border-b-0 lg:border-r lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <span className={labelClassName}>
                        {t("admin.settings_console.appearance.preview")}
                    </span>
                    <div
                        className="inline-flex rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface-muted)] p-1"
                        aria-label={t("admin.settings_console.appearance.preview_mode_label")}
                        role="group"
                    >
                        {[
                            { id: "day", icon: Sun },
                            { id: "dark", icon: Moon },
                        ].map(({ id, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={appearancePreviewMode === id}
                                aria-label={t(
                                    `admin.settings_console.appearance.preview_modes.${id}`
                                )}
                                onClick={() => onPreviewModeChange(id)}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
                                    appearancePreviewMode === id
                                        ? "bg-[var(--theme-surface-strong)] text-[var(--theme-accent)] shadow-sm"
                                        : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text-primary)]"
                                }`}
                            >
                                <Icon size={15} />
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    className={`relative min-h-[300px] overflow-hidden rounded-xl border ${
                        appearancePreviewMode === "day"
                            ? "border-slate-200 bg-slate-100"
                            : "border-white/10 bg-[#02030a]"
                    }`}
                    data-testid="appearance-background-preview"
                >
                    <div
                        className="absolute inset-0"
                        data-testid="appearance-background-preview-scene"
                        style={{
                            filter: `brightness(${appearanceValues.background_brightness})`,
                            opacity: appearanceValues.background_opacity,
                            background:
                                appearancePreviewMode === "day"
                                    ? "radial-gradient(circle at 22% 18%, rgba(34,211,238,0.42), transparent 30%), radial-gradient(circle at 82% 72%, rgba(168,85,247,0.34), transparent 32%), linear-gradient(145deg,#f8fbff 0%,#eaf3ff 54%,#f4edff 100%)"
                                    : "radial-gradient(circle at 22% 18%, rgba(34,211,238,0.48), transparent 31%), radial-gradient(circle at 82% 72%, rgba(168,85,247,0.4), transparent 34%), linear-gradient(145deg,#02030a 0%,#07172b 56%,#140a25 100%)",
                        }}
                    />
                    <div
                        className="absolute left-[13%] top-[16%] h-28 w-28 rounded-full bg-cyan-300"
                        style={{
                            filter: `blur(${24 + appearanceValues.background_bloom * 24}px)`,
                            opacity: clamp(
                                0.08 + appearanceValues.background_bloom * 0.28,
                                0.08,
                                0.5
                            ),
                        }}
                    />
                    <div
                        className="absolute inset-0"
                        data-testid="appearance-background-preview-vignette"
                        style={{
                            background: `radial-gradient(circle at center, transparent 38%, rgba(2, 6, 23, ${
                                appearanceValues.background_vignette *
                                (appearancePreviewMode === "day" ? 0.16 : 0.46)
                            }) 100%)`,
                        }}
                    />
                    <div className="absolute inset-x-5 bottom-5 rounded-lg border border-white/20 bg-slate-950/70 p-4 !text-white shadow-lg backdrop-blur-md">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] !text-cyan-200">
                            {t("admin.settings_console.appearance.preview_eyebrow")}
                        </p>
                        <p className="mt-1 text-lg font-semibold">
                            {t("admin.settings_console.appearance.preview_title")}
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-4 lg:p-5">
                <div className="divide-y divide-[var(--theme-border)]">
                    {APPEARANCE_FIELDS.map((field) => {
                        const value = appearanceValues[field.key];
                        const progress = ((value - field.min) / (field.max - field.min)) * 100;

                        return (
                            <div key={field.key} className="py-4 first:pt-0 last:pb-0">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <label
                                        className={labelClassName}
                                        htmlFor={`setting-${field.key}`}
                                    >
                                        {t(`admin.settings_console.appearance.fields.${field.key}`)}
                                    </label>
                                    <output
                                        className="min-w-[3.5rem] rounded-md bg-[var(--theme-surface-muted)] px-2 py-1 text-center text-xs font-semibold tabular-nums text-[var(--theme-text-primary)]"
                                        htmlFor={`setting-${field.key}`}
                                    >
                                        {formatAppearanceValue(value)}
                                    </output>
                                </div>
                                <input
                                    id={`setting-${field.key}`}
                                    type="range"
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    value={value}
                                    onChange={(event) => onChange(field.key, event.target.value)}
                                    className="theme-appearance-range w-full"
                                    style={{ "--range-progress": `${progress}%` }}
                                />
                                <p className={helpClassName}>
                                    {t(`admin.settings_console.appearance.help.${field.key}`)}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--theme-border)] pt-4 sm:flex-row sm:justify-end">
                    <AdminButton tone="subtle" onClick={onReset} disabled={saving}>
                        <RotateCcw size={16} />
                        {t("admin.settings_console.appearance.reset")}
                    </AdminButton>
                    <AdminButton
                        tone="primary"
                        onClick={onSave}
                        disabled={dirtyCount === 0 || saving}
                    >
                        <Save size={16} />
                        {saving
                            ? t("admin.settings_console.actions.saving")
                            : t("admin.settings_console.appearance.save")}
                    </AdminButton>
                </div>
            </div>
        </div>
    );
};

const SettingsManager = () => {
    const { t } = useTranslation();
    const { updateSetting: updateGlobalSetting } = useSettings();
    const { isDayMode } = useAdminTheme();
    const [settings, setSettings] = useState({});
    const [initialSettings, setInitialSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [savingKey, setSavingKey] = useState("");
    const [activeSection, setActiveSection] = useState("general");
    const [activeAboutGroup, setActiveAboutGroup] = useState("identity");
    const [appearancePreviewMode, setAppearancePreviewMode] = useState("day");

    const fetchSettings = async () => {
        setLoading(true);
        setLoadError(false);
        try {
            const response = await api.get("/settings");
            const nextSettings = response.data || {};
            setSettings(nextSettings);
            setInitialSettings(nextSettings);
        } catch {
            setLoadError(true);
            toast.error(t("admin.settings_console.toasts.load_fail"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
        // Settings are loaded once when the manager mounts.
    }, []);

    const handleChange = (key, value) => {
        setSettings((previous) => ({ ...previous, [key]: value }));
    };

    const handleSave = async (key, value) => {
        setSavingKey(key);
        try {
            await updateGlobalSetting(key, value);
            setInitialSettings((previous) => ({ ...previous, [key]: value }));
            toast.success(t("admin.settings_console.toasts.save_success"));
        } catch {
            toast.error(t("admin.settings_console.toasts.save_fail"));
        } finally {
            setSavingKey("");
        }
    };

    const dirtyMap = useMemo(() => {
        const result = {};
        for (const [key, value] of Object.entries(settings)) {
            result[key] = String(value ?? "") !== String(initialSettings[key] ?? "");
        }
        return result;
    }, [initialSettings, settings]);

    const appearanceValues = useMemo(
        () =>
            Object.fromEntries(
                APPEARANCE_FIELDS.map((field) => [field.key, readAppearanceValue(settings, field)])
            ),
        [settings]
    );
    const dirtyAppearanceKeys = APPEARANCE_FIELDS.filter((field) => dirtyMap[field.key]).map(
        (field) => field.key
    );

    const handleResetAppearance = () => {
        setSettings((previous) => ({
            ...previous,
            ...Object.fromEntries(
                APPEARANCE_FIELDS.map((field) => [field.key, String(field.recommended)])
            ),
        }));
    };

    const handleSaveAppearance = async () => {
        if (dirtyAppearanceKeys.length === 0) return;

        setSavingKey("appearance");
        const savedValues = {};
        let failedCount = 0;

        for (const key of dirtyAppearanceKeys) {
            try {
                const response = await updateGlobalSetting(key, settings[key]);
                if (!response?.data?.success) throw new Error("Setting update was not confirmed");
                savedValues[key] = settings[key];
            } catch {
                failedCount += 1;
            }
        }

        if (Object.keys(savedValues).length > 0) {
            setInitialSettings((previous) => ({ ...previous, ...savedValues }));
        }

        if (failedCount > 0) {
            toast.error(
                t("admin.settings_console.toasts.appearance_save_partial", {
                    saved: Object.keys(savedValues).length,
                    failed: failedCount,
                })
            );
        } else {
            toast.success(t("admin.settings_console.toasts.appearance_save_success"));
        }
        setSavingKey("");
    };

    const currentAboutGroup =
        ABOUT_GROUPS.find((group) => group.id === activeAboutGroup) || ABOUT_GROUPS[0];
    const fieldClassName = `border-b py-3 last:border-b-0 ${
        isDayMode ? "border-slate-200/70" : "border-white/10"
    }`;
    const labelClassName = `mb-2 block text-sm font-medium ${
        isDayMode ? "text-slate-600" : "text-gray-400"
    }`;
    const helpClassName = `mt-2 text-xs ${isDayMode ? "text-slate-500" : "text-gray-500"}`;

    const fieldAction = (key) => (
        <AdminButton
            tone={dirtyMap[key] ? "primary" : "subtle"}
            disabled={!dirtyMap[key] || savingKey === key}
            onClick={() => handleSave(key, settings[key])}
        >
            <Save size={16} />
            {savingKey === key
                ? t("admin.settings_console.actions.saving")
                : dirtyMap[key]
                  ? t("admin.settings_console.actions.save")
                  : t("admin.settings_console.actions.saved")}
        </AdminButton>
    );

    const renderField = ({ key, multiline = false, wide = false }) => (
        <div key={key} className={`${fieldClassName} ${wide ? "lg:col-span-2" : ""}`}>
            <label className={labelClassName} htmlFor={`setting-${key}`}>
                {t(`admin.settings_console.about.fields.${key}`)}
            </label>
            <div className="flex flex-col gap-3 lg:flex-row">
                {multiline ? (
                    <textarea
                        id={`setting-${key}`}
                        value={settings[key] || ""}
                        onChange={(event) => handleChange(key, event.target.value)}
                        rows={key.includes("bullets") ? 4 : 3}
                        className="theme-admin-input flex-1 rounded-xl p-3"
                    />
                ) : (
                    <input
                        id={`setting-${key}`}
                        type="text"
                        value={settings[key] || ""}
                        onChange={(event) => handleChange(key, event.target.value)}
                        className="theme-admin-input flex-1 rounded-xl p-3"
                    />
                )}
                {fieldAction(key)}
            </div>
        </div>
    );

    if (loading) {
        return <AdminLoadingState text={t("admin.settings_console.loading")} />;
    }

    if (loadError) {
        return (
            <AdminInlineNote tone="danger" className="flex items-center justify-between gap-3">
                <span>{t("admin.settings_console.load_error")}</span>
                <AdminButton tone="subtle" onClick={fetchSettings}>
                    {t("admin.settings_console.actions.retry")}
                </AdminButton>
            </AdminInlineNote>
        );
    }

    return (
        <AdminPageShell
            title={t("admin.settings_console.title")}
            description={t("admin.settings_console.description")}
            toolbar={
                <div
                    className="flex gap-2 overflow-x-auto"
                    role="tablist"
                    aria-label={t("admin.settings_console.navigation")}
                >
                    {["general", "appearance", "about"].map((id) => (
                        <FilterChip
                            key={id}
                            role="tab"
                            aria-selected={activeSection === id}
                            active={activeSection === id}
                            onClick={() => setActiveSection(id)}
                            className="shrink-0"
                        >
                            {t(`admin.settings_console.tabs.${id}`)}
                        </FilterChip>
                    ))}
                </div>
            }
        >
            {activeSection === "general" ? (
                <>
                    <AdminPanel
                        title={t("admin.settings_console.security.title")}
                        description={t("admin.settings_console.security.description")}
                        action={<Key size={18} className="text-indigo-300" />}
                    >
                        <div className="grid gap-3 lg:grid-cols-2">
                            <div className={fieldClassName}>
                                <label className={labelClassName} htmlFor="setting-invite-code">
                                    {t("admin.settings_console.security.invite_code")}
                                </label>
                                <div className="flex flex-col gap-3 lg:flex-row">
                                    <input
                                        id="setting-invite-code"
                                        type="text"
                                        value={settings.invite_code || ""}
                                        onChange={(event) =>
                                            handleChange("invite_code", event.target.value)
                                        }
                                        placeholder={t(
                                            "admin.settings_console.security.invite_placeholder"
                                        )}
                                        className="theme-admin-input flex-1 rounded-xl p-3"
                                    />
                                    {fieldAction("invite_code")}
                                </div>
                                <p className={helpClassName}>
                                    {t("admin.settings_console.security.invite_help")}
                                </p>
                            </div>
                        </div>
                    </AdminPanel>

                    <AdminPanel
                        title={t("admin.settings_console.site.title")}
                        description={t("admin.settings_console.site.description")}
                        action={<Globe size={18} className="text-indigo-300" />}
                    >
                        <div className="grid gap-3 lg:grid-cols-2">
                            <div className={fieldClassName}>
                                <label className={labelClassName} htmlFor="setting-site-name">
                                    {t("admin.settings_console.site.name")}
                                </label>
                                <div className="flex flex-col gap-3 lg:flex-row">
                                    <input
                                        id="setting-site-name"
                                        type="text"
                                        value={settings.site_name || ""}
                                        onChange={(event) =>
                                            handleChange("site_name", event.target.value)
                                        }
                                        className="theme-admin-input flex-1 rounded-xl p-3"
                                    />
                                    {fieldAction("site_name")}
                                </div>
                            </div>
                        </div>
                    </AdminPanel>

                    <AdminPanel
                        title={t("admin.settings_console.template.title")}
                        description={t("admin.settings_console.template.description")}
                        action={<FileText size={18} className="text-indigo-300" />}
                    >
                        <AdminInlineNote tone="info">
                            {t("admin.settings_console.template.note")}
                            <a
                                href="/admin?tab=hackathon"
                                className="ml-2 inline-flex font-semibold underline underline-offset-4"
                            >
                                {t("admin.settings_console.template.action")}
                            </a>
                        </AdminInlineNote>
                    </AdminPanel>
                </>
            ) : null}

            {activeSection === "appearance" ? (
                <AdminPanel
                    title={t("admin.settings_console.appearance.title")}
                    description={t("admin.settings_console.appearance.description")}
                    action={
                        <div
                            className={`inline-flex items-center gap-2 text-xs ${
                                dirtyAppearanceKeys.length > 0
                                    ? isDayMode
                                        ? "text-amber-700"
                                        : "text-amber-300"
                                    : isDayMode
                                      ? "text-emerald-700"
                                      : "text-emerald-300"
                            }`}
                            aria-live="polite"
                            role="status"
                        >
                            {dirtyAppearanceKeys.length > 0 ? (
                                <span className="h-2 w-2 rounded-full bg-current" />
                            ) : (
                                <Check size={15} />
                            )}
                            {dirtyAppearanceKeys.length > 0
                                ? t("admin.settings_console.appearance.unsaved", {
                                      count: dirtyAppearanceKeys.length,
                                  })
                                : t("admin.settings_console.appearance.saved")}
                        </div>
                    }
                >
                    <AppearanceSettingsWorkspace
                        appearancePreviewMode={appearancePreviewMode}
                        appearanceValues={appearanceValues}
                        dirtyCount={dirtyAppearanceKeys.length}
                        isDayMode={isDayMode}
                        onChange={handleChange}
                        onPreviewModeChange={setAppearancePreviewMode}
                        onReset={handleResetAppearance}
                        onSave={handleSaveAppearance}
                        saving={savingKey === "appearance"}
                        t={t}
                    />
                </AdminPanel>
            ) : null}

            {activeSection === "about" ? (
                <AdminPanel
                    title={t("admin.settings_console.about.title")}
                    description={t("admin.settings_console.about.description")}
                    action={<FileText size={18} className="text-indigo-300" />}
                >
                    <div
                        className="mb-4 flex gap-2 overflow-x-auto"
                        role="tablist"
                        aria-label={t("admin.settings_console.about.navigation")}
                    >
                        {ABOUT_GROUPS.map((group) => (
                            <FilterChip
                                key={group.id}
                                role="tab"
                                aria-selected={activeAboutGroup === group.id}
                                active={activeAboutGroup === group.id}
                                onClick={() => setActiveAboutGroup(group.id)}
                                className="shrink-0"
                            >
                                {t(`admin.settings_console.about.groups.${group.id}`)}
                            </FilterChip>
                        ))}
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                        {currentAboutGroup.fields.map(renderField)}
                    </div>
                </AdminPanel>
            ) : null}
        </AdminPageShell>
    );
};

export default SettingsManager;
