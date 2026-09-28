import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { bookmarksText, download, nameOf, titleOf } from "./workspace";
const options = { silent: true, noRetry: true, timeout: 15000 };
export function GroupPreview({ groups, english }) {
    return (
        <div className="workspace-preview">
            {groups.map((group) => (
                <details key={group.id} open={groups.length === 1}>
                    <summary>
                        {titleOf(group, english)} <small>{group.links.length}</small>
                    </summary>
                    <ul>
                        {group.links.map((link) => (
                            <li key={link.id}>
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                    {nameOf(link, english)}
                                </a>
                                <span>{link.url}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            ))}
        </div>
    );
}
export default function NavigationPlaza({ user, english, onAdd }) {
    const { t } = useTranslation("navigation");
    const [scope, setScope] = useState("public");
    const [query, setQuery] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [refresh, setRefresh] = useState(0);
    const [data, setData] = useState({ items: [], hasMore: false, canReview: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError("");
        setPreview(null);
        api.get("/navigation/collections", {
            ...options,
            params: { scope, q: search, offset: page * 12 },
        })
            .then((response) => {
                if (alive) setData(response.data);
            })
            .catch(() => {
                if (alive) setError(t("custom.loadError"));
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [scope, search, page, refresh]);
    async function inspect(item) {
        setBusy(true);
        setError("");
        setPreview(null);
        try {
            const response = await api.get(`/navigation/collections/${item.id}`, options);
            setPreview(response.data);
        } catch {
            setError(t("custom.loadError"));
        } finally {
            setBusy(false);
        }
    }
    async function changeStatus(item, status) {
        if (status === "withdrawn" && !window.confirm(t("custom.withdrawConfirm"))) return;
        setBusy(true);
        setError("");
        try {
            await api.patch(`/navigation/collections/${item.id}`, { status }, options);
            setRefresh((n) => n + 1);
        } catch {
            setError(t("custom.actionError"));
        } finally {
            setBusy(false);
        }
    }
    return (
        <section className="workspace-plaza" aria-labelledby="plaza-title">
            <div className="workspace-section-heading">
                <div>
                    <h2 id="plaza-title">{t("custom.plaza")}</h2>
                    <p>{t("custom.plazaHelp")}</p>
                </div>
            </div>
            <div className="workspace-plaza-toolbar">
                <div className="workspace-tabs" aria-label={t("custom.shareScope")}>
                    {[
                        "public",
                        ...(user ? ["mine"] : []),
                        ...(data.canReview ? ["review"] : []),
                    ].map((key) => (
                        <button
                            type="button"
                            disabled={busy}
                            key={key}
                            aria-pressed={scope === key}
                            onClick={() => {
                                setScope(key);
                                setPage(0);
                            }}
                        >
                            {t(`custom.${key}`)}
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setSearch(query.trim());
                        setPage(0);
                    }}
                >
                    <input
                        aria-label={t("custom.searchCollections")}
                        placeholder={t("custom.searchCollections")}
                        value={query}
                        maxLength={100}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button className="workspace-button">{t("custom.searchButton")}</button>
                </form>
            </div>
            {error && (
                <div role="alert" className="workspace-notice">
                    {error}
                    <button type="button" onClick={() => setRefresh((n) => n + 1)}>
                        {t("custom.retry")}
                    </button>
                </div>
            )}
            {loading ? (
                <p role="status">{t("custom.loading")}</p>
            ) : (
                !error && (
                    <>
                        {!data.items.length && (
                            <p className="workspace-empty">{t("custom.emptyPlaza")}</p>
                        )}
                        <div className="workspace-collections">
                            {data.items.map((item) => (
                                <article key={item.id} className="workspace-collection">
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                    <div className="workspace-collection-meta">
                                        <span>{t(`custom.status_${item.status}`)}</span>
                                        <time>{item.created_at.slice(0, 10)}</time>
                                    </div>
                                    <div className="workspace-actions">
                                        <button
                                            className="workspace-button"
                                            disabled={busy}
                                            onClick={() => inspect(item)}
                                        >
                                            {t("custom.preview")}
                                        </button>
                                        {(item.owned || data.canReview) && (
                                            <button
                                                className="workspace-button"
                                                disabled={busy}
                                                onClick={() => changeStatus(item, "withdrawn")}
                                            >
                                                {t("custom.withdraw")}
                                            </button>
                                        )}
                                        {scope === "review" && item.status === "pending" && (
                                            <>
                                                <button
                                                    className="workspace-button"
                                                    disabled={busy}
                                                    onClick={() => changeStatus(item, "approved")}
                                                >
                                                    {t("custom.approve")}
                                                </button>
                                                <button
                                                    className="workspace-button"
                                                    disabled={busy}
                                                    onClick={() => changeStatus(item, "rejected")}
                                                >
                                                    {t("custom.reject")}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                        <div className="workspace-actions">
                            <button
                                className="workspace-button"
                                disabled={page === 0 || busy}
                                onClick={() => setPage((n) => n - 1)}
                            >
                                {t("custom.previous")}
                            </button>
                            <span>{page + 1}</span>
                            <button
                                className="workspace-button"
                                disabled={!data.hasMore || busy}
                                onClick={() => setPage((n) => n + 1)}
                            >
                                {t("custom.next")}
                            </button>
                        </div>
                    </>
                )
            )}
            {busy && <p role="status">{t("custom.loading")}</p>}
            {preview && (
                <section className="workspace-share-preview" aria-labelledby="preview-title">
                    <div className="workspace-section-heading">
                        <h3 id="preview-title">{preview.title}</h3>
                        <button className="workspace-button" onClick={() => setPreview(null)}>
                            {t("custom.closePreview")}
                        </button>
                    </div>
                    <p>{preview.description}</p>
                    <GroupPreview groups={preview.groups} english={english} />
                    <div className="workspace-actions">
                        <button
                            className="workspace-button primary"
                            onClick={() => onAdd(preview.groups)}
                        >
                            {t("custom.addToHome")}
                        </button>
                        <button
                            className="workspace-button"
                            onClick={() =>
                                download(
                                    bookmarksText(preview.groups, english),
                                    "导航书签.html",
                                    "text/html;charset=utf-8"
                                )
                            }
                        >
                            {t("custom.exportBookmarks")}
                        </button>
                    </div>
                </section>
            )}
        </section>
    );
}
