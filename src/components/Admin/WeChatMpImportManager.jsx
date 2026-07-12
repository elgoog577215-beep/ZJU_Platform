import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  LogIn,
  Newspaper,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import api, { uploadFile } from "../../services/api";
import {
  AdminButton,
  AdminEmptyState,
  AdminInlineNote,
  AdminMetricCard,
  AdminPageShell,
  AdminPanel,
  FilterChip,
  ToolbarGroup,
  useAdminTheme,
} from "./AdminUI";

const LOGIN_WAIT_SECONDS = 300;
const LOGIN_ACTIVE_STAGES = new Set([
  "starting",
  "opening",
  "waiting_for_scan",
  "qr_ready",
]);

const initialStatus = {
  credentials: { present: false, cookie_names: [], token_mask: "" },
  login: { active: false, stage: "idle", message: "", qr_data_url: "" },
  runtime: { required: true, dependency: "playwright", chromium_installed: false },
};

const initialForm = {
  accountName: "",
  fakeid: "",
  keyword: "",
  count: 20,
  maxPages: 1,
  allowFirst: false,
  queryDelayMin: 95,
  queryDelayMax: 125,
  pagePauseMin: 10,
  pagePauseMax: 25,
  contentDelayMin: 10,
  contentDelayMax: 20,
};

const initialIngestSettings = {
  enabled: false,
  daily_run_time: "03:30",
  timezone: "Asia/Shanghai",
  query_delay_range: [95, 125],
  page_pause_range: [10, 25],
  page_pause_seconds: 10,
  content_delay_range: [10, 20],
  count_per_page: 20,
  max_pages: 1,
  fetch_content: true,
};

const initialIngestOverview = {
  settings: initialIngestSettings,
  accounts: [],
  runs: [],
  articles: [],
};

const initialIngestAccountForm = {
  name: "",
  fakeid: "",
  alias: "",
  keywords: "",
  enabled: true,
  fetch_content: true,
  count_per_page: 20,
  max_pages: 1,
};

const getApiErrorMessage = (error, fallback, language) => {
  if (!String(language || "").toLowerCase().startsWith("zh")) return fallback;
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
};

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const formatDateTime = (value, language) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(language || undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const splitKeywords = (value) => String(value || "")
  .split(/[，,;；\n]/)
  .map((item) => item.trim())
  .filter(Boolean);

const textParagraphs = (value) =>
  String(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 24);

const optionalNumber = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
};

const optionalDelayRange = (minValue, maxValue) => {
  const min = optionalNumber(minValue);
  const max = optionalNumber(maxValue);
  if (min === undefined && max === undefined) return undefined;
  if (min === undefined) return [max, max];
  if (max === undefined) return [min, min];
  return [min, max];
};

const loginStatusKey = (loginStage, credentialsReady) => {
  if (credentialsReady || loginStage === "saved") return "logged_in";
  if (loginStage === "failed") return "failed";
  if (loginStage === "cancelled") return "cancelled";
  if (LOGIN_ACTIVE_STAGES.has(loginStage)) return "waiting";
  return "not_logged_in";
};

const statusTone = (isReady, isDayMode) =>
  isReady
    ? isDayMode
      ? "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-700"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
    : isDayMode
      ? "border-amber-500/20 bg-amber-500/[0.1] text-amber-700"
      : "border-amber-500/20 bg-amber-500/10 text-amber-200";

const WeChatMpImportManager = () => {
  const { t, i18n } = useTranslation();
  const { isDayMode, headingTextClass, mutedTextClass, subtleTextClass } = useAdminTheme();
  const isChinese = String(i18n.resolvedLanguage || i18n.language || "").toLowerCase().startsWith("zh");
  const fallbackText = (zhText, enText) => (isChinese ? zhText : enText);
  const [status, setStatus] = useState(initialStatus);
  const [statusLoading, setStatusLoading] = useState(true);
  const [loginStarting, setLoginStarting] = useState(false);
  const [loginCancelling, setLoginCancelling] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [accounts, setAccounts] = useState([]);
  const [accountSearching, setAccountSearching] = useState(false);
  const [articlesResult, setArticlesResult] = useState(null);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [content, setContent] = useState(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [importingResource, setImportingResource] = useState("");
  const [ingestOverview, setIngestOverview] = useState(initialIngestOverview);
  const [ingestLoading, setIngestLoading] = useState(true);
  const [ingestSaving, setIngestSaving] = useState(false);
  const [ingestRunning, setIngestRunning] = useState(false);
  const [ingestImporting, setIngestImporting] = useState(false);
  const [ingestFile, setIngestFile] = useState(null);
  const [ingestAccountForm, setIngestAccountForm] = useState(initialIngestAccountForm);

  const login = status?.login || initialStatus.login;
  const runtimeReady = Boolean(status?.runtime?.chromium_installed);
  const credentialsReady = Boolean(status?.credentials?.present);
  const loginActive = Boolean(login.active || LOGIN_ACTIVE_STAGES.has(login.stage));
  const articles = articlesResult?.articles || [];
  const selectedUrl = selectedArticle?.link || "";
  const previewCoverSrc = content?.coverImage || selectedArticle?.cover || "";
  const contentTextLength = content?.contentText?.length || 0;
  const ingestSettings = { ...initialIngestSettings, ...(ingestOverview.settings || {}) };
  const ingestAccounts = ingestOverview.accounts || [];
  const ingestRuns = ingestOverview.runs || [];
  const ingestArticles = ingestOverview.articles || [];
  const latestRun = ingestRuns[0] || null;

  const sanitizedContentHtml = useMemo(() => {
    if (!content?.contentHtml) return "";
    return DOMPurify.sanitize(content.contentHtml, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["script", "style", "iframe"],
    });
  }, [content?.contentHtml]);

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatusLoading(true);
    try {
      const response = await api.get("/admin/wechat-mp/status", { noRetry: true });
      setStatus({ ...initialStatus, ...response.data });
    } catch (error) {
      if (!silent) {
        toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.status_failed"), i18n.resolvedLanguage));
      }
    } finally {
      if (!silent) setStatusLoading(false);
    }
  }, [i18n.resolvedLanguage, t]);

  const loadIngestOverview = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIngestLoading(true);
    try {
      const response = await api.get("/admin/wechat-mp/ingest", { noRetry: true });
      setIngestOverview({
        settings: { ...initialIngestSettings, ...(response.data?.settings || {}) },
        accounts: response.data?.accounts || [],
        runs: response.data?.runs || [],
        articles: response.data?.articles || [],
      });
    } catch (error) {
      if (!silent) {
        toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_load_failed"), i18n.resolvedLanguage));
      }
    } finally {
      if (!silent) setIngestLoading(false);
    }
  }, [i18n.resolvedLanguage, t]);

  useEffect(() => {
    loadStatus();
    loadIngestOverview();
  }, [loadIngestOverview, loadStatus]);

  useEffect(() => {
    if (!loginActive) return undefined;
    const timer = window.setInterval(() => {
      loadStatus({ silent: true });
    }, 1600);
    return () => window.clearInterval(timer);
  }, [loadStatus, loginActive]);

  const updateForm = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const startLogin = async () => {
    setLoginStarting(true);
    try {
      const response = await api.post("/admin/wechat-mp/login/start", {
        wait_seconds: LOGIN_WAIT_SECONDS,
      }, { noRetry: true });
      setStatus((previous) => ({
        ...previous,
        login: response.data,
      }));
      toast.success(t("admin.wechat_mp.toasts.login_started"));
    } catch (error) {
      const responseStatus = error?.response?.data;
      if (responseStatus?.runtime) {
        setStatus((previous) => ({ ...previous, runtime: responseStatus.runtime }));
        toast.error(t("admin.wechat_mp.notes.runtime_missing"));
      } else {
        toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.login_failed"), i18n.resolvedLanguage));
      }
    } finally {
      setLoginStarting(false);
    }
  };

  const cancelLogin = async () => {
    setLoginCancelling(true);
    try {
      const response = await api.post("/admin/wechat-mp/login/cancel", {}, { noRetry: true });
      setStatus((previous) => ({ ...previous, login: response.data }));
      toast.success(t("admin.wechat_mp.toasts.login_cancelled"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.cancel_failed"), i18n.resolvedLanguage));
    } finally {
      setLoginCancelling(false);
    }
  };

  const searchAccounts = async () => {
    if (!form.accountName.trim()) {
      toast.error(t("admin.wechat_mp.toasts.account_required"));
      return;
    }
    setAccountSearching(true);
    setAccounts([]);
    try {
      const response = await api.post("/admin/wechat-mp/accounts/search", {
        query: form.accountName.trim(),
        count: 8,
      });
      setAccounts(response.data?.accounts || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.account_search_failed"), i18n.resolvedLanguage));
    } finally {
      setAccountSearching(false);
    }
  };

  const chooseAccount = (account) => {
    setForm((previous) => ({
      ...previous,
      accountName: account.nickname || previous.accountName,
      fakeid: account.fakeid || "",
    }));
  };

  const pacingPayload = () => ({
  query_delay_range: optionalDelayRange(form.queryDelayMin, form.queryDelayMax),
  page_pause_range: optionalDelayRange(form.pagePauseMin, form.pagePauseMax),
  content_delay_range: optionalDelayRange(form.contentDelayMin, form.contentDelayMax),
});

  const fetchArticles = async () => {
    if (!credentialsReady) {
      toast.error(t("admin.wechat_mp.toasts.login_required"));
      return;
    }
    if (!form.accountName.trim() && !form.fakeid.trim()) {
      toast.error(t("admin.wechat_mp.toasts.account_required"));
      return;
    }
    setArticlesLoading(true);
    setArticlesResult(null);
    setSelectedArticle(null);
    setContent(null);
    try {
      const response = await api.post("/admin/wechat-mp/articles", {
        account_name: form.accountName.trim(),
        fakeid: form.fakeid.trim(),
        keyword: form.keyword.trim(),
        count: Number(form.count) || 20,
        max_pages: Number(form.maxPages) || 1,
        allow_first: form.allowFirst,
        ...pacingPayload(),
      });
      setArticlesResult(response.data);
      const firstArticle = response.data?.articles?.[0] || null;
      if (firstArticle) setSelectedArticle(firstArticle);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.articles_failed"), i18n.resolvedLanguage));
    } finally {
      setArticlesLoading(false);
    }
  };

  const selectArticle = (article) => {
    setSelectedArticle(article);
    setContent(null);
  };

  const fetchContent = async () => {
    if (!selectedUrl) {
      toast.error(t("admin.wechat_mp.toasts.article_required"));
      return;
    }
    setContentLoading(true);
    setContent(null);
    try {
      const response = await api.post("/admin/wechat-mp/article-content", {
        url: selectedUrl,
        article: selectedArticle,
      });
      setContent(response.data);
      toast.success(t("admin.wechat_mp.toasts.content_ready"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.content_failed"), i18n.resolvedLanguage));
    } finally {
      setContentLoading(false);
    }
  };

  const importContent = async (resourceType) => {
    if (!content?.contentText) {
      toast.error(t("admin.wechat_mp.toasts.content_required"));
      return;
    }
    setImportingResource(resourceType);
    try {
      const payloadResponse = await api.post("/admin/wechat-mp/import-payload", {
        resource_type: resourceType,
        article: selectedArticle,
        content,
      }, { retryWrites: true });

      const endpoint = payloadResponse.data?.endpoint;
      const payload = payloadResponse.data?.payload;
      if (!endpoint || !payload?.title) {
        throw new Error(t(
          "admin.wechat_mp.toasts.import_failed",
          fallbackText("导入内容失败", "Failed to import content"),
        ));
      }

      const createResponse = await api.post(endpoint, payload, { retryWrites: true });
      const successFallback = resourceType === "event"
        ? fallbackText(
          "活动已导入，可在活动管理中继续补充时间地点",
          "Event imported. You can add time and location in event management.",
        )
        : fallbackText(
          "文章已导入，可在文章管理中继续编辑",
          "Article imported. You can continue editing it in article management.",
        );
      toast.success(t(`admin.wechat_mp.toasts.import_${resourceType}_ready`, successFallback, {
        id: createResponse.data?.id || "",
      }));
    } catch (error) {
      toast.error(getApiErrorMessage(
        error,
        t(
          "admin.wechat_mp.toasts.import_failed",
          fallbackText("导入内容失败", "Failed to import content"),
        ),
        i18n.resolvedLanguage,
      ));
    } finally {
      setImportingResource("");
    }
  };

  const updateIngestSetting = (key, value) => {
    setIngestOverview((previous) => ({
      ...previous,
      settings: {
        ...initialIngestSettings,
        ...(previous.settings || {}),
        [key]: value,
      },
    }));
  };

  const updateIngestDelay = (key, index, value) => {
    const next = [...(ingestSettings[key] || initialIngestSettings[key])];
    next[index] = value;
    updateIngestSetting(key, next);
  };

  const updateIngestAccountForm = (key, value) => {
    setIngestAccountForm((previous) => ({ ...previous, [key]: value }));
  };

  const saveIngestSettings = async () => {
    setIngestSaving(true);
    try {
      const payload = {
        ...ingestSettings,
        query_delay_range: [
          Number(ingestSettings.query_delay_range?.[0]) || 95,
          Number(ingestSettings.query_delay_range?.[1]) || 125,
        ],
        page_pause_range: [
          Number(ingestSettings.page_pause_range?.[0]) || 10,
          Number(ingestSettings.page_pause_range?.[1]) || 25,
        ],
        content_delay_range: [
          Number(ingestSettings.content_delay_range?.[0]) || 10,
          Number(ingestSettings.content_delay_range?.[1]) || 20,
        ],
        page_pause_seconds: Number(ingestSettings.page_pause_range?.[0]) || 10,
        count_per_page: Number(ingestSettings.count_per_page) || 20,
        max_pages: Number(ingestSettings.max_pages) || 1,
      };
      const response = await api.put("/admin/wechat-mp/ingest/settings", payload);
      setIngestOverview((previous) => ({
        ...previous,
        settings: { ...initialIngestSettings, ...(response.data?.settings || {}) },
      }));
      toast.success(t("admin.wechat_mp.toasts.ingest_settings_saved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_settings_failed"), i18n.resolvedLanguage));
    } finally {
      setIngestSaving(false);
    }
  };

  const saveIngestAccount = async () => {
    if (!ingestAccountForm.name.trim() && !ingestAccountForm.fakeid.trim()) {
      toast.error(t("admin.wechat_mp.toasts.account_required"));
      return;
    }
    setIngestSaving(true);
    try {
      await api.post("/admin/wechat-mp/ingest/accounts", {
        ...ingestAccountForm,
        keywords: splitKeywords(ingestAccountForm.keywords),
        count_per_page: Number(ingestAccountForm.count_per_page) || 20,
        max_pages: Number(ingestAccountForm.max_pages) || 1,
      });
      setIngestAccountForm(initialIngestAccountForm);
      await loadIngestOverview({ silent: true });
      toast.success(t("admin.wechat_mp.toasts.ingest_account_saved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_account_failed"), i18n.resolvedLanguage));
    } finally {
      setIngestSaving(false);
    }
  };

  const deleteIngestAccount = async (account) => {
    const confirmed = window.confirm(t("admin.wechat_mp.ingest.confirm_delete_account", {
      name: account.name || account.fakeid,
    }));
    if (!confirmed) return;
    try {
      await api.delete(`/admin/wechat-mp/ingest/accounts/${account.id}`);
      await loadIngestOverview({ silent: true });
      toast.success(t("admin.wechat_mp.toasts.ingest_account_deleted"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_account_delete_failed"), i18n.resolvedLanguage));
    }
  };

  const importIngestAccounts = async () => {
    if (!ingestFile) {
      toast.error(t("admin.wechat_mp.toasts.ingest_file_required"));
      return;
    }
    setIngestImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", ingestFile);
      const response = await uploadFile("/admin/wechat-mp/ingest/accounts/import", formData);
      setIngestFile(null);
      await loadIngestOverview({ silent: true });
      toast.success(t("admin.wechat_mp.toasts.ingest_imported", {
        count: response.data?.imported_count || 0,
      }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_import_failed"), i18n.resolvedLanguage));
    } finally {
      setIngestImporting(false);
    }
  };

  const runIngestNow = async () => {
    if (!credentialsReady) {
      toast.error(t("admin.wechat_mp.toasts.login_required"));
      return;
    }
    setIngestRunning(true);
    try {
      await api.post("/admin/wechat-mp/ingest/run", {}, { noRetry: true });
      await loadIngestOverview({ silent: true });
      toast.success(t("admin.wechat_mp.toasts.ingest_started"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.ingest_start_failed"), i18n.resolvedLanguage));
    } finally {
      setIngestRunning(false);
    }
  };

  const runtimeNoteTone = runtimeReady ? (credentialsReady ? "success" : "warning") : "danger";
  const runtimeNoteText = runtimeReady
    ? credentialsReady
      ? t("admin.wechat_mp.notes.ready")
      : t("admin.wechat_mp.notes.need_login")
    : t("admin.wechat_mp.notes.runtime_missing");
  const simpleLoginStatus = loginStatusKey(login.stage, credentialsReady);
  const paragraphs = textParagraphs(content?.contentText);

  return (
    <AdminPageShell
      title={t("admin.wechat_mp.title")}
      description={t("admin.wechat_mp.description")}
      actions={(
        <ToolbarGroup className="justify-start lg:justify-end">
          <AdminButton tone="subtle" onClick={() => loadStatus()} disabled={statusLoading}>
            <RefreshCw size={16} className={statusLoading ? "animate-spin" : ""} />
            {t("admin.wechat_mp.actions.refresh_status")}
          </AdminButton>
          <AdminButton
            tone="primary"
            onClick={startLogin}
            disabled={loginStarting || loginActive || !runtimeReady}
          >
            {loginStarting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            {t("admin.wechat_mp.actions.start_login")}
          </AdminButton>
        </ToolbarGroup>
      )}
    >
      <div className="space-y-3">
        <AdminInlineNote tone={runtimeNoteTone}>{runtimeNoteText}</AdminInlineNote>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <AdminPanel
            title={t("admin.wechat_mp.auth.title")}
            description={t("admin.wechat_mp.auth.description")}
            action={loginActive ? (
              <AdminButton tone="danger" onClick={cancelLogin} disabled={loginCancelling}>
                {loginCancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                {t("admin.wechat_mp.actions.cancel_login")}
              </AdminButton>
            ) : null}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <AdminMetricCard
                label={t("admin.wechat_mp.metrics.browser")}
                value={runtimeReady ? t("admin.wechat_mp.status.ready") : t("admin.wechat_mp.status.missing")}
                icon={runtimeReady ? CheckCircle2 : AlertTriangle}
                tone={runtimeReady ? "emerald" : "rose"}
              />
              <AdminMetricCard
                label={t("admin.wechat_mp.metrics.credentials")}
                value={t(`admin.wechat_mp.simple_status.${simpleLoginStatus}`)}
                icon={KeyRound}
                tone={credentialsReady ? "emerald" : "amber"}
              />
              <AdminMetricCard
                label={t("admin.wechat_mp.metrics.login_stage")}
                value={t(`admin.wechat_mp.login_stages.${login.stage}`, login.stage || "idle")}
                icon={ShieldCheck}
                tone={login.stage === "failed" ? "rose" : login.stage === "saved" ? "emerald" : "indigo"}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div
                className={clsx(
                  "flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-[8px] border p-3",
                  isDayMode ? "border-slate-200 bg-white" : "border-white/10 bg-white/[0.04]",
                )}
              >
                {login.qr_data_url ? (
                  <img
                    src={login.qr_data_url}
                    alt={t("admin.wechat_mp.auth.qr_alt")}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className={clsx("text-center text-sm", mutedTextClass)}>
                    <QrCode size={48} className="mx-auto mb-3" />
                    <div>{t("admin.wechat_mp.auth.qr_empty")}</div>
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-3">
                <div
                  role="status"
                  aria-live="polite"
                  className={clsx(
                    "rounded-[8px] border px-3 py-2 text-sm leading-6",
                    statusTone(credentialsReady, isDayMode),
                  )}
                >
                  <div className="font-semibold">
                    {login.message || t("admin.wechat_mp.auth.idle_message")}
                  </div>
                  {login.error ? (
                    <div className="mt-1 break-words text-xs">{login.error}</div>
                  ) : null}
                </div>
                <div className={clsx("grid gap-2 text-xs", mutedTextClass)}>
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-semibold">
                      {t("admin.wechat_mp.auth.diagnostics")}
                    </summary>
                    <div className="mt-2 grid gap-2">
                      <div>
                        {t("admin.wechat_mp.auth.cookie_names")}:{" "}
                        {(status?.credentials?.cookie_names || []).length > 0
                          ? status.credentials.cookie_names.join(", ")
                          : t("admin.wechat_mp.status.none")}
                      </div>
                      <div>
                        {t("admin.wechat_mp.auth.token_mask")}:{" "}
                        {status?.credentials?.token_mask || t("admin.wechat_mp.status.none")}
                      </div>
                      <div className="break-all">
                        {t("admin.wechat_mp.auth.chromium_path")}:{" "}
                        {status?.runtime?.executable_path || t("admin.wechat_mp.status.none")}
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel
            title={t("admin.wechat_mp.collect.title")}
            description={t("admin.wechat_mp.collect.description")}
            action={(
              <AdminButton
                tone="primary"
                onClick={fetchArticles}
                disabled={articlesLoading || !credentialsReady}
              >
                {articlesLoading ? <Loader2 size={16} className="animate-spin" /> : <Newspaper size={16} />}
                {t("admin.wechat_mp.actions.fetch_articles")}
              </AdminButton>
            )}
          >
            <div className="grid gap-3 lg:grid-cols-2">
              <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                {t("admin.wechat_mp.fields.account_name")}
                <div className="mt-1 flex gap-2">
                  <input
                    value={form.accountName}
                    onChange={(event) => updateForm("accountName", event.target.value)}
                    className="theme-admin-input rect-field min-h-[40px] min-w-0 flex-1 px-3 py-2 text-sm"
                    placeholder={t("admin.wechat_mp.placeholders.account_name")}
                  />
                  <AdminButton
                    tone="subtle"
                    onClick={searchAccounts}
                    disabled={accountSearching || !credentialsReady}
                    className="shrink-0"
                  >
                    {accountSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    <span className="hidden sm:inline">{t("admin.wechat_mp.actions.search_account")}</span>
                  </AdminButton>
                </div>
              </label>
              <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                {t("admin.wechat_mp.fields.fakeid")}
                <input
                  value={form.fakeid}
                  onChange={(event) => updateForm("fakeid", event.target.value)}
                  className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  placeholder={t("admin.wechat_mp.placeholders.fakeid")}
                />
              </label>
              <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                {t("admin.wechat_mp.fields.keyword")}
                <input
                  value={form.keyword}
                  onChange={(event) => updateForm("keyword", event.target.value)}
                  className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  placeholder={t("admin.wechat_mp.placeholders.keyword")}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.fields.count")}
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.count}
                    onChange={(event) => updateForm("count", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.fields.max_pages")}
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={form.maxPages}
                    onChange={(event) => updateForm("maxPages", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className={clsx("inline-flex items-center gap-2 text-sm", subtleTextClass)}>
                <input
                  type="checkbox"
                  checked={form.allowFirst}
                  onChange={(event) => updateForm("allowFirst", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                {t("admin.wechat_mp.fields.allow_first")}
              </label>
              {accounts.map((account) => (
                <FilterChip
                  key={account.fakeid}
                  active={form.fakeid === account.fakeid}
                  onClick={() => chooseAccount(account)}
                >
                  {account.nickname || account.alias || account.fakeid}
                </FilterChip>
              ))}
            </div>

            <details className={clsx("mt-4 rounded-[8px] border p-3", isDayMode ? "border-slate-200 bg-white/70" : "border-white/10 bg-white/[0.03]")}>
              <summary className={clsx("cursor-pointer text-sm font-semibold", headingTextClass)}>
                {t("admin.wechat_mp.collect.pacing_title")}
              </summary>
              <AdminInlineNote tone="warning" className="mt-3">
                {t("admin.wechat_mp.collect.pacing_note")}
              </AdminInlineNote>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="grid grid-cols-2 gap-2">
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.query_delay_min")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={form.queryDelayMin}
                      onChange={(event) => updateForm("queryDelayMin", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="95"
                    />
                  </label>
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.query_delay_max")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={form.queryDelayMax}
                      onChange={(event) => updateForm("queryDelayMax", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="125"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.page_pause_min")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      step="0.5"
                      value={form.pagePauseMin}
                      onChange={(event) => updateForm("pagePauseMin", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="10"
                    />
                  </label>
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.page_pause_max")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      step="0.5"
                      value={form.pagePauseMax}
                      onChange={(event) => updateForm("pagePauseMax", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="25"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.content_delay_min")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={form.contentDelayMin}
                      onChange={(event) => updateForm("contentDelayMin", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="10"
                    />
                  </label>
                  <label className={clsx("block text-xs font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.fields.content_delay_max")}
                    <input
                      type="number"
                      min="0"
                      max="3600"
                      value={form.contentDelayMax}
                      onChange={(event) => updateForm("contentDelayMax", event.target.value)}
                      className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                      placeholder="20"
                    />
                  </label>
                </div>
              </div>
            </details>
          </AdminPanel>
        </div>

        <AdminPanel
          title={t("admin.wechat_mp.ingest.title")}
          description={t("admin.wechat_mp.ingest.description")}
          action={(
            <ToolbarGroup className="justify-start sm:justify-end">
              <AdminButton tone="subtle" onClick={() => loadIngestOverview()} disabled={ingestLoading}>
                <RefreshCw size={16} className={ingestLoading ? "animate-spin" : ""} />
                {t("admin.wechat_mp.actions.refresh_ingest")}
              </AdminButton>
              <AdminButton tone="primary" onClick={runIngestNow} disabled={ingestRunning || !credentialsReady}>
                {ingestRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                {t("admin.wechat_mp.actions.run_ingest")}
              </AdminButton>
            </ToolbarGroup>
          )}
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdminMetricCard
              label={t("admin.wechat_mp.ingest.metrics.schedule")}
              value={ingestSettings.enabled ? ingestSettings.daily_run_time : t("admin.wechat_mp.status.disabled")}
              icon={CalendarClock}
              tone={ingestSettings.enabled ? "emerald" : "amber"}
            />
            <AdminMetricCard
              label={t("admin.wechat_mp.ingest.metrics.accounts")}
              value={formatNumber(ingestAccounts.length)}
              icon={ClipboardList}
              tone="indigo"
            />
            <AdminMetricCard
              label={t("admin.wechat_mp.ingest.metrics.latest_run")}
              value={latestRun ? t(`admin.wechat_mp.ingest.run_status.${latestRun.status}`, latestRun.status) : t("admin.wechat_mp.status.none")}
              icon={Clock3}
              tone={latestRun?.status === "completed" ? "emerald" : latestRun?.status === "failed" ? "rose" : "violet"}
            />
            <AdminMetricCard
              label={t("admin.wechat_mp.ingest.metrics.new_articles")}
              value={formatNumber(latestRun?.new_articles || ingestArticles.length)}
              icon={Newspaper}
              tone="violet"
            />
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.ingest.fields.enabled")}
                  <select
                    value={ingestSettings.enabled ? "1" : "0"}
                    onChange={(event) => updateIngestSetting("enabled", event.target.value === "1")}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  >
                    <option value="1">{t("admin.wechat_mp.status.enabled")}</option>
                    <option value="0">{t("admin.wechat_mp.status.disabled")}</option>
                  </select>
                </label>
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.ingest.fields.daily_run_time")}
                  <input
                    type="time"
                    value={ingestSettings.daily_run_time}
                    onChange={(event) => updateIngestSetting("daily_run_time", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.ingest.fields.timezone")}
                  <input
                    value={ingestSettings.timezone}
                    onChange={(event) => updateIngestSetting("timezone", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <AdminInlineNote tone="warning">
                {t("admin.wechat_mp.ingest.pacing_note")}
              </AdminInlineNote>

              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <div className={clsx("text-sm font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.ingest.fields.query_delay")}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.query_delay_min")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.query_delay_range?.[0] ?? 95}
                        onChange={(event) => updateIngestDelay("query_delay_range", 0, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.query_delay_max")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.query_delay_range?.[1] ?? 125}
                        onChange={(event) => updateIngestDelay("query_delay_range", 1, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <div className={clsx("text-sm font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.ingest.fields.page_pause")}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.page_pause_min")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.page_pause_range?.[0] ?? 10}
                        onChange={(event) => updateIngestDelay("page_pause_range", 0, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.page_pause_max")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.page_pause_range?.[1] ?? 25}
                        onChange={(event) => updateIngestDelay("page_pause_range", 1, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <div className={clsx("text-sm font-semibold", headingTextClass)}>
                    {t("admin.wechat_mp.ingest.fields.content_delay")}
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.content_delay_min")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.content_delay_range?.[0] ?? 10}
                        onChange={(event) => updateIngestDelay("content_delay_range", 0, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                    <label className={clsx("block text-xs font-semibold", mutedTextClass)}>
                      {t("admin.wechat_mp.fields.content_delay_max")}
                      <input
                        type="number"
                        min="0"
                        value={ingestSettings.content_delay_range?.[1] ?? 20}
                        onChange={(event) => updateIngestDelay("content_delay_range", 1, event.target.value)}
                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.fields.count")}
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={ingestSettings.count_per_page}
                    onChange={(event) => updateIngestSetting("count_per_page", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className={clsx("block text-sm font-semibold", headingTextClass)}>
                  {t("admin.wechat_mp.fields.max_pages")}
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={ingestSettings.max_pages}
                    onChange={(event) => updateIngestSetting("max_pages", event.target.value)}
                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                  />
                </label>
                <label className={clsx("mt-7 inline-flex items-center gap-2 text-sm", subtleTextClass)}>
                  <input
                    type="checkbox"
                    checked={Boolean(ingestSettings.fetch_content)}
                    onChange={(event) => updateIngestSetting("fetch_content", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  {t("admin.wechat_mp.ingest.fields.fetch_content")}
                </label>
              </div>

              <div className="flex justify-end">
                <AdminButton tone="primary" onClick={saveIngestSettings} disabled={ingestSaving}>
                  {ingestSaving ? <Loader2 size={16} className="animate-spin" /> : <Settings2 size={16} />}
                  {t("admin.wechat_mp.actions.save_ingest")}
                </AdminButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={ingestAccountForm.name}
                  onChange={(event) => updateIngestAccountForm("name", event.target.value)}
                  className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm"
                  placeholder={t("admin.wechat_mp.ingest.placeholders.account_name")}
                />
                <input
                  value={ingestAccountForm.fakeid}
                  onChange={(event) => updateIngestAccountForm("fakeid", event.target.value)}
                  className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm"
                  placeholder={t("admin.wechat_mp.placeholders.fakeid")}
                />
                <input
                  value={ingestAccountForm.keywords}
                  onChange={(event) => updateIngestAccountForm("keywords", event.target.value)}
                  className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm sm:col-span-2"
                  placeholder={t("admin.wechat_mp.ingest.placeholders.keywords")}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className={clsx("inline-flex items-center gap-2 text-sm", subtleTextClass)}>
                  <input
                    type="checkbox"
                    checked={Boolean(ingestAccountForm.enabled)}
                    onChange={(event) => updateIngestAccountForm("enabled", event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                  />
                  {t("admin.wechat_mp.ingest.fields.account_enabled")}
                </label>
                <AdminButton tone="subtle" onClick={saveIngestAccount} disabled={ingestSaving}>
                  {ingestSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {t("admin.wechat_mp.actions.add_account")}
                </AdminButton>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="file"
                  accept=".json,.csv,.tsv,.txt"
                  onChange={(event) => setIngestFile(event.target.files?.[0] || null)}
                  className="theme-admin-input rect-field min-h-[40px] min-w-0 flex-1 px-3 py-2 text-sm"
                />
                <AdminButton tone="subtle" onClick={importIngestAccounts} disabled={ingestImporting}>
                  {ingestImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {t("admin.wechat_mp.actions.import_accounts")}
                </AdminButton>
              </div>

              <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                {ingestAccounts.length > 0 ? ingestAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={clsx(
                      "flex items-start justify-between gap-3 rounded-[8px] border p-3",
                      isDayMode ? "border-slate-200/70 bg-white/[0.72]" : "border-white/10 bg-white/[0.04]",
                    )}
                  >
                    <div className="min-w-0">
                      <div className={clsx("truncate text-sm font-bold", headingTextClass)}>
                        {account.name || account.fakeid}
                      </div>
                      <div className={clsx("mt-1 truncate text-xs", mutedTextClass)}>
                        {account.fakeid || t("admin.wechat_mp.status.none")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteIngestAccount(account)}
                      className={clsx(
                        "rounded-[8px] border p-2 transition-colors",
                        isDayMode ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-rose-400/20 text-rose-300 hover:bg-rose-500/10",
                      )}
                      aria-label={t("admin.wechat_mp.actions.delete_account")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )) : (
                  <AdminEmptyState
                    icon={ClipboardList}
                    title={t("admin.wechat_mp.ingest.empty_accounts_title")}
                    description={t("admin.wechat_mp.ingest.empty_accounts_desc")}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className={clsx("rounded-[8px] border p-3", isDayMode ? "border-slate-200/70" : "border-white/10")}>
              <div className={clsx("mb-2 text-sm font-bold", headingTextClass)}>
                {t("admin.wechat_mp.ingest.runs_title")}
              </div>
              <div className="space-y-2">
                {ingestRuns.length > 0 ? ingestRuns.slice(0, 4).map((run) => (
                  <div key={run.id} className={clsx("flex items-center justify-between gap-3 text-sm", mutedTextClass)}>
                    <span>{formatDateTime(run.started_at, i18n.resolvedLanguage)}</span>
                    <span>{t(`admin.wechat_mp.ingest.run_status.${run.status}`, run.status)}</span>
                    <span>{formatNumber(run.new_articles || 0)}</span>
                  </div>
                )) : (
                  <div className={clsx("text-sm", mutedTextClass)}>{t("admin.wechat_mp.ingest.empty_runs")}</div>
                )}
              </div>
            </div>
            <div className={clsx("rounded-[8px] border p-3", isDayMode ? "border-slate-200/70" : "border-white/10")}>
              <div className={clsx("mb-2 text-sm font-bold", headingTextClass)}>
                {t("admin.wechat_mp.ingest.articles_title")}
              </div>
              <div className="space-y-2">
                {ingestArticles.length > 0 ? ingestArticles.slice(0, 4).map((article) => (
                  <div key={article.id || article.link} className="min-w-0">
                    <div className={clsx("truncate text-sm font-semibold", headingTextClass)}>
                      {article.title || t("admin.wechat_mp.articles.untitled")}
                    </div>
                    <div className={clsx("mt-1 truncate text-xs", mutedTextClass)}>
                      {article.account_name || article.fakeid || t("admin.wechat_mp.status.none")}
                    </div>
                  </div>
                )) : (
                  <div className={clsx("text-sm", mutedTextClass)}>{t("admin.wechat_mp.ingest.empty_articles")}</div>
                )}
              </div>
            </div>
          </div>
        </AdminPanel>

        <div className="grid gap-3 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
          <AdminPanel
            title={t("admin.wechat_mp.articles.title")}
            description={t("admin.wechat_mp.articles.description")}
          >
            {articles.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <AdminMetricCard
                    label={t("admin.wechat_mp.metrics.fetched_articles")}
                    value={formatNumber(articles.length)}
                    icon={ClipboardList}
                    tone="indigo"
                  />
                  <AdminMetricCard
                    label={t("admin.wechat_mp.metrics.remote_total")}
                    value={formatNumber(articlesResult?.total || articles.length)}
                    icon={Newspaper}
                    tone="violet"
                  />
                </div>
                <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                  {articles.map((article) => {
                    const active = selectedArticle?.link === article.link;
                    return (
                      <button
                        key={article.link || article.title}
                        type="button"
                        onClick={() => selectArticle(article)}
                        className={clsx(
                          "w-full rounded-[8px] border p-3 text-left transition-colors",
                          active
                            ? isDayMode
                              ? "border-indigo-300 bg-indigo-50 text-slate-950"
                              : "border-indigo-400/40 bg-indigo-500/10 text-white"
                            : isDayMode
                              ? "border-slate-200/70 bg-white/[0.74] text-slate-700 hover:border-indigo-200"
                              : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/20",
                        )}
                      >
                        <div className="line-clamp-2 text-sm font-bold">{article.title || t("admin.wechat_mp.articles.untitled")}</div>
                        <div className={clsx("mt-1 line-clamp-2 text-xs leading-5", mutedTextClass)}>
                          {article.summary || t("admin.wechat_mp.articles.no_summary")}
                        </div>
                        <div className={clsx("mt-2 flex flex-wrap gap-2 text-xs", mutedTextClass)}>
                          <span>{article.account || articlesResult?.account?.nickname || t("admin.wechat_mp.status.none")}</span>
                          <span>{article.time_text || t("admin.wechat_mp.status.none")}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : articlesLoading ? (
              <div className={clsx("py-10 text-center text-sm", mutedTextClass)}>
                <Loader2 size={28} className="mx-auto mb-3 animate-spin" />
                {t("admin.wechat_mp.articles.loading")}
              </div>
            ) : (
              <AdminEmptyState
                icon={Newspaper}
                title={t("admin.wechat_mp.articles.empty_title")}
                description={t("admin.wechat_mp.articles.empty_desc")}
              />
            )}
          </AdminPanel>

          <AdminPanel
            title={t("admin.wechat_mp.preview.title")}
            description={selectedArticle?.title || t("admin.wechat_mp.preview.description")}
            action={selectedArticle ? (
              <ToolbarGroup className="justify-start sm:justify-end">
                <AdminButton tone="subtle" onClick={fetchContent} disabled={contentLoading}>
                  {contentLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {t("admin.wechat_mp.actions.fetch_content")}
                </AdminButton>
                <AdminButton
                  tone="subtle"
                  onClick={() => importContent("article")}
                  disabled={Boolean(importingResource) || !content?.contentText}
                >
                  {importingResource === "article" ? <Loader2 size={16} className="animate-spin" /> : <Newspaper size={16} />}
                  {t("admin.wechat_mp.actions.import_article", fallbackText("导入为文章", "Import Article"))}
                </AdminButton>
                <AdminButton
                  tone="primary"
                  onClick={() => importContent("event")}
                  disabled={Boolean(importingResource) || !content?.contentText}
                >
                  {importingResource === "event" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {t("admin.wechat_mp.actions.import_event", fallbackText("导入为活动", "Import Event"))}
                </AdminButton>
              </ToolbarGroup>
            ) : null}
          >
            {selectedArticle ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                  {previewCoverSrc ? (
                    <img
                      src={previewCoverSrc}
                      alt=""
                      className={clsx(
                        "h-36 w-full rounded-[8px] object-contain lg:w-56",
                        isDayMode ? "bg-slate-100" : "bg-white/[0.04]",
                      )}
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className={clsx("text-base font-bold", headingTextClass)}>
                      {content?.title || selectedArticle.title || t("admin.wechat_mp.articles.untitled")}
                    </div>
                    <div className={clsx("mt-2 grid gap-1 text-xs", mutedTextClass)}>
                      <span>{content?.author || selectedArticle.author || selectedArticle.account || t("admin.wechat_mp.status.none")}</span>
                      <span>{selectedArticle.time_text || t("admin.wechat_mp.status.none")}</span>
                      {selectedUrl ? (
                        <a
                          href={selectedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-500 hover:underline"
                        >
                          {t("admin.wechat_mp.preview.open_original")}
                          <ExternalLink size={13} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <AdminMetricCard
                    label={t("admin.wechat_mp.metrics.content_status")}
                    value={content?.content_status ? t(`admin.wechat_mp.content_status.${content.content_status}`, content.content_status) : t("admin.wechat_mp.content_status.not_fetched")}
                    icon={FileText}
                    tone={content?.contentText ? "emerald" : "amber"}
                  />
                  <AdminMetricCard
                    label={t("admin.wechat_mp.metrics.content_length")}
                    value={formatNumber(contentTextLength)}
                    icon={ClipboardList}
                    tone="indigo"
                  />
                  <AdminMetricCard
                    label={t("admin.wechat_mp.metrics.images")}
                    value={formatNumber(content?.images?.length || 0)}
                    icon={Newspaper}
                    tone="violet"
                  />
                </div>

                {contentLoading ? (
                  <div className={clsx("py-12 text-center text-sm", mutedTextClass)}>
                    <Loader2 size={28} className="mx-auto mb-3 animate-spin" />
                    {t("admin.wechat_mp.preview.loading_content")}
                  </div>
                ) : content?.contentText ? (
                  <div
                    className={clsx(
                      "max-h-[520px] overflow-y-auto rounded-[8px] border p-4",
                      isDayMode ? "border-slate-200/70 bg-white" : "border-white/10 bg-white/[0.03]",
                    )}
                  >
                    {sanitizedContentHtml ? (
                      <div
                        className={clsx(
                          "prose prose-sm max-w-none",
                          isDayMode ? "prose-slate" : "prose-invert",
                        )}
                        dangerouslySetInnerHTML={{ __html: sanitizedContentHtml }}
                      />
                    ) : (
                      <div className={clsx("space-y-3 text-sm leading-7", subtleTextClass)}>
                        {paragraphs.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <AdminInlineNote tone="warning">
                    {t("admin.wechat_mp.preview.need_fetch_content")}
                  </AdminInlineNote>
                )}

              </div>
            ) : (
              <AdminEmptyState
                icon={FileText}
                title={t("admin.wechat_mp.preview.empty_title")}
                description={t("admin.wechat_mp.preview.empty_desc")}
              />
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminPageShell>
  );
};

export default WeChatMpImportManager;
