import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  Calendar,
  Check,
  Clock3,
  Loader2,
  MapPin,
  MessageSquareText,
  Settings2,
  RotateCcw,
  Save,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";

const formatEventDate = (value) => {
  if (!value || typeof value !== "string") return "";

  const normalized = value.trim().replace(" ", "T");
  const [datePart, timePart] = normalized.split("T");
  const [year, month, day] = datePart.split("-");
  const time = timePart?.slice(0, 5);

  if (!year || !month || !day || Number.isNaN(Number(month)) || Number.isNaN(Number(day))) {
    return value;
  }

  if (time && time !== "00:00") {
    return `${Number(month)}.${Number(day)} ${time}`;
  }

  return `${Number(month)}.${Number(day)}`;
};

const getScopeText = (scope) => {
  switch (scope) {
    case "ongoing":
      return "进行中活动";
    case "mixed_future":
      return "未来/进行中活动";
    case "past":
      return "历史活动";
    case "upcoming":
    default:
      return "未开始活动";
  }
};

const getErrorMessage = (error, t) => {
  const code = error?.response?.data?.error;

  switch (code) {
    case "EVENT_ASSISTANT_UNAVAILABLE":
      return t("events.assistant.unavailable", "活动 AI 助手暂时不可用。");
    case "EVENT_ASSISTANT_TIMEOUT":
      return t("events.assistant.timeout", "活动 AI 助手响应超时，请稍后重试。");
    default:
      return (
        error?.response?.data?.message ||
        t("events.assistant.error", "活动 AI 助手开小差了，请稍后再试。")
      );
  }
};

const categoryOptions = [
  { value: "lecture", label: "讲座" },
  { value: "competition", label: "竞赛" },
  { value: "volunteer", label: "志愿" },
  { value: "recruitment", label: "招新/职业" },
  { value: "culture_sports", label: "文体" },
  { value: "exchange", label: "交流" },
];

const benefitOptions = [
  { value: "score", label: "综测" },
  { value: "volunteer_time", label: "志愿时长" },
];

const quickPrompts = [
  { label: "新生线下", prompt: "适合新生参加的线下活动，最好在紫金港附近" },
  { label: "综测/志愿", prompt: "推荐有综测信息或者志愿时长的活动" },
  { label: "AI 讲座", prompt: "我想参加 AI、科技或创新创业相关的讲座" },
  { label: "本周可去", prompt: "这周能参加、时间比较近的活动有哪些" },
];

const getCoverageText = (coverage) => {
  if (!coverage || !Number.isFinite(Number(coverage.total))) return "";
  const futureCount = Number(coverage.upcoming || 0) + Number(coverage.ongoing || 0);
  const pastCount = Number(coverage.past || 0);

  if (futureCount === 0 && pastCount > 0) {
    return `活动库：暂无未来活动，${pastCount} 个历史线索`;
  }
  return `活动库：${futureCount} 个未来/进行中，${pastCount} 个历史`;
};

const EventAssistantPanel = ({
  isDayMode,
  onOpenEvent,
  className = "",
  variant = "panel",
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantState, setAssistantState] = useState(null);
  const [originalQuery, setOriginalQuery] = useState("");
  const [clarificationAsked, setClarificationAsked] = useState(false);
  const [rememberPreference, setRememberPreference] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileAuthRequired, setProfileAuthRequired] = useState(false);
  const [profileForm, setProfileForm] = useState({
    college: "",
    grade: "",
    campus: "",
    interestTagsText: "",
    preferredCategories: [],
    preferredBenefits: [],
    preferredFormat: "",
  });

  const scopeLabel = useMemo(
    () => getScopeText(assistantState?.scope),
    [assistantState?.scope],
  );

  const understoodItems = assistantState?.understoodIntent?.understood || [];
  const profileSignals = assistantState?.understoodIntent?.profile?.signals || [];
  const hasModelStatus = Boolean(assistantState?.modelStatus);
  const coverageText = useMemo(
    () => getCoverageText(assistantState?.coverage),
    [assistantState?.coverage],
  );

  const emptyStateText = useMemo(() => {
    switch (assistantState?.emptyReason) {
      case "assistant_unreliable":
        return "这次模型输出不够可靠，我没有把它直接展示给你。";
      case "clarification_limit_reached":
        return "这次补充后仍然没有稳定结果，可以换个说法再试。";
      case "no_matches":
        return "目前没有特别贴近这些条件的活动。";
      case "no_upcoming":
      default:
        return "当前暂时没有未开始的活动。";
    }
  }, [assistantState?.emptyReason]);

  const sendAssistantRequest = async (payload, nextOriginalQuery, nextClarificationAsked) => {
    setLoading(true);

    try {
      const response = await api.post("/events/assistant", {
        allowHistoricalFallback: true,
        rememberPreference,
        ...payload,
      });
      setAssistantState(response.data);
      setOriginalQuery(nextOriginalQuery);
      setClarificationAsked(response.data?.type === "clarify" ? true : nextClarificationAsked);
      setInput("");
      setFeedbackMap({});
    } catch (error) {
      toast.error(getErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (assistantState?.type === "clarify" && originalQuery) {
      await sendAssistantRequest(
        {
          query: originalQuery,
          clarificationAnswer: trimmed,
          clarificationUsed: true,
        },
        originalQuery,
        true,
      );
      return;
    }

    await sendAssistantRequest({ query: trimmed }, trimmed, false);
  };

  const handleExpandScope = async () => {
    if (!originalQuery || loading) return;

    await sendAssistantRequest(
      {
        query: originalQuery,
        clarificationUsed: clarificationAsked,
        allowScopeExpansion: true,
      },
      originalQuery,
      clarificationAsked,
    );
  };

  const handleQuickPrompt = async (prompt) => {
    if (loading) return;
    setInput(prompt);
    await sendAssistantRequest({ query: prompt }, prompt, false);
  };

  const submitFeedback = async (item, feedback) => {
    if (!item?.event?.id) return;

    setFeedbackMap((previous) => ({ ...previous, [item.id]: feedback }));
    try {
      await api.post("/events/assistant/feedback", {
        eventId: item.event.id,
        feedback,
        query: originalQuery,
        reason: item.reason,
      });
      toast.success(feedback === "up" ? "已记录：这条推荐适合你" : "已记录：后续会减少类似推荐");
    } catch (error) {
      setFeedbackMap((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
      if (error?.response?.status === 401) {
        toast.error("登录后可以让助手记住反馈");
      } else {
        toast.error("反馈记录失败，请稍后再试");
      }
    }
  };

  const loadProfile = async () => {
    if (profileLoaded || profileLoading) return;
    setProfileLoading(true);
    try {
      const response = await api.get("/events/assistant/preferences");
      const data = response.data || {};
      setProfileForm({
        college: data.college || "",
        grade: data.grade || "",
        campus: data.campus || "",
        interestTagsText: (data.interestTags || []).join("、"),
        preferredCategories: data.preferredCategories || [],
        preferredBenefits: data.preferredBenefits || [],
        preferredFormat: data.preferredFormat || "",
      });
      setProfileLoaded(true);
      setProfileAuthRequired(false);
    } catch (error) {
      if (error?.response?.status === 401) {
        setProfileAuthRequired(true);
        setProfileLoaded(true);
      } else {
        toast.error("推荐偏好加载失败");
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const toggleProfile = async () => {
    const nextOpen = !profileOpen;
    setProfileOpen(nextOpen);
    if (nextOpen) {
      await loadProfile();
    }
  };

  const toggleProfileArrayValue = (key, value) => {
    setProfileForm((previous) => {
      const current = previous[key] || [];
      return {
        ...previous,
        [key]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const saveProfile = async () => {
    if (profileAuthRequired) {
      toast.error("登录后可以保存长期推荐偏好");
      return;
    }

    setProfileSaving(true);
    try {
      const interestTags = profileForm.interestTagsText
        .split(/[,，、;；\s]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 16);

      const response = await api.put("/events/assistant/preferences", {
        college: profileForm.college,
        grade: profileForm.grade,
        campus: profileForm.campus,
        interestTags,
        preferredCategories: profileForm.preferredCategories,
        preferredBenefits: profileForm.preferredBenefits,
        preferredFormat: profileForm.preferredFormat,
      });
      const data = response.data || {};
      setProfileForm((previous) => ({
        ...previous,
        interestTagsText: (data.interestTags || interestTags).join("、"),
      }));
      setProfileLoaded(true);
      toast.success("推荐偏好已保存");
    } catch (error) {
      if (error?.response?.status === 401) {
        toast.error("登录后可以保存推荐偏好");
      } else {
        toast.error("推荐偏好保存失败");
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const resetAssistant = () => {
    setInput("");
    setAssistantState(null);
    setOriginalQuery("");
    setClarificationAsked(false);
    setFeedbackMap({});
  };

  const isFullscreenVariant = variant === "fullscreen";
  const quickPromptGridClass = isFullscreenVariant
    ? "mt-0 grid grid-cols-2 gap-2.5"
    : "mt-4 flex flex-wrap gap-2";
  const shellClass = isFullscreenVariant
    ? isDayMode
      ? "bg-transparent border-transparent shadow-none"
      : "bg-transparent border-transparent shadow-none"
    : isDayMode
    ? "bg-white/95 border-slate-200/85 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    : "bg-[#10121d]/88 border-white/10 shadow-none";
  const softPanelClass = isDayMode
    ? "bg-white/86 border-slate-200/80"
    : "bg-white/[0.05] border-white/10";
  const promptCardClass = isFullscreenVariant
    ? `${isDayMode ? "border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : "border-white/10 bg-white/[0.055] shadow-none"}`
    : softPanelClass;
  const resultPanelClass = isFullscreenVariant
    ? `${isDayMode ? "border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]" : "border-white/10 bg-white/[0.055] shadow-none"}`
    : softPanelClass;
  const textClass = isDayMode ? "text-slate-900" : "text-white";
  const mutedClass = isDayMode ? "text-slate-600" : "text-gray-300";
  const faintClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const chipClass = isDayMode
    ? "bg-slate-50 text-slate-600 border-slate-200/80"
    : "bg-white/8 text-white/75 border-white/10";
  const quickPromptClass = isFullscreenVariant
    ? isDayMode
      ? "bg-white text-slate-700 border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.035)] active:bg-blue-50"
      : "bg-white/[0.055] text-white/82 border-white/10 shadow-none active:bg-white/[0.09]"
    : chipClass;
  const controlChipClass = isFullscreenVariant
    ? isDayMode
      ? "bg-white text-slate-600 border-slate-200"
      : "bg-white/[0.06] text-white/76 border-white/10"
    : chipClass;
  const selectedPillClass = isFullscreenVariant
    ? isDayMode
      ? "bg-blue-600 text-white border-blue-600"
      : "bg-white text-slate-950 border-white"
    : "bg-blue-600 text-white border-blue-600";
  const actionClass = isDayMode
    ? isFullscreenVariant
      ? "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
      : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_1px_2px_rgba(15,23,42,0.12)]"
    : isFullscreenVariant
      ? "bg-white text-slate-950 hover:bg-gray-100 shadow-none"
      : "bg-white text-black hover:bg-gray-200 shadow-none";

  return (
    <div className={`w-full ${className}`}>
      <div className={`relative overflow-hidden border backdrop-blur-2xl ${isFullscreenVariant ? "rounded-none" : "rounded-3xl"} ${shellClass}`}>
        <div className={`relative ${isFullscreenVariant ? "px-0 pb-6 pt-0" : "p-4 sm:p-5 lg:p-6"}`}>
          {!isFullscreenVariant ? (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${chipClass}`}>
                      <Sparkles size={13} className={isDayMode ? "text-cyan-500" : "text-cyan-300"} />
                      AI 活动推荐
                    </span>
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${isDayMode ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-emerald-400/10 text-emerald-200 border-emerald-300/15"}`}>
                      <Brain size={13} />
                      先读活动库，再推荐
                    </span>
                  </div>

                  <h3 className={`mt-3 text-xl font-bold tracking-normal sm:text-2xl ${textClass}`}>
                    说出你想参加什么，我来按画像和活动库筛
                  </h3>
                  <p className={`mt-2 text-sm leading-7 sm:text-base ${mutedClass}`}>
                    可以说主题、校区、面向对象、综测或志愿时长。登录后会参考你的组织、收藏报名和反馈。
                  </p>
                </div>

                {(assistantState || originalQuery) && (
                  <button
                    type="button"
                    onClick={resetAssistant}
                    className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold transition-all ${chipClass}`}
                  >
                    <RotateCcw size={15} />
                    重新提问
                  </button>
                )}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={toggleProfile}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${chipClass}`}
                >
                  <Settings2 size={15} />
                  我的推荐偏好
                </button>
              </div>
            </>
          ) : null}

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className={`mt-4 rounded-2xl border p-4 ${softPanelClass}`}>
                  {profileLoading ? (
                    <div className={`flex items-center gap-2 text-sm ${faintClass}`}>
                      <Loader2 size={16} className="animate-spin" />
                      正在读取推荐偏好...
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {profileAuthRequired ? (
                        <div className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${isDayMode ? "border-amber-200/80 bg-amber-50 text-amber-800" : "border-amber-300/20 bg-amber-400/10 text-amber-100"}`}>
                          登录后可以保存长期画像；现在也可以直接在提问里写清楚偏好，我会按本次内容推荐。
                        </div>
                      ) : null}

                      <div className="grid gap-3 md:grid-cols-3">
                        <label className={`grid gap-2 text-sm ${faintClass}`}>
                          学院/组织
                          <input
                            value={profileForm.college}
                            onChange={(event) =>
                              setProfileForm((previous) => ({
                                ...previous,
                                college: event.target.value,
                              }))
                            }
                            className={`rounded-xl border px-3 py-2.5 outline-none ${isDayMode ? "bg-white text-slate-900 border-slate-200" : "bg-white/5 text-white border-white/10"}`}
                            placeholder="计算机学院"
                          />
                        </label>
                        <label className={`grid gap-2 text-sm ${faintClass}`}>
                          年级
                          <input
                            value={profileForm.grade}
                            onChange={(event) =>
                              setProfileForm((previous) => ({
                                ...previous,
                                grade: event.target.value,
                              }))
                            }
                            className={`rounded-xl border px-3 py-2.5 outline-none ${isDayMode ? "bg-white text-slate-900 border-slate-200" : "bg-white/5 text-white border-white/10"}`}
                            placeholder="本科新生 / 研一"
                          />
                        </label>
                        <label className={`grid gap-2 text-sm ${faintClass}`}>
                          常用校区
                          <input
                            value={profileForm.campus}
                            onChange={(event) =>
                              setProfileForm((previous) => ({
                                ...previous,
                                campus: event.target.value,
                              }))
                            }
                            className={`rounded-xl border px-3 py-2.5 outline-none ${isDayMode ? "bg-white text-slate-900 border-slate-200" : "bg-white/5 text-white border-white/10"}`}
                            placeholder="紫金港"
                          />
                        </label>
                      </div>

                      <label className={`grid gap-2 text-sm ${faintClass}`}>
                        兴趣关键词
                        <input
                          value={profileForm.interestTagsText}
                          onChange={(event) =>
                            setProfileForm((previous) => ({
                              ...previous,
                              interestTagsText: event.target.value,
                            }))
                          }
                          className={`rounded-xl border px-3 py-2.5 outline-none ${isDayMode ? "bg-white text-slate-900 border-slate-200" : "bg-white/5 text-white border-white/10"}`}
                          placeholder="AI、创业、志愿、摄影"
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className={`mb-2 text-sm ${faintClass}`}>偏好类型</div>
                          <div className="flex flex-wrap gap-2">
                            {categoryOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleProfileArrayValue("preferredCategories", option.value)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${profileForm.preferredCategories.includes(option.value) ? selectedPillClass : chipClass}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className={`mb-2 text-sm ${faintClass}`}>偏好收益</div>
                          <div className="flex flex-wrap gap-2">
                            {benefitOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleProfileArrayValue("preferredBenefits", option.value)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${profileForm.preferredBenefits.includes(option.value) ? selectedPillClass : chipClass}`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          {[
                            ["", "不限方式"],
                            ["offline", "偏线下"],
                            ["online", "偏线上"],
                            ["hybrid", "都可以"],
                          ].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() =>
                                setProfileForm((previous) => ({
                                  ...previous,
                                  preferredFormat: value,
                                }))
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${profileForm.preferredFormat === value ? selectedPillClass : chipClass}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={profileSaving || profileAuthRequired}
                          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${actionClass}`}
                        >
                          {profileSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                          保存偏好
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {originalQuery && (
            <div className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm ${chipClass}`}>
              <MessageSquareText size={14} />
              <span className="truncate">{originalQuery}</span>
            </div>
          )}

          {!originalQuery && !assistantState ? (
            <div className={quickPromptGridClass}>
              {quickPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleQuickPrompt(item.prompt)}
                  disabled={loading}
                  className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50 ${quickPromptClass}`}
                >
                  <Sparkles size={13} className={isDayMode ? "text-blue-500" : "text-blue-200"} />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={isFullscreenVariant ? "mt-3" : "mt-4"}>
            <div className={`relative overflow-hidden rounded-3xl border p-4 ${promptCardClass}`}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                rows={2}
                placeholder={
                  assistantState?.type === "clarify"
                    ? "补充一点偏好，我下一轮会直接给结果"
                    : "比如：这周末线下，适合新生，最好有综测或志愿时长的活动"
                }
                className={`w-full resize-none bg-transparent px-1 py-1 text-sm leading-7 outline-none sm:text-base ${isFullscreenVariant ? "min-h-[108px]" : "min-h-[96px]"} ${isDayMode ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-gray-500"}`}
              />

              <div className={`mt-4 flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between ${isDayMode ? "border-slate-200/70" : "border-white/10"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-sm ${controlChipClass}`}>
                    <input
                      type="checkbox"
                      checked={rememberPreference}
                      onChange={(event) => setRememberPreference(event.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    记住
                  </label>
                  {isFullscreenVariant ? (
                    <>
                      <button
                        type="button"
                        onClick={toggleProfile}
                        className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-all ${controlChipClass}`}
                      >
                        <Settings2 size={14} />
                        偏好
                      </button>
                      {(assistantState || originalQuery) && (
                        <button
                          type="button"
                          onClick={resetAssistant}
                          className={`inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-all ${controlChipClass}`}
                        >
                          <RotateCcw size={14} />
                          重来
                        </button>
                      )}
                    </>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={loading || input.trim() === ""}
                  className={`inline-flex min-w-[148px] items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${actionClass}`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      思考中...
                    </>
                  ) : (
                    <>
                      <SendHorizontal size={16} />
                      {assistantState?.type === "clarify" ? "继续推荐" : "开始推荐"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          <AnimatePresence mode="wait">
            {assistantState && (
              <motion.div
                key={assistantState.type + assistantState.scope}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4"
              >
                <div className={`rounded-3xl border p-4 sm:p-5 ${resultPanelClass}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${chipClass}`}>
                      <Sparkles size={13} />
                      {scopeLabel}
                    </span>
                    {assistantState.remembered ? (
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isDayMode ? "bg-emerald-50 text-emerald-700 border-emerald-200/80" : "bg-emerald-400/10 text-emerald-200 border-emerald-300/15"}`}>
                        <Check size={13} />
                        已记住这次偏好
                      </span>
                    ) : null}
                    {hasModelStatus ? (
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${chipClass}`}>
                        <Brain size={13} />
                        {assistantState.modelStatus?.used ? "模型已参与解释" : "规则推荐"}
                      </span>
                    ) : null}
                    {coverageText ? (
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${chipClass}`}>
                        <Calendar size={13} />
                        {coverageText}
                      </span>
                    ) : null}
                  </div>

                  {assistantState.summary ? (
                    <p className={`mt-4 text-base font-semibold leading-7 ${textClass}`}>
                      {assistantState.summary}
                    </p>
                  ) : null}

                  {assistantState.recommendationMode === "historical_fallback" && assistantState.coverage ? (
                    <p className={`mt-2 text-sm leading-6 ${faintClass}`}>
                      我先查未来和进行中的活动，没有足够匹配项后才退到历史活动；这部分更适合用来关注后续同类机会。
                    </p>
                  ) : null}

                  {(understoodItems.length > 0 || profileSignals.length > 0) && (
                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      {understoodItems.length > 0 ? (
                        <div className={`rounded-2xl border p-4 ${chipClass}`}>
                          <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${textClass}`}>
                            <Brain size={15} />
                            我理解到
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {understoodItems.map((item) => (
                              <span key={item} className={`rounded-full border px-3 py-1 text-xs ${chipClass}`}>
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {profileSignals.length > 0 ? (
                        <div className={`rounded-2xl border p-4 ${chipClass}`}>
                          <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${textClass}`}>
                            <UserRound size={15} />
                            参考画像
                          </div>
                          <div className={`space-y-1 text-xs leading-5 ${faintClass}`}>
                            {profileSignals.slice(0, 4).map((item) => (
                              <div key={item}>{item}</div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {(assistantState.warnings || []).length > 0 && (
                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${isDayMode ? "bg-amber-50 text-amber-800 border-amber-200/80" : "bg-amber-400/10 text-amber-100 border-amber-300/20"}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{assistantState.warnings[0]}</span>
                      </div>
                    </div>
                  )}

                  {assistantState.type === "clarify" && (
                    <div className="mt-4 max-w-2xl">
                      <p className={`text-sm uppercase tracking-[0.18em] ${faintClass}`}>
                        我还想确认一点
                      </p>
                      <p className={`mt-3 text-lg font-semibold leading-8 ${textClass}`}>
                        {assistantState.question}
                      </p>
                    </div>
                  )}

                  {assistantState.type === "empty" && (
                    <div className={`mt-4 rounded-2xl border px-5 py-6 text-center ${softPanelClass}`}>
                      <p className={`text-base font-semibold leading-8 sm:text-lg ${textClass}`}>
                        {emptyStateText}
                      </p>
                      <p className={`mt-2 text-sm leading-7 ${mutedClass}`}>
                        {assistantState.canExpandScope
                          ? "可以放宽到进行中或历史活动，看有没有后续可关注的线索。"
                          : "你可以换一个主题、校区或收益条件再试。"}
                      </p>

                      {assistantState.canExpandScope && (
                        <button
                          type="button"
                          onClick={handleExpandScope}
                          disabled={loading}
                          className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${actionClass}`}
                        >
                          <ArrowRight size={15} />
                          看看进行中或历史活动
                        </button>
                      )}
                    </div>
                  )}

                  {assistantState.type === "recommend" && (
                    <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {(assistantState.recommendations || []).map((item) => (
                        <div
                          key={item.id}
                          className={`rounded-2xl border p-4 transition-colors sm:p-5 ${isDayMode ? "bg-white border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.035)]" : "bg-white/[0.045] border-white/10"}`}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenEvent(item.event)}
                            className="group w-full text-left"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  {item.isHistorical ? (
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${isDayMode ? "bg-amber-50 text-amber-700 border-amber-200/80" : "bg-amber-400/10 text-amber-200 border-amber-300/15"}`}>
                                      <Clock3 size={12} />
                                      历史活动
                                    </span>
                                  ) : null}
                                  {Number.isFinite(Number(item.score)) ? (
                                    <span className={`rounded-full border px-2.5 py-1 text-xs ${chipClass}`}>
                                      匹配 {Math.max(0, Math.round(item.score))}
                                    </span>
                                  ) : null}
                                </div>
                                <p className={`text-lg font-bold leading-8 sm:text-xl ${textClass}`}>
                                  {item.event.title}
                                </p>
                                <p className={`mt-3 text-sm leading-7 sm:text-base ${mutedClass}`}>
                                  {item.reason}
                                </p>
                              </div>
                              <span className={`mt-1 inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-xs font-semibold transition-transform group-hover:translate-x-1 ${chipClass}`}>
                                <span className="sm:hidden">详情</span>
                                <span className="hidden sm:inline">看详情</span>
                                <ArrowRight size={16} />
                              </span>
                            </div>
                          </button>

                          {(item.matchSignals || []).length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.matchSignals.slice(0, 4).map((signal) => (
                                <span key={signal} className={`rounded-full border px-3 py-1.5 text-xs ${chipClass}`}>
                                  {signal}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className={`mt-5 flex flex-wrap items-center gap-2 text-xs ${faintClass}`}>
                            {item.event.date && (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${chipClass}`}>
                                <Calendar size={13} />
                                {formatEventDate(item.event.date)}
                              </span>
                            )}
                            {item.event.location && (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${chipClass}`}>
                                <MapPin size={13} />
                                <span className="max-w-[180px] truncate">{item.event.location}</span>
                              </span>
                            )}
                            {item.event.target_audience && (
                              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${chipClass}`}>
                                {item.event.target_audience}
                              </span>
                            )}
                          </div>

                          <div className={`mt-4 flex items-center justify-between border-t pt-3 ${isDayMode ? "border-slate-200/70" : "border-white/10"}`}>
                            <span className={`text-xs ${faintClass}`}>这条推荐对你有用吗？</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label="推荐适合我"
                                title="适合我"
                                onClick={() => submitFeedback(item, "up")}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${feedbackMap[item.id] === "up" ? "bg-emerald-500 text-white border-emerald-500" : chipClass}`}
                              >
                                <ThumbsUp size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label="推荐不适合我"
                                title="不适合我"
                                onClick={() => submitFeedback(item, "down")}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${feedbackMap[item.id] === "down" ? "bg-rose-500 text-white border-rose-500" : chipClass}`}
                              >
                                <ThumbsDown size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {assistantState.type === "recommend" ? (
                    <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDayMode ? "border-slate-200/80 bg-slate-50/80" : "border-white/10 bg-white/[0.04]"}`}>
                      <p className={`text-xs leading-5 ${faintClass}`}>
                        还不够贴近？直接在上方补一句，比如“只看紫金港”“不要历史活动”“更适合新生”，我会继续收窄。
                      </p>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EventAssistantPanel;
