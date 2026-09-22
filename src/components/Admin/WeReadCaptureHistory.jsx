import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import {
    AdminPanel,
    AdminButton,
    AdminMetricCard,
    AdminInlineNote,
    useAdminTheme,
} from "./AdminUI";

export default function WeReadCaptureHistory({ overview, sourceId, openSource }) {
    const { t, i18n } = useTranslation();
    const tr = (key, values) => t(`admin.weread.${key}`, values);
    const theme = useAdminTheme();
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        setPage(1);
        setDetail(null);
    }, [sourceId]);
    useEffect(() => {
        if (!sourceId) return;
        const controller = new AbortController();
        let pending = false;
        const refresh = async () => {
            if (pending) return;
            pending = true;
            try {
                const response = await api.get(
                    `/admin/weread/sources/${encodeURIComponent(sourceId)}/articles`,
                    {
                        params: { page },
                        signal: controller.signal,
                        noRetry: true,
                        silent: true,
                    }
                );
                if (!controller.signal.aborted) {
                    setDetail(response.data);
                    setError(false);
                }
            } catch {
                if (!controller.signal.aborted) setError(true);
            } finally {
                pending = false;
            }
        };
        refresh();
        const timer = setInterval(refresh, 15000);
        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [sourceId, page]);
    const date = (value) => (value ? new Date(value).toLocaleString(i18n.language) : tr("unknown"));
    const rows = sourceId
        ? detail?.id === sourceId && detail?.page === page
            ? detail.articles
            : []
        : (overview.recent_articles || []).slice(0, 10);
    const status = (value) =>
        tr(`pipeline.${value || "unknown"}`, { defaultValue: value || tr("unknown") });
    return (
        <section id="weread-captures" className="scroll-mt-24 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
                <AdminMetricCard
                    label={tr("capturedTotal")}
                    value={overview.captured_total}
                    helper={tr("uniqueCaptureHint")}
                />
                <AdminMetricCard
                    label={tr("captured24h")}
                    value={overview.captured_24h}
                    helper={tr("firstSeenHint")}
                />
                <AdminMetricCard
                    label={tr("sources24h")}
                    value={overview.captured_sources_24h}
                    helper={tr("sources24hHint")}
                />
            </div>
            <AdminPanel
                title={
                    sourceId
                        ? detail?.id === sourceId
                            ? detail.name
                            : tr("sourceArticles")
                        : tr("recentCaptures")
                }
                description={tr(sourceId ? "sourceArticlesHint" : "recentCapturesHint")}
                action={
                    sourceId && (
                        <AdminButton onClick={() => openSource("")}>
                            {tr("backToCaptures")}
                        </AdminButton>
                    )
                }
            >
                {error && sourceId && (
                    <AdminInlineNote tone="warning">{tr("loadError")}</AdminInlineNote>
                )}
                {!rows.length && (
                    <p className={theme.mutedTextClass}>
                        {tr(sourceId && !detail && !error ? "loading" : "noArticles")}
                    </p>
                )}
                <div className="space-y-3">
                    {rows.map((article) => (
                        <article
                            key={article.link}
                            className={`rounded-xl border p-4 ${theme.panelClass}`}
                        >
                            <button
                                className="text-sm font-semibold underline underline-offset-4"
                                onClick={() => openSource(article.source_id)}
                            >
                                {article.source_name}
                            </button>
                            <a
                                href={article.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 block break-words font-semibold underline underline-offset-4"
                            >
                                {article.title || tr("noTitle")} ↗
                            </a>
                            <p className={`mt-1 text-xs ${theme.mutedTextClass}`}>
                                {tr("capturedAt", { time: date(article.observed_at) })}
                                {article.published_at
                                    ? ` · ${tr("publishedAt", { time: date(article.published_at) })}`
                                    : ""}
                            </p>
                            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                                {[
                                    [
                                        "bodyStage",
                                        article.body_status === "pending"
                                            ? "body_pending"
                                            : article.body_status,
                                    ],
                                    [
                                        "importStage",
                                        article.imported ? article.content_status : "not_imported",
                                    ],
                                    ["aiStage", article.extraction_status],
                                    [
                                        "reviewStage",
                                        article.activity_status === "rejected"
                                            ? "not_candidate"
                                            : article.activity_status === "failed"
                                              ? "screen_failed"
                                              : article.review_status ||
                                                (article.event_id
                                                    ? "missing_event"
                                                    : "not_screened"),
                                    ],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className={`text-xs ${theme.mutedTextClass}`}>
                                            {tr(label)}
                                        </dt>
                                        <dd className="mt-1">{status(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                            {article.body_status === "pending" && (
                                <div
                                    className={`mt-3 rounded-lg border p-3 text-sm ${theme.panelClass}`}
                                >
                                    <p>
                                        {tr("bodyFailure", {
                                            reason: tr(
                                                `bodyErrors.${article.body_error || "not_attempted"}`,
                                                {
                                                    defaultValue:
                                                        article.body_error || tr("waiting"),
                                                }
                                            ),
                                        })}
                                    </p>
                                    {article.weread_error && (
                                        <p>
                                            {tr("wereadRoute")}:{" "}
                                            {tr(`bodyErrors.${article.weread_error}`, {
                                                defaultValue: article.weread_error,
                                            })}
                                        </p>
                                    )}
                                    {article.public_error && (
                                        <p>
                                            {tr("publicRoute")}:{" "}
                                            {tr(`bodyErrors.${article.public_error}`, {
                                                defaultValue: article.public_error,
                                            })}
                                        </p>
                                    )}
                                    <p>
                                        {tr("bodyRetryInfo", {
                                            count: article.body_failures,
                                            last: date(article.body_last_attempt_at),
                                            next: date(article.body_next_retry),
                                        })}
                                    </p>
                                </div>
                            )}
                            {overview.vision_enabled &&
                                article.body_status === "ready" &&
                                !article.vision && (
                                    <p className="mt-3 text-sm">{tr("visionQueued")}</p>
                                )}
                            {article.vision && (
                                <div className="mt-3 border-t pt-3 text-sm">
                                    <p>
                                        {tr("visionProgress", {
                                            status: tr(`visionStates.${article.vision.status}`),
                                            done: article.vision.processed,
                                            total: article.vision.total,
                                            failed: article.vision.failed,
                                            chars: article.vision.ocr_chars,
                                        })}
                                    </p>
                                    {article.vision.uncertain && <p>{tr("visionUncertain")}</p>}
                                    {article.vision.selected_image && (
                                        <div className="mt-2 flex items-start gap-3">
                                            <img
                                                src={article.vision.selected_image}
                                                alt={tr("selectedImage")}
                                                loading="lazy"
                                                className="h-20 w-28 rounded object-contain"
                                            />
                                            <p>
                                                {tr("selectedImage")}:{" "}
                                                {article.vision.selection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                            {article.activity_reason && (
                                <p className={`mt-2 break-words text-xs ${theme.mutedTextClass}`}>
                                    {tr("screenReason", { reason: article.activity_reason })}
                                </p>
                            )}
                        </article>
                    ))}
                </div>
                {sourceId && detail?.id === sourceId && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <AdminButton disabled={page <= 1} onClick={() => setPage(page - 1)}>
                            {tr("previousPage")}
                        </AdminButton>
                        <span>{tr("articlePage", { page, total: detail.total })}</span>
                        <AdminButton
                            disabled={page * detail.page_size >= detail.total}
                            onClick={() => setPage(page + 1)}
                        >
                            {tr("nextPage")}
                        </AdminButton>
                    </div>
                )}
            </AdminPanel>
        </section>
    );
}
