import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    Gift,
    Clock,
    ArrowRight,
    Ticket,
    CheckCircle2,
    ExternalLink,
    ImagePlus,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext";
import api from "../../services/api";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { getEventUrl } from "../../utils/hackathonRoute";
import "./lottery.css";
import "./event-lottery.css";

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
        setUrl("");
        setFailed(false);
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
export default function LotteryPage({ eventKey, eventTitle }) {
    const { id: legacyId } = useParams();
    const location = useLocation();
    const id = eventKey ? new URLSearchParams(location.search).get("campaign") : legacyId;
    const requestVersion = useRef(0);
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const { uiMode } = useSettings();
    const mobile = useMediaQuery("(max-width: 767px)");
    const scope = `${eventKey || "legacy"}:${id || "list"}:${user?.id || "guest"}`;
    const currentScope = useRef(scope);
    currentScope.current = scope;
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [clock, setClock] = useState(Date.now());
    const [offset, setOffset] = useState(0);
    const [note, setNote] = useState("");
    const [proof, setProof] = useState(null);
    const [preview, setPreview] = useState("");
    const [proofError, setProofError] = useState("");
    const [likes, setLikes] = useState("");
    const [claim, setClaim] = useState("");
    const [agreed, setAgreed] = useState(false);
    const load = useCallback(async () => {
        const version = ++requestVersion.current;
        try {
            const { data: result } = await api.get(`/lotteries${id ? `/${id}` : ""}`, {
                params: eventKey ? { event: eventKey } : undefined,
                silent: true,
                noRetry: true,
            });
            if (version !== requestVersion.current) return;
            setData(result);
            setError("");
            if (result.server_now) setOffset(result.server_now - Date.now());
        } catch (e) {
            if (version === requestVersion.current)
                setError(e.response?.data?.error || "unavailable");
        }
    }, [id, eventKey, user?.id]);
    useEffect(() => {
        setData(null);
        setBusy(false);
        setNote("");
        setProof(null);
        setProofError("");
        setLikes("");
        setClaim("");
        setError("");
        setAgreed(false);
        load();
        const interval = setInterval(load, 30000);
        return () => {
            ++requestVersion.current;
            clearInterval(interval);
        };
    }, [load]);
    useEffect(() => {
        if (!proof) {
            setPreview("");
            return;
        }
        const objectUrl = URL.createObjectURL(proof);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [proof]);
    useEffect(() => {
        const timer = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);
    const act = async (fn) => {
        setBusy(true);
        setError("");
        try {
            await fn();
            if (scope !== currentScope.current) return;
            setProof(null);
            setAgreed(false);
            await load();
        } catch (e) {
            if (scope === currentScope.current) setError(e.response?.data?.error || "unavailable");
        } finally {
            if (scope === currentScope.current) setBusy(false);
        }
    };
    const chooseProof = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        ) {
            e.target.value = "";
            setProof(null);
            setProofError("lottery.event.proof_invalid");
            return;
        }
        setProof(file);
        setProofError("");
    };
    const campaignUrl = (campaign) =>
        campaign.event_key
            ? getEventUrl(campaign.event_key, "lottery", {
                  search: new URLSearchParams({ campaign: campaign.id }).toString(),
              })
            : `/lotteries/${campaign.id}`;
    const returnUrl = eventKey
        ? id
            ? getEventUrl(eventKey, "lottery")
            : mobile
              ? "/"
              : getEventUrl(eventKey)
        : id
          ? "/lotteries"
          : "/";
    const eventIntroUrl = eventKey
        ? mobile
            ? id
                ? getEventUrl(eventKey, "lottery")
                : "/"
            : getEventUrl(eventKey)
        : "/events";
    const returnLabel = eventKey
        ? id
            ? "lottery.event.back_campaigns"
            : mobile
              ? "lottery.home"
              : "lottery.event.back_event"
        : id
          ? "lottery.back"
          : "lottery.home";
    const exploreLabel = eventKey
        ? mobile
            ? id
                ? "lottery.event.back_campaigns"
                : "lottery.home"
            : "lottery.event.back_event"
        : "lottery.explore";
    const eventCampaign = Boolean(data?.event_key);
    const needsProof = eventCampaign || Boolean(data?.proof_required);
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
    if (!eventKey && data?.event_key) return <Navigate to={campaignUrl(data)} replace />;
    const Container = eventKey ? "section" : "main";
    return (
        <Container
            className={`lottery-shell lottery-public ${eventKey ? "lottery-event" : ""} ${uiMode === "day" ? "lottery-day" : ""}`}
        >
            <Helmet>
                <title>
                    {data?.title ||
                        (eventKey
                            ? `${eventTitle} · ${t("lottery.event.title")}`
                            : t("lottery.title"))}
                </title>
            </Helmet>
            <Link className="lottery-back" to={returnUrl}>
                {t(returnLabel)}
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
                        <h1>{t(eventKey ? "lottery.event.title" : "lottery.title")}</h1>
                        <p>{eventKey ? eventTitle : t("lottery.subtitle")}</p>
                    </header>
                    <div className="lottery-list">
                        {data.map((c) => (
                            <Link key={c.id} className="lottery-campaign" to={campaignUrl(c)}>
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
                            <h2>{t(eventKey ? "lottery.event.empty" : "lottery.empty")}</h2>
                            <p>{t(eventKey ? "lottery.event.empty_hint" : "lottery.empty_hint")}</p>
                            <Link to={eventIntroUrl}>{t(exploreLabel)}</Link>
                        </div>
                    )}
                </>
            )}
            {data && !Array.isArray(data) && (
                <>
                    <header className="lottery-heading">
                        <span className="lottery-tag">{t(`lottery.status.${state}`)}</span>
                        {eventKey && <p className="lottery-event-name">{eventTitle}</p>}
                        <h1>{data.title}</h1>
                        <p>{data.description}</p>
                    </header>
                    {eventCampaign && (
                        <section
                            className="lottery-promotion"
                            aria-label={t("lottery.event.how_to")}
                        >
                            <ol className="lottery-steps">
                                {["share", "capture", "review"].map((step, index) => (
                                    <li key={step}>
                                        <span className="lottery-step-number">0{index + 1}</span>
                                        <div>
                                            <h2>{t(`lottery.event.step_${step}`)}</h2>
                                            <p>{t(`lottery.event.step_${step}_hint`)}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            {data.promotion_url && (
                                <a
                                    className="lottery-promotion-link"
                                    href={data.promotion_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {t("lottery.event.open_post")}
                                    <ExternalLink size={16} />
                                </a>
                            )}
                            <p className="lottery-muted">
                                {t(
                                    Number(data.min_likes) > 0
                                        ? "lottery.event.minimum_likes"
                                        : "lottery.event.likes_record",
                                    { count: Number(data.min_likes) || 0 }
                                )}
                            </p>
                        </section>
                    )}
                    <div className="lottery-layout">
                        <div>
                            <section className="lottery-panel">
                                <h2>
                                    <Gift size={22} />
                                    {t("lottery.prizes")}
                                </h2>
                                <div className="lottery-prizes">
                                    {(data.prizes || []).map((p, index) => (
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
                                {(eventCampaign || Boolean(data.review_required)) && (
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
                                                    {eventCampaign &&
                                                        [
                                                            "pending",
                                                            "approved",
                                                            "rejected",
                                                        ].includes(data.entry.status) && (
                                                            <p
                                                                className="lottery-entry-feedback"
                                                                role="status"
                                                            >
                                                                {t(
                                                                    `lottery.event.entry_${data.entry.status}`
                                                                )}
                                                            </p>
                                                        )}
                                                    {eventCampaign &&
                                                        Number.isInteger(data.entry.like_count) && (
                                                            <span>
                                                                {t(
                                                                    "lottery.event.submitted_likes",
                                                                    { count: data.entry.like_count }
                                                                )}
                                                            </span>
                                                        )}
                                                    {data.entry.review_note && (
                                                        <p>{data.entry.review_note}</p>
                                                    )}
                                                    {data.entry.has_proof && (
                                                        <details>
                                                            <summary>
                                                                {t("lottery.show_proof")}
                                                            </summary>
                                                            <ProofImage
                                                                key={data.entry.submitted_at}
                                                                id={data.id}
                                                                entryId={data.entry.id}
                                                            />
                                                        </details>
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
                                                                if (eventCampaign)
                                                                    form.append(
                                                                        "like_count",
                                                                        String(Number(likes))
                                                                    );
                                                                if (proof)
                                                                    form.append("proof", proof);
                                                                return api.post(
                                                                    `/lotteries/${data.id}/entries`,
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
                                                        <fieldset disabled={busy}>
                                                            {eventCampaign && (
                                                                <label>
                                                                    {t("lottery.event.like_count")}
                                                                    <input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        min={
                                                                            Number(
                                                                                data.min_likes
                                                                            ) || 0
                                                                        }
                                                                        max={1000000000}
                                                                        step="1"
                                                                        required
                                                                        value={likes}
                                                                        onChange={(e) =>
                                                                            setLikes(e.target.value)
                                                                        }
                                                                    />
                                                                    <small>
                                                                        {t(
                                                                            "lottery.event.like_count_hint"
                                                                        )}
                                                                    </small>
                                                                </label>
                                                            )}
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
                                                            {needsProof && (
                                                                <label className="lottery-proof-upload">
                                                                    <span className="lottery-proof-label">
                                                                        <ImagePlus size={18} />
                                                                        {t(
                                                                            eventCampaign
                                                                                ? "lottery.event.screenshot"
                                                                                : "lottery.proof"
                                                                        )}
                                                                    </span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/jpeg,image/png,image/webp"
                                                                        required={
                                                                            !data.entry?.has_proof
                                                                        }
                                                                        onChange={chooseProof}
                                                                    />
                                                                    <small>
                                                                        {t("lottery.proof_hint")}
                                                                    </small>
                                                                    {data.entry?.has_proof &&
                                                                        !proof && (
                                                                            <small>
                                                                                {t(
                                                                                    "lottery.event.keep_proof"
                                                                                )}
                                                                            </small>
                                                                        )}
                                                                    {proofError && (
                                                                        <span
                                                                            className="lottery-proof-error"
                                                                            role="alert"
                                                                        >
                                                                            {t(proofError)}
                                                                        </span>
                                                                    )}
                                                                    {preview && (
                                                                        <img
                                                                            className="lottery-proof-preview"
                                                                            src={preview}
                                                                            alt={t(
                                                                                "lottery.event.preview"
                                                                            )}
                                                                        />
                                                                    )}
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
                                                                disabled={
                                                                    busy ||
                                                                    !agreed ||
                                                                    Boolean(proofError)
                                                                }
                                                            >
                                                                {t(
                                                                    busy
                                                                        ? "lottery.submitting"
                                                                        : eventCampaign
                                                                          ? "lottery.event.submit_review"
                                                                          : "lottery.enter"
                                                                )}
                                                            </button>
                                                        </fieldset>
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
                                                                            `/lotteries/${data.id}/claim`,
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
                            <Link className="lottery-explore" to={eventIntroUrl}>
                                {t(exploreLabel)}
                                <ArrowRight size={18} />
                            </Link>
                        </aside>
                    </div>
                </>
            )}
        </Container>
    );
}
