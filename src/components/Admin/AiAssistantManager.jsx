import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Clock3,
  Database,
  FileSearch,
  KeyRound,
  Layers3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

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
  { id: "overview", label: "总览", icon: Layers3 },
  { id: "governance", label: "活动治理", icon: Database },
  { id: "models", label: "模型 Key", icon: KeyRound },
  { id: "parsing", label: "解析入口", icon: FileSearch },
];

const statusLabel = {
  live: "已上线",
  ready: "可用",
  attention: "需处理",
  planned: "待接入",
};

const valueText = (value) => {
  const text = String(value || "").trim();
  return text || "空";
};

const statusClass = (status, isDayMode) => {
  const day = {
    live: "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700",
    ready: "border-sky-500/20 bg-sky-500/[0.08] text-sky-700",
    attention: "border-amber-500/24 bg-amber-500/[0.1] text-amber-700",
    planned: "border-slate-300/80 bg-slate-100/80 text-slate-600",
  };
  const night = {
    live: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    ready: "border-sky-400/20 bg-sky-400/10 text-sky-200",
    attention: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    planned: "border-white/10 bg-white/6 text-gray-300",
  };
  return (isDayMode ? day : night)[status] || (isDayMode ? day.planned : night.planned);
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
  skipped_conflict: { label: "冲突跳过", tone: "warning" },
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

const MetricTile = ({ label, value, icon: Icon }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  return (
    <div
      className={clsx(
        "rounded-2xl border p-4",
        isDayMode
          ? "border-slate-200/72 bg-white/76"
          : "border-white/10 bg-white/[0.04]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={clsx("text-sm", mutedTextClass)}>{label}</div>
          <div className={clsx("mt-2 text-2xl font-bold", headingTextClass)}>
            {value ?? 0}
          </div>
        </div>
        {Icon ? (
          <div
            className={clsx(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isDayMode ? "bg-slate-100 text-slate-500" : "bg-white/5 text-gray-300",
            )}
          >
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

const ModuleCard = ({ module }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();

  return (
    <div
      className={clsx(
        "rounded-2xl border p-4 transition-colors",
        isDayMode
          ? "border-slate-200/72 bg-white/80 hover:border-slate-300"
          : "border-white/10 bg-white/[0.04] hover:border-white/18",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={clsx("text-base font-bold", headingTextClass)}>
            {module.title}
          </h3>
          <p className={clsx("mt-1 text-sm", mutedTextClass)}>
            {module.entrance}
          </p>
        </div>
        <span
          className={clsx(
            "inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
            statusClass(module.status, isDayMode),
          )}
        >
          {statusLabel[module.status] || module.status}
        </span>
      </div>
      <p className={clsx("mt-4 min-h-[44px] text-sm leading-6", mutedTextClass)}>
        {module.description}
      </p>
      {Array.isArray(module.metrics) && module.metrics.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {module.metrics.map((metric) => (
            <div
              key={`${module.id}-${metric.label}`}
              className={clsx(
                "rounded-xl px-3 py-2",
                isDayMode ? "bg-slate-50 text-slate-600" : "bg-white/[0.04] text-gray-300",
              )}
            >
              <div className="text-xs opacity-70">{metric.label}</div>
              <div className="mt-1 text-sm font-bold">{metric.value}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const SuggestionRow = ({ suggestion, checked, disabled, onToggle }) => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const confidence = Number(suggestion.confidence || 0);
  const statusMeta = suggestionStatusMeta[suggestion.status] || suggestionStatusMeta.suggested;

  return (
    <label
      className={clsx(
        "grid cursor-pointer gap-4 rounded-2xl border p-4 transition-colors md:grid-cols-[minmax(0,1fr)_180px]",
        disabled && "cursor-not-allowed opacity-60",
        isDayMode
          ? "border-slate-200/72 bg-white/82 hover:border-indigo-200"
          : "border-white/10 bg-white/[0.04] hover:border-white/18",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            checked={checked}
            disabled={disabled}
            onChange={() => onToggle(suggestion.suggestionId)}
          />
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
        </div>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className={clsx("rounded-xl px-3 py-2", isDayMode ? "bg-slate-50 text-slate-600" : "bg-white/[0.04] text-gray-300")}>
            {valueText(suggestion.currentValue)}
          </div>
          <div className={clsx("hidden text-xs md:block", mutedTextClass)}>改为</div>
          <div className={clsx("rounded-xl px-3 py-2 font-semibold", isDayMode ? "bg-sky-50 text-sky-800" : "bg-sky-400/10 text-sky-200")}>
            {valueText(suggestion.suggestedValue)}
          </div>
        </div>
        <p className={clsx("mt-3 text-sm leading-6", mutedTextClass)}>
          {suggestion.reason}
        </p>
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
          置信度 {Math.round(confidence * 100)}%
        </span>
        <span className={clsx("text-xs", mutedTextClass)}>
          #{suggestion.eventId}
        </span>
      </div>
    </label>
  );
};

const AiAssistantManager = () => {
  const { isDayMode, mutedTextClass, headingTextClass } = useAdminTheme();
  const [activeSection, setActiveSection] = useState("overview");
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
    () => suggestions
      .filter((item) => item.status === "suggested" && Number(item.confidence || 0) >= 0.72)
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
      toast.error(error?.response?.data?.message || "AI 助手总览加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const runScan = async () => {
    setScanning(true);
    try {
      const response = await api.post("/admin/ai-assistant/event-governance/scan", {
        limit: 260,
        minConfidence: 0.45,
      });
      setScanResult(response.data);
      const nextSelected = (response.data?.suggestions || [])
        .filter((item) => Number(item.confidence || 0) >= 0.72)
        .map((item) => item.suggestionId)
        .filter(Boolean);
      setSelectedIds(nextSelected);
      toast.success(`扫描完成，发现 ${response.data?.summary?.suggestionCount || 0} 条建议`);
      loadOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "活动库扫描失败");
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
      toast.error("请先选择要应用的建议");
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
      toast.success(`已应用 ${response.data?.appliedCount || 0} 条，跳过 ${response.data?.skippedCount || 0} 条`);
      loadOverview();
    } catch (error) {
      toast.error(error?.response?.data?.message || "应用建议失败");
    } finally {
      setApplying(false);
    }
  };

  if (loading && !overview) {
    return <AdminLoadingState text="正在加载 AI 助手..." />;
  }

  const health = overview?.health || {};
  const modules = overview?.modules || [];
  const recentRuns = overview?.recentRuns || [];

  const overviewView = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricTile label="活动库" value={health.eventCount || 0} icon={Database} />
        <MetricTile label="待补分类" value={health.uncategorizedEventCount || 0} icon={SlidersHorizontal} />
        <MetricTile label="启用 Key" value={health.enabledModelConfigCount || 0} icon={KeyRound} />
        <MetricTile label="治理记录" value={health.governanceRunCount || 0} icon={Clock3} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </div>
      <AdminPanel
        title="最近运行"
        description="这里能看到助手最近扫描或应用过什么，不让 AI 在后台悄悄改东西。"
      >
        {recentRuns.length === 0 ? (
          <AdminInlineNote>还没有运行记录。先去活动治理里跑一次扫描。</AdminInlineNote>
        ) : (
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div
                key={run.id}
                className={clsx(
                  "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
                  isDayMode
                    ? "border-slate-200/72 bg-white/76"
                    : "border-white/10 bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={18} className={isDayMode ? "text-slate-500" : "text-gray-300"} />
                  <div>
                    <div className={clsx("text-sm font-semibold", headingTextClass)}>
                      {run.module === "event_governance" ? "活动治理" : run.module} / {run.action === "scan" ? "扫描" : "应用"}
                    </div>
                    <div className={clsx("text-xs", mutedTextClass)}>
                      {run.createdAt || "刚刚"}
                    </div>
                  </div>
                </div>
                <div className={clsx("text-sm", mutedTextClass)}>
                  建议 {run.summary?.suggestionCount ?? run.summary?.requestedCount ?? 0}
                  {run.summary?.appliedCount !== undefined ? `，应用 ${run.summary.appliedCount}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );

  const governanceView = (
    <AdminPanel
      title="活动库治理"
      description="先扫描，再选择应用。扫描不会改数据库；应用时只处理高置信度且未被别人改过的字段。"
      action={
        <div className="flex flex-wrap gap-2">
          <AdminButton tone="subtle" onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            扫描活动库
          </AdminButton>
          <AdminButton tone="primary" onClick={applySelected} disabled={applying || selectedIds.length === 0}>
            {applying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            应用所选
          </AdminButton>
        </div>
      }
    >
      <div className="space-y-4">
        {scanResult ? (
          <div className="grid gap-3 md:grid-cols-3">
            <MetricTile label="扫描活动" value={scanResult.summary?.scannedEventCount || 0} icon={Database} />
            <MetricTile label="发现建议" value={scanResult.summary?.suggestionCount || 0} icon={Sparkles} />
            <MetricTile label="高置信度" value={scanResult.summary?.highConfidenceCount || 0} icon={ShieldCheck} />
          </div>
        ) : null}

        {applySummary ? (
          <div
            className={clsx(
              "grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_auto]",
              isDayMode
                ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                : "border-emerald-400/20 bg-emerald-400/10",
            )}
          >
            <div>
              <div className={clsx("flex items-center gap-2 text-sm font-bold", headingTextClass)}>
                <CheckCircle2 size={17} />
                本轮应用完成
              </div>
              <div className={clsx("mt-1 text-sm", mutedTextClass)}>
                已应用 {applySummary.appliedCount || 0} 条，跳过 {applySummary.skippedCount || 0} 条。
              </div>
            </div>
            {(applySummary.skippedCount || 0) > 0 ? (
              <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-semibold", suggestionStatusClass("skipped_conflict", isDayMode))}>
                <XCircle size={14} />
                有冲突
              </span>
            ) : (
              <span className={clsx("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-semibold", suggestionStatusClass("applied", isDayMode))}>
                <ShieldCheck size={14} />
                全部安全写入
              </span>
            )}
          </div>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={clsx("text-sm", mutedTextClass)}>
              已选择 {selectedIds.length} 条。建议优先应用 72% 以上置信度。
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton tone="subtle" onClick={() => setSelectedIds(highConfidenceIds)}>
                选择高置信度
              </AdminButton>
              <AdminButton tone="subtle" onClick={() => setSelectedIds([])}>
                清空选择
              </AdminButton>
            </div>
          </div>
        ) : null}

        {suggestions.length === 0 ? (
          <AdminEmptyState
            icon={FileSearch}
            title={scanResult ? "这次没有发现可应用建议" : "先扫描活动库"}
            description={scanResult ? "说明当前活动库分类暂时比较稳定。" : "助手会读取活动标题、正文和面向对象，给出可审阅的治理建议。"}
            action={
              <AdminButton tone="primary" onClick={runScan} disabled={scanning}>
                {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                开始扫描
              </AdminButton>
            }
          />
        ) : (
          <div className="space-y-3">
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

  const parsingView = (
    <AdminPanel title="解析入口" description="这个入口现在先占住产品位置，后续微信图文、海报、活动链接都走同一个 AI 助手。">
      <div
        className={clsx(
          "grid gap-3 rounded-2xl border p-4 md:grid-cols-3",
          isDayMode
            ? "border-slate-200/72 bg-white/78"
            : "border-white/10 bg-white/[0.04]",
        )}
      >
        {[
          ["微信图文", "抽取标题、时间、地点、主办方、报名链接"],
          ["海报识别", "把图片里的活动信息整理成结构化草稿"],
          ["活动入库", "套用同一套分类和面向对象规则"],
        ].map(([title, description]) => (
          <div key={title} className="rounded-xl px-3 py-2">
            <div className={clsx("text-sm font-bold", headingTextClass)}>{title}</div>
            <div className={clsx("mt-1 text-sm leading-6", mutedTextClass)}>{description}</div>
          </div>
        ))}
      </div>
      <AdminInlineNote className="mt-4">
        第一版先把助手核心、活动治理和 Key 管理打通。解析入口下一步接入时，不再新建另一套 AI 逻辑。
      </AdminInlineNote>
    </AdminPanel>
  );

  return (
    <AdminPageShell
      title="AI 助手"
      description="推荐、治理、解析入口、模型 Key，一处管理。"
      actions={
        <AdminButton tone="subtle" onClick={loadOverview} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
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
        <AdminInlineNote tone="success">
          前台继续推荐，后台整理活动库，Key 由同一处管理。
        </AdminInlineNote>

        {activeSection === "overview" ? overviewView : null}
        {activeSection === "governance" ? governanceView : null}
        {activeSection === "models" ? <AiModelConfigManager /> : null}
        {activeSection === "parsing" ? parsingView : null}
      </div>
    </AdminPageShell>
  );
};

export default AiAssistantManager;
