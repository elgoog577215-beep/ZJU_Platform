import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
    CheckCircle2,
    Database,
    KeyRound,
    Loader2,
    Network,
    RefreshCw,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import api from "../../services/api";
import {
    AdminButton,
    AdminEmptyState,
    AdminInlineNote,
    AdminLoadingState,
    AdminPageShell,
    AdminPanel,
    FilterChip,
    useAdminTheme,
} from "./AdminUI";
import AiModelConfigManager from "./AiModelConfigManager";

const sections = [
    { id: "agents", labelKey: "agents", icon: Network },
    { id: "governance", labelKey: "governance", icon: Database },
    { id: "models", labelKey: "models", icon: KeyRound },
];

const valueText = (value, emptyLabel) => {
    if (value === null || value === undefined) return emptyLabel;
    const text = String(value).trim();
    return text || emptyLabel;
};

const confidenceClass = (confidence, isDayMode) => {
    if (confidence >= 0.78) {
        return isDayMode
            ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700"
            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }
    if (confidence >= 0.68) {
        return isDayMode
            ? "border-sky-500/20 bg-sky-500/[0.08] text-sky-700"
            : "border-sky-400/20 bg-sky-400/10 text-sky-200";
    }
    return isDayMode
        ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-700"
        : "border-amber-400/20 bg-amber-400/10 text-amber-200";
};

const suggestionStatusMeta = {
    suggested: { tone: "neutral" },
    applied: { tone: "success" },
    skipped: { tone: "warning" },
    skipped_conflict: { tone: "warning" },
};

const suggestionStatusClass = (status, isDayMode) => {
    const tone = suggestionStatusMeta[status]?.tone || "neutral";
    if (tone === "success") {
        return isDayMode
            ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700"
            : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
    }
    if (tone === "warning") {
        return isDayMode
            ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-700"
            : "border-amber-400/20 bg-amber-400/10 text-amber-200";
    }
    return isDayMode
        ? "border-slate-200 bg-slate-50 text-slate-600"
        : "border-white/10 bg-white/[0.04] text-gray-300";
};

const CompactStat = ({ label, value, icon: Icon }) => {
    const { mutedTextClass, headingTextClass } = useAdminTheme();

    return (
        <div className="flex min-w-0 items-center gap-2 py-1">
            {Icon ? <Icon size={15} className={mutedTextClass} /> : null}
            <span className={clsx("text-xs", mutedTextClass)}>{label}</span>
            <span className={clsx("text-base font-bold tabular-nums", headingTextClass)}>
                {value ?? 0}
            </span>
        </div>
    );
};

const AgentSystemView = ({ overview }) => {
    const { t } = useTranslation();
    const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
    const agentSystem = overview?.agentSystem || {};
    const summary = agentSystem.summary || {};
    const modules = agentSystem.modules || overview?.modules || [];
    const gaps = agentSystem.highPriorityGaps || [];
    const partialGaps = agentSystem.partialGaps || [];
    const nextPlan =
        (agentSystem.nextIterationPlan || []).length > 0
            ? agentSystem.nextIterationPlan
            : agentSystem.continuousImprovementPlan || [];

    return (
        <AdminPanel title={t("admin.ai_governance.agents.title")}>
            <div className="space-y-4">
                <AdminInlineNote tone="info">
                    {t("admin.ai_governance.agents.read_only_note")}
                </AdminInlineNote>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[rgba(128,146,167,0.14)] pb-3">
                    <CompactStat
                        label={t("admin.ai_governance.agents.agent_count")}
                        value={summary.agentCount ?? modules.length}
                        icon={Network}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.agents.average_maturity")}
                        value={`${Math.round((summary.averageMaturity || 0) * 100)}%`}
                        icon={ShieldCheck}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.agents.priority_gaps")}
                        value={summary.highPriorityGapCount ?? gaps.length}
                        icon={XCircle}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.agents.live_modules")}
                        value={summary.liveAgentCount || 0}
                        icon={CheckCircle2}
                    />
                </div>

                <div className="divide-y divide-[rgba(128,146,167,0.14)]">
                    {modules.map((module) => (
                        <div
                            key={module.id}
                            className="grid gap-2 py-3 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_minmax(200px,0.8fr)_100px] md:items-center"
                        >
                            <div className="min-w-0">
                                <div
                                    className={clsx("truncate text-sm font-bold", headingTextClass)}
                                >
                                    {module.title}
                                </div>
                                <div className={clsx("mt-1 truncate text-xs", mutedTextClass)}>
                                    {module.entrance}
                                </div>
                            </div>
                            <div className={clsx("line-clamp-2 text-xs leading-5", mutedTextClass)}>
                                {module.description}
                                {(module.nextImprovements || []).length > 0 ? (
                                    <span className="ml-1 text-indigo-500">
                                        {t("admin.ai_governance.agents.next_step", {
                                            value: module.nextImprovements[0],
                                        })}
                                    </span>
                                ) : null}
                            </div>
                            <div className="flex justify-start md:justify-end">
                                <span
                                    className={clsx(
                                        "shrink-0 rounded border px-2 py-1 text-xs font-semibold",
                                        module.status === "live" || module.status === "ready"
                                            ? suggestionStatusClass("applied", isDayMode)
                                            : suggestionStatusClass("skipped", isDayMode)
                                    )}
                                >
                                    {module.status === "live" || module.status === "ready"
                                        ? t("admin.ai_governance.status.operational")
                                        : t("admin.ai_governance.status.diagnostic")}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {partialGaps.length > 0 ? (
                    <div
                        className={clsx(
                            "rounded-xl border p-4",
                            isDayMode
                                ? "border-sky-500/20 bg-sky-500/[0.06]"
                                : "border-sky-400/20 bg-sky-400/10"
                        )}
                    >
                        <div className={clsx("text-sm font-bold", headingTextClass)}>
                            {t("admin.ai_governance.agents.partial_gaps", {
                                count: summary.partialGapCount ?? partialGaps.length,
                            })}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {partialGaps.slice(0, 8).map((gap) => (
                                <span
                                    key={`${gap.agentId}-${gap.dimensionId}`}
                                    className={clsx(
                                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                        isDayMode
                                            ? "border-sky-500/20 bg-white/70 text-sky-800"
                                            : "border-sky-300/20 bg-white/[0.04] text-sky-100"
                                    )}
                                >
                                    {gap.agentTitle} / {gap.dimensionLabel}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                {gaps.length > 0 ? (
                    <div
                        className={clsx(
                            "rounded-xl border p-4",
                            isDayMode
                                ? "border-amber-500/20 bg-amber-500/[0.06]"
                                : "border-amber-400/20 bg-amber-400/10"
                        )}
                    >
                        <div className={clsx("text-sm font-bold", headingTextClass)}>
                            {t("admin.ai_governance.agents.current_priorities")}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {gaps.slice(0, 6).map((gap) => (
                                <span
                                    key={`${gap.agentId}-${gap.dimensionId}`}
                                    className={clsx(
                                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                                        suggestionStatusClass("skipped", isDayMode)
                                    )}
                                >
                                    {gap.agentTitle} / {gap.dimensionLabel}
                                </span>
                            ))}
                        </div>
                    </div>
                ) : null}

                {nextPlan.length > 0 ? (
                    <div
                        className={clsx(
                            "rounded-xl border p-4",
                            isDayMode
                                ? "border-slate-200/70 bg-white/[0.82]"
                                : "border-white/10 bg-white/[0.04]"
                        )}
                    >
                        <div className={clsx("text-sm font-bold", headingTextClass)}>
                            {t("admin.ai_governance.agents.next_iteration")}
                        </div>
                        <div className="mt-3 grid gap-2">
                            {nextPlan.slice(0, 4).map((item) => (
                                <div
                                    key={`${item.order}-${item.target}-${item.dimension}`}
                                    className={clsx(
                                        "rounded-lg px-3 py-2 text-xs leading-5",
                                        isDayMode
                                            ? "bg-slate-50 text-slate-700"
                                            : "bg-white/[0.04] text-gray-300"
                                    )}
                                >
                                    <span className="font-bold">
                                        {item.order}. {item.target} / {item.dimension}
                                    </span>
                                    <span className={clsx("ml-2", mutedTextClass)}>
                                        {item.task}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </AdminPanel>
    );
};

const SuggestionRow = ({ suggestion, checked, disabled, onToggle }) => {
    const { t } = useTranslation();
    const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
    const suggestionId = suggestion.suggestionId || suggestion.id;
    const confidence = Number(suggestion.confidence || 0);
    const status = suggestion.status || "suggested";
    return (
        <label
            title={suggestion.reason || ""}
            className={clsx(
                "grid cursor-pointer gap-3 rounded-xl border p-3 transition-colors md:grid-cols-[20px_minmax(0,1fr)_132px]",
                disabled && "cursor-not-allowed opacity-60",
                isDayMode
                    ? "border-slate-200/70 bg-white/[0.82] hover:border-indigo-200"
                    : "border-white/10 bg-white/[0.04] hover:border-white/[0.18]"
            )}
        >
            <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(suggestionId)}
            />

            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx("truncate text-sm font-bold", headingTextClass)}>
                        {suggestion.eventTitle}
                    </span>
                    <span
                        className={clsx(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
                            isDayMode
                                ? "border-slate-200 bg-slate-50 text-slate-600"
                                : "border-white/10 bg-white/[0.04] text-gray-300"
                        )}
                    >
                        {suggestion.fieldLabel}
                    </span>
                    <span className={clsx("text-xs", mutedTextClass)}>#{suggestion.eventId}</span>
                </div>

                <div className="mt-2 grid gap-2 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div
                        className={clsx(
                            "truncate rounded-lg px-2.5 py-2",
                            isDayMode
                                ? "bg-slate-50 text-slate-600"
                                : "bg-white/[0.04] text-gray-300"
                        )}
                    >
                        {valueText(suggestion.currentValue, t("admin.ai_governance.empty_value"))}
                    </div>
                    <div className={clsx("hidden text-xs md:block", mutedTextClass)}>
                        {t("admin.ai_governance.change_to")}
                    </div>
                    <div
                        className={clsx(
                            "truncate rounded-lg px-2.5 py-2 font-semibold",
                            isDayMode ? "bg-sky-50 text-sky-800" : "bg-sky-400/10 text-sky-200"
                        )}
                    >
                        {valueText(suggestion.suggestedValue, t("admin.ai_governance.empty_value"))}
                    </div>
                </div>

                {suggestion.reason ? (
                    <div
                        className={clsx(
                            "mt-2 line-clamp-2 rounded-lg px-2.5 py-2 text-xs",
                            isDayMode
                                ? "bg-amber-50 text-amber-800"
                                : "bg-amber-400/10 text-amber-100"
                        )}
                    >
                        {t("admin.ai_governance.reason", { value: suggestion.reason })}
                    </div>
                ) : null}
            </div>

            <div className="flex items-start justify-between gap-2 md:flex-col md:items-end">
                <span
                    className={clsx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        suggestionStatusClass(status, isDayMode)
                    )}
                >
                    {t(`admin.ai_governance.suggestion_status.${status}`)}
                </span>
                <span
                    className={clsx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        confidenceClass(confidence, isDayMode)
                    )}
                >
                    {Math.round(confidence * 100)}%
                </span>
            </div>
        </label>
    );
};

const AiAssistantManager = () => {
    const { t } = useTranslation();
    const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
    const [activeSection, setActiveSection] = useState("agents");
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [applying, setApplying] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [applySummary, setApplySummary] = useState(null);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const suggestions = scanResult?.suggestions || [];
    const highConfidenceIds = useMemo(
        () =>
            suggestions
                .filter(
                    (item) =>
                        (item.status || "suggested") === "suggested" &&
                        Number(item.confidence || 0) >= 0.72
                )
                .map((item) => item.suggestionId || item.id)
                .filter(Boolean),
        [suggestions]
    );

    const loadOverview = async () => {
        setLoading(true);
        try {
            const response = await api.get("/admin/ai-assistant/overview");
            setOverview(response.data);
        } catch (error) {
            toast.error(
                error?.response?.data?.message || t("admin.ai_governance.toasts.load_fail")
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOverview();
    }, []);

    const runScan = async () => {
        setScanning(true);
        setApplySummary(null);
        try {
            const response = await api.post("/admin/ai-assistant/event-governance/scan", {
                limit: 260,
                minConfidence: 0.45,
            });
            setScanResult(response.data);
            const nextSelected = (response.data?.suggestions || [])
                .filter((item) => Number(item.confidence || 0) >= 0.72)
                .map((item) => item.suggestionId || item.id)
                .filter(Boolean);
            setSelectedIds(nextSelected);
            toast.success(
                t("admin.ai_governance.toasts.scan_success", {
                    count: response.data?.summary?.suggestionCount || 0,
                })
            );
            loadOverview();
        } catch (error) {
            toast.error(
                error?.response?.data?.message || t("admin.ai_governance.toasts.scan_fail")
            );
        } finally {
            setScanning(false);
        }
    };

    const toggleSuggestion = (id) => {
        if (!id) return;
        setSelectedIds((previous) =>
            previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
        );
    };

    const applySelected = async () => {
        if (!scanResult?.runId || selectedIds.length === 0) {
            toast.error(t("admin.ai_governance.toasts.select_suggestion"));
            return;
        }

        setApplying(true);
        try {
            const response = await api.post("/admin/ai-assistant/event-governance/apply", {
                runId: scanResult.runId,
                suggestionIds: selectedIds,
                minConfidence: 0.72,
            });
            const statusMap = new Map(
                (response.data?.details || []).map((detail) => [
                    detail.suggestionId || detail.id,
                    {
                        status: detail.status,
                        reason: detail.reason,
                    },
                ])
            );
            setScanResult((previous) => ({
                ...previous,
                suggestions: (previous?.suggestions || []).map((item) => {
                    const itemId = item.suggestionId || item.id;
                    return statusMap.has(itemId)
                        ? {
                              ...item,
                              status: statusMap.get(itemId).status,
                              reason: statusMap.get(itemId).reason || item.reason,
                          }
                        : item;
                }),
            }));
            setApplySummary(response.data || null);
            setSelectedIds([]);
            toast.success(
                t("admin.ai_governance.toasts.apply_success", {
                    applied: response.data?.appliedCount || 0,
                    skipped: response.data?.skippedCount || 0,
                })
            );
            loadOverview();
        } catch (error) {
            toast.error(
                error?.response?.data?.message || t("admin.ai_governance.toasts.apply_fail")
            );
        } finally {
            setApplying(false);
        }
    };

    if (loading && !overview) {
        return <AdminLoadingState text={t("admin.ai_governance.loading")} />;
    }

    const health = overview?.health || {};
    const recentRuns = overview?.recentRuns || [];
    const recentCount =
        recentRuns[0]?.summary?.suggestionCount ?? recentRuns[0]?.summary?.requestedCount ?? 0;

    const governanceView = (
        <AdminPanel
            title={t("admin.ai_governance.governance.title")}
            description={t("admin.ai_governance.governance.description")}
            action={
                <div className="flex flex-wrap gap-2">
                    <AdminButton tone="subtle" onClick={runScan} disabled={scanning}>
                        {scanning ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        {t("admin.ai_governance.actions.scan")}
                    </AdminButton>
                    <AdminButton
                        tone="primary"
                        onClick={applySelected}
                        disabled={applying || selectedIds.length === 0}
                    >
                        {applying ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {t("admin.ai_governance.actions.apply")}
                    </AdminButton>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-[rgba(128,146,167,0.14)] pb-3">
                    <CompactStat
                        label={t("admin.ai_governance.governance.events")}
                        value={health.eventCount || 0}
                        icon={Database}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.governance.uncategorized")}
                        value={health.uncategorizedEventCount || 0}
                        icon={CheckCircle2}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.governance.available_keys")}
                        value={health.enabledModelConfigCount || 0}
                        icon={KeyRound}
                    />
                    <CompactStat
                        label={t("admin.ai_governance.governance.latest_run")}
                        value={recentRuns[0] ? recentCount : t("admin.ai_governance.status.none")}
                        icon={ShieldCheck}
                    />
                </div>

                {scanResult ? (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                        <CompactStat
                            label={t("admin.ai_governance.governance.scanned")}
                            value={scanResult.summary?.scannedEventCount || 0}
                            icon={Database}
                        />
                        <CompactStat
                            label={t("admin.ai_governance.governance.suggestions")}
                            value={scanResult.summary?.suggestionCount || 0}
                            icon={CheckCircle2}
                        />
                        <CompactStat
                            label={t("admin.ai_governance.governance.high_confidence")}
                            value={scanResult.summary?.highConfidenceCount || 0}
                            icon={ShieldCheck}
                        />
                    </div>
                ) : null}

                {applySummary ? (
                    <div
                        className={clsx(
                            "flex flex-col gap-3 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between",
                            isDayMode
                                ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                                : "border-emerald-400/20 bg-emerald-400/10"
                        )}
                    >
                        <div className={clsx("font-semibold", headingTextClass)}>
                            {t("admin.ai_governance.apply_summary", {
                                applied: applySummary.appliedCount || 0,
                                skipped: applySummary.skippedCount || 0,
                            })}
                        </div>
                        {(applySummary.skippedCount || 0) > 0 ? (
                            <span
                                className={clsx(
                                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    suggestionStatusClass("skipped_conflict", isDayMode)
                                )}
                            >
                                <XCircle size={14} />
                                {t("admin.ai_governance.status.conflict")}
                            </span>
                        ) : (
                            <span
                                className={clsx(
                                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                                    suggestionStatusClass("applied", isDayMode)
                                )}
                            >
                                <ShieldCheck size={14} />
                                {t("admin.ai_governance.status.complete")}
                            </span>
                        )}
                    </div>
                ) : null}

                {suggestions.length > 0 ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className={clsx("text-sm", mutedTextClass)}>
                            {t("admin.ai_governance.selected_count", {
                                selected: selectedIds.length,
                                total: suggestions.length,
                            })}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <AdminButton
                                tone="subtle"
                                onClick={() => setSelectedIds(highConfidenceIds)}
                            >
                                {t("admin.ai_governance.actions.select_high_confidence")}
                            </AdminButton>
                            <AdminButton tone="subtle" onClick={() => setSelectedIds([])}>
                                {t("admin.ai_governance.actions.clear")}
                            </AdminButton>
                        </div>
                    </div>
                ) : null}

                {suggestions.length === 0 ? (
                    <AdminEmptyState
                        icon={Database}
                        title={
                            scanResult
                                ? t("admin.ai_governance.empty.no_suggestions")
                                : t("admin.ai_governance.empty.not_scanned")
                        }
                        description={
                            scanResult
                                ? t("admin.ai_governance.empty.no_suggestions_description")
                                : t("admin.ai_governance.empty.not_scanned_description")
                        }
                        action={
                            <AdminButton tone="primary" onClick={runScan} disabled={scanning}>
                                {scanning ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={16} />
                                )}
                                {t("admin.ai_governance.actions.scan")}
                            </AdminButton>
                        }
                    />
                ) : (
                    <div className="space-y-2">
                        {suggestions.map((suggestion) => (
                            <SuggestionRow
                                key={suggestion.suggestionId || suggestion.id}
                                suggestion={suggestion}
                                checked={selectedSet.has(suggestion.suggestionId || suggestion.id)}
                                disabled={(suggestion.status || "suggested") !== "suggested"}
                                onToggle={toggleSuggestion}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminPanel>
    );

    return (
        <AdminPageShell
            title={t("admin.ai_governance.title")}
            description={t("admin.ai_governance.description")}
            actions={
                <AdminButton tone="subtle" onClick={loadOverview} disabled={loading}>
                    {loading ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                    {t("admin.ai_governance.actions.refresh")}
                </AdminButton>
            }
            toolbar={
                <div
                    className="flex flex-wrap gap-2"
                    role="tablist"
                    aria-label={t("admin.ai_governance.navigation")}
                >
                    {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                            <FilterChip
                                key={section.id}
                                role="tab"
                                aria-selected={activeSection === section.id}
                                active={activeSection === section.id}
                                onClick={() => setActiveSection(section.id)}
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Icon size={16} />
                                    {t(`admin.ai_governance.sections.${section.labelKey}`)}
                                </span>
                            </FilterChip>
                        );
                    })}
                </div>
            }
        >
            <div className="space-y-4">
                {activeSection === "agents" ? <AgentSystemView overview={overview} /> : null}
                {activeSection === "governance" ? governanceView : null}
                {activeSection === "models" ? (
                    <div className="space-y-3">
                        <AdminInlineNote tone="warning">
                            {t("admin.ai_governance.models.infrastructure_note")}
                        </AdminInlineNote>
                        <AiModelConfigManager embedded />
                    </div>
                ) : null}
            </div>
        </AdminPageShell>
    );
};

export default AiAssistantManager;
