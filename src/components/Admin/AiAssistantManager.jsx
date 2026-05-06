import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminLoadingState,
  AdminPageShell,
  AdminPanel,
  FilterChip,
  useAdminTheme,
} from "./AdminUI";
import AiModelConfigManager from "./AiModelConfigManager";

const sections = [
  { id: "governance", label: "活动治理", icon: Database },
  { id: "models", label: "模型 Key", icon: KeyRound },
];

const valueText = (value) => {
  const text = String(value || "").trim();
  return text || "空";
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
  suggested: { label: "待处理", tone: "neutral" },
  applied: { label: "已应用", tone: "success" },
  skipped: { label: "已跳过", tone: "warning" },
  skipped_conflict: { label: "冲突", tone: "warning" },
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
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();

  return (
    <div
      className={clsx(
        "rounded-xl border p-3",
        isDayMode
          ? "border-slate-200/70 bg-white/[0.74]"
          : "border-white/10 bg-white/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={clsx("text-xs", mutedTextClass)}>{label}</div>
          <div className={clsx("mt-1 text-xl font-bold", headingTextClass)}>
            {value ?? 0}
          </div>
        </div>
        {Icon ? (
          <div
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              isDayMode
                ? "bg-slate-100 text-slate-500"
                : "bg-white/5 text-gray-300",
            )}
          >
            <Icon size={16} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const SuggestionRow = ({ suggestion, checked, disabled, onToggle }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const confidence = Number(suggestion.confidence || 0);
  const statusMeta =
    suggestionStatusMeta[suggestion.status] || suggestionStatusMeta.suggested;

  return (
    <label
      title={suggestion.reason || ""}
      className={clsx(
        "grid cursor-pointer gap-3 rounded-xl border p-3 transition-colors md:grid-cols-[20px_minmax(0,1fr)_132px]",
        disabled && "cursor-not-allowed opacity-60",
        isDayMode
          ? "border-slate-200/70 bg-white/[0.82] hover:border-indigo-200"
          : "border-white/10 bg-white/[0.04] hover:border-white/[0.18]",
      )}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(suggestion.suggestionId)}
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
                : "border-white/10 bg-white/[0.04] text-gray-300",
            )}
          >
            {suggestion.fieldLabel}
          </span>
          <span className={clsx("text-xs", mutedTextClass)}>
            #{suggestion.eventId}
          </span>
        </div>

        <div className="mt-2 grid gap-2 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div
            className={clsx(
              "truncate rounded-lg px-2.5 py-2",
              isDayMode
                ? "bg-slate-50 text-slate-600"
                : "bg-white/[0.04] text-gray-300",
            )}
          >
            {valueText(suggestion.currentValue)}
          </div>
          <div className={clsx("hidden text-xs md:block", mutedTextClass)}>
            改为
          </div>
          <div
            className={clsx(
              "truncate rounded-lg px-2.5 py-2 font-semibold",
              isDayMode
                ? "bg-sky-50 text-sky-800"
                : "bg-sky-400/10 text-sky-200",
            )}
          >
            {valueText(suggestion.suggestedValue)}
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2 md:flex-col md:items-end">
        <span
          className={clsx(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
            suggestionStatusClass(suggestion.status, isDayMode),
          )}
        >
          {statusMeta.label}
        </span>
        <span
          className={clsx(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
            confidenceClass(confidence, isDayMode),
          )}
        >
          {Math.round(confidence * 100)}%
        </span>
      </div>
    </label>
  );
};

const AiAssistantManager = () => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const [activeSection, setActiveSection] = useState("governance");
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
            item.status === "suggested" && Number(item.confidence || 0) >= 0.72,
        )
        .map((item) => item.suggestionId)
        .filter(Boolean),
    [suggestions],
  );

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/ai-assistant/overview");
      setOverview(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "状态加载失败");
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
      const response = await api.post(
        "/admin/ai-assistant/event-governance/scan",
        {
          limit: 260,
          minConfidence: 0.45,
        },
      );
      setScanResult(response.data);
      const nextSelected = (response.data?.suggestions || [])
        .filter((item) => Number(item.confidence || 0) >= 0.72)
        .map((item) => item.suggestionId)
        .filter(Boolean);
      setSelectedIds(nextSelected);
      toast.success(
        `扫描完成：${response.data?.summary?.suggestionCount || 0} 条建议`,
      );
      loadOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "扫描失败");
    } finally {
      setScanning(false);
    }
  };

  const toggleSuggestion = (id) => {
    if (!id) return;
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const applySelected = async () => {
    if (!scanResult?.runId || selectedIds.length === 0) {
      toast.error("请选择建议");
      return;
    }

    setApplying(true);
    try {
      const response = await api.post(
        "/admin/ai-assistant/event-governance/apply",
        {
          runId: scanResult.runId,
          suggestionIds: selectedIds,
          minConfidence: 0.72,
        },
      );
      const statusMap = new Map(
        (response.data?.details || []).map((detail) => [
          detail.suggestionId,
          {
            status: detail.status,
            reason: detail.reason,
          },
        ]),
      );
      setScanResult((previous) => ({
        ...previous,
        suggestions: (previous?.suggestions || []).map((item) =>
          statusMap.has(item.suggestionId)
            ? {
                ...item,
                status: statusMap.get(item.suggestionId).status,
                reason: statusMap.get(item.suggestionId).reason || item.reason,
              }
            : item,
        ),
      }));
      setApplySummary(response.data || null);
      setSelectedIds([]);
      toast.success(
        `已应用 ${response.data?.appliedCount || 0} 条，跳过 ${
          response.data?.skippedCount || 0
        } 条`,
      );
      loadOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "应用失败");
    } finally {
      setApplying(false);
    }
  };

  if (loading && !overview) {
    return <AdminLoadingState text="加载中..." />;
  }

  const health = overview?.health || {};
  const recentRuns = overview?.recentRuns || [];
  const recentCount =
    recentRuns[0]?.summary?.suggestionCount ??
    recentRuns[0]?.summary?.requestedCount ??
    0;

  const governanceView = (
    <AdminPanel
      title="活动治理"
      action={
        <div className="flex flex-wrap gap-2">
          <AdminButton tone="subtle" onClick={runScan} disabled={scanning}>
            {scanning ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            扫描
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
            应用
          </AdminButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CompactStat
            label="活动"
            value={health.eventCount || 0}
            icon={Database}
          />
          <CompactStat
            label="待补分类"
            value={health.uncategorizedEventCount || 0}
            icon={Sparkles}
          />
          <CompactStat
            label="可用 Key"
            value={health.enabledModelConfigCount || 0}
            icon={KeyRound}
          />
          <CompactStat
            label="最近运行"
            value={recentRuns[0] ? recentCount : "无"}
            icon={ShieldCheck}
          />
        </div>

        {scanResult ? (
          <div className="grid grid-cols-3 gap-3">
            <CompactStat
              label="扫描"
              value={scanResult.summary?.scannedEventCount || 0}
              icon={Database}
            />
            <CompactStat
              label="建议"
              value={scanResult.summary?.suggestionCount || 0}
              icon={Sparkles}
            />
            <CompactStat
              label="高置信"
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
                : "border-emerald-400/20 bg-emerald-400/10",
            )}
          >
            <div className={clsx("font-semibold", headingTextClass)}>
              已应用 {applySummary.appliedCount || 0} 条，跳过{" "}
              {applySummary.skippedCount || 0} 条
            </div>
            {(applySummary.skippedCount || 0) > 0 ? (
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  suggestionStatusClass("skipped_conflict", isDayMode),
                )}
              >
                <XCircle size={14} />
                有冲突
              </span>
            ) : (
              <span
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  suggestionStatusClass("applied", isDayMode),
                )}
              >
                <ShieldCheck size={14} />
                完成
              </span>
            )}
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={clsx("text-sm", mutedTextClass)}>
              已选 {selectedIds.length} / {suggestions.length}
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                tone="subtle"
                onClick={() => setSelectedIds(highConfidenceIds)}
              >
                高置信
              </AdminButton>
              <AdminButton tone="subtle" onClick={() => setSelectedIds([])}>
                清空
              </AdminButton>
            </div>
          </div>
        ) : null}

        {suggestions.length === 0 ? (
          <AdminEmptyState
            icon={Database}
            title={scanResult ? "暂无建议" : "未扫描"}
            action={
              <AdminButton tone="primary" onClick={runScan} disabled={scanning}>
                {scanning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                扫描
              </AdminButton>
            }
          />
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.suggestionId || suggestion.id}
                suggestion={suggestion}
                checked={selectedSet.has(suggestion.suggestionId)}
                disabled={suggestion.status !== "suggested"}
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
      title="AI 助手"
      actions={
        <AdminButton tone="subtle" onClick={loadOverview} disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          刷新
        </AdminButton>
      }
      toolbar={
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <FilterChip
                key={section.id}
                active={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon size={16} />
                  {section.label}
                </span>
              </FilterChip>
            );
          })}
        </div>
      }
    >
      <div className="space-y-4">
        {activeSection === "governance" ? governanceView : null}
        {activeSection === "models" ? <AiModelConfigManager embedded /> : null}
      </div>
    </AdminPageShell>
  );
};

export default AiAssistantManager;
