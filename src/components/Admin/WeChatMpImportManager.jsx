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
import { formatServerDateTime as formatDateTime } from "../../utils/serverDate";
import WeChatReadRssManager from "./WeChatReadRssManager";
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
const LOGIN_ACTIVE_STAGES = new Set(["starting", "opening", "waiting_for_scan", "qr_ready"]);

const initialStatus = {
    credentials: {
        present: false,
        cookie_names: [],
        token_mask: "",
        health: { status: "missing", reason: "" },
    },
    login: { active: false, stage: "idle", message: "", qr_data_url: "" },
    runtime: { required: true, dependency: "playwright", chromium_installed: false },
};

const initialForm = {
    sourceType: "wechat_mp",
    rssFeedId: "",
    accountName: "",
    fakeid: "",
    keyword: "",
    count: 20,
    maxPages: 1,
    allowFirst: false,
    queryDelayMin: "",
    queryDelayMax: "",
    pagePauseMin: "",
    pagePauseMax: "",
    contentDelayMin: "",
    contentDelayMax: "",
};

const initialIngestSettings = {
    enabled: false,
    token_health_enabled: true,
    token_health_interval_hours: 12,
    daily_run_time: "03:30",
    timezone: "Asia/Shanghai",
    query_delay_range: [95, 125],
    page_pause_range: [10, 25],
    page_pause_seconds: 10,
    content_delay_range: [10, 20],
    count_per_page: 20,
    max_pages: 1,
    fetch_content: true,
    auto_parse: true,
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
    source_type: "wewe_rss",
    rss_feed_id: "",
    alias: "",
    keywords: "",
    enabled: true,
    fetch_content: true,
    count_per_page: 20,
    max_pages: 1,
};

const getApiErrorMessage = (error, fallback, language) => {
    if (
        !String(language || "")
            .toLowerCase()
            .startsWith("zh")
    )
        return fallback;
    return (
        error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback
    );
};

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const splitKeywords = (value) =>
    String(value || "")
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

const loginStatusKey = (loginStage, credentialsReady, healthStatus) => {
    if (healthStatus === "expired") return "expired";
    if (healthStatus === "checking") return "checking";
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
    const isChinese = String(i18n.resolvedLanguage || i18n.language || "")
        .toLowerCase()
        .startsWith("zh");
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
    const [extractingIngestArticleId, setExtractingIngestArticleId] = useState(null);
    const [ingestImporting, setIngestImporting] = useState(false);
    const [ingestFile, setIngestFile] = useState(null);
    const [ingestAccountForm, setIngestAccountForm] = useState(initialIngestAccountForm);
    const [updatingIngestAccountIds, setUpdatingIngestAccountIds] = useState([]);
    const [activeWorkspace, setActiveWorkspace] = useState("overview");

    const login = status?.login || initialStatus.login;
    const runtimeReady = Boolean(status?.runtime?.chromium_installed);
    const credentialsReady = Boolean(status?.credentials?.present);
    const credentialHealth = status?.credentials?.health || initialStatus.credentials.health;
    const credentialHealthStatus =
        credentialHealth.status || (credentialsReady ? "checking" : "missing");
    const loginActive = Boolean(login.active || LOGIN_ACTIVE_STAGES.has(login.stage));
    const articles = articlesResult?.articles || [];
    const selectedUrl = selectedArticle?.link || "";
    const previewCoverSrc = content?.coverImage || selectedArticle?.cover || "";
    const contentTextLength = content?.contentText?.length || 0;
    const ingestSettings = { ...initialIngestSettings, ...(ingestOverview.settings || {}) };
    const ingestAccounts = ingestOverview.accounts || [];
    const directIngestAccounts = useMemo(
        () => ingestAccounts.filter((account) => account.source_type !== "wewe_rss"),
        [ingestAccounts]
    );
    const rssIngestAccounts = useMemo(
        () => ingestAccounts.filter((account) => account.source_type === "wewe_rss"),
        [ingestAccounts]
    );
    const rssTestSources = rssIngestAccounts;
    const enabledIngestAccountCount = ingestAccounts.filter((account) => account.enabled).length;
    const hasEnabledRssSource = ingestAccounts.some(
        (account) => account.enabled && account.source_type === "wewe_rss"
    );
    const ingestReady = credentialsReady || hasEnabledRssSource;
    const singleTestIsRss = form.sourceType === "wewe_rss";
    const singleTestReady = singleTestIsRss ? Boolean(form.rssFeedId.trim()) : credentialsReady;
    const ingestRuns = ingestOverview.runs || [];
    const ingestArticles = ingestOverview.articles || [];
    const latestRun = ingestRuns[0] || null;
    const latestRunProgress = Math.min(100, Math.max(0, Number(latestRun?.progress_percent) || 0));
    const contentHtml = content?.contentHtml || "";
    const imageOnlyContent = content?.content_status === "image_only";

    const sanitizedContentHtml = useMemo(() => {
        if (!contentHtml) return "";
        return DOMPurify.sanitize(contentHtml, {
            USE_PROFILES: { html: true },
            FORBID_TAGS: ["script", "style", "iframe"],
        });
    }, [contentHtml]);

    const loadStatus = useCallback(
        async ({ silent = false } = {}) => {
            if (!silent) setStatusLoading(true);
            try {
                const response = await api.get("/admin/wechat-mp/status", { noRetry: true });
                setStatus({ ...initialStatus, ...response.data });
            } catch (error) {
                if (!silent) {
                    toast.error(
                        getApiErrorMessage(
                            error,
                            t("admin.wechat_mp.toasts.status_failed"),
                            i18n.resolvedLanguage
                        )
                    );
                }
            } finally {
                if (!silent) setStatusLoading(false);
            }
        },
        [i18n.resolvedLanguage, t]
    );

    const loadIngestOverview = useCallback(
        async ({ silent = false } = {}) => {
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
                    toast.error(
                        getApiErrorMessage(
                            error,
                            t("admin.wechat_mp.toasts.ingest_load_failed"),
                            i18n.resolvedLanguage
                        )
                    );
                }
            } finally {
                if (!silent) setIngestLoading(false);
            }
        },
        [i18n.resolvedLanguage, t]
    );

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

    useEffect(() => {
        const timer = window.setInterval(() => {
            loadStatus({ silent: true });
        }, 60 * 1000);
        return () => window.clearInterval(timer);
    }, [loadStatus]);

    useEffect(() => {
        const timer = window.setInterval(
            () => {
                loadIngestOverview({ silent: true });
            },
            latestRun?.status === "running" ? 2000 : 60 * 1000
        );
        return () => window.clearInterval(timer);
    }, [latestRun?.status, loadIngestOverview]);

    useEffect(() => {
        if (form.sourceType !== "wewe_rss" || !rssTestSources.length) return;
        const selectedFeedExists = rssTestSources.some(
            (source) => source.rss_feed_id === form.rssFeedId
        );
        if (selectedFeedExists) return;
        setForm((previous) => ({
            ...previous,
            rssFeedId: rssTestSources[0].rss_feed_id,
        }));
    }, [form.rssFeedId, form.sourceType, rssTestSources]);

    const updateForm = (key, value) => {
        setForm((previous) => ({ ...previous, [key]: value }));
    };

    const selectSingleTestSource = (sourceType) => {
        updateForm("sourceType", sourceType);
        setArticlesResult(null);
        setSelectedArticle(null);
        setContent(null);
    };

    const startLogin = async () => {
        setLoginStarting(true);
        try {
            const response = await api.post(
                "/admin/wechat-mp/login/start",
                {
                    wait_seconds: LOGIN_WAIT_SECONDS,
                },
                { noRetry: true }
            );
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
                toast.error(
                    getApiErrorMessage(
                        error,
                        t("admin.wechat_mp.toasts.login_failed"),
                        i18n.resolvedLanguage
                    )
                );
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
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.cancel_failed"),
                    i18n.resolvedLanguage
                )
            );
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
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.account_search_failed"),
                    i18n.resolvedLanguage
                )
            );
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
        const isRssSource = form.sourceType === "wewe_rss";
        if (isRssSource) {
            if (!form.rssFeedId.trim()) {
                toast.error(t("admin.wechat_mp.toasts.rss_feed_required"));
                return;
            }
        } else {
            if (!credentialsReady) {
                toast.error(t("admin.wechat_mp.toasts.login_required"));
                return;
            }
            if (!form.accountName.trim() && !form.fakeid.trim()) {
                toast.error(t("admin.wechat_mp.toasts.account_required"));
                return;
            }
        }
        setArticlesLoading(true);
        setArticlesResult(null);
        setSelectedArticle(null);
        setContent(null);
        try {
            const payload = isRssSource
                ? {
                      source_type: "wewe_rss",
                      rss_feed_id: form.rssFeedId.trim(),
                      count: Number(form.count) || 20,
                      max_pages: Number(form.maxPages) || 1,
                  }
                : {
                      account_name: form.accountName.trim(),
                      fakeid: form.fakeid.trim(),
                      keyword: form.keyword.trim(),
                      count: Number(form.count) || 20,
                      max_pages: Number(form.maxPages) || 1,
                      allow_first: form.allowFirst,
                      ...pacingPayload(),
                  };
            const response = await api.post("/admin/wechat-mp/articles", payload);
            setArticlesResult(response.data);
            const firstArticle = response.data?.articles?.[0] || null;
            if (firstArticle) setSelectedArticle(firstArticle);
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.articles_failed"),
                    i18n.resolvedLanguage
                )
            );
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
                ...(form.sourceType === "wewe_rss"
                    ? {
                          source_type: "wewe_rss",
                          feed_id: selectedArticle?.feed_id || form.rssFeedId.trim(),
                          count: Number(form.count) || 100,
                          max_pages: Number(form.maxPages) || 20,
                      }
                    : {}),
                url: selectedUrl,
                article: selectedArticle,
            });
            setContent(response.data);
            toast.success(t("admin.wechat_mp.toasts.content_ready"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.content_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setContentLoading(false);
        }
    };

    const importContent = async (resourceType) => {
        if (!content?.contentText) {
            toast.error(t("admin.wechat_mp.toasts.content_required"));
            return;
        }
        if (imageOnlyContent) {
            toast.error(t("admin.wechat_mp.toasts.image_only_content"));
            return;
        }
        setImportingResource(resourceType);
        try {
            const payloadResponse = await api.post(
                "/admin/wechat-mp/import-payload",
                {
                    resource_type: resourceType,
                    article: selectedArticle,
                    content,
                },
                { retryWrites: true }
            );

            const endpoint = payloadResponse.data?.endpoint;
            const payload = payloadResponse.data?.payload;
            if (!endpoint || !payload?.title) {
                throw new Error(
                    t(
                        "admin.wechat_mp.toasts.import_failed",
                        fallbackText("导入内容失败", "Failed to import content")
                    )
                );
            }

            const createResponse = await api.post(endpoint, payload, { retryWrites: true });
            const successFallback =
                resourceType === "event"
                    ? fallbackText(
                          "活动已导入，AI 解析出的时间、地点和活动属性已写入",
                          "Event imported with AI-analyzed time, location, and category."
                      )
                    : fallbackText(
                          "文章已导入，可在文章管理中继续编辑",
                          "Article imported. You can continue editing it in article management."
                      );
            toast.success(
                t(`admin.wechat_mp.toasts.import_${resourceType}_ready`, successFallback, {
                    id: createResponse.data?.id || "",
                })
            );
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t(
                        "admin.wechat_mp.toasts.import_failed",
                        fallbackText("导入内容失败", "Failed to import content")
                    ),
                    i18n.resolvedLanguage
                )
            );
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
                token_health_interval_hours:
                    Number(ingestSettings.token_health_interval_hours) || 12,
            };
            const response = await api.put("/admin/wechat-mp/ingest/settings", payload);
            setIngestOverview((previous) => ({
                ...previous,
                settings: { ...initialIngestSettings, ...(response.data?.settings || {}) },
            }));
            toast.success(t("admin.wechat_mp.toasts.ingest_settings_saved"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_settings_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setIngestSaving(false);
        }
    };

    const saveIngestAccount = async () => {
        if (ingestAccountForm.source_type === "wewe_rss" && !ingestAccountForm.rss_feed_id.trim()) {
            toast.error(t("admin.wechat_mp.toasts.rss_feed_required"));
            return;
        }
        if (
            ingestAccountForm.source_type !== "wewe_rss" &&
            !ingestAccountForm.name.trim() &&
            !ingestAccountForm.fakeid.trim()
        ) {
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
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_account_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setIngestSaving(false);
        }
    };

    const deleteIngestAccount = async (account) => {
        const confirmed = window.confirm(
            t("admin.wechat_mp.ingest.confirm_delete_account", {
                name: account.name || account.fakeid,
            })
        );
        if (!confirmed) return;
        try {
            await api.delete(`/admin/wechat-mp/ingest/accounts/${account.id}`);
            await loadIngestOverview({ silent: true });
            toast.success(t("admin.wechat_mp.toasts.ingest_account_deleted"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_account_delete_failed"),
                    i18n.resolvedLanguage
                )
            );
        }
    };

    const updateIngestAccountState = (updatedAccounts) => {
        const updatesById = new Map(
            updatedAccounts.filter(Boolean).map((account) => [account.id, account])
        );
        setIngestOverview((previous) => ({
            ...previous,
            accounts: (previous.accounts || []).map((item) => updatesById.get(item.id) || item),
        }));
    };

    const isIngestAccountUpdating = (accountId) => updatingIngestAccountIds.includes(accountId);

    const toggleIngestAccount = async (account, nextEnabled = !account.enabled) => {
        if (isIngestAccountUpdating(account.id)) return;
        setUpdatingIngestAccountIds((previous) => [...previous, account.id]);
        try {
            const response = await api.patch(
                `/admin/wechat-mp/ingest/accounts/${account.id}/enabled`,
                { enabled: nextEnabled }
            );
            const updatedAccount = response.data?.account || { ...account, enabled: nextEnabled };
            updateIngestAccountState([updatedAccount]);
            toast.success(t("admin.wechat_mp.toasts.ingest_account_updated"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_account_update_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setUpdatingIngestAccountIds((previous) =>
                previous.filter((accountId) => accountId !== account.id)
            );
        }
    };

    const toggleIngestAccountGroup = async (sourceAccounts) => {
        if (
            !sourceAccounts.length ||
            sourceAccounts.some((account) => isIngestAccountUpdating(account.id))
        ) {
            return;
        }
        const nextEnabled = !sourceAccounts.every((account) => account.enabled);
        const accountsToUpdate = sourceAccounts.filter(
            (account) => Boolean(account.enabled) !== nextEnabled
        );
        if (!accountsToUpdate.length) return;

        const accountIds = accountsToUpdate.map((account) => account.id);
        setUpdatingIngestAccountIds((previous) => [...new Set([...previous, ...accountIds])]);
        const results = await Promise.allSettled(
            accountsToUpdate.map(async (account) => {
                const response = await api.patch(
                    `/admin/wechat-mp/ingest/accounts/${account.id}/enabled`,
                    { enabled: nextEnabled }
                );
                return response.data?.account || { ...account, enabled: nextEnabled };
            })
        );
        const updatedAccounts = results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value);
        updateIngestAccountState(updatedAccounts);
        setUpdatingIngestAccountIds((previous) =>
            previous.filter((accountId) => !accountIds.includes(accountId))
        );

        const failedCount = results.filter((result) => result.status === "rejected").length;
        if (failedCount) {
            toast.error(
                t("admin.wechat_mp.toasts.ingest_account_group_update_failed", {
                    count: failedCount,
                })
            );
        } else {
            toast.success(
                t("admin.wechat_mp.toasts.ingest_account_group_updated", {
                    count: updatedAccounts.length,
                })
            );
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
            toast.success(
                t("admin.wechat_mp.toasts.ingest_imported", {
                    count: response.data?.imported_count || 0,
                })
            );
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_import_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setIngestImporting(false);
        }
    };

    const runIngestNow = async () => {
        if (!ingestReady) {
            toast.error(t("admin.wechat_mp.toasts.source_required"));
            return;
        }
        setIngestRunning(true);
        try {
            await api.post("/admin/wechat-mp/ingest/run", {}, { noRetry: true });
            await loadIngestOverview({ silent: true });
            toast.success(t("admin.wechat_mp.toasts.ingest_started"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_start_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setIngestRunning(false);
        }
    };

    const retryIngestArticleExtraction = async (article) => {
        if (!article?.id) return;
        setExtractingIngestArticleId(article.id);
        try {
            await api.post(
                `/admin/wechat-mp/ingest/articles/${article.id}/parse`,
                {},
                { noRetry: true }
            );
            await loadIngestOverview({ silent: true });
            toast.success(t("admin.wechat_mp.toasts.ingest_extraction_completed"));
        } catch (error) {
            toast.error(
                getApiErrorMessage(
                    error,
                    t("admin.wechat_mp.toasts.ingest_extraction_failed"),
                    i18n.resolvedLanguage
                )
            );
        } finally {
            setExtractingIngestArticleId(null);
        }
    };

    const renderIngestSourceList = ({
        sourceAccounts,
        titleKey,
        titleFallback,
        descriptionKey,
        descriptionFallback,
        emptyTitleKey,
        emptyTitleFallback,
        emptyDescriptionKey,
        emptyDescriptionFallback,
        emptyIcon,
        idPrefix,
    }) => {
        const allEnabled =
            sourceAccounts.length > 0 && sourceAccounts.every((account) => account.enabled);
        const hasUpdatingAccount = sourceAccounts.some((account) =>
            isIngestAccountUpdating(account.id)
        );

        return (
            <section
                className={clsx(
                    "rounded-[8px] border p-3",
                    isDayMode ? "border-slate-200/70 bg-white/[0.5]" : "border-white/10"
                )}
                aria-label={t(titleKey, titleFallback)}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className={clsx("text-sm font-bold", headingTextClass)}>
                            {t(titleKey, titleFallback)}
                        </h3>
                        <p className={clsx("mt-1 text-xs leading-5", mutedTextClass)}>
                            {t(descriptionKey, descriptionFallback)}
                        </p>
                        <p className={clsx("mt-1 text-xs", mutedTextClass)}>
                            {t("admin.wechat_mp.ingest.account_summary", {
                                enabled: formatNumber(
                                    sourceAccounts.filter((account) => account.enabled).length
                                ),
                                total: formatNumber(sourceAccounts.length),
                            })}
                        </p>
                    </div>
                    <label
                        className={clsx(
                            "inline-flex shrink-0 items-center gap-2 text-xs",
                            subtleTextClass,
                            sourceAccounts.length && !hasUpdatingAccount
                                ? "cursor-pointer"
                                : "cursor-not-allowed opacity-50"
                        )}
                    >
                        <input
                            type="checkbox"
                            checked={allEnabled}
                            onChange={() => toggleIngestAccountGroup(sourceAccounts)}
                            disabled={!sourceAccounts.length || hasUpdatingAccount}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                            aria-label={t(
                                "admin.wechat_mp.ingest.select_all_sources",
                                "Select all sources"
                            )}
                        />
                        {t(
                            allEnabled
                                ? "admin.wechat_mp.ingest.clear_all_sources"
                                : "admin.wechat_mp.ingest.select_all_sources",
                            allEnabled ? "Clear all" : "Select all"
                        )}
                    </label>
                </div>

                <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                    {sourceAccounts.length > 0 ? (
                        sourceAccounts.map((account) => {
                            const sourceName =
                                account.name ||
                                account.fakeid ||
                                account.rss_feed_id ||
                                t("admin.wechat_mp.status.none");
                            const sourceDetail =
                                account.source_type === "wewe_rss"
                                    ? account.rss_feed_id || t("admin.wechat_mp.status.none")
                                    : account.fakeid || t("admin.wechat_mp.status.none");
                            const checkboxId = `ingest-source-${idPrefix}-${account.id}`;
                            const updating = isIngestAccountUpdating(account.id);

                            return (
                                <div
                                    key={account.id}
                                    className={clsx(
                                        "flex flex-col gap-3 rounded-[8px] border p-3 sm:flex-row sm:items-center sm:justify-between",
                                        isDayMode
                                            ? "border-slate-200/70 bg-white/[0.72]"
                                            : "border-white/10 bg-white/[0.04]"
                                    )}
                                >
                                    <div className="flex min-w-0 items-start gap-3">
                                        <input
                                            id={checkboxId}
                                            type="checkbox"
                                            checked={Boolean(account.enabled)}
                                            onChange={(event) =>
                                                toggleIngestAccount(account, event.target.checked)
                                            }
                                            disabled={updating}
                                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600"
                                            aria-label={t("admin.wechat_mp.ingest.select_source", {
                                                name: sourceName,
                                                defaultValue: `Select ${sourceName} for ingest`,
                                            })}
                                        />
                                        <label
                                            htmlFor={checkboxId}
                                            className="min-w-0 cursor-pointer"
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div
                                                    className={clsx(
                                                        "truncate text-sm font-bold",
                                                        headingTextClass
                                                    )}
                                                >
                                                    {sourceName}
                                                </div>
                                                <span
                                                    className={clsx(
                                                        "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                        account.enabled
                                                            ? isDayMode
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-emerald-500/10 text-emerald-300"
                                                            : isDayMode
                                                              ? "bg-slate-100 text-slate-500"
                                                              : "bg-white/5 text-gray-400"
                                                    )}
                                                >
                                                    {t(
                                                        account.enabled
                                                            ? "admin.wechat_mp.status.enabled"
                                                            : "admin.wechat_mp.status.disabled"
                                                    )}
                                                </span>
                                            </div>
                                            <div
                                                className={clsx(
                                                    "mt-1 truncate text-xs",
                                                    mutedTextClass
                                                )}
                                            >
                                                {sourceDetail}
                                            </div>
                                        </label>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-end gap-2">
                                        {updating ? (
                                            <Loader2
                                                size={16}
                                                className={clsx("animate-spin", mutedTextClass)}
                                                aria-label={t(
                                                    "admin.wechat_mp.ingest.updating_source",
                                                    "Updating source"
                                                )}
                                            />
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => deleteIngestAccount(account)}
                                            className={clsx(
                                                "rounded-[8px] border p-2 transition-colors",
                                                isDayMode
                                                    ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                                                    : "border-rose-400/20 text-rose-300 hover:bg-rose-500/10"
                                            )}
                                            aria-label={t("admin.wechat_mp.actions.delete_account")}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <AdminEmptyState
                            icon={emptyIcon}
                            title={t(emptyTitleKey, emptyTitleFallback)}
                            description={t(emptyDescriptionKey, emptyDescriptionFallback)}
                        />
                    )}
                </div>
            </section>
        );
    };

    const runtimeNoteTone = hasEnabledRssSource
        ? "success"
        : runtimeReady
          ? credentialHealthStatus === "expired"
              ? "warning"
              : credentialsReady
                ? "success"
                : "warning"
          : "danger";
    const runtimeNoteText =
        hasEnabledRssSource && !credentialsReady
            ? t("admin.wechat_mp.notes.rss_ready")
            : runtimeReady
              ? credentialHealthStatus === "expired"
                  ? credentialHealth.reason === "check_failed"
                      ? t("admin.wechat_mp.notes.token_check_failed")
                      : t("admin.wechat_mp.notes.token_expired")
                  : credentialHealthStatus === "checking"
                    ? t("admin.wechat_mp.notes.token_checking")
                    : credentialsReady
                      ? t("admin.wechat_mp.notes.ready")
                      : t("admin.wechat_mp.notes.need_login")
              : t("admin.wechat_mp.notes.runtime_missing");
    const simpleLoginStatus = loginStatusKey(login.stage, credentialsReady, credentialHealthStatus);
    const paragraphs = textParagraphs(content?.contentText);

    return (
        <AdminPageShell
            title={t("admin.wechat_mp.workspace.title", "内容采集")}
            actions={
                <ToolbarGroup className="justify-start lg:justify-end">
                    <AdminButton
                        tone="subtle"
                        onClick={() => loadStatus()}
                        disabled={statusLoading}
                    >
                        <RefreshCw size={16} className={statusLoading ? "animate-spin" : ""} />
                        {t("admin.wechat_mp.actions.refresh_status")}
                    </AdminButton>
                    <AdminButton
                        tone="primary"
                        onClick={ingestReady ? runIngestNow : () => setActiveWorkspace("advanced")}
                        disabled={
                            ingestReady
                                ? ingestRunning
                                : loginStarting || loginActive || !runtimeReady
                        }
                    >
                        {loginStarting || ingestRunning ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : ingestReady ? (
                            <Play size={16} />
                        ) : (
                            <LogIn size={16} />
                        )}
                        {ingestReady
                            ? t("admin.wechat_mp.actions.run_ingest")
                            : t("admin.wechat_mp.workspace.connect_wechat", "连接微信采集")}
                    </AdminButton>
                </ToolbarGroup>
            }
            toolbar={
                <div
                    className="flex gap-2 overflow-x-auto"
                    role="tablist"
                    aria-label={t("admin.wechat_mp.workspace.navigation", "内容采集工作区")}
                >
                    {[
                        ["overview", "overview_tab", "概况"],
                        ["sources", "sources_tab", "采集源"],
                        ["candidates", "candidates_tab", "候选内容"],
                        ["rss", "rss_tab", "RSS 管理"],
                        ["advanced", "advanced_tab", "连接与工具"],
                    ].map(([id, key, fallback]) => (
                        <FilterChip
                            key={id}
                            role="tab"
                            aria-selected={activeWorkspace === id}
                            active={activeWorkspace === id}
                            onClick={() => setActiveWorkspace(id)}
                            className="shrink-0"
                        >
                            {t(`admin.wechat_mp.workspace.${key}`, fallback)}
                        </FilterChip>
                    ))}
                </div>
            }
        >
            <div className="space-y-3">
                {activeWorkspace !== "rss" ? (
                    <AdminInlineNote tone={runtimeNoteTone}>{runtimeNoteText}</AdminInlineNote>
                ) : null}

                {activeWorkspace === "overview" ? (
                    <>
                        <AdminPanel>
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                                <span className={headingTextClass}>
                                    {t("admin.wechat_mp.workspace.sources_status", {
                                        enabled: formatNumber(enabledIngestAccountCount),
                                        total: formatNumber(ingestAccounts.length),
                                        defaultValue: `采集源 ${enabledIngestAccountCount}/${ingestAccounts.length}`,
                                    })}
                                </span>
                                <span className={mutedTextClass}>|</span>
                                <span className={headingTextClass}>
                                    {t("admin.wechat_mp.workspace.login_status", {
                                        status:
                                            hasEnabledRssSource && !credentialsReady
                                                ? t("admin.wechat_mp.workspace.rss_status")
                                                : t(
                                                      `admin.wechat_mp.simple_status.${simpleLoginStatus}`
                                                  ),
                                        defaultValue: `微信连接 ${t(`admin.wechat_mp.simple_status.${simpleLoginStatus}`)}`,
                                    })}
                                </span>
                                <span className={mutedTextClass}>|</span>
                                <span className={headingTextClass}>
                                    {ingestSettings.enabled
                                        ? t("admin.wechat_mp.workspace.schedule_status", {
                                              time: ingestSettings.daily_run_time,
                                              defaultValue: `每日 ${ingestSettings.daily_run_time}`,
                                          })
                                        : t(
                                              "admin.wechat_mp.workspace.schedule_disabled",
                                              "定时采集未启用"
                                          )}
                                </span>
                                <span className={mutedTextClass}>|</span>
                                <span className={headingTextClass}>
                                    {t("admin.wechat_mp.workspace.new_articles_status", {
                                        count: formatNumber(
                                            latestRun?.new_articles || ingestArticles.length
                                        ),
                                        defaultValue: `本轮新增 ${formatNumber(latestRun?.new_articles || ingestArticles.length)}`,
                                    })}
                                </span>
                            </div>
                        </AdminPanel>

                        <AdminPanel>
                            <div className="grid md:grid-cols-2 md:divide-x md:divide-[rgba(128,146,167,0.14)]">
                                <section className="pb-4 md:pb-0 md:pr-5">
                                    <h3 className={clsx("text-sm font-bold", headingTextClass)}>
                                        {t("admin.wechat_mp.ingest.runs_title", "最近采集")}
                                    </h3>
                                    <div className="mt-3 divide-y divide-[rgba(128,146,167,0.14)]">
                                        {ingestLoading ? (
                                            <div className={clsx("py-3 text-sm", mutedTextClass)}>
                                                {t("common.loading", "加载中...")}
                                            </div>
                                        ) : ingestRuns.length > 0 ? (
                                            ingestRuns.slice(0, 5).map((run) => (
                                                <div
                                                    key={run.id}
                                                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-2.5 text-sm"
                                                >
                                                    <span
                                                        className={clsx("truncate", mutedTextClass)}
                                                    >
                                                        {formatDateTime(
                                                            run.started_at,
                                                            i18n.resolvedLanguage
                                                        )}
                                                    </span>
                                                    <span className={headingTextClass}>
                                                        {t(
                                                            `admin.wechat_mp.ingest.run_status.${run.status}`,
                                                            run.status
                                                        )}
                                                    </span>
                                                    <span
                                                        className={clsx(
                                                            "tabular-nums",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        {formatNumber(run.new_articles || 0)}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={clsx("py-3 text-sm", mutedTextClass)}>
                                                {t("admin.wechat_mp.ingest.empty_runs")}
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section className="border-t border-[rgba(128,146,167,0.14)] pt-4 md:border-t-0 md:pl-5 md:pt-0">
                                    <h3 className={clsx("text-sm font-bold", headingTextClass)}>
                                        {t("admin.wechat_mp.ingest.articles_title", "候选内容")}
                                    </h3>
                                    <div className="mt-3 divide-y divide-[rgba(128,146,167,0.14)]">
                                        {ingestLoading ? (
                                            <div className={clsx("py-3 text-sm", mutedTextClass)}>
                                                {t("common.loading", "加载中...")}
                                            </div>
                                        ) : ingestArticles.length > 0 ? (
                                            ingestArticles.slice(0, 5).map((article) => (
                                                <div
                                                    key={article.id || article.link}
                                                    className="flex min-w-0 items-center justify-between gap-3 py-2.5"
                                                >
                                                    <span
                                                        className={clsx(
                                                            "min-w-0 truncate text-sm font-semibold",
                                                            headingTextClass
                                                        )}
                                                    >
                                                        {article.title ||
                                                            t("admin.wechat_mp.articles.untitled")}
                                                    </span>
                                                    <span
                                                        className={clsx(
                                                            "shrink-0 text-xs",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        {article.account_name ||
                                                            article.fakeid ||
                                                            t("admin.wechat_mp.status.none")}
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={clsx("py-3 text-sm", mutedTextClass)}>
                                                {t("admin.wechat_mp.ingest.empty_articles")}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </AdminPanel>
                    </>
                ) : null}

                {activeWorkspace === "advanced" ? (
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                        <AdminPanel
                            title={t("admin.wechat_mp.auth.title")}
                            description={t("admin.wechat_mp.auth.description")}
                            className={singleTestIsRss ? "hidden" : ""}
                            action={
                                loginActive ? (
                                    <AdminButton
                                        tone="danger"
                                        onClick={cancelLogin}
                                        disabled={loginCancelling}
                                    >
                                        {loginCancelling ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <XCircle size={16} />
                                        )}
                                        {t("admin.wechat_mp.actions.cancel_login")}
                                    </AdminButton>
                                ) : (
                                    <AdminButton
                                        tone="primary"
                                        onClick={startLogin}
                                        disabled={loginStarting || !runtimeReady}
                                    >
                                        {loginStarting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <LogIn size={16} />
                                        )}
                                        {t("admin.wechat_mp.actions.start_login")}
                                    </AdminButton>
                                )
                            }
                        >
                            <div className="grid gap-3 sm:grid-cols-3">
                                <AdminMetricCard
                                    label={t("admin.wechat_mp.metrics.browser")}
                                    value={
                                        runtimeReady
                                            ? t("admin.wechat_mp.status.ready")
                                            : t("admin.wechat_mp.status.missing")
                                    }
                                    icon={runtimeReady ? CheckCircle2 : AlertTriangle}
                                    tone={runtimeReady ? "emerald" : "rose"}
                                />
                                <AdminMetricCard
                                    label={t("admin.wechat_mp.metrics.credentials")}
                                    value={t(`admin.wechat_mp.simple_status.${simpleLoginStatus}`)}
                                    icon={KeyRound}
                                    tone={
                                        credentialHealthStatus === "expired"
                                            ? "rose"
                                            : credentialsReady
                                              ? "emerald"
                                              : "amber"
                                    }
                                />
                                <AdminMetricCard
                                    label={t("admin.wechat_mp.metrics.login_stage")}
                                    value={t(
                                        `admin.wechat_mp.login_stages.${login.stage}`,
                                        login.stage || "idle"
                                    )}
                                    icon={ShieldCheck}
                                    tone={
                                        login.stage === "failed"
                                            ? "rose"
                                            : login.stage === "saved"
                                              ? "emerald"
                                              : "indigo"
                                    }
                                />
                            </div>

                            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                                <div
                                    className={clsx(
                                        "flex aspect-square w-full max-w-[240px] items-center justify-center overflow-hidden rounded-[8px] border p-3",
                                        isDayMode
                                            ? "border-slate-200 bg-white"
                                            : "border-white/10 bg-white/[0.04]"
                                    )}
                                >
                                    {login.qr_data_url ? (
                                        <img
                                            src={login.qr_data_url}
                                            alt={t("admin.wechat_mp.auth.qr_alt")}
                                            className="h-full w-full object-contain"
                                        />
                                    ) : (
                                        <div
                                            className={clsx("text-center text-sm", mutedTextClass)}
                                        >
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
                                            statusTone(
                                                credentialsReady &&
                                                    credentialHealthStatus !== "expired",
                                                isDayMode
                                            )
                                        )}
                                    >
                                        <div className="font-semibold">
                                            {login.message ||
                                                t("admin.wechat_mp.auth.idle_message")}
                                        </div>
                                        {login.error ? (
                                            <div className="mt-1 break-words text-xs">
                                                {login.error}
                                            </div>
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
                                                    {(status?.credentials?.cookie_names || [])
                                                        .length > 0
                                                        ? status.credentials.cookie_names.join(", ")
                                                        : t("admin.wechat_mp.status.none")}
                                                </div>
                                                <div>
                                                    {t("admin.wechat_mp.auth.token_mask")}:{" "}
                                                    {status?.credentials?.token_mask ||
                                                        t("admin.wechat_mp.status.none")}
                                                </div>
                                                <div className="break-all">
                                                    {t("admin.wechat_mp.auth.chromium_path")}:{" "}
                                                    {status?.runtime?.executable_path ||
                                                        t("admin.wechat_mp.status.none")}
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        </AdminPanel>

                        <AdminPanel
                            title={t("admin.wechat_mp.collect.title")}
                            description={t(
                                singleTestIsRss
                                    ? "admin.wechat_mp.collect.rss_description"
                                    : "admin.wechat_mp.collect.description"
                            )}
                            action={
                                <AdminButton
                                    tone="primary"
                                    onClick={fetchArticles}
                                    disabled={articlesLoading || !singleTestReady}
                                >
                                    {articlesLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Newspaper size={16} />
                                    )}
                                    {t("admin.wechat_mp.actions.fetch_articles")}
                                </AdminButton>
                            }
                        >
                            <label
                                className={clsx("block text-sm font-semibold", headingTextClass)}
                            >
                                {t("admin.wechat_mp.ingest.fields.source_type")}
                                <select
                                    value={form.sourceType}
                                    onChange={(event) => selectSingleTestSource(event.target.value)}
                                    className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                >
                                    <option value="wechat_mp">
                                        {t("admin.wechat_mp.ingest.source_types.wechat_mp")}
                                    </option>
                                    <option value="wewe_rss">
                                        {t("admin.wechat_mp.ingest.source_types.wewe_rss")}
                                    </option>
                                </select>
                            </label>
                            <div className="grid gap-3 lg:grid-cols-2">
                                {singleTestIsRss ? (
                                    <label
                                        className={clsx(
                                            "block text-sm font-semibold",
                                            headingTextClass
                                        )}
                                    >
                                        {t("admin.wechat_mp.collect.rss_feed")}
                                        <select
                                            value={form.rssFeedId}
                                            onChange={(event) =>
                                                updateForm("rssFeedId", event.target.value)
                                            }
                                            disabled={!rssTestSources.length}
                                            className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                        >
                                            <option value="">
                                                {t("admin.wechat_mp.collect.rss_feed_empty")}
                                            </option>
                                            {rssTestSources.map((source) => (
                                                <option key={source.id} value={source.rss_feed_id}>
                                                    {source.name || source.rss_feed_id} ·{" "}
                                                    {source.rss_feed_id}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                ) : (
                                    <>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.account_name")}
                                            <div className="mt-1 flex gap-2">
                                                <input
                                                    value={form.accountName}
                                                    onChange={(event) =>
                                                        updateForm(
                                                            "accountName",
                                                            event.target.value
                                                        )
                                                    }
                                                    className="theme-admin-input rect-field min-h-[40px] min-w-0 flex-1 px-3 py-2 text-sm"
                                                    placeholder={t(
                                                        "admin.wechat_mp.placeholders.account_name"
                                                    )}
                                                />
                                                <AdminButton
                                                    tone="subtle"
                                                    onClick={searchAccounts}
                                                    disabled={accountSearching || !credentialsReady}
                                                    className="shrink-0"
                                                >
                                                    {accountSearching ? (
                                                        <Loader2
                                                            size={16}
                                                            className="animate-spin"
                                                        />
                                                    ) : (
                                                        <Search size={16} />
                                                    )}
                                                    <span className="hidden sm:inline">
                                                        {t(
                                                            "admin.wechat_mp.actions.search_account"
                                                        )}
                                                    </span>
                                                </AdminButton>
                                            </div>
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.fakeid")}
                                            <input
                                                value={form.fakeid}
                                                onChange={(event) =>
                                                    updateForm("fakeid", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                placeholder={t(
                                                    "admin.wechat_mp.placeholders.fakeid"
                                                )}
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.keyword")}
                                            <input
                                                value={form.keyword}
                                                onChange={(event) =>
                                                    updateForm("keyword", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                placeholder={t(
                                                    "admin.wechat_mp.placeholders.keyword"
                                                )}
                                            />
                                        </label>
                                    </>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    <label
                                        className={clsx(
                                            "block text-sm font-semibold",
                                            headingTextClass
                                        )}
                                    >
                                        {t("admin.wechat_mp.fields.count")}
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={form.count}
                                            onChange={(event) =>
                                                updateForm("count", event.target.value)
                                            }
                                            className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label
                                        className={clsx(
                                            "block text-sm font-semibold",
                                            headingTextClass
                                        )}
                                    >
                                        {t("admin.wechat_mp.fields.max_pages")}
                                        <input
                                            type="number"
                                            min="1"
                                            max="5"
                                            value={form.maxPages}
                                            onChange={(event) =>
                                                updateForm("maxPages", event.target.value)
                                            }
                                            className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                        />
                                    </label>
                                </div>
                            </div>

                            {singleTestIsRss ? (
                                <AdminInlineNote
                                    tone={rssTestSources.length ? "info" : "warning"}
                                    className="mt-3"
                                >
                                    {rssTestSources.length
                                        ? t("admin.wechat_mp.collect.rss_note")
                                        : t("admin.wechat_mp.collect.rss_no_sources")}
                                </AdminInlineNote>
                            ) : null}

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {!singleTestIsRss ? (
                                    <>
                                        <label
                                            className={clsx(
                                                "inline-flex items-center gap-2 text-sm",
                                                subtleTextClass
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.allowFirst}
                                                onChange={(event) =>
                                                    updateForm("allowFirst", event.target.checked)
                                                }
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
                                                {account.nickname ||
                                                    account.alias ||
                                                    account.fakeid}
                                            </FilterChip>
                                        ))}
                                    </>
                                ) : null}
                            </div>

                            <details
                                className={clsx(
                                    "mt-4 rounded-[8px] border p-3",
                                    singleTestIsRss && "hidden",
                                    isDayMode
                                        ? "border-slate-200 bg-white/70"
                                        : "border-white/10 bg-white/[0.03]"
                                )}
                            >
                                <summary
                                    className={clsx(
                                        "cursor-pointer text-sm font-semibold",
                                        headingTextClass
                                    )}
                                >
                                    {t("admin.wechat_mp.collect.pacing_title")}
                                </summary>
                                <AdminInlineNote tone="warning" className="mt-3">
                                    {t("admin.wechat_mp.collect.pacing_note")}
                                </AdminInlineNote>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.query_delay_min")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                value={form.queryDelayMin}
                                                onChange={(event) =>
                                                    updateForm("queryDelayMin", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="95"
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.query_delay_max")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                value={form.queryDelayMax}
                                                onChange={(event) =>
                                                    updateForm("queryDelayMax", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="125"
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.page_pause_min")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                step="0.5"
                                                value={form.pagePauseMin}
                                                onChange={(event) =>
                                                    updateForm("pagePauseMin", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="10"
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.page_pause_max")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                step="0.5"
                                                value={form.pagePauseMax}
                                                onChange={(event) =>
                                                    updateForm("pagePauseMax", event.target.value)
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="25"
                                            />
                                        </label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.content_delay_min")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                value={form.contentDelayMin}
                                                onChange={(event) =>
                                                    updateForm(
                                                        "contentDelayMin",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="10"
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-xs font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.content_delay_max")}
                                            <input
                                                type="number"
                                                min="0"
                                                max="3600"
                                                value={form.contentDelayMax}
                                                onChange={(event) =>
                                                    updateForm(
                                                        "contentDelayMax",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[36px] w-full px-2 py-1 text-sm"
                                                placeholder="20"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </details>
                        </AdminPanel>
                    </div>
                ) : null}

                {activeWorkspace === "rss" ? <WeChatReadRssManager /> : null}

                {activeWorkspace === "sources" ? (
                    <AdminPanel
                        title={t("admin.wechat_mp.ingest.title")}
                        description={t("admin.wechat_mp.ingest.description")}
                        action={
                            <ToolbarGroup className="justify-start sm:justify-end">
                                <AdminButton
                                    tone="subtle"
                                    onClick={() => loadIngestOverview()}
                                    disabled={ingestLoading}
                                >
                                    <RefreshCw
                                        size={16}
                                        className={ingestLoading ? "animate-spin" : ""}
                                    />
                                    {t("admin.wechat_mp.actions.refresh_ingest")}
                                </AdminButton>
                                <AdminButton
                                    tone="primary"
                                    onClick={runIngestNow}
                                    disabled={ingestRunning || !ingestReady}
                                >
                                    {ingestRunning ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Play size={16} />
                                    )}
                                    {t("admin.wechat_mp.actions.run_ingest")}
                                </AdminButton>
                            </ToolbarGroup>
                        }
                    >
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <AdminMetricCard
                                label={t("admin.wechat_mp.ingest.metrics.schedule")}
                                value={
                                    ingestSettings.enabled
                                        ? ingestSettings.daily_run_time
                                        : t("admin.wechat_mp.status.disabled")
                                }
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
                                value={
                                    latestRun
                                        ? t(
                                              `admin.wechat_mp.ingest.run_status.${latestRun.status}`,
                                              latestRun.status
                                          )
                                        : t("admin.wechat_mp.status.none")
                                }
                                icon={Clock3}
                                tone={
                                    latestRun?.status === "completed"
                                        ? "emerald"
                                        : latestRun?.status === "failed"
                                          ? "rose"
                                          : "violet"
                                }
                            />
                            <AdminMetricCard
                                label={t("admin.wechat_mp.ingest.metrics.new_articles")}
                                value={formatNumber(
                                    latestRun?.new_articles || ingestArticles.length
                                )}
                                icon={Newspaper}
                                tone="violet"
                            />
                        </div>

                        {latestRun?.status === "running" || latestRun?.status === "failed" ? (
                            <div
                                className={clsx(
                                    "mt-3 rounded-[8px] border p-4",
                                    latestRun.status === "failed"
                                        ? isDayMode
                                            ? "border-rose-200 bg-rose-50/70"
                                            : "border-rose-500/20 bg-rose-500/10"
                                        : isDayMode
                                          ? "border-indigo-200 bg-indigo-50/70"
                                          : "border-indigo-500/20 bg-indigo-500/10"
                                )}
                                aria-live="polite"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div
                                            className={clsx(
                                                "text-sm font-bold",
                                                latestRun.status === "failed"
                                                    ? isDayMode
                                                        ? "text-rose-800"
                                                        : "text-rose-200"
                                                    : headingTextClass
                                            )}
                                        >
                                            {latestRun.status === "failed"
                                                ? t("admin.wechat_mp.ingest.progress.failed_title")
                                                : t("admin.wechat_mp.ingest.progress.title")}
                                        </div>
                                        <div className={clsx("mt-1 text-xs", mutedTextClass)}>
                                            {t(
                                                `admin.wechat_mp.ingest.progress.stage.${latestRun.progress_stage || "starting"}`,
                                                latestRun.progress_stage || "starting"
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className={clsx(
                                            "shrink-0 text-sm font-bold tabular-nums",
                                            latestRun.status === "failed"
                                                ? isDayMode
                                                    ? "text-rose-700"
                                                    : "text-rose-200"
                                                : isDayMode
                                                  ? "text-indigo-700"
                                                  : "text-indigo-200"
                                        )}
                                    >
                                        {latestRun.status === "failed"
                                            ? t("admin.wechat_mp.ingest.run_status.failed")
                                            : `${latestRunProgress}%`}
                                    </span>
                                </div>
                                {latestRun.status === "running" ? (
                                    <div
                                        className={clsx(
                                            "mt-3 h-2 overflow-hidden rounded-full",
                                            isDayMode ? "bg-indigo-100" : "bg-white/10"
                                        )}
                                        role="progressbar"
                                        aria-label={t("admin.wechat_mp.ingest.progress.title")}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                        aria-valuenow={latestRunProgress}
                                    >
                                        <div
                                            className="h-full rounded-full bg-indigo-500 transition-[width] duration-500"
                                            style={{ width: `${latestRunProgress}%` }}
                                        />
                                    </div>
                                ) : null}
                                <div
                                    className={clsx(
                                        "mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs",
                                        mutedTextClass
                                    )}
                                >
                                    <span>
                                        {t("admin.wechat_mp.ingest.progress.accounts", {
                                            processed: latestRun.processed_accounts || 0,
                                            total: latestRun.total_accounts || 0,
                                        })}
                                    </span>
                                    <span>
                                        {t("admin.wechat_mp.ingest.progress.articles", {
                                            processed: latestRun.processed_articles || 0,
                                            total: latestRun.total_articles || 0,
                                        })}
                                    </span>
                                </div>
                                {latestRun.status === "running" &&
                                (latestRun.current_account || latestRun.current_article) ? (
                                    <div className={clsx("mt-2 truncate text-xs", mutedTextClass)}>
                                        {latestRun.current_account || ""}
                                        {latestRun.current_account && latestRun.current_article
                                            ? " · "
                                            : ""}
                                        {latestRun.current_article || ""}
                                    </div>
                                ) : null}
                                {latestRun.status === "failed" && latestRun.error ? (
                                    <div
                                        className={clsx(
                                            "mt-2 line-clamp-2 text-xs",
                                            isDayMode ? "text-rose-700" : "text-rose-200"
                                        )}
                                    >
                                        {latestRun.error}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
                            <details
                                className={clsx(
                                    "rounded-[8px] border p-3",
                                    isDayMode
                                        ? "border-slate-200/70 bg-white/[0.5]"
                                        : "border-white/10 bg-white/[0.025]"
                                )}
                            >
                                <summary
                                    className={clsx(
                                        "cursor-pointer text-sm font-bold",
                                        headingTextClass
                                    )}
                                >
                                    {t(
                                        "admin.wechat_mp.workspace.advanced_schedule",
                                        "定时与风控参数"
                                    )}
                                    <span
                                        className={clsx("ml-2 text-xs font-normal", mutedTextClass)}
                                    >
                                        {t(
                                            "admin.wechat_mp.workspace.advanced_schedule_hint",
                                            "默认值适合日常运行，仅在异常排查时调整"
                                        )}
                                    </span>
                                </summary>
                                <div className="mt-3 space-y-3">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.ingest.fields.enabled")}
                                            <select
                                                value={ingestSettings.enabled ? "1" : "0"}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "enabled",
                                                        event.target.value === "1"
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            >
                                                <option value="1">
                                                    {t("admin.wechat_mp.status.enabled")}
                                                </option>
                                                <option value="0">
                                                    {t("admin.wechat_mp.status.disabled")}
                                                </option>
                                            </select>
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.ingest.fields.daily_run_time")}
                                            <input
                                                type="time"
                                                value={ingestSettings.daily_run_time}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "daily_run_time",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.ingest.fields.timezone")}
                                            <input
                                                value={ingestSettings.timezone}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "timezone",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t(
                                                "admin.wechat_mp.ingest.fields.token_health_enabled"
                                            )}
                                            <select
                                                value={
                                                    ingestSettings.token_health_enabled ? "1" : "0"
                                                }
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "token_health_enabled",
                                                        event.target.value === "1"
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            >
                                                <option value="1">
                                                    {t("admin.wechat_mp.status.enabled")}
                                                </option>
                                                <option value="0">
                                                    {t("admin.wechat_mp.status.disabled")}
                                                </option>
                                            </select>
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t(
                                                "admin.wechat_mp.ingest.fields.token_health_interval"
                                            )}
                                            <input
                                                type="number"
                                                min="1"
                                                max="168"
                                                step="1"
                                                value={ingestSettings.token_health_interval_hours}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "token_health_interval_hours",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <AdminInlineNote tone="info" className="self-end">
                                            {t("admin.wechat_mp.ingest.token_health_note")}
                                        </AdminInlineNote>
                                    </div>

                                    <AdminInlineNote tone="warning">
                                        {t("admin.wechat_mp.ingest.pacing_note")}
                                    </AdminInlineNote>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div>
                                            <div
                                                className={clsx(
                                                    "text-sm font-semibold",
                                                    headingTextClass
                                                )}
                                            >
                                                {t("admin.wechat_mp.ingest.fields.query_delay")}
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-2">
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.query_delay_min")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings.query_delay_range?.[0] ??
                                                            95
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "query_delay_range",
                                                                0,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.query_delay_max")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings.query_delay_range?.[1] ??
                                                            125
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "query_delay_range",
                                                                1,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className={clsx(
                                                    "text-sm font-semibold",
                                                    headingTextClass
                                                )}
                                            >
                                                {t("admin.wechat_mp.ingest.fields.page_pause")}
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-2">
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.page_pause_min")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings.page_pause_range?.[0] ??
                                                            10
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "page_pause_range",
                                                                0,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.page_pause_max")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings.page_pause_range?.[1] ??
                                                            25
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "page_pause_range",
                                                                1,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <div
                                                className={clsx(
                                                    "text-sm font-semibold",
                                                    headingTextClass
                                                )}
                                            >
                                                {t("admin.wechat_mp.ingest.fields.content_delay")}
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-2">
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.content_delay_min")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings
                                                                .content_delay_range?.[0] ?? 10
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "content_delay_range",
                                                                0,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                                <label
                                                    className={clsx(
                                                        "block text-xs font-semibold",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {t("admin.wechat_mp.fields.content_delay_max")}
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={
                                                            ingestSettings
                                                                .content_delay_range?.[1] ?? 20
                                                        }
                                                        onChange={(event) =>
                                                            updateIngestDelay(
                                                                "content_delay_range",
                                                                1,
                                                                event.target.value
                                                            )
                                                        }
                                                        className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.count")}
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={ingestSettings.count_per_page}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "count_per_page",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <label
                                            className={clsx(
                                                "block text-sm font-semibold",
                                                headingTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.fields.max_pages")}
                                            <input
                                                type="number"
                                                min="1"
                                                max="5"
                                                value={ingestSettings.max_pages}
                                                onChange={(event) =>
                                                    updateIngestSetting(
                                                        "max_pages",
                                                        event.target.value
                                                    )
                                                }
                                                className="theme-admin-input rect-field mt-1 min-h-[40px] w-full px-3 py-2 text-sm"
                                            />
                                        </label>
                                        <div
                                            className={clsx(
                                                "mt-7 space-y-2 text-sm",
                                                subtleTextClass
                                            )}
                                        >
                                            <label className="inline-flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(ingestSettings.fetch_content)}
                                                    onChange={(event) =>
                                                        updateIngestSetting(
                                                            "fetch_content",
                                                            event.target.checked
                                                        )
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                />
                                                {t("admin.wechat_mp.ingest.fields.fetch_content")}
                                            </label>
                                            <label className="inline-flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(ingestSettings.auto_parse)}
                                                    onChange={(event) =>
                                                        updateIngestSetting(
                                                            "auto_parse",
                                                            event.target.checked
                                                        )
                                                    }
                                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                                />
                                                {t("admin.wechat_mp.ingest.fields.auto_parse")}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex justify-end">
                                        <AdminButton
                                            tone="primary"
                                            onClick={saveIngestSettings}
                                            disabled={ingestSaving}
                                        >
                                            {ingestSaving ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Settings2 size={16} />
                                            )}
                                            {t("admin.wechat_mp.actions.save_ingest")}
                                        </AdminButton>
                                    </div>
                                </div>
                            </details>

                            <div className="space-y-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <select
                                        value={ingestAccountForm.source_type}
                                        onChange={(event) =>
                                            updateIngestAccountForm(
                                                "source_type",
                                                event.target.value
                                            )
                                        }
                                        className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm sm:col-span-2"
                                        aria-label={t("admin.wechat_mp.ingest.fields.source_type")}
                                    >
                                        <option value="wechat_mp">
                                            {t("admin.wechat_mp.ingest.source_types.wechat_mp")}
                                        </option>
                                        <option value="wewe_rss">
                                            {t("admin.wechat_mp.ingest.source_types.wewe_rss")}
                                        </option>
                                    </select>
                                    <input
                                        value={ingestAccountForm.name}
                                        onChange={(event) =>
                                            updateIngestAccountForm("name", event.target.value)
                                        }
                                        className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm"
                                        placeholder={t(
                                            ingestAccountForm.source_type === "wewe_rss"
                                                ? "admin.wechat_mp.ingest.placeholders.rss_name"
                                                : "admin.wechat_mp.ingest.placeholders.account_name"
                                        )}
                                    />
                                    {ingestAccountForm.source_type === "wewe_rss" ? (
                                        <input
                                            value={ingestAccountForm.rss_feed_id}
                                            onChange={(event) =>
                                                updateIngestAccountForm(
                                                    "rss_feed_id",
                                                    event.target.value
                                                )
                                            }
                                            className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm"
                                            placeholder={t(
                                                "admin.wechat_mp.ingest.placeholders.rss_feed_id"
                                            )}
                                        />
                                    ) : (
                                        <input
                                            value={ingestAccountForm.fakeid}
                                            onChange={(event) =>
                                                updateIngestAccountForm(
                                                    "fakeid",
                                                    event.target.value
                                                )
                                            }
                                            className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm"
                                            placeholder={t("admin.wechat_mp.placeholders.fakeid")}
                                        />
                                    )}
                                    {ingestAccountForm.source_type === "wewe_rss" ? (
                                        <div
                                            className={clsx(
                                                "text-xs leading-5 sm:col-span-2",
                                                mutedTextClass
                                            )}
                                        >
                                            {t("admin.wechat_mp.ingest.rss_source_note")}
                                        </div>
                                    ) : (
                                        <input
                                            value={ingestAccountForm.keywords}
                                            onChange={(event) =>
                                                updateIngestAccountForm(
                                                    "keywords",
                                                    event.target.value
                                                )
                                            }
                                            className="theme-admin-input rect-field min-h-[40px] w-full px-3 py-2 text-sm sm:col-span-2"
                                            placeholder={t(
                                                "admin.wechat_mp.ingest.placeholders.keywords"
                                            )}
                                        />
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <label
                                        className={clsx(
                                            "inline-flex items-center gap-2 text-sm",
                                            subtleTextClass
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={Boolean(ingestAccountForm.enabled)}
                                            onChange={(event) =>
                                                updateIngestAccountForm(
                                                    "enabled",
                                                    event.target.checked
                                                )
                                            }
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                                        />
                                        {t("admin.wechat_mp.ingest.fields.account_enabled")}
                                    </label>
                                    <AdminButton
                                        tone="subtle"
                                        onClick={saveIngestAccount}
                                        disabled={ingestSaving}
                                    >
                                        {ingestSaving ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                        {t("admin.wechat_mp.actions.add_account")}
                                    </AdminButton>
                                </div>

                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <input
                                        type="file"
                                        accept=".json,.csv,.tsv,.txt"
                                        onChange={(event) =>
                                            setIngestFile(event.target.files?.[0] || null)
                                        }
                                        className="theme-admin-input rect-field min-h-[40px] min-w-0 flex-1 px-3 py-2 text-sm"
                                    />
                                    <AdminButton
                                        tone="subtle"
                                        onClick={importIngestAccounts}
                                        disabled={ingestImporting}
                                    >
                                        {ingestImporting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Upload size={16} />
                                        )}
                                        {t("admin.wechat_mp.actions.import_accounts")}
                                    </AdminButton>
                                </div>

                                <div className={clsx("text-xs", mutedTextClass)}>
                                    {t("admin.wechat_mp.ingest.account_summary", {
                                        enabled: formatNumber(enabledIngestAccountCount),
                                        total: formatNumber(ingestAccounts.length),
                                    })}
                                </div>
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                    {renderIngestSourceList({
                                        sourceAccounts: directIngestAccounts,
                                        titleKey:
                                            "admin.wechat_mp.ingest.source_lists.wechat_mp.title",
                                        titleFallback: "微信公众号来源",
                                        descriptionKey:
                                            "admin.wechat_mp.ingest.source_lists.wechat_mp.description",
                                        descriptionFallback:
                                            "通过微信公众平台直接采集，多个来源可以同时启用。",
                                        emptyTitleKey:
                                            "admin.wechat_mp.ingest.source_lists.wechat_mp.empty_title",
                                        emptyTitleFallback: "暂无直连公众号",
                                        emptyDescriptionKey:
                                            "admin.wechat_mp.ingest.source_lists.wechat_mp.empty_description",
                                        emptyDescriptionFallback: "添加或导入一个直连公众号来源。",
                                        emptyIcon: ClipboardList,
                                        idPrefix: "wechat-mp",
                                    })}
                                    {renderIngestSourceList({
                                        sourceAccounts: rssIngestAccounts,
                                        titleKey:
                                            "admin.wechat_mp.ingest.source_lists.wewe_rss.title",
                                        titleFallback: "微信读书 RSS Feed",
                                        descriptionKey:
                                            "admin.wechat_mp.ingest.source_lists.wewe_rss.description",
                                        descriptionFallback:
                                            "通过 WeWe RSS 读取公众号 Feed，多个 Feed 可以同时启用。",
                                        emptyTitleKey:
                                            "admin.wechat_mp.ingest.source_lists.wewe_rss.empty_title",
                                        emptyTitleFallback: "暂无微信读书 RSS Feed",
                                        emptyDescriptionKey:
                                            "admin.wechat_mp.ingest.source_lists.wewe_rss.empty_description",
                                        emptyDescriptionFallback:
                                            "先在 RSS 管理中解析并添加公众号订阅源。",
                                        emptyIcon: Newspaper,
                                        idPrefix: "wewe-rss",
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <div
                                className={clsx(
                                    "rounded-[8px] border p-3",
                                    isDayMode ? "border-slate-200/70" : "border-white/10"
                                )}
                            >
                                <div className={clsx("mb-2 text-sm font-bold", headingTextClass)}>
                                    {t("admin.wechat_mp.ingest.runs_title")}
                                </div>
                                <div className="space-y-2">
                                    {ingestRuns.length > 0 ? (
                                        ingestRuns.slice(0, 4).map((run) => (
                                            <div
                                                key={run.id}
                                                className={clsx(
                                                    "flex items-center justify-between gap-3 text-sm",
                                                    mutedTextClass
                                                )}
                                            >
                                                <span>
                                                    {formatDateTime(
                                                        run.started_at,
                                                        i18n.resolvedLanguage
                                                    )}
                                                </span>
                                                <span>
                                                    {t(
                                                        `admin.wechat_mp.ingest.run_status.${run.status}`,
                                                        run.status
                                                    )}
                                                </span>
                                                <span>{formatNumber(run.new_articles || 0)}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={clsx("text-sm", mutedTextClass)}>
                                            {t("admin.wechat_mp.ingest.empty_runs")}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={clsx(
                                    "rounded-[8px] border p-3",
                                    isDayMode ? "border-slate-200/70" : "border-white/10"
                                )}
                            >
                                <div className={clsx("mb-2 text-sm font-bold", headingTextClass)}>
                                    {t("admin.wechat_mp.ingest.articles_title")}
                                </div>
                                <div className="space-y-2">
                                    {ingestArticles.length > 0 ? (
                                        ingestArticles.slice(0, 4).map((article) => (
                                            <div
                                                key={article.id || article.link}
                                                className="flex min-w-0 items-start justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div
                                                        className={clsx(
                                                            "truncate text-sm font-semibold",
                                                            headingTextClass
                                                        )}
                                                    >
                                                        {article.title ||
                                                            t("admin.wechat_mp.articles.untitled")}
                                                    </div>
                                                    <div
                                                        className={clsx(
                                                            "mt-1 truncate text-xs",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        {article.account_name ||
                                                            article.fakeid ||
                                                            t("admin.wechat_mp.status.none")}
                                                    </div>
                                                    <div
                                                        className={clsx(
                                                            "mt-1 text-xs",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        {t(
                                                            `admin.wechat_mp.ingest.content_status.${article.content_status || "not_fetched"}`,
                                                            article.content_status || "not_fetched"
                                                        )}
                                                        {" · "}
                                                        {t(
                                                            `admin.wechat_mp.ingest.extraction_status.${article.extraction_status || "not_started"}`,
                                                            article.extraction_status ||
                                                                "not_started"
                                                        )}
                                                        {" · "}
                                                        {t(
                                                            `admin.wechat_mp.ingest.activity_status.${article.activity_status || "not_screened"}`,
                                                            article.activity_status ||
                                                                "not_screened"
                                                        )}
                                                        {article.extracted_event?.title
                                                            ? ` · ${article.extracted_event.title}`
                                                            : ""}
                                                    </div>
                                                    {article.activity_reason ? (
                                                        <div
                                                            className={clsx(
                                                                "mt-1 line-clamp-2 text-xs",
                                                                mutedTextClass
                                                            )}
                                                        >
                                                            {article.activity_reason}
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        retryIngestArticleExtraction(article)
                                                    }
                                                    disabled={
                                                        extractingIngestArticleId === article.id ||
                                                        !article.content_text ||
                                                        article.content_status === "image_only"
                                                    }
                                                    className={clsx(
                                                        "shrink-0 rounded-[8px] border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                                        isDayMode
                                                            ? "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                            : "border-white/10 text-gray-300 hover:bg-white/10"
                                                    )}
                                                    aria-label={t(
                                                        "admin.wechat_mp.actions.retry_extraction"
                                                    )}
                                                    title={t(
                                                        "admin.wechat_mp.actions.retry_extraction"
                                                    )}
                                                >
                                                    <RefreshCw
                                                        size={14}
                                                        className={
                                                            extractingIngestArticleId === article.id
                                                                ? "animate-spin"
                                                                : ""
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className={clsx("text-sm", mutedTextClass)}>
                                            {t("admin.wechat_mp.ingest.empty_articles")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AdminPanel>
                ) : null}

                {activeWorkspace === "candidates" ? (
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
                                            value={formatNumber(
                                                articlesResult?.total || articles.length
                                            )}
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
                                                              : "border-white/10 bg-white/[0.04] text-gray-200 hover:border-white/20"
                                                    )}
                                                >
                                                    <div className="line-clamp-2 text-sm font-bold">
                                                        {article.title ||
                                                            t("admin.wechat_mp.articles.untitled")}
                                                    </div>
                                                    <div
                                                        className={clsx(
                                                            "mt-1 line-clamp-2 text-xs leading-5",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        {article.summary ||
                                                            t(
                                                                "admin.wechat_mp.articles.no_summary"
                                                            )}
                                                    </div>
                                                    <div
                                                        className={clsx(
                                                            "mt-2 flex flex-wrap gap-2 text-xs",
                                                            mutedTextClass
                                                        )}
                                                    >
                                                        <span>
                                                            {article.account ||
                                                                articlesResult?.account?.nickname ||
                                                                t("admin.wechat_mp.status.none")}
                                                        </span>
                                                        <span>
                                                            {article.time_text ||
                                                                t("admin.wechat_mp.status.none")}
                                                        </span>
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
                                    description={t(
                                        singleTestIsRss
                                            ? "admin.wechat_mp.articles.rss_empty_desc"
                                            : "admin.wechat_mp.articles.empty_desc"
                                    )}
                                />
                            )}
                        </AdminPanel>

                        <AdminPanel
                            title={t("admin.wechat_mp.preview.title")}
                            description={
                                selectedArticle?.title || t("admin.wechat_mp.preview.description")
                            }
                            action={
                                selectedArticle ? (
                                    <ToolbarGroup className="justify-start sm:justify-end">
                                        <AdminButton
                                            tone="subtle"
                                            onClick={fetchContent}
                                            disabled={contentLoading}
                                        >
                                            {contentLoading ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <FileText size={16} />
                                            )}
                                            {t("admin.wechat_mp.actions.fetch_content")}
                                        </AdminButton>
                                        <AdminButton
                                            tone="subtle"
                                            onClick={() => importContent("article")}
                                            disabled={
                                                Boolean(importingResource) ||
                                                !content?.contentText ||
                                                imageOnlyContent
                                            }
                                        >
                                            {importingResource === "article" ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Newspaper size={16} />
                                            )}
                                            {t(
                                                "admin.wechat_mp.actions.import_article",
                                                fallbackText("导入为文章", "Import Article")
                                            )}
                                        </AdminButton>
                                        <AdminButton
                                            tone="primary"
                                            onClick={() => importContent("event")}
                                            disabled={
                                                Boolean(importingResource) ||
                                                !content?.contentText ||
                                                imageOnlyContent
                                            }
                                        >
                                            {importingResource === "event" ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Plus size={16} />
                                            )}
                                            {t(
                                                "admin.wechat_mp.actions.import_event",
                                                fallbackText("导入为活动", "Import Event")
                                            )}
                                        </AdminButton>
                                    </ToolbarGroup>
                                ) : null
                            }
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
                                                    isDayMode ? "bg-slate-100" : "bg-white/[0.04]"
                                                )}
                                            />
                                        ) : null}
                                        <div className="min-w-0 flex-1">
                                            <div
                                                className={clsx(
                                                    "text-base font-bold",
                                                    headingTextClass
                                                )}
                                            >
                                                {content?.title ||
                                                    selectedArticle.title ||
                                                    t("admin.wechat_mp.articles.untitled")}
                                            </div>
                                            <div
                                                className={clsx(
                                                    "mt-2 grid gap-1 text-xs",
                                                    mutedTextClass
                                                )}
                                            >
                                                <span>
                                                    {content?.author ||
                                                        selectedArticle.author ||
                                                        selectedArticle.account ||
                                                        t("admin.wechat_mp.status.none")}
                                                </span>
                                                <span>
                                                    {selectedArticle.time_text ||
                                                        t("admin.wechat_mp.status.none")}
                                                </span>
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
                                            value={
                                                content?.content_status
                                                    ? t(
                                                          `admin.wechat_mp.content_status.${content.content_status}`,
                                                          content.content_status
                                                      )
                                                    : t(
                                                          "admin.wechat_mp.content_status.not_fetched"
                                                      )
                                            }
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

                                    {imageOnlyContent ? (
                                        <AdminInlineNote tone="warning">
                                            {t("admin.wechat_mp.preview.image_only_content")}
                                        </AdminInlineNote>
                                    ) : null}

                                    {contentLoading ? (
                                        <div
                                            className={clsx(
                                                "py-12 text-center text-sm",
                                                mutedTextClass
                                            )}
                                        >
                                            <Loader2
                                                size={28}
                                                className="mx-auto mb-3 animate-spin"
                                            />
                                            {t("admin.wechat_mp.preview.loading_content")}
                                        </div>
                                    ) : content?.contentText ? (
                                        <div
                                            className={clsx(
                                                "max-h-[520px] overflow-y-auto rounded-[8px] border p-4",
                                                isDayMode
                                                    ? "border-slate-200/70 bg-white"
                                                    : "border-white/10 bg-white/[0.03]"
                                            )}
                                        >
                                            {sanitizedContentHtml ? (
                                                <div
                                                    className={clsx(
                                                        "prose prose-sm max-w-none",
                                                        isDayMode ? "prose-slate" : "prose-invert"
                                                    )}
                                                    dangerouslySetInnerHTML={{
                                                        __html: sanitizedContentHtml,
                                                    }}
                                                />
                                            ) : (
                                                <div
                                                    className={clsx(
                                                        "space-y-3 text-sm leading-7",
                                                        subtleTextClass
                                                    )}
                                                >
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
                ) : null}
            </div>
        </AdminPageShell>
    );
};

export default WeChatMpImportManager;
