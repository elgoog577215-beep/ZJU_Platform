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
  { id: "agents", label: "Agent 体系", icon: Network },
  { id: "governance", label: "治理建议", icon: Database },
  { id: "models", label: "模型配置", icon: KeyRound },
];

const valueText = (value) => {
  if (value === null || value === undefined) return "空";
  const text = String(value).trim();
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

const AgentSystemView = ({ overview }) => {
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
    <AdminPanel title="Agent 体系完成度">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CompactStat
            label="Agent"
            value={summary.agentCount ?? modules.length}
            icon={Network}
          />
          <CompactStat
            label="平均成熟度"
            value={`${Math.round((summary.averageMaturity || 0) * 100)}%`}
            icon={ShieldCheck}
          />
          <CompactStat
            label="高优先缺口"
            value={summary.highPriorityGapCount ?? gaps.length}
            icon={XCircle}
          />
          <CompactStat
            label="在线模块"
            value={summary.liveAgentCount || 0}
            icon={CheckCircle2}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.id}
              className={clsx(
                "rounded-xl border p-4",
                isDayMode
                  ? "border-slate-200/70 bg-white/[0.82]"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={clsx("truncate text-sm font-bold", headingTextClass)}>
                    {module.title}
                  </div>
                  <div className={clsx("mt-1 text-xs", mutedTextClass)}>
                    {module.entrance}
                  </div>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    module.status === "live" || module.status === "ready"
                      ? suggestionStatusClass("applied", isDayMode)
                      : suggestionStatusClass("skipped", isDayMode),
                  )}
                >
                  {module.status}
                </span>
              </div>

              <p className={clsx("mt-3 line-clamp-2 text-sm leading-6", mutedTextClass)}>
                {module.description}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(module.metrics || []).slice(0, 5).map((metric) => (
                  <span
                    key={`${module.id}-${metric.label}`}
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-xs font-semibold",
                      isDayMode
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-white/10 bg-white/[0.04] text-gray-300",
                    )}
                  >
                    {metric.label}: {metric.value}
                  </span>
                ))}
              </div>

              {(module.nextImprovements || []).length > 0 ? (
                <div
                  className={clsx(
                    "mt-3 rounded-lg px-3 py-2 text-xs leading-5",
                    isDayMode
                      ? "bg-indigo-50 text-indigo-800"
                      : "bg-indigo-400/10 text-indigo-100",
                  )}
                >
                  下一步：{module.nextImprovements[0]}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {partialGaps.length > 0 ? (
          <div
            className={clsx(
              "rounded-xl border p-4",
              isDayMode
                ? "border-sky-500/20 bg-sky-500/[0.06]"
                : "border-sky-400/20 bg-sky-400/10",
            )}
          >
            <div className={clsx("text-sm font-bold", headingTextClass)}>
              继续打磨：{summary.partialGapCount ?? partialGaps.length} 个半成熟环节
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {partialGaps.slice(0, 8).map((gap) => (
                <span
                  key={`${gap.agentId}-${gap.dimensionId}`}
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    isDayMode
                      ? "border-sky-500/20 bg-white/70 text-sky-800"
                      : "border-sky-300/20 bg-white/[0.04] text-sky-100",
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
                : "border-amber-400/20 bg-amber-400/10",
            )}
          >
            <div className={clsx("text-sm font-bold", headingTextClass)}>
              当前优先补齐
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {gaps.slice(0, 6).map((gap) => (
                <span
                  key={`${gap.agentId}-${gap.dimensionId}`}
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-xs font-semibold",
                    suggestionStatusClass("skipped", isDayMode),
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
                : "border-white/10 bg-white/[0.04]",
            )}
          >
            <div className={clsx("text-sm font-bold", headingTextClass)}>
              下一轮任务
            </div>
            <div className="mt-3 grid gap-2">
              {nextPlan.slice(0, 4).map((item) => (
                <div
                  key={`${item.order}-${item.target}-${item.dimension}`}
                  className={clsx(
                    "rounded-lg px-3 py-2 text-xs leading-5",
                    isDayMode
                      ? "bg-slate-50 text-slate-700"
                      : "bg-white/[0.04] text-gray-300",
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
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const suggestionId = suggestion.suggestionId || suggestion.id;
  const confidence = Number(suggestion.confidence || 0);
  const status = suggestion.status || "suggested";
  const statusMeta =
    suggestionStatusMeta[status] || suggestionStatusMeta.suggested;

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
        onChange={() => onToggle(suggestionId)}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={clsx("truncate text-sm font-bold", headingTextClass)}
          >
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

        {suggestion.reason ? (
          <div
            className={clsx(
              "mt-2 line-clamp-2 rounded-lg px-2.5 py-2 text-xs",
              isDayMode
                ? "bg-amber-50 text-amber-800"
                : "bg-amber-400/10 text-amber-100",
            )}
          >
            原因：{suggestion.reason}
          </div>
        ) : null}
      </div>

      <div className="flex items-start justify-between gap-2 md:flex-col md:items-end">
        <span
          className={clsx(
            "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
            suggestionStatusClass(status, isDayMode),
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
            Number(item.confidence || 0) >= 0.72,
        )
        .map((item) => item.suggestionId || item.id)
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
        .map((item) => item.suggestionId || item.id)
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
          detail.suggestionId || detail.id,
          {
            status: detail.status,
            reason: detail.reason,
          },
        ]),
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
      title="活动治理建议"
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
            icon={CheckCircle2}
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
              icon={CheckCircle2}
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
                选择高置信
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
            description={
              scanResult
                ? "当前扫描没有发现需要处理的治理建议。"
                : "运行扫描后会列出可应用的活动治理建议。"
            }
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
                checked={selectedSet.has(
                  suggestion.suggestionId || suggestion.id,
                )}
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
      title="治理与模型配置"
      description="集中处理活动治理建议和模型接口配置，保留必要的自动化能力，减少无关助手入口。"
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
        {activeSection === "agents" ? <AgentSystemView overview={overview} /> : null}
        {activeSection === "governance" ? governanceView : null}
        {activeSection === "models" ? <AiModelConfigManager embedded /> : null}
      </div>
    </AdminPageShell>
  );
};

export default AiAssistantManager;
