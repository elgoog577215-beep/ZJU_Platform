import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import DOMPurify from "dompurify";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  KeyRound,
  Loader2,
  LogIn,
  Newspaper,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Wand2,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import api from "../../services/api";
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
};

const getApiErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const textParagraphs = (value) =>
  String(value || "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 24);

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
  const { t } = useTranslation();
  const { isDayMode, headingTextClass, mutedTextClass, subtleTextClass } = useAdminTheme();
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
  const [parsedResult, setParsedResult] = useState(null);
  const [parsing, setParsing] = useState(false);

  const login = status?.login || initialStatus.login;
  const runtimeReady = Boolean(status?.runtime?.chromium_installed);
  const credentialsReady = Boolean(status?.credentials?.present);
  const loginActive = Boolean(login.active || LOGIN_ACTIVE_STAGES.has(login.stage));
  const articles = articlesResult?.articles || [];
  const selectedUrl = selectedArticle?.link || "";
  const contentTextLength = content?.contentText?.length || 0;

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
        toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.status_failed")));
      }
    } finally {
      if (!silent) setStatusLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

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
        toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.login_failed")));
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
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.cancel_failed")));
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
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.account_search_failed")));
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
    setParsedResult(null);
    try {
      const response = await api.post("/admin/wechat-mp/articles", {
        account_name: form.accountName.trim(),
        fakeid: form.fakeid.trim(),
        keyword: form.keyword.trim(),
        count: Number(form.count) || 20,
        max_pages: Number(form.maxPages) || 1,
        allow_first: form.allowFirst,
      });
      setArticlesResult(response.data);
      const firstArticle = response.data?.articles?.[0] || null;
      if (firstArticle) setSelectedArticle(firstArticle);
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.articles_failed")));
    } finally {
      setArticlesLoading(false);
    }
  };

  const selectArticle = (article) => {
    setSelectedArticle(article);
    setContent(null);
    setParsedResult(null);
  };

  const fetchContent = async () => {
    if (!selectedUrl) {
      toast.error(t("admin.wechat_mp.toasts.article_required"));
      return;
    }
    setContentLoading(true);
    setContent(null);
    setParsedResult(null);
    try {
      const response = await api.post("/admin/wechat-mp/article-content", {
        url: selectedUrl,
      });
      setContent(response.data);
      toast.success(t("admin.wechat_mp.toasts.content_ready"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.content_failed")));
    } finally {
      setContentLoading(false);
    }
  };

  const parseContent = async () => {
    if (!content?.contentText) {
      toast.error(t("admin.wechat_mp.toasts.content_required"));
      return;
    }
    setParsing(true);
    try {
      const response = await api.post("/admin/wechat-mp/parse", {
        article: selectedArticle,
        content,
      }, { retryWrites: true });
      setParsedResult(response.data);
      toast.success(t("admin.wechat_mp.toasts.parse_ready"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("admin.wechat_mp.toasts.parse_failed")));
    } finally {
      setParsing(false);
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
          </AdminPanel>
        </div>

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
                <AdminButton tone="primary" onClick={parseContent} disabled={parsing || !content?.contentText}>
                  {parsing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {t("admin.wechat_mp.actions.parse_content")}
                </AdminButton>
              </ToolbarGroup>
            ) : null}
          >
            {selectedArticle ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row">
                  {selectedArticle.cover || content?.coverImage ? (
                    <img
                      src={content?.coverImage || selectedArticle.cover}
                      alt=""
                      className="h-36 w-full rounded-[8px] object-cover lg:w-48"
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

                {parsedResult?.parsed ? (
                  <div
                    className={clsx(
                      "rounded-[8px] border p-4",
                      isDayMode ? "border-emerald-500/20 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/10",
                    )}
                  >
                    <div className={clsx("mb-3 text-sm font-bold", headingTextClass)}>
                      {t("admin.wechat_mp.parse.title")}
                    </div>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      {[
                        ["title", parsedResult.parsed.title],
                        ["category", parsedResult.parsed.category],
                        ["date", parsedResult.parsed.date],
                        ["location", parsedResult.parsed.location],
                        ["organizer", parsedResult.parsed.organizer],
                        ["notice_type", parsedResult.parsed.notice_type],
                      ].map(([key, value]) => (
                        <div key={key} className="min-w-0">
                          <div className={clsx("text-xs font-semibold", mutedTextClass)}>
                            {t(`admin.wechat_mp.parse.fields.${key}`)}
                          </div>
                          <div className={clsx("mt-1 truncate font-semibold", headingTextClass)}>
                            {value || t("admin.wechat_mp.status.none")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
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
