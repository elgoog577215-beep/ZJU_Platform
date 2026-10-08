import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowDown,
    ArrowUp,
    Check,
    Eye,
    EyeOff,
    Heart,
    ImagePlus,
    Pencil,
    Plus,
    Share2,
    Trash2,
    X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api, {
    getProfileCard,
    updateProfileCard,
    uploadAvatar,
    uploadProfileCardCover,
} from "../../services/api";
import "./ProfileHome.css";

const emptyCard = (type = "text") => ({
    card_type: type,
    title: "",
    description: "",
    cover_url: "",
    link_url: "",
    aspect_ratio: type === "heading" ? "large" : "wide",
    is_visible: true,
    crop_x: 0,
    crop_y: 0,
    crop_width: 1,
    crop_height: 1,
});
const sizes = {
    square: "1 / 1",
    landscape: "4 / 3",
    portrait: "3 / 4",
    wide: "16 / 9",
    vertical: "9 / 16",
    large: "16 / 10",
};
const safeLink = (value) =>
    /^https?:\/\//i.test(value || "") || /^\/(events|articles)\?/.test(value || "") ? value : "";
const cropStyle = (card) => ({
    width: `${100 / (card.crop_width || 1)}%`,
    height: `${100 / (card.crop_height || 1)}%`,
    left: `${(-100 * (card.crop_x || 0)) / (card.crop_width || 1)}%`,
    top: `${(-100 * (card.crop_y || 0)) / (card.crop_height || 1)}%`,
});

function CardView({ card, t }) {
    if (card.unavailable) return <p className="ph-muted">{t("unavailable")}</p>;
    return (
        <>
            {card.cover_url && (
                <div
                    className="ph-cover"
                    style={{ aspectRatio: sizes[card.aspect_ratio] || sizes.wide }}
                >
                    <img
                        src={card.cover_url}
                        alt={card.title || ""}
                        loading="lazy"
                        style={cropStyle(card)}
                    />
                </div>
            )}
            <div className="ph-card-copy">
                {card.source_type && (
                    <span className="ph-kicker">
                        {t(card.source_type)} · {t("published")}
                    </span>
                )}
                {card.title && <h3>{card.title}</h3>}
                {card.description && <p>{card.description}</p>}
                {safeLink(card.link_url) && (
                    <a
                        className="ph-link"
                        href={safeLink(card.link_url)}
                        target={card.source_type ? undefined : "_blank"}
                        rel="noreferrer"
                    >
                        {t("open")} ↗
                    </a>
                )}
            </div>
        </>
    );
}

export default function ProfileHome({
    user,
    setUser,
    currentUser,
    profileCard,
    setProfileCard,
    isDayMode,
    refreshUser,
    onOpenRelations,
    onManage,
}) {
    const { t: translate } = useTranslation();
    const t = (key) => translate(`profile_home.${key}`);
    const owner = String(user.id) === String(currentUser?.id);
    const [preview, setPreview] = useState(false);
    const canEdit = owner && !preview;
    const [editing, setEditing] = useState(null);
    const [draft, setDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [conflict, setConflict] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [busySocial, setBusySocial] = useState(false);
    const [tab, setTab] = useState("wall");
    const [adding, setAdding] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarCrop, setAvatarCrop] = useState({ crop_x: 0, crop_y: 0, crop_size: 1 });
    const [avatarDimensions, setAvatarDimensions] = useState({ width: 1, height: 1 });
    const avatarScaleX =
        Math.min(avatarDimensions.width, avatarDimensions.height) / avatarDimensions.width;
    const avatarScaleY =
        Math.min(avatarDimensions.width, avatarDimensions.height) / avatarDimensions.height;
    const root = useRef(null);
    const epoch = useRef(0);
    useEffect(() => {
        epoch.current += 1;
        return () => {
            epoch.current += 1;
        };
    }, [user.id, currentUser?.id]);
    useEffect(
        () => () => {
            if (avatarUrl) URL.revokeObjectURL(avatarUrl);
        },
        [avatarUrl]
    );
    useEffect(() => {
        if (!editing) return;
        const warn = (event) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [editing]);
    const cardData = profileCard || {
        cards: [],
        tags: [],
        social_links: [],
        background: {},
        works: [],
    };
    const start = (section, value) => {
        if (editing) return;
        setDraft(structuredClone(value));
        setEditing(section);
        setError("");
        setConflict(false);
        setAdding(false);
    };
    const cancel = () => {
        setEditing(null);
        setDraft(null);
        setError("");
        setConflict(false);
        setAvatar(null);
        setAvatarUrl("");
    };
    const save = async (patch) => {
        const generation = epoch.current;
        setSaving(true);
        setError("");
        setConflict(false);
        try {
            const response = await updateProfileCard({
                ...cardData,
                ...patch,
                version: cardData.version,
            });
            if (generation !== epoch.current) return;
            setProfileCard(response.data);
            if (patch.nickname !== undefined) {
                setUser((old) => ({ ...old, nickname: response.data.nickname }));
                await refreshUser();
            }
            cancel();
        } catch (err) {
            if (generation !== epoch.current) return;
            const nameTaken = err.response?.data?.code === "NAME_TAKEN";
            setConflict(err.response?.status === 409 && !nameTaken);
            setError(
                nameTaken
                    ? t("name_taken")
                    : err.response?.status === 409
                      ? t("conflict")
                      : t("save_failed")
            );
        } finally {
            if (generation === epoch.current) setSaving(false);
        }
    };
    const reloadVersion = async () => {
        try {
            const response = await getProfileCard(user.id);
            setProfileCard(response.data);
            cancel();
        } catch {
            setError(t("load_failed"));
        }
    };
    const uploadImage = async (file, field) => {
        if (!file) return;
        if (
            !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        ) {
            setError(t("image_error"));
            return;
        }
        const generation = epoch.current;
        setUploading(true);
        setError("");
        try {
            const response = await uploadProfileCardCover(file);
            const url = response.data?.fileUrl || response.data?.coverUrl;
            if (!url) throw new Error("Missing image");
            if (epoch.current === generation) setDraft((old) => ({ ...old, [field]: url }));
        } catch {
            if (generation === epoch.current) setError(t("upload_failed"));
        } finally {
            if (generation === epoch.current) setUploading(false);
        }
    };
    const social = async (kind) => {
        if (!currentUser) {
            window.dispatchEvent(new CustomEvent("open-auth-modal"));
            toast.error(t("login"));
            return;
        }
        const generation = epoch.current;
        setBusySocial(true);
        try {
            const active = kind === "like" ? user.is_liked : user.is_following;
            const response = await api.request({
                method: active ? "delete" : kind === "like" ? "put" : "post",
                url: `/users/${user.id}/${kind}`,
                noRetry: true,
            });
            if (generation === epoch.current) setUser((old) => ({ ...old, ...response.data }));
        } catch {
            toast.error(t("save_failed"));
        } finally {
            if (generation === epoch.current) setBusySocial(false);
        }
    };
    const share = async () => {
        const url = `${window.location.origin}/user/${user.id}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t("copied"));
        } catch {
            setError(`${t("copy_link")}: ${url}`);
        }
    };
    const buttons = (onSave) => (
        <div className="ph-save">
            <button
                type="button"
                className="ph-primary"
                disabled={saving || uploading || conflict}
                onClick={onSave}
            >
                <Check size={16} />
                {t(saving ? "saving" : "save")}
            </button>
            <button type="button" disabled={saving || uploading} onClick={cancel}>
                <X size={16} />
                {t("cancel")}
            </button>
        </div>
    );
    const editButton = (label, onClick) =>
        canEdit && (
            <button
                type="button"
                className="ph-icon"
                disabled={!!editing}
                aria-label={t(label)}
                onClick={onClick}
            >
                <Pencil size={16} />
            </button>
        );
    const background = editing === "background" ? draft : cardData.background || {};
    const cards = editing === "order" ? draft.cards : cardData.cards;
    const beginCard = (index) => start(`card:${index}`, { ...cardData.cards[index] });
    const saveBasics = () => {
        const form = root.current.querySelector("form");
        if (form && !form.reportValidity()) return;
        return save({
            ...draft,
            tags: draft.tagsText
                .split(/[,，\n]/)
                .map((label) => label.trim())
                .filter(Boolean),
        });
    };
    const saveCard = (index) => {
        if (
            !draft.source_type &&
            ![draft.title, draft.description, draft.cover_url, draft.link_url].some((value) =>
                String(value || "").trim()
            )
        ) {
            setError(t("empty_card"));
            return;
        }
        const next = [...cardData.cards];
        if (index < next.length) next[index] = draft;
        else next.push(draft);
        return save({ cards: next.map((item, i) => ({ ...item, sort_order: i })) });
    };
    const displayCard = (card, index) => {
        const edit = editing === `card:${index}`;
        if ((!owner || preview) && card.is_visible === false) return null;
        return (
            <article
                key={edit ? "editing-card" : card.id || index}
                className={`ph-card ${card.card_type === "heading" ? "ph-heading" : ""} ${card.aspect_ratio === "large" || card.card_type === "heading" ? "ph-wide" : ""} ${edit ? "ph-editing" : ""}`}
                data-testid="wall-card"
            >
                {edit ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            saveCard(index);
                        }}
                    >
                        <fieldset disabled={saving || uploading}>
                            {!draft.source_type && (
                                <>
                                    <label>
                                        {t("title")}
                                        <input
                                            autoFocus
                                            value={draft.title}
                                            maxLength={120}
                                            onChange={(e) =>
                                                setDraft({ ...draft, title: e.target.value })
                                            }
                                        />
                                    </label>
                                    {draft.card_type !== "heading" && (
                                        <label>
                                            {t("text")}
                                            <textarea
                                                rows={5}
                                                maxLength={4000}
                                                value={draft.description}
                                                onChange={(e) =>
                                                    setDraft({
                                                        ...draft,
                                                        description: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                    )}
                                    {draft.card_type !== "heading" && (
                                        <label>
                                            {t("link")}
                                            <input
                                                type="url"
                                                value={draft.link_url}
                                                placeholder="https://"
                                                onChange={(e) =>
                                                    setDraft({ ...draft, link_url: e.target.value })
                                                }
                                            />
                                        </label>
                                    )}
                                    {draft.card_type !== "heading" && (
                                        <label className="ph-upload">
                                            <ImagePlus size={16} />
                                            {t("image")}
                                            <input
                                                aria-label={t("image")}
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                onChange={(e) =>
                                                    uploadImage(e.target.files?.[0], "cover_url")
                                                }
                                            />
                                        </label>
                                    )}
                                </>
                            )}
                            {draft.cover_url && (
                                <>
                                    <div
                                        className="ph-cover"
                                        style={{
                                            aspectRatio: sizes[draft.aspect_ratio] || sizes.wide,
                                        }}
                                    >
                                        <img
                                            src={draft.cover_url}
                                            alt=""
                                            style={cropStyle(draft)}
                                        />
                                    </div>
                                    <label>
                                        {t("crop_size")}
                                        <input
                                            type="range"
                                            min="0.2"
                                            max="1"
                                            step="0.01"
                                            value={draft.crop_width || 1}
                                            onChange={(e) => {
                                                const size = Number(e.target.value);
                                                setDraft({
                                                    ...draft,
                                                    crop_width: size,
                                                    crop_height: size,
                                                    crop_x: Math.min(draft.crop_x || 0, 1 - size),
                                                    crop_y: Math.min(draft.crop_y || 0, 1 - size),
                                                });
                                            }}
                                        />
                                    </label>
                                    {["x", "y"].map((axis) => (
                                        <label key={axis}>
                                            {t(`position_${axis}`)}
                                            <input
                                                type="range"
                                                min="0"
                                                max={1 - (draft.crop_width || 1)}
                                                step="0.01"
                                                value={draft[`crop_${axis}`] || 0}
                                                onChange={(e) =>
                                                    setDraft({
                                                        ...draft,
                                                        [`crop_${axis}`]: Number(e.target.value),
                                                    })
                                                }
                                            />
                                        </label>
                                    ))}
                                    {!draft.source_type && (
                                        <button
                                            type="button"
                                            onClick={() => setDraft({ ...draft, cover_url: "" })}
                                        >
                                            {t("remove_image")}
                                        </button>
                                    )}
                                </>
                            )}
                            {draft.card_type !== "heading" && (
                                <label>
                                    {t("size")}
                                    <select
                                        value={draft.aspect_ratio}
                                        onChange={(e) =>
                                            setDraft({ ...draft, aspect_ratio: e.target.value })
                                        }
                                    >
                                        {Object.keys(sizes).map((size) => (
                                            <option key={size} value={size}>
                                                {t(`size_${size}`)}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <label className="ph-check">
                                <input
                                    type="checkbox"
                                    checked={draft.is_visible !== false}
                                    onChange={(e) =>
                                        setDraft({ ...draft, is_visible: e.target.checked })
                                    }
                                />
                                {t("public")}
                            </label>
                        </fieldset>
                        {buttons(() => {
                            if (root.current.querySelector("form:invalid")) {
                                root.current.querySelector("form:invalid").reportValidity();
                                return;
                            }
                            saveCard(index);
                        })}
                    </form>
                ) : (
                    <>
                        <CardView card={card} t={t} />
                        {card.is_visible === false && (
                            <small className="ph-muted">
                                <EyeOff size={14} />
                                {t("hidden")}
                            </small>
                        )}
                        {canEdit && (
                            <div className="ph-card-tools">
                                {editing === "order" ? (
                                    <>
                                        {[
                                            [-1, ArrowUp, "up"],
                                            [1, ArrowDown, "down"],
                                        ].map(([step, Icon, key]) => (
                                            <button
                                                type="button"
                                                key={key}
                                                aria-label={t(key)}
                                                disabled={
                                                    saving ||
                                                    index + step < 0 ||
                                                    index + step >= cards.length
                                                }
                                                onClick={() => {
                                                    const next = [...cards];
                                                    [next[index], next[index + step]] = [
                                                        next[index + step],
                                                        next[index],
                                                    ];
                                                    setDraft({ cards: next });
                                                }}
                                            >
                                                <Icon size={16} />
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            disabled={saving}
                                            aria-label={t("remove")}
                                            onClick={() =>
                                                setDraft({
                                                    cards: cards.filter((_, i) => i !== index),
                                                })
                                            }
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                ) : (
                                    editButton("edit_card", () => beginCard(index))
                                )}
                            </div>
                        )}
                    </>
                )}
            </article>
        );
    };

    return (
        <div
            ref={root}
            className={`profile-home ${isDayMode ? "ph-day" : "ph-night"}`}
            style={{ backgroundColor: background.color || undefined }}
        >
            {background.image && (
                <div
                    className="ph-background"
                    style={{
                        backgroundImage: `url(${JSON.stringify(background.image)})`,
                        backgroundPosition: `${background.x ?? 50}% ${background.y ?? 50}%`,
                        opacity: background.opacity ?? 0.25,
                    }}
                />
            )}
            <div className="ph-content">
                <div className="ph-toolbar">
                    {owner && (
                        <button
                            type="button"
                            disabled={!!editing}
                            onClick={() => setPreview(!preview)}
                        >
                            <Eye size={16} />
                            {t(preview ? "back_edit" : "preview")}
                        </button>
                    )}
                    {canEdit && (
                        <button
                            type="button"
                            disabled={!!editing}
                            onClick={() => start("background", cardData.background || {})}
                        >
                            <ImagePlus size={16} />
                            {t("background")}
                        </button>
                    )}
                    <button type="button" onClick={share}>
                        <Share2 size={16} />
                        {t("share")}
                    </button>
                    {canEdit && (
                        <details className="ph-menu">
                            <summary>{t("account")}</summary>
                            <div>
                                {[
                                    "submissions",
                                    "favorites",
                                    "messages",
                                    "security",
                                    "identity",
                                    "activity-profile",
                                ].map((key) => (
                                    <button
                                        key={key}
                                        type="button"
                                        disabled={!!editing}
                                        onClick={() => onManage(key)}
                                    >
                                        {t(key)}
                                    </button>
                                ))}
                            </div>
                        </details>
                    )}
                </div>
                {editing === "background" && (
                    <div className="ph-editor" data-testid="background-editor">
                        <fieldset disabled={saving || uploading}>
                            <label>
                                {t("background_color")}
                                <input
                                    type="color"
                                    value={draft.color || (isDayMode ? "#f5f6fa" : "#101322")}
                                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                                />
                            </label>
                            <label className="ph-upload">
                                {t("background_image")}
                                <input
                                    aria-label={t("background_image")}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(e) => uploadImage(e.target.files?.[0], "image")}
                                />
                            </label>
                            {draft.image &&
                                ["x", "y"].map((axis) => (
                                    <label key={axis}>
                                        {t(`position_${axis}`)}
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={draft[axis] ?? 50}
                                            onChange={(e) =>
                                                setDraft({
                                                    ...draft,
                                                    [axis]: Number(e.target.value),
                                                })
                                            }
                                        />
                                    </label>
                                ))}
                            {draft.image && (
                                <label>
                                    {t("opacity")}
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step=".05"
                                        value={draft.opacity ?? 0.25}
                                        onChange={(e) =>
                                            setDraft({ ...draft, opacity: Number(e.target.value) })
                                        }
                                    />
                                </label>
                            )}
                            <button type="button" onClick={() => setDraft({})}>
                                {t("reset")}
                            </button>
                        </fieldset>
                        {buttons(() => save({ background: draft }))}
                    </div>
                )}
                <header className="ph-hero">
                    <div className="ph-avatar-block">
                        <div className="ph-avatar">
                            {user.avatar ? (
                                <img src={user.avatar} alt="" />
                            ) : (
                                (user.nickname || user.username || "?")[0]
                            )}
                        </div>
                        {editButton("edit_avatar", () => start("avatar", {}))}
                    </div>
                    <div className="ph-intro">
                        {editing === "basics" ? (
                            <form
                                className="ph-editor"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    saveBasics();
                                }}
                            >
                                <fieldset disabled={saving}>
                                    <label>
                                        {t("name")}
                                        <input
                                            autoFocus
                                            required
                                            maxLength={40}
                                            value={draft.nickname}
                                            onChange={(e) =>
                                                setDraft({ ...draft, nickname: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label>
                                        {t("slogan")}
                                        <input
                                            maxLength={240}
                                            value={draft.slogan}
                                            onChange={(e) =>
                                                setDraft({ ...draft, slogan: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label>
                                        {t("description")}
                                        <textarea
                                            rows={4}
                                            maxLength={4000}
                                            value={draft.description}
                                            onChange={(e) =>
                                                setDraft({ ...draft, description: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label>
                                        {t("tags")}
                                        <input
                                            value={draft.tagsText}
                                            onChange={(e) =>
                                                setDraft({ ...draft, tagsText: e.target.value })
                                            }
                                        />
                                    </label>
                                    <label>
                                        {t("status")}
                                        <select
                                            value={draft.status}
                                            onChange={(e) =>
                                                setDraft({ ...draft, status: e.target.value })
                                            }
                                        >
                                            {[
                                                "",
                                                "open_chat",
                                                "seeking_collab",
                                                "coffee_chat",
                                                "team_up",
                                                "joining_events",
                                                "busy",
                                            ].map((value) => (
                                                <option key={value} value={value}>
                                                    {value
                                                        ? translate(
                                                              `user_profile.center.profile_status.${value}`
                                                          )
                                                        : t("none")}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </fieldset>
                                {buttons(saveBasics)}
                            </form>
                        ) : (
                            <>
                                <div className="ph-name">
                                    <h1>{user.nickname || user.username}</h1>
                                    {editButton("edit_basics", () =>
                                        start("basics", {
                                            nickname: user.nickname || user.username,
                                            slogan: cardData.slogan || "",
                                            description: cardData.description || "",
                                            tagsText: cardData.tags
                                                .map((tag) => tag.label || tag)
                                                .join(", "),
                                            status: cardData.status || "",
                                        })
                                    )}
                                </div>
                                {cardData.status && (
                                    <span className="ph-status">
                                        {translate(
                                            `user_profile.center.profile_status.${cardData.status}`
                                        )}
                                    </span>
                                )}
                                {cardData.slogan && <p className="ph-slogan">{cardData.slogan}</p>}
                                {cardData.description && (
                                    <p className="ph-description">{cardData.description}</p>
                                )}
                                {!!cardData.tags.length && (
                                    <div className="ph-tags">
                                        {cardData.tags.map((tag, index) => (
                                            <span key={index}>{tag.label || tag}</span>
                                        ))}
                                    </div>
                                )}
                                {canEdit && !cardData.slogan && (
                                    <button
                                        type="button"
                                        className="ph-text-action"
                                        disabled={!!editing}
                                        onClick={() =>
                                            start("basics", {
                                                nickname: user.nickname || user.username,
                                                slogan: "",
                                                description: cardData.description || "",
                                                status: cardData.status || "",
                                                tagsText: cardData.tags
                                                    .map((tag) => tag.label || tag)
                                                    .join(", "),
                                            })
                                        }
                                    >
                                        {t("add_intro")}
                                    </button>
                                )}
                            </>
                        )}
                        <div className="ph-social-stats">
                            <button
                                type="button"
                                aria-pressed={!!user.is_liked}
                                disabled={owner || busySocial}
                                onClick={() => social("like")}
                            >
                                <Heart size={17} fill={user.is_liked ? "currentColor" : "none"} />
                                {user.profile_likes || 0} {t("likes")}
                            </button>
                            <button
                                type="button"
                                disabled={!!editing}
                                onClick={() => onOpenRelations("following")}
                            >
                                {user.following_count || 0} {t("following")}
                            </button>
                            <button
                                type="button"
                                disabled={!!editing}
                                onClick={() => onOpenRelations("followers")}
                            >
                                {user.followers_count || 0} {t("followers")}
                            </button>
                            {!owner && (
                                <button
                                    type="button"
                                    className="ph-primary"
                                    disabled={busySocial}
                                    onClick={() => social("follow")}
                                >
                                    {t(
                                        user.is_following
                                            ? user.is_followed_by
                                                ? "mutual"
                                                : "followed"
                                            : "follow"
                                    )}
                                </button>
                            )}
                        </div>
                        <div className="ph-contacts">
                            {cardData.social_links
                                .filter((link) => canEdit || link.is_visible !== false)
                                .map((link, index) => (
                                    <span key={index}>
                                        {link.platform === "wechat" ? (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigator.clipboard
                                                        .writeText(link.url)
                                                        .then(() => toast.success(t("copied")))
                                                        .catch(() => toast.error(link.url))
                                                }
                                            >
                                                {link.label || t("wechat")}
                                            </button>
                                        ) : (
                                            <a
                                                href={
                                                    link.platform === "email"
                                                        ? `mailto:${encodeURIComponent(link.url)}`
                                                        : safeLink(link.url)
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {link.label || link.platform} ↗
                                            </a>
                                        )}
                                        {link.is_visible === false && <EyeOff size={12} />}
                                    </span>
                                ))}
                            {editButton("edit_contacts", () =>
                                start("contacts", { links: cardData.social_links })
                            )}
                            {canEdit && !cardData.social_links.length && (
                                <button
                                    type="button"
                                    disabled={!!editing}
                                    onClick={() => start("contacts", { links: [] })}
                                >
                                    {t("add_contact")}
                                </button>
                            )}
                        </div>
                    </div>
                </header>
                {editing === "avatar" && (
                    <div className="ph-editor">
                        <label>
                            {t("image")}
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (
                                        !["image/png", "image/jpeg", "image/webp"].includes(
                                            file.type
                                        ) ||
                                        file.size > 5 * 1024 * 1024
                                    ) {
                                        setError(t("image_error"));
                                        return;
                                    }
                                    setAvatar(file);
                                    setAvatarUrl(URL.createObjectURL(file));
                                    setAvatarCrop({ crop_x: 0, crop_y: 0, crop_size: 1 });
                                }}
                            />
                        </label>
                        {avatarUrl && (
                            <>
                                <div
                                    className="ph-avatar-crop"
                                    style={{
                                        aspectRatio: `${avatarDimensions.width} / ${avatarDimensions.height}`,
                                    }}
                                >
                                    <img
                                        src={avatarUrl}
                                        alt=""
                                        onLoad={(e) =>
                                            setAvatarDimensions({
                                                width: e.target.naturalWidth,
                                                height: e.target.naturalHeight,
                                            })
                                        }
                                    />
                                    <div
                                        style={{
                                            left: `${avatarCrop.crop_x * 100}%`,
                                            top: `${avatarCrop.crop_y * 100}%`,
                                            width: `${avatarCrop.crop_size * avatarScaleX * 100}%`,
                                            height: `${avatarCrop.crop_size * avatarScaleY * 100}%`,
                                        }}
                                    />
                                </div>
                                <label>
                                    {t("crop_size")}
                                    <input
                                        type="range"
                                        min=".2"
                                        max="1"
                                        step=".01"
                                        value={avatarCrop.crop_size}
                                        onChange={(e) => {
                                            const size = Number(e.target.value);
                                            setAvatarCrop({
                                                crop_x: Math.min(
                                                    avatarCrop.crop_x,
                                                    1 - size * avatarScaleX
                                                ),
                                                crop_y: Math.min(
                                                    avatarCrop.crop_y,
                                                    1 - size * avatarScaleY
                                                ),
                                                crop_size: size,
                                            });
                                        }}
                                    />
                                </label>
                                {["x", "y"].map((axis) => (
                                    <label key={axis}>
                                        {t(`position_${axis}`)}
                                        <input
                                            type="range"
                                            min="0"
                                            max={
                                                1 -
                                                avatarCrop.crop_size *
                                                    (axis === "x" ? avatarScaleX : avatarScaleY)
                                            }
                                            step=".01"
                                            value={avatarCrop[`crop_${axis}`]}
                                            onChange={(e) =>
                                                setAvatarCrop({
                                                    ...avatarCrop,
                                                    [`crop_${axis}`]: Number(e.target.value),
                                                })
                                            }
                                        />
                                    </label>
                                ))}
                            </>
                        )}
                        {buttons(async () => {
                            if (!avatar) return;
                            const generation = epoch.current;
                            setSaving(true);
                            try {
                                const response = await uploadAvatar(avatar, avatarCrop);
                                if (generation !== epoch.current) return;
                                setUser((old) => ({
                                    ...old,
                                    avatar: response.data.avatar || response.data.user?.avatar,
                                }));
                                await refreshUser();
                                cancel();
                            } catch {
                                setError(t("upload_failed"));
                            } finally {
                                if (generation === epoch.current) setSaving(false);
                            }
                        })}
                    </div>
                )}
                {editing === "contacts" && (
                    <form
                        className="ph-editor"
                        onSubmit={(e) => {
                            e.preventDefault();
                            save({ social_links: draft.links });
                        }}
                    >
                        <fieldset disabled={saving}>
                            {draft.links.map((link, index) => (
                                <div className="ph-contact-row" key={index}>
                                    <label>
                                        {t("platform")}
                                        <select
                                            value={link.platform}
                                            onChange={(e) =>
                                                setDraft({
                                                    links: draft.links.map((v, i) =>
                                                        i === index
                                                            ? { ...v, platform: e.target.value }
                                                            : v
                                                    ),
                                                })
                                            }
                                        >
                                            {[
                                                "website",
                                                "wechat",
                                                "email",
                                                "github",
                                                "bilibili",
                                                "xiaohongshu",
                                                "zhihu",
                                                "linkedin",
                                                "twitter",
                                                "custom",
                                            ].map((platform) => (
                                                <option key={platform} value={platform}>
                                                    {t(platform)}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        {t("label")}
                                        <input
                                            value={link.label || ""}
                                            onChange={(e) =>
                                                setDraft({
                                                    links: draft.links.map((v, i) =>
                                                        i === index
                                                            ? { ...v, label: e.target.value }
                                                            : v
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <label>
                                        {t("address")}
                                        <input
                                            required
                                            type={
                                                link.platform === "email"
                                                    ? "email"
                                                    : link.platform === "wechat"
                                                      ? "text"
                                                      : "url"
                                            }
                                            value={link.url}
                                            onChange={(e) =>
                                                setDraft({
                                                    links: draft.links.map((v, i) =>
                                                        i === index
                                                            ? { ...v, url: e.target.value }
                                                            : v
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="ph-check">
                                        <input
                                            type="checkbox"
                                            checked={link.is_visible !== false}
                                            onChange={(e) =>
                                                setDraft({
                                                    links: draft.links.map((v, i) =>
                                                        i === index
                                                            ? { ...v, is_visible: e.target.checked }
                                                            : v
                                                    ),
                                                })
                                            }
                                        />
                                        {t("public")}
                                    </label>
                                    <button
                                        type="button"
                                        aria-label={t("remove")}
                                        onClick={() =>
                                            setDraft({
                                                links: draft.links.filter((_, i) => i !== index),
                                            })
                                        }
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                disabled={draft.links.length >= 20}
                                onClick={() =>
                                    setDraft({
                                        links: [
                                            ...draft.links,
                                            {
                                                platform: "website",
                                                label: "",
                                                url: "",
                                                is_visible: true,
                                            },
                                        ],
                                    })
                                }
                            >
                                <Plus size={16} />
                                {t("add_contact")}
                            </button>
                        </fieldset>
                        {buttons(() => {
                            const form = root.current.querySelector("form");
                            if (form.reportValidity()) save({ social_links: draft.links });
                        })}
                    </form>
                )}
                {error && (
                    <div className="ph-error" role="alert">
                        {error}
                        {conflict && (
                            <button type="button" onClick={reloadVersion}>
                                {t("reload")}
                            </button>
                        )}
                    </div>
                )}
                <div className="ph-wall-bar">
                    <nav aria-label={t("contents")}>
                        {["wall", "event", "article"].map((key) => (
                            <button
                                type="button"
                                key={key}
                                disabled={!!editing}
                                aria-current={tab === key ? "page" : undefined}
                                onClick={() => {
                                    setTab(key);
                                    setAdding(false);
                                }}
                            >
                                {t(key)}
                            </button>
                        ))}
                    </nav>
                    {canEdit && tab === "wall" && (
                        <div className="ph-wall-actions">
                            <button
                                type="button"
                                disabled={!!editing || cards.length >= 40}
                                onClick={() => setAdding(!adding)}
                            >
                                <Plus size={16} />
                                {t("add")}
                            </button>
                            <button
                                type="button"
                                disabled={!!editing || !cards.length}
                                onClick={() => start("order", { cards: cardData.cards })}
                            >
                                {t("organize")}
                            </button>
                        </div>
                    )}
                </div>
                {adding && (
                    <div className="ph-add-menu">
                        {["text", "image", "link", "heading"].map((type) => (
                            <button
                                type="button"
                                key={type}
                                onClick={() => start(`card:${cards.length}`, emptyCard(type))}
                            >
                                {t(type)}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => {
                                setAdding(false);
                                setTab("event");
                            }}
                        >
                            {t("choose_work")}
                        </button>
                    </div>
                )}
                {editing === "order" && (
                    <div className="ph-order-save">
                        {buttons(() =>
                            save({
                                cards: draft.cards.map((card, index) => ({
                                    ...card,
                                    sort_order: index,
                                })),
                            })
                        )}
                    </div>
                )}
                {tab === "wall" ? (
                    <div className="ph-wall">
                        {cards.map(displayCard)}
                        {editing === `card:${cards.length}` && displayCard(draft, cards.length)}
                        {!cards.length && !editing && (
                            <div className="ph-empty">
                                {t(canEdit ? "empty_owner" : "empty_wall")}
                                {canEdit && (
                                    <button type="button" onClick={() => setAdding(true)}>
                                        <Plus size={16} />
                                        {t("add")}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="ph-wall">
                        {(cardData.works || [])
                            .filter((work) => work.type === tab)
                            .map((work) => (
                                <article className="ph-card" key={work.id}>
                                    <CardView
                                        card={{
                                            title: work.title,
                                            cover_url: work.cover,
                                            link_url: work.url,
                                            source_type: work.type,
                                            aspect_ratio: "wide",
                                        }}
                                        t={t}
                                    />
                                    {canEdit && (
                                        <button
                                            type="button"
                                            className="ph-work-add"
                                            disabled={
                                                saving ||
                                                cards.length >= 40 ||
                                                cards.some(
                                                    (card) =>
                                                        card.source_type === work.type &&
                                                        card.source_id === work.id
                                                )
                                            }
                                            onClick={() =>
                                                save({
                                                    cards: [
                                                        ...cards,
                                                        {
                                                            ...emptyCard(work.type),
                                                            source_type: work.type,
                                                            source_id: work.id,
                                                            sort_order: cards.length,
                                                        },
                                                    ],
                                                })
                                            }
                                        >
                                            <Plus size={16} />
                                            {t(
                                                cards.some(
                                                    (card) =>
                                                        card.source_type === work.type &&
                                                        card.source_id === work.id
                                                )
                                                    ? "added"
                                                    : "add_to_wall"
                                            )}
                                        </button>
                                    )}
                                </article>
                            ))}
                        {!(cardData.works || []).some((work) => work.type === tab) && (
                            <p className="ph-empty">{t("empty_works")}</p>
                        )}
                    </div>
                )}
                {canEdit && (
                    <p className="ph-footer-note">
                        {t("private_hint")}{" "}
                        <Link to="/me?tab=settings&settings=security">{t("account")}</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
