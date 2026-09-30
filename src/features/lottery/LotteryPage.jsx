import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Gift, Clock, ArrowRight, Ticket, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";
import "./lottery.css";

export const dateLabel = (n, lang) =>
    new Date(n).toLocaleString(lang, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    });
export function ProofImage({ id, entryId }) {
    const { t } = useTranslation();
    const [url, setUrl] = useState("");
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        let active = true;
        let objectUrl;
        api.get(`/lotteries/${id}/entries/${entryId}/proof`, {
            responseType: "blob",
            silent: true,
            noRetry: true,
        })
            .then(({ data }) => {
                if (active) {
                    objectUrl = URL.createObjectURL(data);
                    setUrl(objectUrl);
                }
            })
            .catch(() => {
                if (active) setFailed(true);
            });
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [id, entryId]);
    return url ? (
        <a href={url} target="_blank" rel="noreferrer">
            <img className="lottery-proof" src={url} alt={t("lottery.proof")} />
        </a>
    ) : (
        <p>{t(failed ? "lottery.errors.unavailable" : "lottery.loading")}</p>
    );
}
export default function LotteryPage() {
    const { id } = useParams();
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { uiMode } = useSettings();
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [clock, setClock] = useState(Date.now());
    const [offset, setOffset] = useState(0);
    const [note, setNote] = useState("");
    const [proof, setProof] = useState(null);
    const [claim, setClaim] = useState("");
    const [agreed, setAgreed] = useState(false);
    const load = useCallback(async () => {
        try {
            const { data: result } = await api.get(`/lotteries${id ? `/${id}` : ""}`, {
                silent: true,
                noRetry: true,
            });
            setData(result);
            setError("");
            if (result.server_now) setOffset(result.server_now - Date.now());
        } catch (e) {
            setError(e.response?.data?.error || "unavailable");
        }
    }, [id, user?.id]);
    useEffect(() => {
        setData(null);
        setNote("");
        setProof(null);
        setAgreed(false);
        load();
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);
    useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const act = async (fn) => {
        setBusy(true);
        setError("");
        try {
            await fn();
            await load();
        } catch (e) {
            setError(e.response?.data?.error || "unavailable");
        } finally {
            setBusy(false);
        }
    };
    const now = clock + offset;
    const date = (n) => dateLabel(n, i18n.language);
    const remaining =
        data && !Array.isArray(data) ? Math.max(0, Math.ceil((data.draws_at - now) / 1000)) : 0;
    const countdown = `${Math.floor(remaining / 86400)}${t("lottery.days")} ${String(Math.floor(remaining / 3600) % 24).padStart(2, "0")}:${String(Math.floor(remaining / 60) % 60).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
    const canEnter = data?.status === "open" && now >= data.opens_at && now < data.closes_at;
    const state =
        data?.status === "open"
            ? now < data.opens_at
                ? "upcoming"
                : now >= data.closes_at
                  ? "closed"
                  : "open"
            : data?.status;
    return (
        <main className={`lottery-shell ${uiMode === "day" ? "lottery-day" : ""}`}>
            <Helmet>
                <title>{data?.title || t("lottery.title")}</title>
            </Helmet>
            <Link className="lottery-back" to={id ? "/lotteries" : "/"}>
                {t(id ? "lottery.back" : "lottery.home")}
            </Link>
            {error && (
                <div role="alert" className="lottery-alert">
                    {t(`lottery.errors.${error}`, {
                        defaultValue: t("lottery.errors.unavailable"),
                    })}
                    <button onClick={load}>{t("lottery.refresh")}</button>
                </div>
            )}
            {!data && !error && <p role="status">{t("lottery.loading")}</p>}
            {Array.isArray(data) && (
                <>
                    <header className="lottery-heading">
                        <Gift size={32} />
                        <h1>{t("lottery.title")}</h1>
                        <p>{t("lottery.subtitle")}</p>
                    </header>
                    <div className="lottery-list">
                        {data.map((c) => (
                            <Link key={c.id} className="lottery-campaign" to={`/lotteries/${c.id}`}>
                                <span className="lottery-tag">
                                    {t(
                                        `lottery.status.${c.status === "open" ? (now < c.opens_at ? "upcoming" : now >= c.closes_at ? "closed" : "open") : c.status}`
                                    )}
                                </span>
                                <h2>{c.title}</h2>
                                <p>{c.description}</p>
                                <div className="lottery-prize-names">
                                    {c.prizes.map((p) => (
                                        <span key={p.id}>
                                            {p.name} × {p.quantity}
                                        </span>
                                    ))}
                                </div>
                                <footer>
                                    <span>
                                        {t("lottery.draws_at")} {date(c.draws_at)}
                                    </span>
                                    <ArrowRight size={20} />
                                </footer>
                            </Link>
                        ))}
                    </div>
                    {!data.length && (
                        <div className="lottery-empty">
                            <Gift size={44} />
                            <h2>{t("lottery.empty")}</h2>
                            <p>{t("lottery.empty_hint")}</p>
                            <Link to="/events">{t("lottery.explore")}</Link>
                        </div>
                    )}
                </>
            )}
            {data && !Array.isArray(data) && (
                <>
                    <header className="lottery-heading">
                        <span className="lottery-tag">{t(`lottery.status.${state}`)}</span>
                        <h1>{data.title}</h1>
                        <p>{data.description}</p>
                    </header>
                    <div className="lottery-layout">
                        <div>
                            <section className="lottery-panel">
                                <h2>
                                    <Gift size={22} />
                                    {t("lottery.prizes")}
                                </h2>
                                <div className="lottery-prizes">
                                    {data.prizes.map((p, index) => (
                                        <div className="lottery-prize" key={p.id}>
                                            <span className="lottery-prize-index">
                                                {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <h3>{p.name}</h3>
                                            <strong>
                                                {t("lottery.quantity", { count: p.quantity })}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className="lottery-panel">
                                <h2>{t("lottery.rules")}</h2>
                                <p className="lottery-prose">{data.rules}</p>
                                <p className="lottery-muted">{t("lottery.fairness")}</p>
                                {Boolean(data.review_required) && (
                                    <p className="lottery-muted">{t("lottery.review_notice")}</p>
                                )}
                                <dl className="lottery-dates">
                                    {["opens_at", "closes_at", "draws_at", "claims_until"].map(
                                        (k) => (
                                            <div key={k}>
                                                <dt>{t(`lottery.${k}`)}</dt>
                                                <dd>{date(data[k])}</dd>
                                            </div>
                                        )
                                    )}
                                </dl>
                            </section>
                            {data.status === "drawn" && (
                                <section className="lottery-panel">
                                    <h2>{t("lottery.results")}</h2>
                                    <p>
                                        {t("lottery.draw_summary", { count: data.eligible_count })}{" "}
                                        · {date(data.drawn_at)}
                                    </p>
                                    {data.winners.length ? (
                                        <ul className="lottery-results">
                                            {data.winners.map((w) => (
                                                <li key={w.ticket}>
                                                    <code>{w.ticket}</code>
                                                    <strong>{w.prize_name}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>{t("lottery.no_winners")}</p>
                                    )}
                                    <details>
                                        <summary>{t("lottery.record")}</summary>
                                        <p className="lottery-muted">{t("lottery.hash_hint")}</p>
                                        <code className="lottery-hash">{data.pool_hash}</code>
                                    </details>
                                </section>
                            )}
                        </div>
                        <aside className="lottery-panel lottery-entry">
                            <h2>
                                <Ticket size={22} />
                                {t("lottery.my_entry")}
                            </h2>
                            {data.status === "cancelled" ? (
                                <p role="status">
                                    {t("lottery.status.cancelled")}：{data.cancel_reason}
                                </p>
                            ) : (
                                <>
                                    {data.status !== "drawn" && (
                                        <div className="lottery-countdown">
                                            <Clock size={18} />
                                            <span>
                                                {remaining ? countdown : t("lottery.drawing")}
                                            </span>
                                            <small>{t("lottery.until_draw")}</small>
                                        </div>
                                    )}
                                    {!user ? (
                                        <>
                                            <p>{t("lottery.login_hint")}</p>
                                            <button
                                                className="lottery-primary"
                                                onClick={() =>
                                                    window.dispatchEvent(
                                                        new Event("open-auth-modal")
                                                    )
                                                }
                                            >
                                                {t("lottery.login")}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            {data.entry && (
                                                <div className="lottery-ticket">
                                                    <span>{t("lottery.ticket")}</span>
                                                    <code>{data.entry.ticket}</code>
                                                    <strong>
                                                        {t(
                                                            `lottery.entry_status.${data.entry.status}`
                                                        )}
                                                    </strong>
                                                    {data.entry.review_note && (
                                                        <p>{data.entry.review_note}</p>
                                                    )}
                                                </div>
                                            )}
                                            {canEnter &&
                                                (!data.entry ||
                                                    data.entry.status === "rejected") && (
                                                    <form
                                                        onSubmit={(e) => {
                                                            e.preventDefault();
                                                            act(() => {
                                                                const form = new FormData();
                                                                form.append("note", note);
                                                                if (proof)
                                                                    form.append("proof", proof);
                                                                return api.post(
                                                                    `/lotteries/${id}/entries`,
                                                                    form,
                                                                    {
                                                                        headers: {
                                                                            "Content-Type":
                                                                                undefined,
                                                                        },
                                                                        noRetry: true,
                                                                        silent: true,
                                                                    }
                                                                );
                                                            });
                                                        }}
                                                    >
                                                        <label>
                                                            {t("lottery.note")}
                                                            <textarea
                                                                maxLength={1000}
                                                                value={note}
                                                                onChange={(e) =>
                                                                    setNote(e.target.value)
                                                                }
                                                            />
                                                        </label>
                                                        {Boolean(data.proof_required) && (
                                                            <label>
                                                                {t("lottery.proof")}
                                                                <input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp"
                                                                    required={
                                                                        !data.entry?.has_proof
                                                                    }
                                                                    onChange={(e) =>
                                                                        setProof(
                                                                            e.target.files?.[0] ||
                                                                                null
                                                                        )
                                                                    }
                                                                />
                                                                <small>
                                                                    {t("lottery.proof_hint")}
                                                                </small>
                                                            </label>
                                                        )}
                                                        <label className="lottery-check">
                                                            <input
                                                                type="checkbox"
                                                                checked={agreed}
                                                                onChange={(e) =>
                                                                    setAgreed(e.target.checked)
                                                                }
                                                                required
                                                            />
                                                            {t("lottery.agree")}
                                                        </label>
                                                        <button
                                                            className="lottery-primary"
                                                            disabled={busy || !agreed}
                                                        >
                                                            {t(
                                                                busy
                                                                    ? "lottery.submitting"
                                                                    : "lottery.enter"
                                                            )}
                                                        </button>
                                                    </form>
                                                )}
                                            {!canEnter &&
                                                !data.entry &&
                                                data.status !== "drawn" && (
                                                    <p>{t(`lottery.status.${state}`)}</p>
                                                )}
                                            {data.status === "drawn" &&
                                                (data.my_win ? (
                                                    <div className="lottery-win">
                                                        <CheckCircle2 />
                                                        <h3>
                                                            {t("lottery.won", {
                                                                prize: data.my_win.prize_name,
                                                            })}
                                                        </h3>
                                                        {data.my_win.claimed_at ? (
                                                            <p>
                                                                {t(
                                                                    data.my_win.fulfilled_at
                                                                        ? "lottery.fulfilled"
                                                                        : "lottery.claimed"
                                                                )}
                                                            </p>
                                                        ) : now >= data.claims_until ? (
                                                            <p>{t("lottery.claim_expired")}</p>
                                                        ) : (
                                                            <form
                                                                onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    act(() =>
                                                                        api.post(
                                                                            `/lotteries/${id}/claim`,
                                                                            { text: claim },
                                                                            {
                                                                                silent: true,
                                                                                noRetry: true,
                                                                            }
                                                                        )
                                                                    );
                                                                }}
                                                            >
                                                                <label>
                                                                    {t("lottery.claim_contact")}
                                                                    <textarea
                                                                        required
                                                                        maxLength={1000}
                                                                        value={claim}
                                                                        onChange={(e) =>
                                                                            setClaim(e.target.value)
                                                                        }
                                                                    />
                                                                    <small>
                                                                        {t("lottery.claim_private")}
                                                                    </small>
                                                                </label>
                                                                <button
                                                                    className="lottery-primary"
                                                                    disabled={busy}
                                                                >
                                                                    {t("lottery.claim")}
                                                                </button>
                                                            </form>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p>
                                                        {t(
                                                            data.entry?.eligible
                                                                ? "lottery.not_won"
                                                                : "lottery.not_eligible"
                                                        )}
                                                    </p>
                                                ))}
                                        </>
                                    )}
                                </>
                            )}
                            <Link className="lottery-explore" to="/events">
                                {t("lottery.explore")}
                                <ArrowRight size={18} />
                            </Link>
                        </aside>
                    </div>
                </>
            )}
        </main>
    );
}
