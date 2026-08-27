import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Loader2, Trophy, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import api, { createProjectCard } from "../services/api";

const initialForm = () => ({
    title: "",
    summary: "",
    author: "",
    major: "",
    gitUrl: "",
    deploymentUrl: "",
    cover: null,
});

const uploadCover = async (file) => {
    if (!file) return null;
    const body = new FormData();
    body.append("file", file);
    const response = await api.post("/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.fileUrl;
};

const EventProjectSubmissionModal = ({ open, onClose, onSubmitted, competition }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [createdProjectId, setCreatedProjectId] = useState("");
    const [coverPreview, setCoverPreview] = useState("");
    const fileRef = useRef(null);

    useBackClose(open, onClose);
    useBodyScrollLock(open);

    useEffect(() => {
        if (!open) return;
        setForm({
            ...initialForm(),
            author: user?.nickname || user?.username || "",
        });
        setCreatedProjectId("");
    }, [open, user?.nickname, user?.username]);

    useEffect(() => {
        if (!form.cover) {
            setCoverPreview("");
            return undefined;
        }
        const preview = URL.createObjectURL(form.cover);
        setCoverPreview(preview);
        return () => URL.revokeObjectURL(preview);
    }, [form.cover]);

    if (!open || typeof document === "undefined") return null;

    const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
    const validate = () => {
        if (!form.cover) return t("event_project_submit.validation.cover");
        if (!form.title.trim()) return t("event_project_submit.validation.title");
        if (!form.summary.trim()) return t("event_project_submit.validation.summary");
        if (!form.author.trim()) return t("event_project_submit.validation.author");
        if (!form.major.trim()) return t("event_project_submit.validation.major");
        try {
            const url = new URL(form.gitUrl.trim());
            if (url.protocol !== "https:") throw new Error("protocol");
        } catch {
            return t("event_project_submit.validation.git_url");
        }
        if (form.deploymentUrl.trim()) {
            try {
                const url = new URL(form.deploymentUrl.trim());
                if (url.protocol !== "https:") throw new Error("protocol");
            } catch {
                return t("event_project_submit.validation.deployment_url");
            }
        }
        return null;
    };

    const submit = async (event) => {
        event.preventDefault();
        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }
        setSubmitting(true);
        let projectId = createdProjectId;
        try {
            let coverUrl = null;
            if (!projectId) {
                coverUrl = await uploadCover(form.cover);
                const projectResponse = await createProjectCard({
                    title: form.title.trim(),
                    intro: form.summary.trim(),
                    content: form.summary.trim(),
                    progress: "live",
                    need_tags: [],
                    tech_tags: [],
                    repo_url: form.gitUrl.trim(),
                    deployment_provider: form.deploymentUrl.trim() ? "modelscope" : null,
                    deployment_url: form.deploymentUrl.trim() || null,
                    images: coverUrl ? [coverUrl] : [],
                    status: "published",
                });
                projectId = String(projectResponse.data.id);
                setCreatedProjectId(projectId);
            }
            await api.post(`/competitions/${encodeURIComponent(competition.slug)}/works`, {
                project_id: projectId,
                title: form.title.trim(),
                author: form.author.trim(),
                summary: form.summary.trim(),
                major: form.major.trim(),
                git_url: form.gitUrl.trim(),
                deployment_provider: form.deploymentUrl.trim() ? "modelscope" : null,
                deployment_url: form.deploymentUrl.trim() || null,
                public_consent: true,
                cover_url: coverUrl,
            });
            toast.success(t("event_project_submit.success"));
            onSubmitted?.();
            onClose?.();
        } catch (requestError) {
            const message = requestError.response?.data?.error || requestError.message;
            toast.error(
                createdProjectId || projectId
                    ? t("event_project_submit.retry_error", { message })
                    : t("event_project_submit.error", { message })
            );
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div className="event-project-submit-backdrop" onMouseDown={onClose}>
            <section
                className={`event-project-submit ${isDayMode ? "is-day" : "is-dark"}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-project-submit-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header>
                    <div>
                        <span>{competition.title}</span>
                        <h2 id="event-project-submit-title">{t("event_project_submit.title")}</h2>
                        <p>{t("event_project_submit.description")}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label={t("common.close")}>
                        <X className="h-5 w-5" />
                    </button>
                </header>
                <form onSubmit={submit}>
                    <button
                        type="button"
                        className={`event-project-cover ${form.cover ? "has-file" : ""}`}
                        onClick={() => fileRef.current?.click()}
                    >
                        {form.cover ? (
                            <img src={coverPreview} alt="" />
                        ) : (
                            <>
                                <ImagePlus className="h-7 w-7" />
                                <strong>{t("event_project_submit.cover")}</strong>
                                <span>{t("event_project_submit.cover_hint")}</span>
                            </>
                        )}
                    </button>
                    <input
                        ref={fileRef}
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) => update("cover", event.target.files?.[0] || null)}
                    />
                    <label>
                        {t("event_project_submit.name")}
                        <input
                            value={form.title}
                            onChange={(event) => update("title", event.target.value)}
                            maxLength={40}
                        />
                    </label>
                    <label>
                        {t("event_project_submit.summary")}
                        <textarea
                            rows={3}
                            value={form.summary}
                            onChange={(event) => update("summary", event.target.value)}
                            maxLength={240}
                        />
                    </label>
                    <div className="event-project-fields">
                        <label>
                            {t("event_project_submit.author")}
                            <input
                                value={form.author}
                                onChange={(event) => update("author", event.target.value)}
                                maxLength={80}
                            />
                        </label>
                        <label>
                            {t("event_project_submit.major")}
                            <input
                                value={form.major}
                                onChange={(event) => update("major", event.target.value)}
                                maxLength={160}
                            />
                        </label>
                    </div>
                    <div className="event-project-fields">
                        <label>
                            {t("event_project_submit.git_url")}
                            <input
                                type="url"
                                value={form.gitUrl}
                                onChange={(event) => update("gitUrl", event.target.value)}
                                placeholder="https://github.com/..."
                            />
                        </label>
                        <label>
                            {t("event_project_submit.deployment_url")}
                            <input
                                type="url"
                                value={form.deploymentUrl}
                                onChange={(event) => update("deploymentUrl", event.target.value)}
                                placeholder="https://modelscope.cn/studios/..."
                            />
                        </label>
                    </div>
                    {createdProjectId ? (
                        <p className="event-project-retry">
                            {t("event_project_submit.retry_hint")}
                        </p>
                    ) : null}
                    <button
                        className="event-project-submit-action"
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trophy className="h-4 w-4" />
                        )}
                        {submitting
                            ? t("event_project_submit.submitting")
                            : t("event_project_submit.action")}
                    </button>
                </form>
            </section>
            <style>{`
                .event-project-submit-backdrop{position:fixed;inset:0;z-index:180;display:grid;place-items:center;padding:1rem;background:rgba(0,0,0,.78);backdrop-filter:blur(10px)}
                .event-project-submit{--accent:#b9ff18;width:min(720px,100%);max-height:calc(100dvh - 2rem);overflow:auto;border:1px solid rgba(185,255,24,.32);border-radius:16px;background:#041008;color:#f7f8f2;box-shadow:0 30px 90px rgba(0,0,0,.52)}.event-project-submit.is-day{background:#fbfff3;color:#10200b;box-shadow:0 30px 90px rgba(22,50,16,.2)}
                .event-project-submit header{display:flex;align-items:flex-start;justify-content:space-between;gap:1.5rem;padding:1.35rem 1.5rem;border-bottom:1px solid rgba(185,255,24,.22)}.event-project-submit header span{color:var(--accent);font-size:.7rem;font-weight:900}.event-project-submit header h2{margin:.4rem 0 0;font-size:1.55rem;font-weight:950}.event-project-submit header p{margin:.45rem 0 0;color:color-mix(in srgb,currentColor 62%,transparent);font-size:.8rem}.event-project-submit header button{display:grid;width:40px;height:40px;place-items:center;border:1px solid rgba(185,255,24,.22);border-radius:10px;background:transparent;color:inherit}
                .event-project-submit form{display:grid;gap:1rem;padding:1.4rem 1.5rem}.event-project-submit label{display:grid;gap:.45rem;font-size:.78rem;font-weight:900}.event-project-submit input,.event-project-submit textarea{width:100%;border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:10px;background:color-mix(in srgb,currentColor 5%,transparent);padding:.72rem .8rem;color:inherit;outline:none}.event-project-submit input:focus,.event-project-submit textarea:focus{border-color:var(--accent)}
                .event-project-cover{position:relative;display:grid;min-height:180px;place-items:center;align-content:center;gap:.35rem;overflow:hidden;border:1px dashed rgba(185,255,24,.5);border-radius:12px;background:rgba(185,255,24,.04);color:inherit}.event-project-cover span{font-size:.72rem;opacity:.58}.event-project-cover.has-file{display:block;padding:0;border-style:solid}.event-project-cover img{display:block;width:100%;height:220px;object-fit:cover}
                .event-project-fields{display:grid;grid-template-columns:1fr 1.3fr;gap:1rem}.event-project-retry{margin:0;color:#f6c453;font-size:.75rem;font-weight:800}.event-project-submit-action{display:inline-flex;min-height:50px;align-items:center;justify-content:center;gap:.55rem;border:0;border-radius:10px;background:var(--accent);color:#071006;font-weight:950}.event-project-submit-action:disabled{opacity:.6}
                @media(max-width:640px){.event-project-submit-backdrop{align-items:end;padding:0}.event-project-submit{max-height:100dvh;height:100dvh;border:0;border-radius:0}.event-project-submit header{padding:1rem}.event-project-submit form{padding:1rem}.event-project-fields{grid-template-columns:1fr}.event-project-cover{min-height:145px}.event-project-cover img{height:180px}}
            `}</style>
        </div>,
        document.body
    );
};

export default EventProjectSubmissionModal;
