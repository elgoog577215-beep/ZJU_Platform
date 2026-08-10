import React, { useEffect, useMemo, useState } from "react";
import { FileText, Globe, Key, Save, Sun } from "lucide-react";
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

const SettingsManager = () => {
    const { t } = useTranslation();
    const { updateSetting: updateGlobalSetting } = useSettings();
    const { isDayMode } = useAdminTheme();
    const [settings, setSettings] = useState({});
    const [initialSettings, setInitialSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState("");
    const [activeSection, setActiveSection] = useState("general");
    const [activeAboutGroup, setActiveAboutGroup] = useState("identity");

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get("/settings");
            const nextSettings = response.data || {};
            setSettings(nextSettings);
            setInitialSettings(nextSettings);
        } catch {
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
            disabled={savingKey === key}
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
                    action={<Sun size={18} className="text-indigo-300" />}
                >
                    <div className="grid gap-3 lg:grid-cols-2">
                        {[
                            {
                                key: "background_brightness",
                                min: "0.2",
                                max: "2",
                                fallback: 1,
                            },
                            { key: "background_bloom", min: "0", max: "3", fallback: 0.8 },
                            { key: "background_vignette", min: "0", max: "1", fallback: 0.5 },
                        ].map((field) => (
                            <div key={field.key} className={fieldClassName}>
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                    <div className="flex-1">
                                        <label
                                            className={labelClassName}
                                            htmlFor={`setting-${field.key}`}
                                        >
                                            {t(
                                                `admin.settings_console.appearance.fields.${field.key}`,
                                                {
                                                    value: settings[field.key] || field.fallback,
                                                }
                                            )}
                                        </label>
                                        <input
                                            id={`setting-${field.key}`}
                                            type="range"
                                            min={field.min}
                                            max={field.max}
                                            step="0.1"
                                            value={settings[field.key] || field.fallback}
                                            onChange={(event) =>
                                                handleChange(field.key, event.target.value)
                                            }
                                            className="w-full"
                                        />
                                        <p className={helpClassName}>
                                            {t(
                                                `admin.settings_console.appearance.help.${field.key}`
                                            )}
                                        </p>
                                    </div>
                                    {fieldAction(field.key)}
                                </div>
                            </div>
                        ))}
                    </div>
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
