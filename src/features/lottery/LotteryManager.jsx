import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";
import { dateLabel, ProofImage } from "./LotteryPage";
import LotteryShare from "./LotteryShare";
import "./lottery.css";
import { useHackathonSchedule } from "../../hooks/useHackathonSchedule";
import { AIX_EVENT_KEY } from "../../utils/hackathonAiX";
import { getLotteryUrl } from "../../utils/lotteryRoute";
const blank = (eventKey = AIX_EVENT_KEY) => ({
    event_key: eventKey,
    promotion_url: "",
    min_likes: 0,
    title: "",
    description: "",
    rules: "",
    proof_required: true,
    review_required: true,
    opens_at: "",
    closes_at: "",
    draws_at: "",
    claims_until: "",
    prizes: [{ name: "", quantity: 1 }],
});
const localTime = (n) => {
    const d = new Date(n);
    return new Date(n - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
function EntryRow({ entry, campaign, busy, onReview, onFulfill }) {
    const { t } = useTranslation();
    const [note, setNote] = useState("");
    const [showProof, setShowProof] = useState(false);
    return (
        <article className="lottery-entry-row">
            <h3>
                {entry.username} · <code>{entry.ticket}</code>
            </h3>
            <p>
                {t(`lottery.entry_status.${entry.status}`)}
                {entry.prize_name && ` · ${entry.prize_name}`}
            </p>
            {campaign.event_key && (
                <p>
                    {t("lottery.like_count")}：<strong>{entry.like_count ?? "—"}</strong>
                </p>
            )}
            <p>{entry.note}</p>
            {entry.review_note && (
                <p>
                    {t("lottery.review_note")}：{entry.review_note}
                </p>
            )}
            {Boolean(entry.has_proof) && (
                <>
                    <button onClick={() => setShowProof(!showProof)}>
                        {t(showProof ? "lottery.hide_proof" : "lottery.show_proof")}
                    </button>
                    {showProof && (
                        <ProofImage key={entry.submitted_at} id={campaign.id} entryId={entry.id} />
                    )}
                </>
            )}
            {campaign.status === "open" && Date.now() < campaign.draws_at && (
                <>
                    <label>
                        {t("lottery.review_note")}
                        <input
                            value={note}
                            maxLength={500}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </label>
                    <div className="lottery-actions">
                        <button
                            disabled={busy || entry.status === "approved"}
                            onClick={() => onReview(entry.id, "approved", note)}
                        >
                            {t("lottery.approve")}
                        </button>
                        <button
                            disabled={busy || !note.trim()}
                            onClick={() => onReview(entry.id, "rejected", note)}
                        >
                            {t("lottery.reject")}
                        </button>
                    </div>
                </>
            )}
            {entry.claimed_at && (
                <>
                    <p>
                        {t("lottery.claim_contact")}：{entry.claim_text}
                    </p>
                    <button
                        disabled={busy || Boolean(entry.fulfilled_at)}
                        onClick={() => onFulfill(entry.id)}
                    >
                        {t(entry.fulfilled_at ? "lottery.fulfilled" : "lottery.fulfill")}
                    </button>
                </>
            )}
        </article>
    );
}
export default function LotteryManager() {
    const { t, i18n } = useTranslation();
    const { uiMode, settings } = useSettings();
    const { schedule } = useHackathonSchedule(settings);
    const [list, setList] = useState([]);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(blank);
    const [entries, setEntries] = useState({ items: [], total: 0 });
    const [page, setPage] = useState(1);
    const [audit, setAudit] = useState([]);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const [publishReady, setPublishReady] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const refreshList = useCallback(async () => {
        const r = await api.get("/lotteries/admin", { silent: true, noRetry: true });
        setList(r.data);
    }, []);
    useEffect(() => {
        refreshList().catch(() => setError("unavailable"));
    }, [refreshList]);
    const fetchEntries = async (id, p) => {
        const [e, a] = await Promise.all([
            api.get(`/lotteries/admin/${id}/entries?page=${p}`, { silent: true, noRetry: true }),
            api.get(`/lotteries/admin/${id}/audit`, { silent: true, noRetry: true }),
        ]);
        setEntries(e.data);
        setAudit(a.data);
    };
    const open = async (id, p = 1) => {
        const { data } = await api.get(`/lotteries/admin/${id}`, { silent: true, noRetry: true });
        setSelected(data);
        setForm({
            ...data,
            event_key: data.event_key || "",
            promotion_url: data.promotion_url || "",
            min_likes: data.min_likes || 0,
            proof_required: Boolean(data.proof_required),
            review_required: Boolean(data.review_required),
            ...Object.fromEntries(
                ["opens_at", "closes_at", "draws_at", "claims_until"].map((k) => [
                    k,
                    localTime(data[k]),
                ])
            ),
        });
        setPage(p);
        setPublishReady(false);
        await fetchEntries(id, p);
    };
    const act = async (fn, refresh = true) => {
        setBusy(true);
        setError("");
        setMessage("");
        try {
            await fn();
            if (refresh) {
                await refreshList();
                if (selected) await open(selected.id, page);
            }
        } catch (e) {
            setError(e.response?.data?.error || "unavailable");
        } finally {
            setBusy(false);
        }
    };
    const field = (key, value) =>
        setForm((f) => ({
            ...f,
            [key]: value,
            ...(key === "event_key" && value
                ? { proof_required: true, review_required: true }
                : {}),
        }));
    const save = async (e) => {
        e.preventDefault();
        await act(async () => {
            const payload = {
                ...form,
                ...Object.fromEntries(
                    ["opens_at", "closes_at", "draws_at", "claims_until"].map((k) => [
                        k,
                        new Date(form[k]).getTime(),
                    ])
                ),
            };
            const result = selected
                ? await api.put(`/lotteries/admin/${selected.id}`, payload, {
                      silent: true,
                      noRetry: true,
                  })
                : await api.post("/lotteries/admin", payload, { silent: true, noRetry: true });
            await refreshList();
            await open(result.data.id);
            setMessage("saved");
        }, false);
    };
    const editable = !selected || selected.status === "draft";
    return (
        <div className={`lottery-shell lottery-admin ${uiMode === "day" ? "lottery-day" : ""}`}>
            <header className="lottery-heading">
                <h1>{t("lottery.manage")}</h1>
                <p>{t("lottery.manage_hint")}</p>
            </header>
            {error && (
                <p className="lottery-alert" role="alert">
                    {t(`lottery.errors.${error}`, {
                        defaultValue: t("lottery.errors.unavailable"),
                    })}
                </p>
            )}
            {message && <p role="status">{t(`lottery.${message}`)}</p>}
            <div className="lottery-admin-grid">
                <nav className="lottery-admin-list" aria-label={t("lottery.title")}>
                    <button
                        className="lottery-primary"
                        disabled={busy}
                        onClick={() => {
                            setSelected(null);
                            setForm(blank(schedule.activeEventKey));
                            setEntries({ items: [], total: 0 });
                            setError("");
                            setMessage("");
                            setPublishReady(false);
                        }}
                    >
                        {t("lottery.create")}
                    </button>
                    {list.map((c) => (
                        <button
                            key={c.id}
                            disabled={busy}
                            aria-pressed={selected?.id === c.id}
                            onClick={() => act(() => open(c.id), false)}
                        >
                            {c.title}
                            <small>{t(`lottery.status.${c.status}`)}</small>
                        </button>
                    ))}
                </nav>
                <div>
                    <section className="lottery-panel">
                        <form onSubmit={save}>
                            <fieldset disabled={busy || !editable}>
                                <label>
                                    {t("lottery.event_label")}
                                    <select
                                        value={form.event_key || ""}
                                        onChange={(e) => field("event_key", e.target.value)}
                                    >
                                        {selected && !selected.event_key && (
                                            <option value="">{t("lottery.legacy_event")}</option>
                                        )}
                                        {schedule.events.map(({ event }) => (
                                            <option key={event.key} value={event.key}>
                                                {event.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {form.event_key && (
                                    <>
                                        <label>
                                            {t("lottery.promotion_url")}
                                            <input
                                                type="url"
                                                maxLength={2000}
                                                value={form.promotion_url || ""}
                                                onChange={(e) =>
                                                    field("promotion_url", e.target.value)
                                                }
                                                placeholder="https://mp.weixin.qq.com/…"
                                            />
                                            <small>{t("lottery.promotion_url_hint")}</small>
                                        </label>
                                        <label>
                                            {t("lottery.min_likes")}
                                            <input
                                                type="number"
                                                required
                                                min={0}
                                                step={1}
                                                max={1000000000}
                                                value={form.min_likes ?? 0}
                                                onChange={(e) =>
                                                    field(
                                                        "min_likes",
                                                        e.target.value === ""
                                                            ? ""
                                                            : Number(e.target.value)
                                                    )
                                                }
                                            />
                                            <small>{t("lottery.min_likes_hint")}</small>
                                        </label>
                                        <p className="lottery-muted">
                                            {t("lottery.event_review_required")}
                                        </p>
                                    </>
                                )}
                                <label>
                                    {t("lottery.name")}
                                    <input
                                        required
                                        maxLength={100}
                                        value={form.title}
                                        onChange={(e) => field("title", e.target.value)}
                                    />
                                </label>
                                <label>
                                    {t("lottery.description")}
                                    <textarea
                                        maxLength={4000}
                                        value={form.description}
                                        onChange={(e) => field("description", e.target.value)}
                                    />
                                </label>
                                <label>
                                    {t("lottery.rules")}
                                    <textarea
                                        required
                                        maxLength={6000}
                                        value={form.rules}
                                        onChange={(e) => field("rules", e.target.value)}
                                    />
                                    <small>{t("lottery.rules_hint")}</small>
                                </label>
                                <div className="lottery-form-grid">
                                    {["opens_at", "closes_at", "draws_at", "claims_until"].map(
                                        (k) => (
                                            <label key={k}>
                                                {t(`lottery.${k}`)}
                                                <input
                                                    type="datetime-local"
                                                    required
                                                    value={form[k]}
                                                    onChange={(e) => field(k, e.target.value)}
                                                />
                                            </label>
                                        )
                                    )}
                                </div>
                                <p className="lottery-muted">
                                    {t("lottery.time_hint", {
                                        zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                                    })}
                                </p>
                                <label className="lottery-check">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(form.event_key) || form.proof_required}
                                        disabled={Boolean(form.event_key)}
                                        onChange={(e) => field("proof_required", e.target.checked)}
                                    />
                                    {t("lottery.require_proof")}
                                </label>
                                <label className="lottery-check">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(form.event_key) || form.review_required}
                                        disabled={Boolean(form.event_key)}
                                        onChange={(e) => field("review_required", e.target.checked)}
                                    />
                                    {t("lottery.require_review")}
                                </label>
                                <h2>{t("lottery.prizes")}</h2>
                                {form.prizes.map((p, index) => (
                                    <div className="lottery-prize-editor" key={index}>
                                        <label>
                                            {t("lottery.prize_name")}
                                            <input
                                                required
                                                maxLength={100}
                                                value={p.name}
                                                onChange={(e) =>
                                                    field(
                                                        "prizes",
                                                        form.prizes.map((x, i) =>
                                                            i === index
                                                                ? { ...x, name: e.target.value }
                                                                : x
                                                        )
                                                    )
                                                }
                                            />
                                        </label>
                                        <label>
                                            {t("lottery.prize_count")}
                                            <input
                                                type="number"
                                                required
                                                min={1}
                                                max={100}
                                                value={p.quantity}
                                                onChange={(e) =>
                                                    field(
                                                        "prizes",
                                                        form.prizes.map((x, i) =>
                                                            i === index
                                                                ? {
                                                                      ...x,
                                                                      quantity: Number(
                                                                          e.target.value
                                                                      ),
                                                                  }
                                                                : x
                                                        )
                                                    )
                                                }
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            disabled={form.prizes.length === 1}
                                            onClick={() =>
                                                field(
                                                    "prizes",
                                                    form.prizes.filter((_, i) => i !== index)
                                                )
                                            }
                                        >
                                            {t("lottery.remove")}
                                        </button>
                                    </div>
                                ))}
                                {editable && (
                                    <div className="lottery-actions">
                                        <button
                                            type="button"
                                            disabled={form.prizes.length >= 20}
                                            onClick={() =>
                                                field("prizes", [
                                                    ...form.prizes,
                                                    { name: "", quantity: 1 },
                                                ])
                                            }
                                        >
                                            {t("lottery.add_prize")}
                                        </button>
                                        <button className="lottery-primary" type="submit">
                                            {t("lottery.save")}
                                        </button>
                                    </div>
                                )}
                            </fieldset>
                        </form>
                        {selected && (
                            <>
                                <p className="lottery-muted">{t("lottery.publish_lock")}</p>
                                {selected.status === "draft" ? (
                                    <>
                                        <label className="lottery-check">
                                            <input
                                                type="checkbox"
                                                checked={publishReady}
                                                onChange={(e) => setPublishReady(e.target.checked)}
                                            />
                                            {t("lottery.publish_confirm")}
                                            {selected.event_key && !selected.promotion_url && (
                                                <small>{t("lottery.promotion_url_hint")}</small>
                                            )}
                                        </label>
                                        <button
                                            className="lottery-primary"
                                            disabled={
                                                busy ||
                                                !publishReady ||
                                                Boolean(
                                                    selected.event_key && !selected.promotion_url
                                                )
                                            }
                                            onClick={() =>
                                                act(() =>
                                                    api.post(
                                                        `/lotteries/admin/${selected.id}/publish`,
                                                        { version: selected.version },
                                                        { silent: true, noRetry: true }
                                                    )
                                                )
                                            }
                                        >
                                            {t("lottery.publish")}
                                        </button>
                                    </>
                                ) : (
                                    <Link to={getLotteryUrl(selected)}>
                                        {t("lottery.view_public")} ↗
                                    </Link>
                                )}
                                {["draft", "open"].includes(selected.status) && (
                                    <details>
                                        <summary>{t("lottery.cancel")}</summary>
                                        <label>
                                            {t("lottery.cancel_reason")}
                                            <input
                                                maxLength={500}
                                                value={cancelReason}
                                                onChange={(e) => setCancelReason(e.target.value)}
                                            />
                                        </label>
                                        <button
                                            disabled={busy || !cancelReason.trim()}
                                            onClick={() =>
                                                act(() =>
                                                    api.post(
                                                        `/lotteries/admin/${selected.id}/cancel`,
                                                        { reason: cancelReason },
                                                        { silent: true, noRetry: true }
                                                    )
                                                )
                                            }
                                        >
                                            {t("lottery.cancel")}
                                        </button>
                                    </details>
                                )}
                            </>
                        )}
                    </section>
                    <LotteryShare key={selected?.id || "new"} campaign={selected} />
                    {selected && (
                        <section className="lottery-panel">
                            <h2>
                                {t("lottery.entries")} · {entries.total}
                            </h2>
                            {selected.event_key && (
                                <p className="lottery-muted">{t("lottery.review_checklist")}</p>
                            )}
                            <p>
                                {t("lottery.pending_count", {
                                    count: selected.counts.pending || 0,
                                })}
                            </p>
                            <p className="lottery-muted">{t("lottery.review_notice")}</p>
                            <button
                                disabled={busy}
                                onClick={() => act(() => open(selected.id, page), false)}
                            >
                                {t("lottery.refresh")}
                            </button>
                            {entries.items.map((e) => (
                                <EntryRow
                                    key={e.id}
                                    entry={e}
                                    campaign={selected}
                                    busy={busy}
                                    onReview={(entryId, status, note) =>
                                        act(() =>
                                            api.post(
                                                `/lotteries/admin/${selected.id}/entries/${entryId}/review`,
                                                { status, note },
                                                { silent: true, noRetry: true }
                                            )
                                        )
                                    }
                                    onFulfill={(entryId) =>
                                        act(() =>
                                            api.post(
                                                `/lotteries/admin/${selected.id}/entries/${entryId}/fulfill`,
                                                {},
                                                { silent: true, noRetry: true }
                                            )
                                        )
                                    }
                                />
                            ))}
                            <div className="lottery-actions">
                                <button
                                    disabled={busy || page <= 1}
                                    onClick={() => act(() => open(selected.id, page - 1), false)}
                                >
                                    {t("lottery.previous")}
                                </button>
                                <span>
                                    {page} / {Math.max(1, Math.ceil(entries.total / 50))}
                                </span>
                                <button
                                    disabled={busy || page * 50 >= entries.total}
                                    onClick={() => act(() => open(selected.id, page + 1), false)}
                                >
                                    {t("lottery.next")}
                                </button>
                            </div>
                            <details>
                                <summary>{t("lottery.audit")}</summary>
                                {audit.map((a, index) => (
                                    <p key={index}>
                                        {dateLabel(a.created_at, i18n.language)} ·{" "}
                                        {t(`lottery.actions.${a.action}`)}
                                        <code className="lottery-hash">{a.detail}</code>
                                    </p>
                                ))}
                            </details>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
