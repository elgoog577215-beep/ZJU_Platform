import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import QRCode from "qrcode";
import {
    BookOpen,
    CheckCircle2,
    Clipboard,
    ExternalLink,
    History,
    Link2,
    Loader2,
    PauseCircle,
    Play,
    RefreshCw,
    Trash2,
    UserRound,
    XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import api from "../../services/api";
import { formatServerDateTime as formatDateTime } from "../../utils/serverDate";
import {
    AdminButton,
    AdminEmptyState,
    AdminInlineNote,
    AdminMetricCard,
    AdminPanel,
    AdminIconButton,
    useAdminTheme,
} from "./AdminUI";

const initialOverview = {
    configured: false,
    base_url: "",
    accounts: { blocks: [], items: [] },
    feeds: { items: [] },
    refresh_running: false,
    history: { id: "", page: 1 },
};

const initialLogin = {
    active: false,
    stage: "idle",
    uuid: "",
    scan_url: "",
    message: "",
};

const getErrorMessage = (error, fallback) =>
    error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

const statusLabel = (status, t) => {
    if (Number(status) === 1) return t("admin.wechat_mp.rss_admin.status.enabled");
    if (Number(status) === 2) return t("admin.wechat_mp.rss_admin.status.disabled");
    return t("admin.wechat_mp.rss_admin.status.invalid");
};

const copyText = async (value) => {
    const text = String(value || "");
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fall through to the legacy browser path.
        }
    }
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(input);
    return copied;
};

const WeChatReadRssManager = () => {
    const { t, i18n } = useTranslation();
    const { isDayMode, headingTextClass, mutedTextClass, subtleTextClass } = useAdminTheme();
    const [overview, setOverview] = useState(initialOverview);
    const [loading, setLoading] = useState(true);
    const [login, setLogin] = useState(initialLogin);
    const [loginQr, setLoginQr] = useState("");
    const [loginStarting, setLoginStarting] = useState(false);
    const [loginCancelling, setLoginCancelling] = useState(false);
    const [feedLink, setFeedLink] = useState("");
    const [discovering, setDiscovering] = useState(false);
    const [discoveredFeeds, setDiscoveredFeeds] = useState([]);
    const [busyAction, setBusyAction] = useState("");
    const [selectedFeedId, setSelectedFeedId] = useState("");
    const [articles, setArticles] = useState([]);
    const [articlesLoading, setArticlesLoading] = useState(false);

    const text = useCallback(
        (key, defaultValue, options = {}) =>
            t(`admin.wechat_mp.rss_admin.${key}`, { defaultValue, ...options }),
        [t]
    );
    const accounts = overview.accounts?.items || [];
    const feeds = overview.feeds?.items || [];
    const selectedFeed = feeds.find((feed) => feed.id === selectedFeedId) || null;
    const historyRunning = Boolean(overview.history?.id);

    const loadOverview = useCallback(
        async ({ silent = false } = {}) => {
            if (!silent) setLoading(true);
            try {
                const response = await api.get("/admin/wechat-rss", { noRetry: true });
                setOverview({ ...initialOverview, ...(response.data || {}) });
            } catch (error) {
                if (!silent) {
                    toast.error(
                        getErrorMessage(error, text("errors.load", "加载 WeWe RSS 状态失败"))
                    );
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [text]
    );

    const loadArticles = useCallback(
        async (feedId) => {
            if (!feedId) {
                setArticles([]);
                return;
            }
            setArticlesLoading(true);
            try {
                const response = await api.get(`/admin/wechat-rss/feeds/${feedId}/articles`, {
                    params: { limit: 100 },
                    noRetry: true,
                });
                setArticles(response.data?.items || []);
            } catch (error) {
                toast.error(getErrorMessage(error, text("errors.articles", "加载 RSS 文章失败")));
            } finally {
                setArticlesLoading(false);
            }
        },
        [text]
    );

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (!selectedFeedId && feeds[0]?.id) {
            setSelectedFeedId(feeds[0].id);
            return;
        }
        if (selectedFeedId && !feeds.some((feed) => feed.id === selectedFeedId)) {
            setSelectedFeedId(feeds[0]?.id || "");
        }
    }, [feeds, selectedFeedId]);

    useEffect(() => {
        loadArticles(selectedFeedId);
    }, [loadArticles, selectedFeedId]);

    useEffect(() => {
        if (!login.scan_url) {
            setLoginQr("");
            return undefined;
        }
        let alive = true;
        setLoginQr("");
        QRCode.toDataURL(login.scan_url, {
            width: 240,
            margin: 1,
            color: { dark: isDayMode ? "#17231f" : "#101418", light: "#ffffff" },
        })
            .then((url) => {
                if (alive) setLoginQr(url);
            })
            .catch(() => {
                if (alive) toast.error(text("errors.qr", "二维码生成失败"));
            });
        return () => {
            alive = false;
        };
    }, [isDayMode, login.scan_url, text]);

    useEffect(() => {
        if (!login.active || !login.uuid) return undefined;
        let stopped = false;
        let timer = null;
        const poll = async () => {
            try {
                const response = await api.get("/admin/wechat-rss/login/status", {
                    params: { id: login.uuid },
                    noRetry: true,
                });
                if (stopped) return;
                const nextLogin = response.data || initialLogin;
                setLogin(nextLogin);
                if (nextLogin.stage === "saved") {
                    toast.success(text("toasts.login_saved", "微信读书账号已保存"));
                    await loadOverview({ silent: true });
                } else if (nextLogin.active) {
                    timer = window.setTimeout(poll, 1200);
                }
            } catch (error) {
                if (stopped) return;
                toast.error(
                    getErrorMessage(error, text("errors.login", "获取微信读书登录状态失败"))
                );
                timer = window.setTimeout(poll, 3000);
            }
        };
        timer = window.setTimeout(poll, 300);
        return () => {
            stopped = true;
            if (timer) window.clearTimeout(timer);
        };
    }, [loadOverview, login.active, login.uuid, text]);

    useEffect(() => {
        if (!overview.refresh_running && !historyRunning) return undefined;
        const timer = window.setInterval(() => loadOverview({ silent: true }), 4000);
        return () => window.clearInterval(timer);
    }, [historyRunning, loadOverview, overview.refresh_running]);

    const startLogin = async () => {
        setLoginStarting(true);
        try {
            const response = await api.post("/admin/wechat-rss/login/start", {}, { noRetry: true });
            setLogin(response.data || initialLogin);
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.login_start", "启动微信读书登录失败")));
        } finally {
            setLoginStarting(false);
        }
    };

    const cancelLogin = async () => {
        setLoginCancelling(true);
        try {
            const response = await api.post(
                "/admin/wechat-rss/login/cancel",
                { id: login.uuid },
                { noRetry: true }
            );
            setLogin(response.data || initialLogin);
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.login_cancel", "取消登录失败")));
        } finally {
            setLoginCancelling(false);
        }
    };

    const updateAccountStatus = async (account) => {
        const nextStatus = Number(account.status) === 1 ? 2 : 1;
        const action = `account-status-${account.id}`;
        setBusyAction(action);
        try {
            await api.patch(`/admin/wechat-rss/accounts/${account.id}`, { status: nextStatus });
            await loadOverview({ silent: true });
            toast.success(text("toasts.account_updated", "读书账号状态已更新"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.account_update", "更新读书账号失败")));
        } finally {
            setBusyAction("");
        }
    };

    const deleteAccount = async (account) => {
        if (
            !window.confirm(
                text("confirm.account", `确认删除“${account.name || account.id}”？`, {
                    name: account.name || account.id,
                })
            )
        ) {
            return;
        }
        const action = `account-delete-${account.id}`;
        setBusyAction(action);
        try {
            await api.delete(`/admin/wechat-rss/accounts/${account.id}`);
            await loadOverview({ silent: true });
            toast.success(text("toasts.account_deleted", "读书账号已删除"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.account_delete", "删除读书账号失败")));
        } finally {
            setBusyAction("");
        }
    };

    const discoverFeed = async () => {
        if (!feedLink.trim()) {
            toast.error(text("errors.link_required", "请填写公众号文章链接"));
            return;
        }
        setDiscovering(true);
        setDiscoveredFeeds([]);
        try {
            const response = await api.post(
                "/admin/wechat-rss/feeds/discover",
                { wxs_link: feedLink.trim() },
                { noRetry: true }
            );
            setDiscoveredFeeds(response.data?.items || []);
            if (!response.data?.items?.length) {
                toast.error(text("errors.link_not_found", "没有找到对应的公众号订阅源"));
            }
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.discover", "解析公众号订阅源失败")));
        } finally {
            setDiscovering(false);
        }
    };

    const addFeed = async (feed) => {
        const action = `feed-add-${feed.id}`;
        setBusyAction(action);
        try {
            await api.post("/admin/wechat-rss/feeds", feed, { retryWrites: true });
            setFeedLink("");
            setDiscoveredFeeds([]);
            await loadOverview({ silent: true });
            setSelectedFeedId(feed.id);
            toast.success(text("toasts.feed_added", "公众号订阅源已添加"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.feed_add", "添加订阅源失败")));
        } finally {
            setBusyAction("");
        }
    };

    const toggleFeedStatus = async (feed) => {
        const nextStatus = Number(feed.status) === 1 ? 2 : 1;
        const action = `feed-status-${feed.id}`;
        setBusyAction(action);
        try {
            await api.patch(`/admin/wechat-rss/feeds/${feed.id}`, { status: nextStatus });
            await loadOverview({ silent: true });
            toast.success(text("toasts.feed_updated", "订阅源状态已更新"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.feed_update", "更新订阅源失败")));
        } finally {
            setBusyAction("");
        }
    };

    const refreshFeed = async (feed) => {
        const action = `feed-refresh-${feed.id}`;
        setBusyAction(action);
        try {
            await api.post(`/admin/wechat-rss/feeds/${feed.id}/refresh`, {}, { noRetry: true });
            await loadOverview({ silent: true });
            await loadArticles(feed.id);
            toast.success(text("toasts.feed_refreshed", "订阅源已更新"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.feed_refresh", "更新订阅源文章失败")));
        } finally {
            setBusyAction("");
        }
    };

    const refreshAllFeeds = async () => {
        setBusyAction("feed-refresh-all");
        try {
            await api.post("/admin/wechat-rss/feeds/refresh-all", {}, { noRetry: true });
            await loadOverview({ silent: true });
            if (selectedFeedId) await loadArticles(selectedFeedId);
            toast.success(text("toasts.all_refreshed", "全部订阅源已更新"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.all_refresh", "更新全部订阅源失败")));
        } finally {
            setBusyAction("");
        }
    };

    const updateHistory = async (feed) => {
        const action = historyRunning ? "history-cancel" : `history-start-${feed.id}`;
        setBusyAction(action);
        try {
            if (historyRunning) {
                await api.post("/admin/wechat-rss/history/cancel", {}, { noRetry: true });
            } else {
                await api.post(`/admin/wechat-rss/feeds/${feed.id}/history`, {}, { noRetry: true });
            }
            await loadOverview({ silent: true });
            toast.success(
                text(
                    historyRunning ? "toasts.history_cancelled" : "toasts.history_started",
                    "历史文章任务状态已更新"
                )
            );
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.history", "历史文章任务失败")));
        } finally {
            setBusyAction("");
        }
    };

    const deleteFeed = async (feed) => {
        if (
            !window.confirm(
                text("confirm.feed", `确认删除“${feed.mpName || feed.id}”？`, {
                    name: feed.mpName || feed.id,
                })
            )
        )
            return;
        const action = `feed-delete-${feed.id}`;
        setBusyAction(action);
        try {
            await api.delete(`/admin/wechat-rss/feeds/${feed.id}`);
            await loadOverview({ silent: true });
            toast.success(text("toasts.feed_deleted", "订阅源已删除"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.feed_delete", "删除订阅源失败")));
        } finally {
            setBusyAction("");
        }
    };

    const deleteArticle = async (article) => {
        if (
            !window.confirm(
                text("confirm.article", `确认删除文章“${article.title}”？`, {
                    name: article.title,
                })
            )
        )
            return;
        const action = `article-delete-${article.id}`;
        setBusyAction(action);
        try {
            await api.delete(`/admin/wechat-rss/articles/${encodeURIComponent(article.id)}`);
            await loadArticles(selectedFeedId);
            toast.success(text("toasts.article_deleted", "文章已删除"));
        } catch (error) {
            toast.error(getErrorMessage(error, text("errors.article_delete", "删除文章失败")));
        } finally {
            setBusyAction("");
        }
    };

    const feedCountText = useMemo(
        () => text("metrics.feed_count", `${feeds.length} 个订阅源`, { count: feeds.length }),
        [feeds.length, text]
    );

    return (
        <div className="space-y-3">
            <AdminInlineNote tone={overview.configured ? "success" : "warning"}>
                {overview.configured
                    ? text(
                          "notes.configured",
                          "WeRead 管理已接入主平台后台。微信读书 Token 只保存在 WeWe RSS 服务端，浏览器不会接触。"
                      )
                    : text(
                          "notes.not_configured",
                          "主平台后端尚未配置 WEWE_RSS_AUTH_CODE；配置后即可在这里完成微信读书登录和订阅源管理。"
                      )}
            </AdminInlineNote>

            <div className="grid gap-3 sm:grid-cols-3">
                <AdminMetricCard
                    label={text("metrics.accounts", "读书账号")}
                    value={accounts.length}
                    icon={UserRound}
                    tone="indigo"
                />
                <AdminMetricCard
                    label={text("metrics.feeds", "公众号订阅源")}
                    value={feeds.length}
                    helper={feedCountText}
                    icon={BookOpen}
                    tone="emerald"
                />
                <AdminMetricCard
                    label={text("metrics.connection", "后端连接")}
                    value={
                        overview.configured
                            ? text("status.ready", "已接入")
                            : text("status.missing", "待配置")
                    }
                    icon={overview.configured ? CheckCircle2 : XCircle}
                    tone={overview.configured ? "emerald" : "amber"}
                />
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <AdminPanel
                    title={text("accounts.title", "微信读书账号")}
                    description={text(
                        "accounts.description",
                        "在主平台后台发起微信读书扫码登录；账号令牌由 WeWe RSS 服务端保存。"
                    )}
                    action={
                        login.active ? (
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
                                {text("actions.cancel_login", "取消登录")}
                            </AdminButton>
                        ) : (
                            <AdminButton
                                tone="primary"
                                onClick={startLogin}
                                disabled={loginStarting || !overview.configured}
                            >
                                {loginStarting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Play size={16} />
                                )}
                                {text("actions.add_account", "添加账号")}
                            </AdminButton>
                        )
                    }
                >
                    {login.active ? (
                        <div className="grid gap-4 sm:grid-cols-[240px_minmax(0,1fr)] sm:items-center">
                            <div className="mx-auto flex h-[240px] w-[240px] items-center justify-center bg-white p-2">
                                {loginQr ? (
                                    <img
                                        src={loginQr}
                                        alt={text("login.qr_alt", "微信读书登录二维码")}
                                        className="h-full w-full"
                                    />
                                ) : (
                                    <Loader2 size={28} className="animate-spin text-slate-500" />
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className={headingTextClass}>
                                    {login.message ||
                                        text("login.waiting", "请使用微信扫描二维码登录")}
                                </div>
                                <p className={mutedTextClass}>
                                    {text(
                                        "login.note",
                                        "登录完成后，账号会自动保存到 WeWe RSS 后端，不会把 Token 返回给浏览器。"
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className={mutedTextClass}>{text("loading", "加载中...")}</div>
                    ) : accounts.length ? (
                        <div className="space-y-2">
                            {accounts.map((account) => (
                                <div
                                    key={account.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(128,146,167,0.14)] py-2.5 last:border-b-0"
                                >
                                    <div className="min-w-0">
                                        <div className={headingTextClass}>
                                            {account.name || account.id}
                                        </div>
                                        <div className={mutedTextClass}>{account.id}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={
                                                Number(account.status) === 1
                                                    ? "text-xs text-emerald-500"
                                                    : "text-xs text-amber-500"
                                            }
                                        >
                                            {statusLabel(account.status, t)}
                                        </span>
                                        <AdminIconButton
                                            label={
                                                Number(account.status) === 1
                                                    ? text("actions.disable_account", "停用账号")
                                                    : text("actions.enable_account", "启用账号")
                                            }
                                            onClick={() => updateAccountStatus(account)}
                                            disabled={busyAction === `account-status-${account.id}`}
                                        >
                                            {busyAction === `account-status-${account.id}` ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : Number(account.status) === 1 ? (
                                                <PauseCircle size={16} />
                                            ) : (
                                                <CheckCircle2 size={16} />
                                            )}
                                        </AdminIconButton>
                                        <AdminIconButton
                                            label={text("actions.delete_account", "删除账号")}
                                            tone="danger"
                                            onClick={() => deleteAccount(account)}
                                            disabled={busyAction === `account-delete-${account.id}`}
                                        >
                                            {busyAction === `account-delete-${account.id}` ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={16} />
                                            )}
                                        </AdminIconButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <AdminEmptyState
                            icon={UserRound}
                            title={text("accounts.empty_title", "还没有微信读书账号")}
                            description={text(
                                "accounts.empty_desc",
                                "点击右上角添加账号并扫码登录。"
                            )}
                        />
                    )}
                </AdminPanel>

                <AdminPanel
                    title={text("feeds.title", "公众号订阅源")}
                    description={text(
                        "feeds.description",
                        "粘贴一篇 mp.weixin.qq.com 文章链接，WeRead 会解析并维护对应公众号。"
                    )}
                    action={
                        <AdminButton
                            tone="subtle"
                            onClick={refreshAllFeeds}
                            disabled={!overview.configured || busyAction === "feed-refresh-all"}
                        >
                            {busyAction === "feed-refresh-all" ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <RefreshCw size={16} />
                            )}
                            {text("actions.refresh_all", "更新全部")}
                        </AdminButton>
                    }
                >
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                            value={feedLink}
                            onChange={(event) => setFeedLink(event.target.value)}
                            className="theme-admin-input rect-field min-h-[40px] min-w-0 flex-1 px-3 py-2 text-sm"
                            placeholder={text(
                                "feeds.link_placeholder",
                                "https://mp.weixin.qq.com/s/..."
                            )}
                        />
                        <AdminButton
                            tone="primary"
                            onClick={discoverFeed}
                            disabled={discovering || !overview.configured}
                        >
                            {discovering ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Link2 size={16} />
                            )}
                            {text("actions.discover", "解析订阅源")}
                        </AdminButton>
                    </div>
                    <p className={clsx("mt-2 text-xs leading-5", mutedTextClass)}>
                        {text(
                            "feeds.link_note",
                            "需要至少有一个已启用的微信读书账号；这里只保存公众号订阅源，不保存文章链接作为凭据。"
                        )}
                    </p>

                    {discoveredFeeds.length ? (
                        <div className="mt-3 space-y-2">
                            {discoveredFeeds.map((feed) => (
                                <div
                                    key={feed.id}
                                    className="flex flex-wrap items-center justify-between gap-3 border border-indigo-500/20 bg-indigo-500/[0.06] p-3"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {feed.mpCover ? (
                                            <img
                                                src={feed.mpCover}
                                                alt=""
                                                className="h-9 w-9 rounded object-cover"
                                            />
                                        ) : (
                                            <BookOpen size={20} className={mutedTextClass} />
                                        )}
                                        <div className="min-w-0">
                                            <div className={headingTextClass}>
                                                {feed.mpName || feed.id}
                                            </div>
                                            <div className={mutedTextClass}>{feed.id}</div>
                                        </div>
                                    </div>
                                    <AdminButton
                                        tone="success"
                                        onClick={() => addFeed(feed)}
                                        disabled={busyAction === `feed-add-${feed.id}`}
                                    >
                                        {busyAction === `feed-add-${feed.id}` ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <CheckCircle2 size={16} />
                                        )}
                                        {text("actions.add_feed", "添加")}
                                    </AdminButton>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-4 space-y-2">
                        {feeds.length ? (
                            feeds.map((feed) => (
                                <div
                                    key={feed.id}
                                    className={
                                        selectedFeedId === feed.id
                                            ? "border border-indigo-500/30 bg-indigo-500/[0.06] p-3"
                                            : "border border-[rgba(128,146,167,0.14)] p-3"
                                    }
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <button
                                            type="button"
                                            className="flex min-w-0 items-center gap-3 text-left"
                                            onClick={() => setSelectedFeedId(feed.id)}
                                        >
                                            {feed.mpCover ? (
                                                <img
                                                    src={feed.mpCover}
                                                    alt=""
                                                    className="h-9 w-9 rounded object-cover"
                                                />
                                            ) : (
                                                <BookOpen size={20} className={mutedTextClass} />
                                            )}
                                            <span className="min-w-0">
                                                <span
                                                    className={clsx(
                                                        "block truncate",
                                                        headingTextClass
                                                    )}
                                                >
                                                    {feed.mpName || feed.id}
                                                </span>
                                                <span
                                                    className={clsx(
                                                        "block truncate text-xs",
                                                        mutedTextClass
                                                    )}
                                                >
                                                    {feed.id} · {statusLabel(feed.status, t)}
                                                </span>
                                            </span>
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <AdminIconButton
                                                label={text("actions.copy_feed", "复制 Feed 地址")}
                                                onClick={async () => {
                                                    const copied = await copyText(feed.feedUrl);
                                                    toast[copied ? "success" : "error"](
                                                        copied
                                                            ? text(
                                                                  "toasts.feed_copied",
                                                                  "Feed 地址已复制"
                                                              )
                                                            : text("errors.copy", "复制失败")
                                                    );
                                                }}
                                            >
                                                <Clipboard size={16} />
                                            </AdminIconButton>
                                            <AdminIconButton
                                                label={text("actions.refresh", "立即更新")}
                                                onClick={() => refreshFeed(feed)}
                                                disabled={busyAction === `feed-refresh-${feed.id}`}
                                            >
                                                {busyAction === `feed-refresh-${feed.id}` ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <RefreshCw size={16} />
                                                )}
                                            </AdminIconButton>
                                            <AdminIconButton
                                                label={
                                                    Number(feed.status) === 1
                                                        ? text("actions.disable_feed", "停用订阅源")
                                                        : text("actions.enable_feed", "启用订阅源")
                                                }
                                                onClick={() => toggleFeedStatus(feed)}
                                                disabled={busyAction === `feed-status-${feed.id}`}
                                            >
                                                {busyAction === `feed-status-${feed.id}` ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : Number(feed.status) === 1 ? (
                                                    <PauseCircle size={16} />
                                                ) : (
                                                    <CheckCircle2 size={16} />
                                                )}
                                            </AdminIconButton>
                                            <AdminIconButton
                                                label={text("actions.delete_feed", "删除订阅源")}
                                                tone="danger"
                                                onClick={() => deleteFeed(feed)}
                                                disabled={busyAction === `feed-delete-${feed.id}`}
                                            >
                                                {busyAction === `feed-delete-${feed.id}` ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Trash2 size={16} />
                                                )}
                                            </AdminIconButton>
                                        </div>
                                    </div>
                                    <div
                                        className={clsx(
                                            "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs",
                                            mutedTextClass
                                        )}
                                    >
                                        <span>
                                            {text("feeds.last_sync", "上次同步")}:{" "}
                                            {feed.syncTime
                                                ? formatDateTime(
                                                      feed.syncTime * 1000,
                                                      i18n.resolvedLanguage
                                                  )
                                                : text("status.never", "从未")}
                                        </span>
                                        {feed.feedUrl ? (
                                            <a
                                                href={feed.feedUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                                            >
                                                {text("actions.open_feed", "打开 Feed")}
                                                <ExternalLink size={13} />
                                            </a>
                                        ) : null}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <AdminEmptyState
                                icon={BookOpen}
                                title={text("feeds.empty_title", "还没有公众号订阅源")}
                                description={text(
                                    "feeds.empty_desc",
                                    "粘贴一篇公众号文章链接开始添加。"
                                )}
                            />
                        )}
                    </div>
                </AdminPanel>
            </div>

            <AdminPanel
                title={text("articles.title", "订阅源文章")}
                description={
                    selectedFeed
                        ? `${selectedFeed.mpName || selectedFeed.id} · ${text("articles.description", "文章由 WeWe RSS 同步到当前订阅源")}`
                        : text("articles.select_feed", "选择一个订阅源查看文章")
                }
                action={
                    selectedFeed ? (
                        <ToolbarGroupFallback>
                            <AdminButton
                                tone="subtle"
                                onClick={() => updateHistory(selectedFeed)}
                                disabled={busyAction !== "" || !overview.configured}
                            >
                                {busyAction === "history-start-" + selectedFeed.id ||
                                busyAction === "history-cancel" ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : historyRunning ? (
                                    <PauseCircle size={16} />
                                ) : (
                                    <History size={16} />
                                )}
                                {historyRunning
                                    ? text("actions.stop_history", "停止历史同步")
                                    : text("actions.history", "同步历史文章")}
                            </AdminButton>
                            <AdminButton
                                tone="subtle"
                                onClick={() => loadArticles(selectedFeed.id)}
                                disabled={articlesLoading}
                            >
                                {articlesLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <RefreshCw size={16} />
                                )}
                                {text("actions.refresh_articles", "刷新文章")}
                            </AdminButton>
                        </ToolbarGroupFallback>
                    ) : null
                }
            >
                {selectedFeed && overview.history?.id === selectedFeed.id ? (
                    <AdminInlineNote tone="info">
                        {text("articles.history_progress", "正在同步历史文章，第 {{page}} 页", {
                            page: overview.history.page,
                        })}
                    </AdminInlineNote>
                ) : null}
                {articlesLoading ? (
                    <div className={mutedTextClass}>{text("loading", "加载中...")}</div>
                ) : articles.length ? (
                    <div className="space-y-2">
                        {articles.map((article) => (
                            <div
                                key={article.id}
                                className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(128,146,167,0.14)] py-2.5 last:border-b-0"
                            >
                                <div className="min-w-0">
                                    <a
                                        href={`https://mp.weixin.qq.com/s/${article.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={clsx(
                                            "block truncate font-semibold hover:underline",
                                            headingTextClass
                                        )}
                                    >
                                        {article.title || text("articles.untitled", "未命名文章")}
                                    </a>
                                    <div className={clsx("text-xs", mutedTextClass)}>
                                        {article.publishTime
                                            ? formatDateTime(
                                                  article.publishTime * 1000,
                                                  i18n.resolvedLanguage
                                              )
                                            : text("status.never", "从未")}
                                    </div>
                                </div>
                                <AdminIconButton
                                    label={text("actions.delete_article", "删除文章")}
                                    tone="danger"
                                    onClick={() => deleteArticle(article)}
                                    disabled={busyAction === `article-delete-${article.id}`}
                                >
                                    {busyAction === `article-delete-${article.id}` ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </AdminIconButton>
                            </div>
                        ))}
                    </div>
                ) : (
                    <AdminEmptyState
                        icon={BookOpen}
                        title={text("articles.empty_title", "还没有文章")}
                        description={
                            selectedFeed
                                ? text(
                                      "articles.empty_desc",
                                      "点击立即更新，或先完成微信读书账号登录。"
                                  )
                                : text("articles.select_feed", "选择一个订阅源查看文章")
                        }
                    />
                )}
            </AdminPanel>

            <p className={clsx("text-xs leading-5", subtleTextClass)}>
                {text(
                    "footer",
                    "当前平台只代理管理 API；WeWe RSS 的 MySQL、微信读书登录态和原始同步逻辑仍由 rss.tuotuzju.com 内部服务维护。"
                )}
            </p>
        </div>
    );
};

const ToolbarGroupFallback = ({ children }) => (
    <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
);

export default WeChatReadRssManager;
