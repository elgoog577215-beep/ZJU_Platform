import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
    Check,
    Film,
    Github,
    Image as ImageIcon,
    Loader2,
    PackagePlus,
    Upload,
    X,
} from "lucide-react";
import toast from "react-hot-toast";

import api, { getProjects, uploadFile } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";

import {
    appendPhotoFiles,
    batchPhotoTitle,
    isRetryablePhoto,
    PHOTO_ACCEPT,
    PHOTO_BATCH_LIMIT,
} from "../utils/eventPhotoBatch";

const validUploadTypes = new Set(["stage_photo", "promo_video", "work"]);

const createInitialForm = (type = "stage_photo", projectId = "") => ({
    type: validUploadTypes.has(type) ? type : "stage_photo",
    title: "",
    description: "",
    file: null,
    coverFile: null,
    projectId: projectId ? String(projectId) : "",
    workTitle: "",
    author: "",
    summary: "",
    gitUrl: "",
    deploymentUrl: "",
    award: "",
    rank: "",
    honorTitle: "",
    grade: "",
    major: "",
    highlight: "",
    experience: "",
    publicConsent: true,
});

const uploadAsset = async (file, fieldName = "file", t) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append(fieldName, file);
    try {
        const response = await uploadFile("/upload", formData);
        return fieldName === "cover" ? response.data.coverUrl : response.data.fileUrl;
    } catch (error) {
        const serverMessage =
            error.response?.data?.message || error.response?.data?.error || error.message;
        throw new Error(
            t("outcome_upload.errors.upload_failed", "{{asset}}上传失败：{{message}}", {
                asset:
                    fieldName === "cover"
                        ? t("outcome_upload.fields.cover", "封面（可选）")
                        : t("outcome_upload.fields.file", "文件"),
                message: serverMessage,
            })
        );
    }
};

const extractApiError = (error, t) => {
    const data = error.response?.data;
    if (typeof data === "string") {
        if (data.trim().startsWith("<!doctype") || data.includes("<html")) {
            return t(
                "outcome_upload.errors.non_json",
                "接口没有返回 JSON，当前后端可能还没重启到最新版"
            );
        }
        return data;
    }
    return (
        data?.error ||
        data?.message ||
        error.message ||
        t("outcome_upload.errors.unknown", "未知错误")
    );
};

const CompetitionOutcomeUploadModal = ({
    open,
    onClose,
    onSubmitted,
    initialType = "stage_photo",
    lockType = false,
    initialProjectId = "",
    competitionSlug,
    competitionTitle,
    photoCategories = [],
    initialPhotoCategory = "",
}) => {
    const { t } = useTranslation();
    const { user, isAdmin } = useAuth();
    const { uiMode } = useSettings();
    const isDayMode = uiMode === "day";
    const [form, setForm] = useState(() => createInitialForm(initialType, initialProjectId));
    const [submitting, setSubmitting] = useState(false);
    const [submitLabel, setSubmitLabel] = useState("");
    const [projectOptions, setProjectOptions] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);

    const [photos, setPhotos] = useState([]);
    const [selectionNotice, setSelectionNotice] = useState("");
    const [photoCategory, setPhotoCategory] = useState(initialPhotoCategory);
    const previewUrls = useRef(new Set());
    const submittingRef = useRef(false);
    useEffect(
        () => () => {
            previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
        },
        []
    );

    useBackClose(open, () => {
        if (!submittingRef.current) onClose?.();
    });
    useBodyScrollLock(open);

    const typeOptions = useMemo(
        () => [
            {
                value: "stage_photo",
                label: t("outcome_upload.types.photo", "赛场照片"),
                destination: t("outcome_upload.types.photo_destination", "本场照片"),
                icon: ImageIcon,
            },
            {
                value: "promo_video",
                label: t("outcome_upload.types.video", "赛事宣传片"),
                destination: t("outcome_upload.types.video_destination", "本场视频"),
                icon: Film,
            },
            {
                value: "work",
                label: t("outcome_upload.types.work", "参赛项目"),
                destination: t("outcome_upload.types.work_destination", "本场作品"),
                icon: PackagePlus,
            },
        ],
        [t]
    );

    const shellClass = isDayMode
        ? "bg-white text-slate-950 shadow-[0_24px_90px_rgba(15,23,42,0.22)]"
        : "bg-[#071014] text-white shadow-[0_28px_100px_rgba(0,0,0,0.58)]";
    const inputClass = isDayMode
        ? "border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-cyan-500"
        : "border-white/10 bg-white/[0.06] text-white placeholder:text-white/38 focus:border-cyan-300/70";
    const mutedClass = isDayMode ? "text-slate-500" : "text-white/58";

    const selectedType = useMemo(
        () => typeOptions.find((option) => option.value === form.type) || typeOptions[0],
        [form.type, typeOptions]
    );
    const SelectedIcon = selectedType.icon;
    const isPromoVideo = form.type === "promo_video";
    const photosOnly = lockType && initialType === "stage_photo";

    useEffect(() => {
        if (open) {
            setForm(createInitialForm(initialType, initialProjectId));
            setSubmitLabel("");
            setPhotos([]);
            setSelectionNotice("");
            setPhotoCategory(initialPhotoCategory);
            previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
            previewUrls.current.clear();
        }
    }, [initialProjectId, initialType, initialPhotoCategory, open]);

    useEffect(() => {
        if (!open || form.type !== "work" || !user) return;
        let alive = true;
        setProjectsLoading(true);
        getProjects({ mine: 1, limit: 48 })
            .then(({ data }) => {
                if (!alive) return;
                const projects = Array.isArray(data?.items) ? data.items : [];
                setProjectOptions(projects);
                const selected = projects.find(
                    (project) => String(project.id) === String(initialProjectId)
                );
                if (selected) {
                    setForm((previous) => ({
                        ...previous,
                        projectId: String(selected.id),
                        workTitle: previous.workTitle || selected.title || "",
                        summary: previous.summary || selected.intro || "",
                        gitUrl: previous.gitUrl || selected.repo_url || "",
                        deploymentUrl: previous.deploymentUrl || selected.deployment_url || "",
                        author:
                            previous.author ||
                            selected.owner_name ||
                            user.nickname ||
                            user.username ||
                            "",
                    }));
                }
            })
            .catch(() => alive && setProjectOptions([]))
            .finally(() => alive && setProjectsLoading(false));
        return () => {
            alive = false;
        };
    }, [form.type, initialProjectId, open, user]);

    if (!open) return null;

    const updateField = (field, value) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const resetAndClose = () => {
        if (submittingRef.current) return;
        setForm(createInitialForm(initialType, initialProjectId));
        setSubmitLabel("");
        previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
        previewUrls.current.clear();
        onClose?.();
    };

    const addPhotos = (event) => {
        const { added, rejected } = appendPhotoFiles(photos, Array.from(event.target.files || []));
        const additions = added.map((entry) => {
            const preview = URL.createObjectURL(entry.file);
            previewUrls.current.add(preview);
            return { ...entry, preview };
        });
        setPhotos((previous) => [...previous, ...additions]);
        setSelectionNotice(
            Object.entries(rejected)
                .filter(([, count]) => count)
                .map(([kind, count]) => t(`outcome_upload.batch.${kind}`, { count }))
                .join(" · ")
        );
        event.target.value = "";
    };

    const removePhoto = (entry) => {
        URL.revokeObjectURL(entry.preview);
        previewUrls.current.delete(entry.preview);
        setPhotos((previous) => previous.filter((photo) => photo.id !== entry.id));
    };

    const submitPhotoBatch = async () => {
        const pending = photos.filter(isRetryablePhoto);
        let completed = photos.filter((entry) => entry.status === "saved").length;
        let failures = 0;
        const updatePhoto = (id, patch) =>
            setPhotos((previous) =>
                previous.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
            );
        for (const entry of pending) {
            let saving = false;
            updatePhoto(entry.id, { status: "uploading", error: "" });
            setSubmitLabel(
                t("outcome_upload.batch.progress", { current: completed, total: photos.length })
            );
            try {
                const url = entry.url || (await uploadAsset(entry.file, "file", t));
                updatePhoto(entry.id, { url });
                saving = true;
                await api.post(`/competitions/${encodeURIComponent(competitionSlug)}/media`, {
                    type: "stage_photo",
                    title: batchPhotoTitle(
                        entry.file,
                        form.title,
                        photos.indexOf(entry),
                        photos.length
                    ),
                    url,
                    description: form.description,
                    category_name: photoCategory || null,
                });
                completed += 1;
                updatePhoto(entry.id, { status: "saved" });
            } catch (error) {
                failures += 1;
                // A lost save response may already have committed; never blindly retry that write.
                const uncertain = saving && (!error.response || error.response.status >= 500);
                updatePhoto(entry.id, {
                    status: uncertain ? "uncertain" : "failed",
                    error: uncertain
                        ? t("outcome_upload.batch.uncertain_hint")
                        : extractApiError(error, t),
                });
            }
        }
        onSubmitted?.();
        if (failures || photos.some((entry) => entry.status === "uncertain")) {
            toast.error(
                t("outcome_upload.batch.partial", { count: completed, total: photos.length })
            );
        } else {
            toast.success(
                t("outcome_upload.success.media_batch_submitted", {
                    count: completed,
                    event: competitionTitle || t("outcome_upload.current_competition"),
                })
            );
        }
    };

    const selectProject = (projectId) => {
        const selected = projectOptions.find((project) => String(project.id) === projectId);
        setForm((previous) => ({
            ...previous,
            projectId,
            workTitle: selected?.title || previous.workTitle,
            summary: selected?.intro || previous.summary,
            gitUrl: selected?.repo_url || previous.gitUrl,
            deploymentUrl: selected?.deployment_url || previous.deploymentUrl,
            author: selected?.owner_name || user?.nickname || user?.username || previous.author,
        }));
    };

    const validateForm = () => {
        if (form.type === "work") {
            if (!form.workTitle.trim())
                return t("outcome_upload.validation.work_title_required", "作品名称不能为空");
            if (!form.author.trim())
                return t("outcome_upload.validation.author_required", "作者不能为空");
            if (!form.major.trim())
                return t("outcome_upload.validation.major_required", "专业不能为空");
            if (!form.summary.trim())
                return t("outcome_upload.validation.summary_required", "作品简介不能为空");
            if (!form.gitUrl.trim())
                return t("outcome_upload.validation.git_required", "Git 链接不能为空");
            if (!form.publicConsent)
                return t(
                    "outcome_upload.validation.consent_required",
                    "请确认同意公开展示作品与经验分享"
                );
            try {
                const parsed = new URL(form.gitUrl.trim());
                if (!["http:", "https:"].includes(parsed.protocol)) {
                    return t(
                        "outcome_upload.validation.git_protocol",
                        "Git 链接必须以 http:// 或 https:// 开头"
                    );
                }
            } catch {
                return t(
                    "outcome_upload.validation.git_format",
                    "Git 链接格式不正确，例如 https://github.com/user/project"
                );
            }
            if (form.deploymentUrl.trim()) {
                try {
                    const parsed = new URL(form.deploymentUrl.trim());
                    if (parsed.protocol !== "https:") {
                        return t(
                            "outcome_upload.validation.deployment_protocol",
                            "魔搭部署链接必须以 https:// 开头"
                        );
                    }
                } catch {
                    return t(
                        "outcome_upload.validation.deployment_format",
                        "请输入有效的魔搭社区部署链接"
                    );
                }
            }
            return null;
        }

        if (photosOnly)
            return photos.some(isRetryablePhoto)
                ? null
                : t("outcome_upload.validation.photo_required", "请上传赛场照片文件");
        if (!form.title.trim())
            return t("outcome_upload.validation.title_required", "标题不能为空");
        if (!form.file || (Array.isArray(form.file) && form.file.length === 0))
            return form.type === "promo_video"
                ? t("outcome_upload.validation.video_required", "请上传赛事宣传片文件")
                : t("outcome_upload.validation.photo_required", "请上传赛场照片文件");
        return null;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submittingRef.current) return;
        if (!user) {
            toast.error(t("outcome_upload.login_required", "请先登录后再上传比赛成果"));
            return;
        }

        const validationError = validateForm();
        if (validationError) {
            toast.error(validationError);
            return;
        }

        setSubmitting(true);
        submittingRef.current = true;
        try {
            if (photosOnly) {
                await submitPhotoBatch();
                return;
            }
            if (form.type === "work") {
                let coverUrl = null;
                if (form.coverFile) {
                    setSubmitLabel(
                        t("outcome_upload.status.uploading_work_cover", "正在上传作品封面")
                    );
                    coverUrl = await uploadAsset(form.coverFile, "cover", t);
                }
                setSubmitLabel(t("outcome_upload.status.saving_work", "正在保存作品信息"));
                await api.post(`/competitions/${encodeURIComponent(competitionSlug)}/works`, {
                    project_id: form.projectId || null,
                    title: form.workTitle,
                    author: form.author,
                    summary: form.summary,
                    git_url: form.gitUrl,
                    deployment_provider: form.deploymentUrl.trim() ? "modelscope" : null,
                    deployment_url: form.deploymentUrl.trim() || null,
                    award: form.award,
                    rank: form.rank,
                    honor_title: form.honorTitle,
                    grade: form.grade,
                    major: form.major,
                    highlight: form.highlight,
                    experience: form.experience,
                    public_consent: form.publicConsent,
                    cover_url: coverUrl,
                });
            } else {
                let coverUrl = null;
                if (isPromoVideo && form.coverFile) {
                    setSubmitLabel(
                        t("outcome_upload.status.uploading_video_cover", "正在上传宣传片封面")
                    );
                    coverUrl = await uploadAsset(form.coverFile, "cover", t);
                }
                const files = isPromoVideo
                    ? [form.file]
                    : Array.isArray(form.file)
                      ? form.file
                      : [form.file];
                for (const [index, file] of files.entries()) {
                    setSubmitLabel(
                        isPromoVideo
                            ? t("outcome_upload.status.uploading_video", "正在上传宣传片")
                            : t(
                                  "outcome_upload.status.uploading_photo_batch",
                                  "正在上传照片 {{current}} / {{total}}",
                                  { current: index + 1, total: files.length }
                              )
                    );
                    const fileUrl = await uploadAsset(file, "file", t);
                    setSubmitLabel(
                        t("outcome_upload.status.saving_archive", "正在保存到本场成果档案")
                    );
                    await api.post(`/competitions/${encodeURIComponent(competitionSlug)}/media`, {
                        type: form.type,
                        title:
                            files.length > 1
                                ? `${form.title} ${String(index + 1).padStart(2, "0")}`
                                : form.title,
                        url: fileUrl,
                        cover_url: coverUrl,
                        description: form.description,
                    });
                }
            }

            toast.success(
                form.type === "work"
                    ? isAdmin
                        ? t("outcome_upload.success.work_published", "作品信息已发布")
                        : t("outcome_upload.success.work_pending", "作品信息已提交，等待管理员审核")
                    : Array.isArray(form.file) && form.file.length > 1
                      ? t(
                            "outcome_upload.success.media_batch_submitted",
                            "{{count}} 张照片已提交到“{{event}}”照片直播",
                            {
                                count: form.file.length,
                                event:
                                    competitionTitle ||
                                    t("outcome_upload.current_competition", "当前比赛"),
                            }
                        )
                      : t("outcome_upload.success.media_submitted", "已提交到“{{event}}”成果档案", {
                            event:
                                competitionTitle ||
                                t("outcome_upload.current_competition", "当前比赛"),
                        })
            );
            onSubmitted?.();
            submittingRef.current = false;
            resetAndClose();
        } catch (error) {
            const detail = extractApiError(error, t);
            toast.error(
                t("outcome_upload.errors.submit_failed", "提交失败：{{message}}", {
                    message: detail,
                })
            );
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
            setSubmitLabel("");
        }
    };

    return createPortal(
        <div className="outcome-upload-backdrop fixed inset-0 z-[160] flex items-end justify-center bg-black/68 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div
                className={`outcome-upload-panel max-h-[92vh] w-full max-w-3xl overflow-hidden border border-white/10 ${shellClass} sm:rounded-2xl`}
            >
                <div className="outcome-upload-header flex items-center justify-between border-b border-white/10 px-5 py-4">
                    <div>
                        <p
                            className={`outcome-upload-eyebrow text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}
                        >
                            {photosOnly ? "Event Photos" : "Competition Outcome Upload"}
                        </p>
                        <h2 className="outcome-upload-title mt-1 text-xl font-black">
                            {t(photosOnly ? "outcome_upload.photo_title" : "outcome_upload.title", {
                                event:
                                    competitionTitle ||
                                    t("outcome_upload.current_competition", "当前比赛"),
                            })}
                        </h2>
                        <p
                            className={`outcome-upload-subtitle mt-1 text-xs leading-5 ${mutedClass}`}
                        >
                            {t(
                                photosOnly
                                    ? "outcome_upload.photo_subtitle"
                                    : "outcome_upload.subtitle"
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={resetAndClose}
                        disabled={submitting}
                        className="outcome-upload-close inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
                        aria-label={t("outcome_upload.close", "关闭")}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="outcome-upload-form max-h-[calc(92vh-73px)] overflow-y-auto px-5 py-5"
                >
                    <fieldset disabled={photosOnly && submitting} className="min-w-0">
                        {!lockType && (
                            <div className="outcome-upload-type-grid grid gap-2 sm:grid-cols-3">
                                {typeOptions.map((option) => {
                                    const Icon = option.icon;
                                    const active = form.type === option.value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                                setForm(
                                                    createInitialForm(
                                                        option.value,
                                                        initialProjectId
                                                    )
                                                )
                                            }
                                            className={`outcome-upload-type-option flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
                                                active
                                                    ? "border-cyan-300 bg-cyan-300 text-black"
                                                    : isDayMode
                                                      ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-400"
                                                      : "border-white/10 bg-white/[0.04] text-white/74 hover:border-cyan-300/40"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="grid text-left leading-tight">
                                                <span>{option.label}</span>
                                                <span
                                                    className={`outcome-upload-type-destination text-[10px] font-bold ${active ? "text-slate-700" : mutedClass}`}
                                                >
                                                    {option.destination}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="outcome-upload-card mt-5 rounded-2xl border border-white/10 p-4">
                            <div className="outcome-upload-card-head mb-4 flex items-center gap-2">
                                <SelectedIcon className="h-5 w-5 text-cyan-300" />
                                <span className="text-sm font-black">{selectedType.label}</span>
                                <span className={`text-xs ${mutedClass}`}>
                                    {selectedType.destination}
                                </span>
                                {!isAdmin ? (
                                    <span className={`text-xs ${mutedClass}`}>
                                        {t("outcome_upload.pending_review", "提交后进入待审核")}
                                    </span>
                                ) : null}
                            </div>

                            {form.type === "work" ? (
                                <div className="outcome-upload-field-stack grid gap-4">
                                    <div
                                        className={`outcome-upload-project-linkage grid gap-3 border-b pb-4 ${
                                            isDayMode ? "border-slate-200" : "border-white/10"
                                        }`}
                                    >
                                        <div className="outcome-upload-project-head flex items-end justify-between gap-3">
                                            <div>
                                                <label
                                                    className="text-sm font-black"
                                                    htmlFor="outcome-project-select"
                                                >
                                                    {t(
                                                        "outcome_upload.project_select_label",
                                                        "关联已有项目（可选）"
                                                    )}
                                                </label>
                                                <p
                                                    className={`mt-1 text-xs leading-5 ${mutedClass}`}
                                                >
                                                    {t(
                                                        "outcome_upload.project_select_hint",
                                                        "本次提交保存独立赛事快照，审核通过并由管理员精选后公开展示。"
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <select
                                            id="outcome-project-select"
                                            value={form.projectId}
                                            onChange={(event) => selectProject(event.target.value)}
                                            className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            required={false}
                                            disabled={projectsLoading}
                                        >
                                            <option value="">
                                                {projectsLoading
                                                    ? t(
                                                          "outcome_upload.projects_loading",
                                                          "正在加载你的项目…"
                                                      )
                                                    : t(
                                                          "outcome_upload.project_select_placeholder",
                                                          "直接提交赛事作品"
                                                      )}
                                            </option>
                                            {projectOptions.map((project) => (
                                                <option key={project.id} value={project.id}>
                                                    {project.title}
                                                    {project.status === "draft"
                                                        ? ` · ${t("outcome_upload.project_draft", "草稿")}`
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                        {!projectsLoading && projectOptions.length === 0 ? (
                                            <p className={`text-xs ${mutedClass}`}>
                                                {t(
                                                    "outcome_upload.projects_empty",
                                                    "直接填写下方作品信息即可提交。"
                                                )}
                                            </p>
                                        ) : null}
                                    </div>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.work_title", "作品名称")}
                                        <input
                                            required
                                            value={form.workTitle}
                                            onChange={(event) =>
                                                updateField("workTitle", event.target.value)
                                            }
                                            className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <div className="outcome-upload-field-grid grid gap-4 sm:grid-cols-2">
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.author", "作者")}
                                            <input
                                                required
                                                value={form.author}
                                                onChange={(event) =>
                                                    updateField("author", event.target.value)
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                            <span className="outcome-upload-field-hint text-xs font-medium opacity-70">
                                                {t(
                                                    "outcome_upload.fields.author_hint",
                                                    "填写获奖者、团队或社团名称后，相关用户可在个人主页中确认认领。"
                                                )}
                                            </span>
                                        </label>
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.git_url", "Git 链接")}
                                            <input
                                                required
                                                type="url"
                                                value={form.gitUrl}
                                                onChange={(event) =>
                                                    updateField("gitUrl", event.target.value)
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                    </div>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t(
                                            "outcome_upload.fields.deployment_url",
                                            "魔搭社区部署链接（可选）"
                                        )}
                                        <input
                                            type="url"
                                            value={form.deploymentUrl}
                                            onChange={(event) =>
                                                updateField("deploymentUrl", event.target.value)
                                            }
                                            placeholder="https://modelscope.cn/studios/..."
                                            className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                        />
                                        <span className="outcome-upload-field-hint text-xs font-medium opacity-70">
                                            {t(
                                                "outcome_upload.fields.deployment_hint",
                                                "用于在线体验，与 GitHub 源码仓库分开保存。"
                                            )}
                                        </span>
                                    </label>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.summary", "简介")}
                                        <textarea
                                            required
                                            rows={4}
                                            value={form.summary}
                                            onChange={(event) =>
                                                updateField("summary", event.target.value)
                                            }
                                            className={`outcome-upload-textarea rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <div className="outcome-upload-field-grid grid gap-4 sm:grid-cols-3">
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.award", "奖项")}
                                            <input
                                                value={form.award}
                                                onChange={(event) =>
                                                    updateField("award", event.target.value)
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.rank", "排序")}
                                            <input
                                                value={form.rank}
                                                onChange={(event) =>
                                                    updateField("rank", event.target.value)
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.cover", "封面（可选）")}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(event) =>
                                                    updateField(
                                                        "coverFile",
                                                        event.target.files?.[0] || null
                                                    )
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                                            />
                                        </label>
                                    </div>
                                    <div className="outcome-upload-field-grid grid gap-4 sm:grid-cols-3">
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.honor_title", "荣誉称号")}
                                            <input
                                                value={form.honorTitle}
                                                onChange={(event) =>
                                                    updateField("honorTitle", event.target.value)
                                                }
                                                placeholder={t(
                                                    "outcome_upload.fields.honor_placeholder",
                                                    "如 Top 20 获奖成员"
                                                )}
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.grade", "年级")}
                                            <input
                                                value={form.grade}
                                                onChange={(event) =>
                                                    updateField("grade", event.target.value)
                                                }
                                                placeholder={t(
                                                    "outcome_upload.fields.grade_placeholder",
                                                    "如 大一 / 研二"
                                                )}
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.fields.major", "专业")}
                                            <input
                                                required
                                                value={form.major}
                                                onChange={(event) =>
                                                    updateField("major", event.target.value)
                                                }
                                                placeholder={t(
                                                    "outcome_upload.fields.major_placeholder",
                                                    "如 计算机科学与技术"
                                                )}
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                            />
                                        </label>
                                    </div>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.highlight", "精选感悟")}
                                        <input
                                            value={form.highlight}
                                            onChange={(event) =>
                                                updateField("highlight", event.target.value)
                                            }
                                            placeholder={t(
                                                "outcome_upload.fields.highlight_placeholder",
                                                "一句最想展示在卡片上的经验或感受"
                                            )}
                                            className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.experience", "经验分享")}
                                        <textarea
                                            rows={5}
                                            value={form.experience}
                                            onChange={(event) =>
                                                updateField("experience", event.target.value)
                                            }
                                            placeholder={t(
                                                "outcome_upload.fields.experience_placeholder",
                                                "可以写作品创新点、技术点、卡壳点、五小时极限开发的时间分配与迭代心得"
                                            )}
                                            className={`outcome-upload-textarea outcome-upload-long-textarea rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <label className="flex items-start gap-3 text-sm font-semibold">
                                        <input
                                            type="checkbox"
                                            checked={form.publicConsent}
                                            onChange={(event) =>
                                                updateField("publicConsent", event.target.checked)
                                            }
                                            className="mt-1"
                                        />
                                        <span>
                                            {t(
                                                "outcome_upload.fields.public_consent",
                                                "同意公开展示作品信息、项目链接、荣誉称号与经验分享"
                                            )}
                                        </span>
                                    </label>
                                </div>
                            ) : photosOnly ? (
                                <div className="grid gap-4">
                                    <label
                                        className={`grid cursor-pointer gap-2 rounded-xl border border-dashed p-5 text-center ${inputClass}`}
                                    >
                                        <Upload className="mx-auto h-6 w-6 text-cyan-500" />
                                        <span className="text-sm font-bold">
                                            {t("outcome_upload.batch.add")}
                                        </span>
                                        <span className={`text-xs ${mutedClass}`}>
                                            {t("outcome_upload.batch.file_hint")}
                                        </span>
                                        <input
                                            type="file"
                                            multiple
                                            accept={PHOTO_ACCEPT}
                                            onChange={addPhotos}
                                            className="mx-auto max-w-full text-xs"
                                        />
                                    </label>
                                    {selectionNotice && (
                                        <p role="status" className="text-sm text-amber-500">
                                            {selectionNotice}
                                        </p>
                                    )}
                                    {photoCategories.length > 0 && (
                                        <label className="grid gap-2 text-sm font-semibold">
                                            {t("outcome_upload.batch.scene")}
                                            <select
                                                value={photoCategory}
                                                onChange={(event) =>
                                                    setPhotoCategory(event.target.value)
                                                }
                                                className={`min-h-11 rounded-xl border px-3 ${inputClass}`}
                                            >
                                                <option value="">
                                                    {t("outcome_upload.batch.scene_unspecified")}
                                                </option>
                                                {photoCategories.map((scene) => (
                                                    <option
                                                        key={
                                                            typeof scene === "string"
                                                                ? scene
                                                                : scene.name
                                                        }
                                                        value={
                                                            typeof scene === "string"
                                                                ? scene
                                                                : scene.name
                                                        }
                                                    >
                                                        {typeof scene === "string"
                                                            ? scene
                                                            : scene.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    <label className="grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.batch.title")}
                                        <input
                                            value={form.title}
                                            onChange={(event) =>
                                                updateField("title", event.target.value)
                                            }
                                            placeholder={t("outcome_upload.batch.title_hint")}
                                            className={`min-h-11 rounded-xl border px-3 ${inputClass}`}
                                        />
                                    </label>
                                    <label className="grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.batch.description")}
                                        <textarea
                                            rows={2}
                                            value={form.description}
                                            onChange={(event) =>
                                                updateField("description", event.target.value)
                                            }
                                            className={`rounded-xl border px-3 py-2 ${inputClass}`}
                                        />
                                    </label>
                                    {photos.length > 0 && (
                                        <div className="grid gap-3">
                                            <p className="text-sm font-semibold" aria-live="polite">
                                                {t("outcome_upload.batch.selected", {
                                                    count: photos.length,
                                                    limit: PHOTO_BATCH_LIMIT,
                                                })}
                                            </p>
                                            <ul className="grid gap-2">
                                                {photos.map((entry) => (
                                                    <li
                                                        key={entry.id}
                                                        className={`flex items-center gap-3 rounded-xl border p-2 ${isDayMode ? "border-slate-200" : "border-white/10"}`}
                                                    >
                                                        <img
                                                            src={entry.preview}
                                                            alt=""
                                                            className="h-14 w-14 flex-none rounded-lg object-cover"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p
                                                                className="truncate text-sm"
                                                                title={entry.file.name}
                                                            >
                                                                {entry.file.name}
                                                            </p>
                                                            <p
                                                                className={`text-xs ${entry.status === "failed" || entry.status === "uncertain" ? "text-amber-500" : mutedClass}`}
                                                            >
                                                                {t(
                                                                    `outcome_upload.batch.${entry.status}`
                                                                )}
                                                            </p>
                                                            {entry.error && (
                                                                <p className="mt-1 break-words text-xs text-amber-500">
                                                                    {entry.error}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {entry.status === "uploading" ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : entry.status === "saved" ? (
                                                            <Check className="h-4 w-4 text-cyan-500" />
                                                        ) : (
                                                            entry.status !== "uncertain" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        removePhoto(entry)
                                                                    }
                                                                    aria-label={t(
                                                                        "outcome_upload.batch.remove",
                                                                        { name: entry.file.name }
                                                                    )}
                                                                    className="rounded-lg p-2 hover:bg-white/10"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </button>
                                                            )
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                            {(submitting ||
                                                photos.some(
                                                    (entry) => entry.status !== "pending"
                                                )) && (
                                                <div role="status" className="grid gap-2 text-sm">
                                                    <progress
                                                        className="h-2 w-full accent-cyan-400"
                                                        value={
                                                            photos.filter(
                                                                (entry) => entry.status === "saved"
                                                            ).length
                                                        }
                                                        max={photos.length}
                                                    />
                                                    <span>
                                                        {t("outcome_upload.batch.progress", {
                                                            current: photos.filter(
                                                                (entry) => entry.status === "saved"
                                                            ).length,
                                                            total: photos.length,
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="outcome-upload-field-stack grid gap-4">
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.title", "标题")}
                                        <input
                                            required
                                            value={form.title}
                                            onChange={(event) =>
                                                updateField("title", event.target.value)
                                            }
                                            className={`outcome-upload-input min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                        {t("outcome_upload.fields.description", "简介")}
                                        <textarea
                                            rows={3}
                                            value={form.description}
                                            onChange={(event) =>
                                                updateField("description", event.target.value)
                                            }
                                            className={`outcome-upload-textarea rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                                        />
                                    </label>
                                    <div
                                        className={`outcome-upload-field-grid grid gap-4 ${isPromoVideo ? "sm:grid-cols-2" : ""}`}
                                    >
                                        <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                            {isPromoVideo
                                                ? t(
                                                      "outcome_upload.fields.video_file",
                                                      "宣传片文件"
                                                  )
                                                : t(
                                                      "outcome_upload.fields.photo_files",
                                                      "现场照片（可多选）"
                                                  )}
                                            <input
                                                required
                                                type="file"
                                                multiple={!isPromoVideo}
                                                accept={
                                                    form.type === "promo_video"
                                                        ? "video/*"
                                                        : "image/*"
                                                }
                                                onChange={(event) =>
                                                    updateField(
                                                        "file",
                                                        isPromoVideo
                                                            ? event.target.files?.[0] || null
                                                            : Array.from(
                                                                  event.target.files || []
                                                              ).slice(0, 24)
                                                    )
                                                }
                                                className={`outcome-upload-input min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                                            />
                                            {!isPromoVideo ? (
                                                <span
                                                    className={`text-xs font-normal ${mutedClass}`}
                                                >
                                                    {t(
                                                        "outcome_upload.fields.photo_files_hint",
                                                        "单次最多 24 张；审核通过后按上传时间进入照片直播。"
                                                    )}
                                                </span>
                                            ) : null}
                                        </label>
                                        {isPromoVideo ? (
                                            <label className="outcome-upload-field grid gap-2 text-sm font-semibold">
                                                {t("outcome_upload.fields.cover", "封面（可选）")}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(event) =>
                                                        updateField(
                                                            "coverFile",
                                                            event.target.files?.[0] || null
                                                        )
                                                    }
                                                    className={`outcome-upload-input min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                                                />
                                            </label>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    </fieldset>
                    <div className="outcome-upload-actions mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={resetAndClose}
                            disabled={submitting}
                            className="outcome-upload-action-button inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold transition hover:bg-white/8"
                        >
                            {t(
                                photosOnly &&
                                    photos.some(
                                        (entry) =>
                                            entry.status === "saved" || entry.status === "uncertain"
                                    )
                                    ? "outcome_upload.close"
                                    : "outcome_upload.cancel"
                            )}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (photosOnly && !photos.some(isRetryablePhoto))}
                            className="outcome-upload-action-button inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            {submitting
                                ? submitLabel || t("outcome_upload.submitting", "提交中")
                                : t(
                                      photosOnly
                                          ? photos.some((entry) => entry.status === "failed")
                                              ? "outcome_upload.batch.retry"
                                              : "outcome_upload.submit_photos"
                                          : "outcome_upload.submit"
                                  )}
                            {!submitting ? <Check className="h-4 w-4" /> : null}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @media (max-width: 520px) {
                    .outcome-upload-project-head {
                        align-items: flex-start;
                        flex-direction: column;
                    }
                    .outcome-upload-create-project {
                        white-space: normal;
                    }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default CompetitionOutcomeUploadModal;
