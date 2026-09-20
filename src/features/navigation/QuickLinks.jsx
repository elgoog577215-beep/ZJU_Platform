import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown, ArrowUpRight, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { allSites, featuredIds, filterDirectory } from "./directory";

const defaults = featuredIds.map((id) => {
    const { name, url } = allSites.find((entry) => entry.id === id);
    return { name, url };
});
const endpoint = "/users/me/navigation-shortcuts";

export default function QuickLinks() {
    const { user, loading } = useAuth();
    return <AccountQuickLinks key={user?.id || "guest"} user={user} authLoading={loading} />;
}

function AccountQuickLinks({ user, authLoading }) {
    const { t } = useTranslation("navigation");
    const [saved, setSaved] = useState({ links: null, version: 0 });
    const [loading, setLoading] = useState(Boolean(user));
    const [loadError, setLoadError] = useState(false);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [search, setSearch] = useState("");
    const [customName, setCustomName] = useState("");
    const [customUrl, setCustomUrl] = useState("");
    const [reload, setReload] = useState(0);
    const links = saved.links ?? defaults;
    const selected = draft ?? defaults;
    const displayName = useCallback(
        (entry) => {
            const original = allSites.find(
                (site) => site.url === entry.url && site.name === entry.name
            );
            return original
                ? t(`names.${original.id}`, { defaultValue: original.name })
                : entry.name;
        },
        [t]
    );
    const candidates = useMemo(
        () =>
            filterDirectory(search)
                .flatMap((group) => group.sites)
                .slice(0, 12),
        [search]
    );

    useEffect(() => {
        if (!user || editing) return undefined;
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(endpoint, {
                    signal: controller.signal,
                    silent: true,
                    noRetry: true,
                });
                if (!controller.signal.aborted) {
                    setSaved(data);
                    setLoadError(false);
                }
            } catch {
                if (!controller.signal.aborted) setLoadError(true);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        load();
        window.addEventListener("focus", load);
        return () => {
            controller.abort();
            window.removeEventListener("focus", load);
        };
    }, [user, editing, reload]);

    function begin() {
        if (!user) {
            window.dispatchEvent(new Event("open-auth-modal"));
            return;
        }
        setDraft(saved.links);
        setError("");
        setStatus("");
        setSearch("");
        setCustomName("");
        setCustomUrl("");
        setEditing(true);
    }
    function add(entry) {
        if (selected.length >= 12) {
            setError("limit");
            return;
        }
        if (selected.some((item) => item.url === entry.url)) {
            setError("duplicate");
            return;
        }
        setDraft([...selected, { name: entry.name, url: entry.url }]);
        setError("");
    }
    function addCustom(event) {
        event.preventDefault();
        try {
            const url = new URL(customUrl.trim());
            if (
                !["https:", "http:"].includes(url.protocol) ||
                url.username ||
                url.password ||
                !customName.trim()
            )
                throw new Error();
            if (selected.length >= 12 || selected.some((item) => item.url === url.href)) {
                add({ name: customName.trim(), url: url.href });
                return;
            }
            add({ name: customName.trim(), url: url.href });
            setCustomName("");
            setCustomUrl("");
        } catch {
            setError("invalid");
        }
    }
    function move(index, delta) {
        const next = [...selected];
        [next[index], next[index + delta]] = [next[index + delta], next[index]];
        setDraft(next);
    }
    async function save() {
        setSaving(true);
        setError("");
        try {
            const { data } = await api.put(
                endpoint,
                { links: draft, version: saved.version },
                { silent: true, noRetry: true }
            );
            setSaved(data);
            setEditing(false);
            setStatus("saved");
        } catch (failure) {
            setError(failure.response?.status === 409 ? "conflict" : "saveError");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="directory-shortcuts" aria-label={t("featured")}>
            <div className="directory-quick-row">
                <h2>{t("featured")}</h2>
                <div className="directory-quick-links">
                    {links.map((entry) => (
                        <a
                            key={entry.url}
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {displayName(entry)}
                            <ArrowUpRight size={12} aria-hidden="true" />
                        </a>
                    ))}
                    {!links.length && <span>{t("quick.empty")}</span>}
                </div>
                <button
                    className="directory-edit-shortcuts"
                    type="button"
                    onClick={begin}
                    disabled={authLoading || loading || loadError || editing}
                    aria-expanded={editing}
                    aria-controls="shortcut-editor"
                >
                    {t(loading ? "quick.loading" : "quick.customize")}
                </button>
            </div>
            {loadError && (
                <p className="directory-shortcut-message" role="alert">
                    {t("quick.loadError")}{" "}
                    <button type="button" onClick={() => setReload((n) => n + 1)}>
                        {t("quick.retry")}
                    </button>
                </p>
            )}
            {status && !editing && (
                <p className="directory-shortcut-message" role="status">
                    {t(`quick.${status}`)}
                </p>
            )}
            {editing && (
                <div id="shortcut-editor" className="directory-shortcut-editor">
                    <p>{t("quick.hint")}</p>
                    <div className="directory-shortcut-editor-columns">
                        <div>
                            <h3>{t("quick.selected", { count: selected.length })}</h3>
                            <ol className="directory-selected-links">
                                {selected.map((entry, index) => (
                                    <li key={entry.url}>
                                        <span>
                                            {displayName(entry)}
                                            <small>{new URL(entry.url).hostname}</small>
                                        </span>
                                        <button
                                            type="button"
                                            disabled={saving || index === 0}
                                            onClick={() => move(index, -1)}
                                            aria-label={t("quick.up", { name: displayName(entry) })}
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={saving || index === selected.length - 1}
                                            onClick={() => move(index, 1)}
                                            aria-label={t("quick.down", {
                                                name: displayName(entry),
                                            })}
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() =>
                                                setDraft(selected.filter((_, i) => i !== index))
                                            }
                                            aria-label={t("quick.remove", {
                                                name: displayName(entry),
                                            })}
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="directory-shortcut-add">
                            <label htmlFor="shortcut-search">{t("quick.pick")}</label>
                            <input
                                id="shortcut-search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder={t("quick.search")}
                                type="search"
                            />
                            <div className="directory-shortcut-candidates">
                                {candidates.map((entry) => (
                                    <button
                                        key={entry.id}
                                        type="button"
                                        disabled={
                                            saving ||
                                            selected.length >= 12 ||
                                            selected.some((item) => item.url === entry.url)
                                        }
                                        onClick={() => add(entry)}
                                    >
                                        {displayName(entry)}
                                    </button>
                                ))}
                                {!candidates.length && <p>{t("empty")}</p>}
                            </div>
                            <form onSubmit={addCustom}>
                                <h3>{t("quick.own")}</h3>
                                <label htmlFor="shortcut-name">{t("quick.name")}</label>
                                <input
                                    id="shortcut-name"
                                    value={customName}
                                    onChange={(event) => setCustomName(event.target.value)}
                                    maxLength={40}
                                    required
                                />
                                <label htmlFor="shortcut-url">{t("quick.url")}</label>
                                <input
                                    id="shortcut-url"
                                    type="url"
                                    value={customUrl}
                                    onChange={(event) => setCustomUrl(event.target.value)}
                                    placeholder="https://"
                                    maxLength={2048}
                                    required
                                />
                                <button type="submit" disabled={saving || selected.length >= 12}>
                                    {t("quick.add")}
                                </button>
                            </form>
                        </div>
                    </div>
                    {error && (
                        <p className="directory-shortcut-error" role="alert">
                            {t(`quick.${error}`)}
                        </p>
                    )}
                    <div className="directory-shortcut-actions">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                setDraft(null);
                                setError("");
                            }}
                        >
                            {t("quick.restore")}
                        </button>
                        <span />
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                                setEditing(false);
                                setError("");
                            }}
                        >
                            {t("quick.cancel")}
                        </button>
                        <button
                            type="button"
                            className="directory-shortcut-save"
                            disabled={saving || error === "conflict"}
                            onClick={save}
                        >
                            {t(saving ? "quick.saving" : "quick.save")}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
