import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

import api, { uploadFile } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

const validUploadTypes = new Set(["stage_photo", "promo_video", "work"]);

const createInitialForm = (type = "stage_photo") => ({
  type: validUploadTypes.has(type) ? type : "stage_photo",
  title: "",
  description: "",
  file: null,
  coverFile: null,
  workTitle: "",
  author: "",
  summary: "",
  gitUrl: "",
  award: "",
  rank: "",
  honorTitle: "",
  grade: "",
  major: "",
  highlight: "",
  experience: "",
  publicConsent: true,
});

const typeOptions = [
  { value: "stage_photo", label: "赛场照片", destination: "进入画廊", icon: ImageIcon },
  { value: "promo_video", label: "赛事宣传片", destination: "进入视频栏目", icon: Film },
  { value: "work", label: "优秀作品", destination: "进入荣誉与经验分享", icon: PackagePlus },
];

const uploadAsset = async (file, fieldName = "file") => {
  if (!file) return null;
  const formData = new FormData();
  formData.append(fieldName, file);
  try {
    const response = await uploadFile("/upload", formData);
    return fieldName === "cover" ? response.data.coverUrl : response.data.fileUrl;
  } catch (error) {
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message;
    throw new Error(`${fieldName === "cover" ? "封面" : "文件"}上传失败：${serverMessage}`);
  }
};

const outcomeTags = "黑客松,比赛成果,AI全栈极速黑客松";

const extractApiError = (error) => {
  const data = error.response?.data;
  if (typeof data === "string") {
    if (data.trim().startsWith("<!doctype") || data.includes("<html")) {
      return "接口没有返回 JSON，当前后端可能还没重启到最新版";
    }
    return data;
  }
  return data?.error || data?.message || error.message || "未知错误";
};

const CompetitionOutcomeUploadModal = ({ open, onClose, onSubmitted, initialType = "stage_photo" }) => {
  const { user, isAdmin } = useAuth();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === "day";
  const [form, setForm] = useState(() => createInitialForm(initialType));
  const [submitting, setSubmitting] = useState(false);
  const [submitLabel, setSubmitLabel] = useState("");

  const shellClass = isDayMode
    ? "bg-white text-slate-950 shadow-[0_24px_90px_rgba(15,23,42,0.22)]"
    : "bg-[#071014] text-white shadow-[0_28px_100px_rgba(0,0,0,0.58)]";
  const inputClass = isDayMode
    ? "border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-cyan-500"
    : "border-white/10 bg-white/[0.06] text-white placeholder:text-white/38 focus:border-cyan-300/70";
  const mutedClass = isDayMode ? "text-slate-500" : "text-white/58";

  const selectedType = useMemo(
    () => typeOptions.find((option) => option.value === form.type) || typeOptions[0],
    [form.type],
  );
  const SelectedIcon = selectedType.icon;
  const isPromoVideo = form.type === "promo_video";

  useEffect(() => {
    if (open) {
      setForm(createInitialForm(initialType));
      setSubmitLabel("");
    }
  }, [initialType, open]);

  if (!open) return null;

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const resetAndClose = () => {
    setForm(createInitialForm(initialType));
    setSubmitLabel("");
    onClose?.();
  };

  const validateForm = () => {
    if (form.type === "work") {
      if (!form.workTitle.trim()) return "作品名称不能为空";
      if (!form.author.trim()) return "作者不能为空";
      if (!form.summary.trim()) return "作品简介不能为空";
      if (!form.gitUrl.trim()) return "Git 链接不能为空";
      if (!form.publicConsent) return "请确认同意公开展示作品与经验分享";
      try {
        const parsed = new URL(form.gitUrl.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return "Git 链接必须以 http:// 或 https:// 开头";
        }
      } catch {
        return "Git 链接格式不正确，例如 https://github.com/user/project";
      }
      return null;
    }

    if (!form.title.trim()) return "标题不能为空";
    if (!form.file) return form.type === "promo_video" ? "请上传赛事宣传片文件" : "请上传赛场照片文件";
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.error("请先登录后再上传比赛成果");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (form.type === "work") {
        let coverUrl = null;
        if (form.coverFile) {
          setSubmitLabel("正在上传作品封面");
          coverUrl = await uploadAsset(form.coverFile, "cover");
        }
        setSubmitLabel("正在保存作品信息");
        await api.post("/competitions/current/works", {
          title: form.workTitle,
          author: form.author,
          summary: form.summary,
          git_url: form.gitUrl,
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
        setSubmitLabel(isPromoVideo ? "正在上传宣传片" : "正在上传照片");
        const fileUrl = await uploadAsset(form.file, "file");
        let coverUrl = null;
        if (isPromoVideo && form.coverFile) {
          setSubmitLabel("正在上传宣传片封面");
          coverUrl = await uploadAsset(form.coverFile, "cover");
        }
        setSubmitLabel(isPromoVideo ? "正在保存到视频栏目" : "正在保存到画廊");
        if (isPromoVideo) {
          await api.post("/videos", {
            title: form.title,
            tags: outcomeTags,
            video: fileUrl,
            thumbnail: coverUrl || "",
            gameType: "hackathon",
            gameDescription: form.description,
            featured: 0,
          });
        } else {
          await api.post("/photos", {
            title: form.title,
            tags: outcomeTags,
            url: fileUrl,
            size: "",
            gameType: "hackathon",
            gameDescription: form.description,
            featured: 0,
          });
        }
      }

      toast.success(
        form.type === "work"
          ? (isAdmin ? "作品信息已发布" : "作品信息已提交，等待管理员审核")
          : (isPromoVideo ? "已提交到视频栏目" : "已提交到画廊"),
      );
      onSubmitted?.();
      resetAndClose();
    } catch (error) {
      const detail = extractApiError(error);
      toast.error(`提交失败：${detail}`);
    } finally {
      setSubmitting(false);
      setSubmitLabel("");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/68 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className={`max-h-[92vh] w-full max-w-3xl overflow-hidden border border-white/10 ${shellClass} sm:rounded-2xl`}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${mutedClass}`}>
              Competition Outcome Upload
            </p>
            <h2 className="mt-1 text-xl font-black">提交黑客松成果</h2>
            <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>
              照片进入画廊，视频进入视频栏目，作品进入优秀作品与经验分享。
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition hover:bg-white/10"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-73px)] overflow-y-auto px-5 py-5">
          <div className="grid gap-2 sm:grid-cols-3">
            {typeOptions.map((option) => {
              const Icon = option.icon;
              const active = form.type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm(createInitialForm(option.value))}
                  className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-black transition ${
                    active
                      ? "border-cyan-300 bg-cyan-300 text-slate-950"
                      : isDayMode
                        ? "border-slate-200 bg-white text-slate-700 hover:border-cyan-400"
                        : "border-white/10 bg-white/[0.04] text-white/74 hover:border-cyan-300/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="grid text-left leading-tight">
                    <span>{option.label}</span>
                    <span className={`text-[10px] font-bold ${active ? "text-slate-700" : mutedClass}`}>
                      {option.destination}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 p-4">
            <div className="mb-4 flex items-center gap-2">
              <SelectedIcon className="h-5 w-5 text-cyan-300" />
              <span className="text-sm font-black">{selectedType.label}</span>
              <span className={`text-xs ${mutedClass}`}>{selectedType.destination}</span>
              {!isAdmin ? <span className={`text-xs ${mutedClass}`}>提交后进入待审核</span> : null}
            </div>

            {form.type === "work" ? (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold">
                  作品名称
                  <input
                    required
                    value={form.workTitle}
                    onChange={(event) => updateField("workTitle", event.target.value)}
                    className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    作者
                    <input
                      required
                      value={form.author}
                      onChange={(event) => updateField("author", event.target.value)}
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Git 链接
                    <input
                      required
                      type="url"
                      value={form.gitUrl}
                      onChange={(event) => updateField("gitUrl", event.target.value)}
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  简介
                  <textarea
                    required
                    rows={4}
                    value={form.summary}
                    onChange={(event) => updateField("summary", event.target.value)}
                    className={`rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm font-semibold">
                    奖项
                    <input
                      value={form.award}
                      onChange={(event) => updateField("award", event.target.value)}
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    排序
                    <input
                      value={form.rank}
                      onChange={(event) => updateField("rank", event.target.value)}
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    封面（可选）
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => updateField("coverFile", event.target.files?.[0] || null)}
                      className={`min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm font-semibold">
                    荣誉称号
                    <input
                      value={form.honorTitle}
                      onChange={(event) => updateField("honorTitle", event.target.value)}
                      placeholder="如 Top 20 获奖成员"
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    年级
                    <input
                      value={form.grade}
                      onChange={(event) => updateField("grade", event.target.value)}
                      placeholder="如 大一 / 研二"
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    专业
                    <input
                      value={form.major}
                      onChange={(event) => updateField("major", event.target.value)}
                      placeholder="如 计算机科学与技术"
                      className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-semibold">
                  精选感悟
                  <input
                    value={form.highlight}
                    onChange={(event) => updateField("highlight", event.target.value)}
                    placeholder="一句最想展示在卡片上的经验或感受"
                    className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  经验分享
                  <textarea
                    rows={5}
                    value={form.experience}
                    onChange={(event) => updateField("experience", event.target.value)}
                    placeholder="可以写作品创新点、技术点、卡壳点、五小时极限开发的时间分配与迭代心得"
                    className={`rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                  />
                </label>
                <label className="flex items-start gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.publicConsent}
                    onChange={(event) => updateField("publicConsent", event.target.checked)}
                    className="mt-1"
                  />
                  <span>同意公开展示作品信息、项目链接、荣誉称号与经验分享</span>
                </label>
              </div>
            ) : (
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-semibold">
                  标题
                  <input
                    required
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    className={`min-h-11 rounded-xl border px-3 outline-none ${inputClass}`}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  简介
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    className={`rounded-xl border px-3 py-3 outline-none ${inputClass}`}
                  />
                </label>
                <div className={`grid gap-4 ${isPromoVideo ? "sm:grid-cols-2" : ""}`}>
                  <label className="grid gap-2 text-sm font-semibold">
                    {isPromoVideo ? "宣传片文件" : "照片文件"}
                    <input
                      required
                      type="file"
                      accept={form.type === "promo_video" ? "video/*" : "image/*"}
                      onChange={(event) => updateField("file", event.target.files?.[0] || null)}
                      className={`min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                    />
                  </label>
                  {isPromoVideo ? (
                    <label className="grid gap-2 text-sm font-semibold">
                      封面（可选）
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => updateField("coverFile", event.target.files?.[0] || null)}
                        className={`min-h-11 rounded-xl border px-3 py-2 outline-none ${inputClass}`}
                      />
                    </label>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetAndClose}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold transition hover:bg-white/8"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? submitLabel || "提交中" : "提交成果"}
              {!submitting ? <Check className="h-4 w-4" /> : null}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CompetitionOutcomeUploadModal;
