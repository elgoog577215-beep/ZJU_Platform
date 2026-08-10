import React, { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ExternalLink, FolderKanban, RefreshCw, RotateCcw, Search, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import api from "../../services/api";
import {
    AdminButton,
    AdminEmptyState,
    AdminLoadingState,
    AdminPageShell,
    AdminPanel,
    ConfirmDialog,
    FilterChip,
    ToolbarGroup,
    useAdminTheme,
} from "./AdminUI";

const STATUS_IDS = ["all", "published", "draft", "removed"];
const PROGRESS_IDS = ["all", "idea", "dev", "live", "pause"];

const ProjectManager = () => {
    const { t, i18n } = useTranslation();
    const { headingTextClass, mutedTextClass, statusToneMap } = useAdminTheme();
    const [projects, setProjects] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("all");
    const [progress, setProgress] = useState("all");
    const [queryInput, setQueryInput] = useState("");
    const [query, setQuery] = useState("");
    const [pendingAction, setPendingAction] = useState(null);
    const [actionReason, setActionReason] = useState("");
    const [actionPending, setActionPending] = useState(false);

    const loadProjects = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/projects", {
                params: {
                    status: status === "all" ? undefined : status,
                    progress: progress === "all" ? undefined : progress,
                    q: query || undefined,
                    limit: 60,
                },
            });
            setProjects(response.data?.items || []);
            setTotal(Number(response.data?.total || 0));
        } catch (error) {
            toast.error(
                error?.response?.data?.error || t("admin.project_manager.toasts.load_fail")
            );
        } finally {
            setLoading(false);
        }
    }, [progress, query, status, t]);

    useEffect(() => {
        loadProjects();
    }, [loadProjects]);

    const visibleCounts = useMemo(
        () => ({
            reports: projects.reduce((sum, item) => sum + Number(item.report_count || 0), 0),
            removed: projects.filter((item) => item.status === "removed").length,
        }),
        [projects]
    );

    const openAction = (project, mode) => {
        setPendingAction({ project, mode });
        setActionReason("");
    };

    const runAction = async () => {
        if (!pendingAction) return;
        setActionPending(true);
        try {
            const { project, mode } = pendingAction;
            if (mode === "takedown") {
                await api.put(`/admin/projects/${project.id}/takedown`, {
                    reason: actionReason.trim(),
                });
                toast.success(t("admin.project_manager.toasts.takedown_success"));
            } else {
                await api.put(`/admin/projects/${project.id}/restore`);
                toast.success(t("admin.project_manager.toasts.restore_success"));
            }
            setPendingAction(null);
            setActionReason("");
            await loadProjects();
        } catch (error) {
            toast.error(
                error?.response?.data?.error || t("admin.project_manager.toasts.action_fail")
            );
        } finally {
            setActionPending(false);
        }
    };

    const statusClass = (value) => {
        if (value === "published") return statusToneMap.success;
        if (value === "removed") return statusToneMap.danger;
        return statusToneMap.muted;
    };

    const dateFormatter = useMemo(
        () =>
            new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language || "zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            }),
        [i18n.language, i18n.resolvedLanguage]
    );

    if (loading && projects.length === 0) {
        return <AdminLoadingState text={t("admin.project_manager.loading")} />;
    }

    return (
        <>
            <AdminPageShell
                title={t("admin.project_manager.title")}
                description={t("admin.project_manager.description")}
                actions={
                    <AdminButton tone="subtle" onClick={loadProjects} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                        {t("admin.project_manager.actions.refresh")}
                    </AdminButton>
                }
                toolbar={
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <ToolbarGroup>
                            {STATUS_IDS.map((id) => (
                                <FilterChip
                                    key={id}
                                    active={status === id}
                                    onClick={() => setStatus(id)}
                                >
                                    {t(`admin.project_manager.status.${id}`)}
                                </FilterChip>
                            ))}
                            <select
                                aria-label={t("admin.project_manager.progress_filter")}
                                value={progress}
                                onChange={(event) => setProgress(event.target.value)}
                                className="theme-admin-input rect-field min-h-[38px] px-3 py-2 text-sm"
                            >
                                {PROGRESS_IDS.map((id) => (
                                    <option key={id} value={id}>
                                        {t(`admin.project_manager.progress.${id}`)}
                                    </option>
                                ))}
                            </select>
                        </ToolbarGroup>
                        <form
                            className="flex min-w-0 gap-2"
                            role="search"
                            aria-label={t("admin.project_manager.search")}
                            onSubmit={(event) => {
                                event.preventDefault();
                                setQuery(queryInput.trim());
                            }}
                        >
                            <input
                                type="search"
                                value={queryInput}
                                onChange={(event) => setQueryInput(event.target.value)}
                                placeholder={t("admin.project_manager.search_placeholder")}
                                className="theme-admin-input rect-field min-h-[38px] min-w-0 flex-1 px-3 py-2 text-sm sm:w-64"
                            />
                            <AdminButton type="submit" tone="subtle">
                                <Search size={16} />
                                {t("admin.project_manager.actions.search")}
                            </AdminButton>
                        </form>
                    </div>
                }
            >
                <AdminPanel>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                        <span className={headingTextClass}>
                            {t("admin.project_manager.summary.total", { count: total })}
                        </span>
                        <span className={mutedTextClass}>|</span>
                        <span className={headingTextClass}>
                            {t("admin.project_manager.summary.visible", {
                                count: projects.length,
                            })}
                        </span>
                        <span className={mutedTextClass}>|</span>
                        <span className={headingTextClass}>
                            {t("admin.project_manager.summary.reports", {
                                count: visibleCounts.reports,
                            })}
                        </span>
                        <span className={mutedTextClass}>|</span>
                        <span className={headingTextClass}>
                            {t("admin.project_manager.summary.removed", {
                                count: visibleCounts.removed,
                            })}
                        </span>
                    </div>
                </AdminPanel>

                <AdminPanel title={t("admin.project_manager.list_title", { count: total })}>
                    {projects.length === 0 ? (
                        <AdminEmptyState
                            icon={FolderKanban}
                            title={t("admin.project_manager.empty_title")}
                            description={t("admin.project_manager.empty_description")}
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="theme-admin-table w-full min-w-[820px] text-left text-sm">
                                <thead>
                                    <tr>
                                        <th>{t("admin.project_manager.columns.project")}</th>
                                        <th>{t("admin.project_manager.columns.owner")}</th>
                                        <th>{t("admin.project_manager.columns.progress")}</th>
                                        <th>{t("admin.project_manager.columns.status")}</th>
                                        <th>{t("admin.project_manager.columns.reports")}</th>
                                        <th>{t("admin.project_manager.columns.updated")}</th>
                                        <th className="text-right">
                                            {t("admin.project_manager.columns.actions")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.map((project) => (
                                        <tr key={project.id}>
                                            <td className="max-w-[280px]">
                                                <div
                                                    className={clsx(
                                                        "font-semibold",
                                                        headingTextClass
                                                    )}
                                                >
                                                    {project.title}
                                                </div>
                                                <div
                                                    className={clsx(
                                                        "mt-1 truncate text-xs",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {project.intro ||
                                                        t("admin.project_manager.no_intro")}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={headingTextClass}>
                                                    {project.owner_name || `#${project.user_id}`}
                                                </div>
                                                <div
                                                    className={clsx(
                                                        "mt-1 max-w-[180px] truncate text-xs",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {(project.owner_profiles || []).join(" / ") ||
                                                        t("admin.project_manager.no_organization")}
                                                </div>
                                            </td>
                                            <td>
                                                {t(
                                                    `admin.project_manager.progress.${project.progress}`
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className={clsx(
                                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                                        statusClass(project.status)
                                                    )}
                                                >
                                                    {t(
                                                        `admin.project_manager.status.${project.status}`
                                                    )}
                                                </span>
                                            </td>
                                            <td>
                                                <div
                                                    className={
                                                        project.report_count
                                                            ? "font-bold text-amber-500"
                                                            : mutedTextClass
                                                    }
                                                >
                                                    {project.report_count || 0}
                                                </div>
                                                {project.latest_report_reason ? (
                                                    <div
                                                        className={clsx(
                                                            "mt-1 max-w-[160px] truncate text-xs",
                                                            mutedTextClass
                                                        )}
                                                        title={project.latest_report_reason}
                                                    >
                                                        {project.latest_report_reason}
                                                    </div>
                                                ) : null}
                                            </td>
                                            <td className={mutedTextClass}>
                                                {project.updated_at
                                                    ? dateFormatter.format(
                                                          new Date(project.updated_at)
                                                      )
                                                    : "—"}
                                            </td>
                                            <td>
                                                <div className="flex justify-end gap-2">
                                                    <AdminButton
                                                        tone="subtle"
                                                        onClick={() =>
                                                            window.open(
                                                                `/projects/${project.id}`,
                                                                "_blank",
                                                                "noopener,noreferrer"
                                                            )
                                                        }
                                                        aria-label={t(
                                                            "admin.project_manager.actions.open_project",
                                                            { title: project.title }
                                                        )}
                                                    >
                                                        <ExternalLink size={15} />
                                                    </AdminButton>
                                                    {project.status === "removed" ? (
                                                        <AdminButton
                                                            tone="subtle"
                                                            onClick={() =>
                                                                openAction(project, "restore")
                                                            }
                                                            aria-label={t(
                                                                "admin.project_manager.actions.restore_project",
                                                                { title: project.title }
                                                            )}
                                                            title={t(
                                                                "admin.project_manager.actions.restore_project",
                                                                { title: project.title }
                                                            )}
                                                        >
                                                            <RotateCcw size={15} />
                                                            <span className="hidden 2xl:inline">
                                                                {t(
                                                                    "admin.project_manager.actions.restore"
                                                                )}
                                                            </span>
                                                        </AdminButton>
                                                    ) : (
                                                        <AdminButton
                                                            tone="danger"
                                                            onClick={() =>
                                                                openAction(project, "takedown")
                                                            }
                                                            aria-label={t(
                                                                "admin.project_manager.actions.takedown_project",
                                                                { title: project.title }
                                                            )}
                                                            title={t(
                                                                "admin.project_manager.actions.takedown_project",
                                                                { title: project.title }
                                                            )}
                                                        >
                                                            <XCircle size={15} />
                                                            <span className="hidden 2xl:inline">
                                                                {t(
                                                                    "admin.project_manager.actions.takedown"
                                                                )}
                                                            </span>
                                                        </AdminButton>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </AdminPanel>
            </AdminPageShell>

            <ConfirmDialog
                open={Boolean(pendingAction)}
                title={
                    pendingAction?.mode === "takedown"
                        ? t("admin.project_manager.dialog.takedown_title")
                        : t("admin.project_manager.dialog.restore_title")
                }
                description={
                    pendingAction?.mode === "takedown"
                        ? t("admin.project_manager.dialog.takedown_description", {
                              title: pendingAction?.project?.title,
                          })
                        : t("admin.project_manager.dialog.restore_description", {
                              title: pendingAction?.project?.title,
                          })
                }
                confirmText={
                    pendingAction?.mode === "takedown"
                        ? t("admin.project_manager.actions.confirm_takedown")
                        : t("admin.project_manager.actions.confirm_restore")
                }
                cancelText={t("admin.cancel")}
                tone={pendingAction?.mode === "takedown" ? "danger" : "primary"}
                pending={actionPending}
                confirmDisabled={
                    pendingAction?.mode === "takedown" && actionReason.trim().length === 0
                }
                onConfirm={runAction}
                onCancel={() => setPendingAction(null)}
            >
                {pendingAction?.mode === "takedown" ? (
                    <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                        {t("admin.project_manager.dialog.reason")}
                        <textarea
                            value={actionReason}
                            onChange={(event) => setActionReason(event.target.value)}
                            rows={3}
                            className="theme-admin-input mt-2 w-full rounded-lg p-3"
                            placeholder={t("admin.project_manager.dialog.reason_placeholder")}
                        />
                    </label>
                ) : null}
            </ConfirmDialog>
        </>
    );
};

export default ProjectManager;
