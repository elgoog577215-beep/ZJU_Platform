import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, BookOpen, Clock, FileClock, Pause, Play, RefreshCw, QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useSearchParams } from "react-router-dom";
import WeReadCaptureHistory from "./WeReadCaptureHistory";
import {
    AdminPageShell,
    AdminPanel,
    AdminButton,
    AdminInlineNote,
    AdminMetricCard,
    AdminLoadingState,
    useAdminTheme,
} from "./AdminUI";

export default function WeReadCollectorManager() {
    const { t, i18n } = useTranslation();
    const tr = (key, values) => t(`admin.weread.${key}`, values);
    const theme = useAdminTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const openSource = (id) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (id) next.set("source", id);
            else next.delete("source");
            return next;
        });
        document.getElementById("weread-captures")?.scrollIntoView({ block: "start" });
    };
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [busy, setBusy] = useState(false);
    const [minutes, setMinutes] = useState(15);
    const [qr, setQr] = useState(null);
    const refreshing = useRef(false);
    const refresh = useCallback(async () => {
        if (refreshing.current) return;
        refreshing.current = true;
        try {
            const response = await api.get("/admin/weread", { noRetry: true, silent: true });
            setData(response.data);
            setError(false);
        } catch {
            setError(true);
        } finally {
            refreshing.current = false;
        }
    }, []);
    useEffect(() => {
        refresh();
        const timer = setInterval(refresh, 15000);
        return () => clearInterval(timer);
    }, [refresh]);
    useEffect(() => {
        if (data) setMinutes(data.poll_seconds / 60);
    }, [data?.poll_seconds]);
    useEffect(() => {
        if (!qr) return;
        let stopped = false;
        let checking = false;
        const timer = setInterval(async () => {
            if (checking) return;
            checking = true;
            try {
                const response = await api.get("/admin/weread/login", {
                    noRetry: true,
                    silent: true,
                });
                if (!stopped && response.data.logged_in) {
                    setQr(null);
                    toast.success(t("admin.weread.loginSuccess"));
                    refresh();
                }
            } catch {
                if (!stopped) {
                    setQr(null);
                    toast.error(t("admin.weread.actionError"));
                }
            } finally {
                checking = false;
            }
        }, 5000);
        const timeout = setTimeout(() => setQr(null), 180000);
        return () => {
            stopped = true;
            clearInterval(timer);
            clearTimeout(timeout);
        };
    }, [qr, refresh, t]);
    const act = async (route, body, method = "patch") => {
        setBusy(true);
        try {
            const response = await api[method](`/admin/weread/${route}`, body, {
                noRetry: true,
                silent: true,
            });
            if (route === "login") setQr(response.data.image);
            else toast.success(tr(route === "import" ? "importStarted" : "queued"));
            await refresh();
        } catch (err) {
            const code = err.response?.data?.error;
            toast.error(tr(code === "WEREAD_WORKER_UPGRADE_REQUIRED" ? "upgrade" : "actionError"));
        } finally {
            setBusy(false);
        }
    };
    const date = (value) => {
        if (!value) return tr("unknown");
        const parsed = new Date(
            typeof value === "number"
                ? value * 1000
                : /(?:Z|[+-]\d\d:\d\d)$/.test(value)
                  ? value
                  : `${value.replace(" ", "T")}Z`
        );
        return Number.isNaN(parsed.getTime())
            ? tr("unknown")
            : parsed.toLocaleString(i18n.language);
    };
    const status = !data?.online
        ? "offline"
        : data.auth_required
          ? "authRequired"
          : data.error
            ? "attention"
            : data.paused
              ? "paused"
              : data.pause_until * 1000 > Date.now()
                ? "backoff"
                : "running";
    const writable = !busy && data?.worker_version === 2 && !error;
    return (
        <AdminPageShell
            title={tr("title")}
            description={tr("description")}
            descriptionVisible
            actions={
                <AdminButton onClick={refresh} disabled={busy}>
                    <RefreshCw size={16} />
                    {tr("refresh")}
                </AdminButton>
            }
        >
            {error && (
                <div role="alert">
                    <AdminInlineNote tone="warning">{tr("loadError")}</AdminInlineNote>
                </div>
            )}
            {!data ? (
                !error && <AdminLoadingState text={tr("loading")} />
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <AdminMetricCard
                            label={tr("worker")}
                            value={tr(status)}
                            icon={Activity}
                            helper={tr("heartbeat", { time: date(data.heartbeat_at) })}
                        />
                        <AdminMetricCard
                            label={tr("sources")}
                            value={data.sources.length}
                            icon={BookOpen}
                            helper={tr("pollEvery", { minutes: data.poll_seconds / 60 })}
                        />
                        <AdminMetricCard
                            label={tr("pending")}
                            value={data.sources.reduce((n, s) => n + s.pending, 0)}
                            icon={FileClock}
                            helper={tr("pendingHint")}
                        />
                        <AdminMetricCard
                            label={tr("import")}
                            value={
                                data.last_run?.status === "completed"
                                    ? tr("completed")
                                    : data.last_run?.status === "running"
                                      ? tr("running")
                                      : tr("unknown")
                            }
                            icon={Clock}
                            helper={date(data.last_run?.started_at)}
                        />
                    </div>
                    <WeReadCaptureHistory
                        overview={data}
                        sourceId={searchParams.get("source") || ""}
                        openSource={openSource}
                    />
                    <AdminInlineNote>{tr("limits")}</AdminInlineNote>
                    {!data.configured && (
                        <AdminInlineNote tone="warning">{tr("unconfigured")}</AdminInlineNote>
                    )}
                    {data.worker_version !== 2 && (
                        <AdminInlineNote tone="warning">{tr("upgrade")}</AdminInlineNote>
                    )}
                    {data.control_pending && (
                        <p role="status" className={theme.mutedTextClass}>
                            {tr("controlPending")}
                        </p>
                    )}
                    {data.pause_until * 1000 > Date.now() && (
                        <AdminInlineNote tone="warning">
                            {tr("backoffUntil", { time: date(data.pause_until) })}
                        </AdminInlineNote>
                    )}
                    {data.error && (
                        <AdminInlineNote tone="warning">
                            {tr("workerError", { error: data.error })}
                        </AdminInlineNote>
                    )}
                    <AdminPanel
                        title={tr("authorization")}
                        description={tr("authHint")}
                        action={
                            <AdminButton
                                disabled={busy || !data.login_available}
                                onClick={() => act("login", {}, "post")}
                            >
                                <QrCode size={16} />
                                {tr("authorize")}
                            </AdminButton>
                        }
                    >
                        <p className={theme.subtleTextClass}>
                            {tr(
                                data.auth_required
                                    ? "authRequired"
                                    : data.last_success_at
                                      ? "authObserved"
                                      : "authUnknown",
                                { time: date(data.last_success_at) }
                            )}
                        </p>
                        {!data.login_available && (
                            <p className={theme.mutedTextClass}>{tr("loginUnconfigured")}</p>
                        )}
                        {qr && (
                            <div className="mt-4 flex flex-col items-center gap-3" role="status">
                                <img
                                    src={qr}
                                    alt={tr("qrAlt")}
                                    className="h-56 w-56 rounded-xl bg-white p-3"
                                />
                                <p>{tr("qrHint")}</p>
                                <AdminButton onClick={() => setQr(null)}>{tr("close")}</AdminButton>
                            </div>
                        )}
                    </AdminPanel>
                    <AdminPanel title={tr("schedule")} description={tr("scheduleHint")}>
                        <div className="flex flex-wrap items-end gap-3">
                            <label className="flex flex-col gap-1 text-sm">
                                {tr("interval")}
                                <input
                                    type="number"
                                    min="15"
                                    max="360"
                                    step="1"
                                    value={minutes}
                                    onChange={(e) => setMinutes(Number(e.target.value))}
                                    className="theme-input w-32 rounded-lg border p-2"
                                />
                            </label>
                            <AdminButton
                                disabled={
                                    !writable ||
                                    !Number.isInteger(minutes) ||
                                    minutes < 15 ||
                                    minutes > 360
                                }
                                onClick={() => act("control", { poll_seconds: minutes * 60 })}
                            >
                                {tr("save")}
                            </AdminButton>
                            <AdminButton
                                disabled={!writable}
                                onClick={() => act("control", { paused: !data.paused })}
                            >
                                {data.paused ? <Play size={16} /> : <Pause size={16} />}
                                {tr(data.paused ? "resume" : "pause")}
                            </AdminButton>
                            <AdminButton
                                disabled={
                                    busy ||
                                    error ||
                                    !data.configured ||
                                    data.last_run?.status === "running"
                                }
                                onClick={() => act("import", {}, "post")}
                            >
                                {tr("importNow")}
                            </AdminButton>
                        </div>
                        <p className={`mt-3 text-sm ${theme.mutedTextClass}`}>
                            {tr(data.import_minutes >= 5 ? "importHint" : "importDaily", {
                                minutes: data.import_minutes,
                            })}
                        </p>
                    </AdminPanel>
                    <AdminPanel title={tr("sources")} description={tr("sourceHint")}>
                        <div className="space-y-3">
                            {data.sources.map((source) => (
                                <article
                                    key={source.id}
                                    className={`rounded-xl border p-4 ${theme.panelClass}`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h4 className="font-semibold">
                                                <button
                                                    className="underline underline-offset-4"
                                                    onClick={() => openSource(source.id)}
                                                >
                                                    {source.name}
                                                </button>{" "}
                                                <span
                                                    className={`ml-2 text-xs ${theme.mutedTextClass}`}
                                                >
                                                    {tr(source.paused ? "paused" : "scheduled")}
                                                </span>
                                            </h4>
                                            <p className={`mt-1 text-xs ${theme.mutedTextClass}`}>
                                                {tr("sourceStats", {
                                                    total: source.total,
                                                    pending: source.pending,
                                                })}
                                            </p>
                                            <p className={`mt-1 text-xs ${theme.mutedTextClass}`}>
                                                {tr("sourceProcessing", {
                                                    recent: source.captured_24h,
                                                    imported: source.imported,
                                                    extracted: source.extracted,
                                                })}
                                                {" · "}
                                                {tr("capturedAt", {
                                                    time: date(source.captured_at),
                                                })}
                                            </p>
                                            <p className="mt-2 break-words text-sm">
                                                {source.latest_title || tr("noArticles")}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <AdminButton
                                                disabled={!writable}
                                                onClick={() =>
                                                    act("control", {
                                                        feed_id: source.id,
                                                        feed_paused: !source.paused,
                                                    })
                                                }
                                            >
                                                {tr(source.paused ? "resume" : "pause")}
                                            </AdminButton>
                                            <AdminButton
                                                disabled={
                                                    !writable ||
                                                    source.retry_pending ||
                                                    source.paused ||
                                                    data.paused
                                                }
                                                onClick={() =>
                                                    act("control", {
                                                        feed_id: source.id,
                                                        retry: true,
                                                    })
                                                }
                                            >
                                                {tr(source.retry_pending ? "retryQueued" : "retry")}
                                            </AdminButton>
                                        </div>
                                    </div>
                                    <p className={`mt-3 text-xs ${theme.mutedTextClass}`}>
                                        {tr("sourceTimes", {
                                            checked: date(source.checked_at),
                                            next:
                                                source.paused || data.paused
                                                    ? tr("paused")
                                                    : date(source.next_check),
                                        })}
                                    </p>
                                    {!source.import_enabled && (
                                        <p className="mt-2 text-sm text-amber-600">
                                            {tr("importDisabled")}
                                        </p>
                                    )}
                                    {source.error && (
                                        <p className="mt-2 break-all text-sm text-amber-600">
                                            {tr("sourceError", { error: source.error })}
                                        </p>
                                    )}
                                    {source.pending > 0 && (
                                        <details className="mt-3 text-sm">
                                            <summary className="cursor-pointer">
                                                {tr("pendingDetails")}
                                            </summary>
                                            <ul className="mt-2 space-y-2">
                                                {source.pending_articles.map((article, index) => (
                                                    <li key={index} className="break-words">
                                                        {article.title}
                                                        <span
                                                            className={`block text-xs ${theme.mutedTextClass}`}
                                                        >
                                                            {tr("retryAt", {
                                                                time: date(article.next_retry),
                                                                error:
                                                                    article.error || tr("waiting"),
                                                            })}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </article>
                            ))}
                        </div>
                    </AdminPanel>
                </>
            )}
        </AdminPageShell>
    );
}
