import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { AdminButton, AdminPageShell, AdminLoadingState, ConfirmDialog } from "./AdminUI";

const makeDraft = (account) => ({
    role: account.role,
    permissions: account.admin_permissions,
});
export default function AdminPermissionManager() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [selected, setSelected] = useState(null);
    const [draft, setDraft] = useState(null);
    const [query, setQuery] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);
    const [logoutOpen, setLogoutOpen] = useState(false);
    const load = useCallback(async () => {
        setError("");
        setSelected(null);
        setDraft(null);
        try {
            setData((await api.get("/admin/access", { noRetry: true })).data);
        } catch {
            setData(null);
            setError(t("admin.access.load_error"));
        }
    }, [t]);
    useEffect(() => {
        load();
    }, [load]);
    const choose = (account) => {
        setSelected(account);
        setDraft(makeDraft(account));
        setError("");
        setSaved(false);
    };
    const toggle = (field, value) => {
        setSaved(false);
        setDraft((old) => ({
            ...old,
            [field]: old[field].includes(value)
                ? old[field].filter((v) => v !== value)
                : [...old[field], value],
        }));
    };
    const save = async (logout = false) => {
        setPending(true);
        setError("");
        setSaved(false);
        try {
            const body = logout ? { force_logout: true } : draft;
            const response = await api.put(
                `/admin/access/${selected.id}`,
                { ...body, expected_version: selected.admin_access_version },
                { noRetry: true, silent: true }
            );
            setData((old) => ({
                ...old,
                users: old.users.map((account) =>
                    account.id === selected.id ? response.data : account
                ),
            }));
            choose(response.data);
            setSaved(true);
            setLogoutOpen(false);
        } catch (err) {
            setError(
                t(`admin.access.errors.${err.response?.data?.error}`, t("admin.access.save_error"))
            );
        } finally {
            setPending(false);
        }
    };
    const own = selected?.id === user?.id;
    const changed = selected && JSON.stringify(makeDraft(selected)) !== JSON.stringify(draft);
    const matches =
        data?.users.filter((account) =>
            `${account.username} ${account.nickname || ""} ${account.id}`
                .toLowerCase()
                .includes(query.toLowerCase())
        ) || [];
    return (
        <AdminPageShell
            title={t("admin.access.title")}
            description={t("admin.access.description")}
            descriptionVisible
            actions={
                <AdminButton tone="subtle" onClick={load} disabled={pending}>
                    {t("admin.access.refresh")}
                </AdminButton>
            }
        >
            {error && (
                <p role="alert" className="text-sm text-rose-600">
                    {error}
                </p>
            )}
            {!data ? (
                !error && <AdminLoadingState text={t("admin.access.loading")} />
            ) : (
                <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
                    <div className="min-w-0">
                        <label className="block text-sm">
                            {t("admin.access.find_account")}
                            <input
                                type="search"
                                value={query}
                                disabled={pending}
                                onChange={(e) => setQuery(e.target.value)}
                                className="theme-admin-input mt-2 w-full p-2.5 text-base"
                            />
                        </label>
                        <ul className="mt-3 max-h-[55vh] overflow-y-auto divide-y divide-slate-500/20">
                            {matches.map((account) => (
                                <li key={account.id}>
                                    <button
                                        type="button"
                                        disabled={pending || account.role === "banned"}
                                        aria-pressed={selected?.id === account.id}
                                        onClick={() => choose(account)}
                                        className={`flex w-full items-center justify-between gap-2 px-2 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${selected?.id === account.id ? "bg-indigo-500/15" : "hover:bg-slate-500/10"}`}
                                    >
                                        <span className="min-w-0 break-all text-sm font-medium">
                                            {account.nickname || account.username}
                                            <span className="block text-xs opacity-80">
                                                {account.username}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs">
                                            {t(`admin.access.roles.${account.role}`, account.role)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {!matches.length && (
                            <p className="py-4 text-sm">{t("admin.access.no_accounts")}</p>
                        )}
                    </div>
                    {!selected ? (
                        <p className="py-3 text-sm">{t("admin.access.select_account")}</p>
                    ) : (
                        <form
                            className="min-w-0 space-y-5"
                            onSubmit={(e) => {
                                e.preventDefault();
                                save();
                            }}
                        >
                            <div>
                                <h3 className="font-semibold">
                                    {selected.nickname || selected.username}
                                </h3>
                                <p className="mt-1 text-sm">
                                    {own
                                        ? t("admin.access.own_hint")
                                        : t("admin.access.password_hint")}
                                </p>
                            </div>
                            <fieldset
                                disabled={pending || own}
                                className="space-y-5 disabled:opacity-60"
                            >
                                <label className="block text-sm font-medium">
                                    {t("admin.access.role")}
                                    <select
                                        value={draft.role}
                                        onChange={(e) => {
                                            setSaved(false);
                                            setDraft({
                                                role: e.target.value,
                                                permissions:
                                                    e.target.value === "operator"
                                                        ? [...data.permissions]
                                                        : [],
                                            });
                                        }}
                                        className="theme-admin-input mt-2 block w-full p-2.5 text-base"
                                    >
                                        {["user", "operator", "admin"].map((role) => (
                                            <option key={role} value={role}>
                                                {t(`admin.access.roles.${role}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {draft.role === "admin" && (
                                    <p className="text-sm">{t("admin.access.platform_hint")}</p>
                                )}
                                {draft.role === "operator" && (
                                    <>
                                        <fieldset>
                                            <legend className="mb-2 text-sm font-semibold">
                                                {t("admin.access.permissions")}
                                            </legend>
                                            <div className="divide-y divide-slate-500/20">
                                                {data.permissions.map((key) => (
                                                    <label
                                                        key={key}
                                                        className="flex cursor-pointer items-start gap-3 py-3"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mt-1 h-4 w-4 accent-indigo-600"
                                                            checked={draft.permissions.includes(
                                                                key
                                                            )}
                                                            onChange={() =>
                                                                toggle("permissions", key)
                                                            }
                                                        />
                                                        <span className="text-sm">
                                                            {t(
                                                                `admin.access.permission_labels.${key.split(".")[1]}`
                                                            )}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    </>
                                )}
                            </fieldset>
                            <p className="border-t border-slate-500/20 pt-3 text-sm">
                                {t("admin.access.preview", {
                                    role: t(`admin.access.roles.${draft.role}`),
                                    count:
                                        draft.role === "operator"
                                            ? draft.permissions.length
                                            : draft.role === "admin"
                                              ? data.permissions.length
                                              : 0,
                                })}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <AdminButton type="submit" disabled={pending || own || !changed}>
                                    {pending ? t("admin.access.saving") : t("admin.access.save")}
                                </AdminButton>
                                <AdminButton
                                    tone="subtle"
                                    disabled={pending || own}
                                    onClick={() => setLogoutOpen(true)}
                                >
                                    {t("admin.access.force_logout")}
                                </AdminButton>
                                {saved && (
                                    <span role="status" className="text-sm">
                                        {t("admin.access.saved")}
                                    </span>
                                )}
                            </div>
                        </form>
                    )}
                </div>
            )}
            <ConfirmDialog
                open={logoutOpen}
                title={t("admin.access.force_logout")}
                description={t("admin.access.logout_hint")}
                confirmText={t("admin.access.confirm")}
                cancelText={t("admin.access.cancel")}
                pending={pending}
                onConfirm={() => save(true)}
                onCancel={() => setLogoutOpen(false)}
            />
        </AdminPageShell>
    );
}
