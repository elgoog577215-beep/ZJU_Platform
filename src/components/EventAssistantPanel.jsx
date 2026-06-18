import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock3,
  Loader2,
  MapPin,
  MessageSquareText,
  RotateCcw,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import api from "../services/api";
import { getOrCreateSiteVisitorKey } from "../utils/visitorKey";

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

const quickPromptDefs = [
  {
    key: "this_week",
    labelFallback: "本周可去",
    promptFallback: "这周能参加、时间比较近的活动有哪些",
  },
  {
    key: "credit_volunteer",
    labelFallback: "综测/志愿",
    promptFallback: "推荐有综测信息或者志愿时长的活动",
  },
  {
    key: "freshman_offline",
    labelFallback: "新生线下",
    promptFallback: "适合新生参加的线下活动，最好在紫金港附近",
  },
  {
    key: "ai_lecture",
    labelFallback: "AI 讲座",
    promptFallback: "我想参加 AI、科技或创新创业相关的讲座",
  },
];

const feedbackReasonDefs = [
  { value: "not_relevant", fallback: "不相关" },
  { value: "time_mismatch", fallback: "时间不合适" },
  { value: "location_mismatch", fallback: "地点不合适" },
  { value: "benefit_mismatch", fallback: "收益不符合" },
  { value: "already_joined", fallback: "已参加过" },
];

const getDecisionPreview = (opportunityMatch) => {
  if (!opportunityMatch) return null;
  const decisionHint = String(opportunityMatch.decisionHint || "").trim();
  const nextAction = String(opportunityMatch.decisionSupport?.nextAction || "").trim();
  if (!decisionHint && !nextAction) return null;
  return { decisionHint, nextAction };
};

const EventAssistantPanel = ({
  isDayMode,
  onOpenEvent,
  onClose,
  className = "",
  variant = "panel",
}) => {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantState, setAssistantState] = useState(null);
  const [originalQuery, setOriginalQuery] = useState("");
  const [clarificationAsked, setClarificationAsked] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [feedbackReasonMap, setFeedbackReasonMap] = useState({});

  const quickPrompts = useMemo(
    () => quickPromptDefs.map((item) => ({
      ...item,
      label: t(`events.assistant.quick.${item.key}.label`, item.labelFallback),
      prompt: t(`events.assistant.quick.${item.key}.prompt`, item.promptFallback),
    })),
    [t],
  );
  const feedbackReasonOptions = useMemo(
    () => feedbackReasonDefs.map((item) => ({
      value: item.value,
      label: t(`events.assistant.feedback.${item.value}`, item.fallback),
    })),
    [t],
  );
  const emptyStateText = useMemo(() => {
    switch (assistantState?.emptyReason) {
      case "assistant_unreliable":
        return t("events.assistant.empty_unreliable", "这次结果不够可靠，可以换个说法再试。");
      case "clarification_limit_reached":
        return t("events.assistant.empty_after_clarify", "这次补充后仍然没有稳定结果，可以换个说法再试。");
      case "no_matches":
        return t("events.assistant.empty_no_matches", "目前没有特别贴近这些条件的活动。");
      case "no_upcoming":
      default:
        return t("events.assistant.empty_no_upcoming", "当前暂时没有未开始的活动。");
    }
  }, [assistantState?.emptyReason, t]);

  const sendAssistantRequest = async (payload, nextOriginalQuery, nextClarificationAsked) => {
    setLoading(true);

    try {
      const response = await api.post("/events/assistant", {
        allowHistoricalFallback: true,
        visitorKey: getOrCreateSiteVisitorKey(),
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

  const getRecommendationRank = (item, index = 0) => {
    const explicitRank = Number(item?.rank);
    if (Number.isFinite(explicitRank) && explicitRank > 0) {
      return explicitRank;
    }
    return index + 1;
  };

  const recordDecisionAction = async (item, actionType, metadata = {}) => {
    if (!item?.event?.id || !assistantState?.assistantRunId) return;
    try {
      await api.post("/events/assistant/action", {
        eventId: item.event.id,
        actionType,
        assistantRunId: assistantState.assistantRunId,
        recommendationRank: metadata.recommendationRank || getRecommendationRank(item),
        source: variant === "fullscreen" ? "event_assistant_mobile" : "event_assistant_card",
        visitorKey: getOrCreateSiteVisitorKey(),
        metadata,
      }, { silent: true });
    } catch {
      // Decision telemetry should never block the user's action.
    }
  };

  const submitFeedback = async (item, feedback, reasonValue = "", recommendationRank = null) => {
    if (!item?.event?.id) return;

    setFeedbackMap((previous) => ({ ...previous, [item.id]: feedback }));
    if (feedback === "down" && reasonValue) {
      setFeedbackReasonMap((previous) => ({ ...previous, [item.id]: reasonValue }));
    }
    try {
      const reasonLabel = feedbackReasonOptions.find((option) => option.value === reasonValue)?.label;
      await api.post("/events/assistant/feedback", {
        eventId: item.event.id,
        feedback,
        query: originalQuery,
        assistantRunId: assistantState?.assistantRunId,
        recommendationRank: recommendationRank || getRecommendationRank(item),
        source: variant === "fullscreen" ? "event_assistant_mobile" : "event_assistant_card",
        reason: feedback === "down" && reasonLabel
          ? `${reasonLabel}: ${item.reason}`
          : item.reason,
      });
      toast.success(feedback === "up"
        ? t("events.assistant.toast.feedback_up", "已记录：这条推荐适合你")
        : t("events.assistant.toast.feedback_down", "已记录：后续会减少类似推荐"));
    } catch (error) {
      setFeedbackMap((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
      setFeedbackReasonMap((previous) => {
        const next = { ...previous };
        delete next[item.id];
        return next;
      });
      if (error?.response?.status === 401) {
        toast.error(t("events.assistant.toast.feedback_login_required", "登录后可以让助手记住反馈"));
      } else {
        toast.error(t("events.assistant.toast.feedback_failed", "反馈记录失败，请稍后再试"));
      }
    }
  };

  const resetAssistant = () => {
    setInput("");
    setAssistantState(null);
    setOriginalQuery("");
    setClarificationAsked(false);
    setFeedbackMap({});
    setFeedbackReasonMap({});
  };

  const isFullscreenVariant = variant === "fullscreen";
  const isRailVariant = variant === "rail";
  const isCompactVariant = isFullscreenVariant || isRailVariant;
  const quickPromptGridClass = isFullscreenVariant
    ? "mt-0 grid grid-cols-2 gap-2"
    : isRailVariant
      ? "mt-2.5 grid grid-cols-2 gap-1.5"
      : "mt-4 flex flex-wrap gap-2";
  const shellClass = isFullscreenVariant
    ? "bg-transparent border-transparent shadow-none"
    : isRailVariant
      ? isDayMode
        ? "bg-white border-slate-200/85 shadow-none"
        : "bg-[#0d111a]/94 border-white/10 shadow-[0_18px_46px_rgba(0,0,0,0.34)]"
      : isDayMode
        ? "bg-white border-slate-200/85 shadow-none"
        : "bg-[#10121d]/88 border-white/10 shadow-none";
  const softPanelClass = isDayMode
    ? "bg-white border-slate-200/80"
    : "bg-white/[0.05] border-white/10";
  const promptCardClass = isFullscreenVariant || isRailVariant
    ? `${isDayMode ? "border-slate-200/90 bg-white shadow-none" : "border-white/10 bg-white/[0.045] shadow-none"}`
    : softPanelClass;
  const resultPanelClass = isFullscreenVariant || isRailVariant
    ? `${isDayMode ? "border-slate-200/90 bg-white shadow-none" : "border-white/10 bg-white/[0.045] shadow-none"}`
    : softPanelClass;
  const textClass = isDayMode ? "text-slate-900" : "text-white";
  const mutedClass = isDayMode ? "text-slate-600" : "text-gray-300";
  const faintClass = isDayMode ? "text-slate-500" : "text-gray-400";
  const chipClass = isDayMode
    ? "bg-white text-slate-600 border-violet-100/80"
    : "bg-white/8 text-white/75 border-white/10";
  const quickPromptClass = isFullscreenVariant || isRailVariant
    ? isDayMode
      ? "bg-white text-slate-700 border-violet-100 shadow-none hover:border-violet-200 hover:bg-white active:bg-white"
      : "bg-white/[0.055] text-white/82 border-white/10 shadow-none hover:border-blue-300/20 hover:bg-white/[0.085] active:bg-white/[0.1]"
    : chipClass;
  const controlChipClass = isFullscreenVariant || isRailVariant
    ? isDayMode
      ? "bg-white text-slate-600 border-violet-100"
      : "bg-white/[0.06] text-white/76 border-white/10"
    : chipClass;
  const actionClass = isDayMode
    ? "bg-violet-700 text-white hover:bg-violet-800 shadow-none"
    : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_1px_2px_rgba(0,0,0,0.22)]";
  const disabledActionClass = isDayMode
    ? "disabled:bg-white disabled:text-slate-400 disabled:shadow-none"
    : "disabled:bg-white/[0.07] disabled:text-white/35 disabled:shadow-none";
  const panelPaddingClass = isRailVariant
    ? "min-h-0 flex-1 overflow-y-auto p-2.5 custom-scrollbar"
    : isFullscreenVariant
      ? "px-0 pb-6 pt-0"
      : "p-4 sm:p-5 lg:p-6";
  const recommendationGridClass = isRailVariant
    ? "mt-3 grid grid-cols-1 gap-2.5"
    : "mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2";
  const resultPaddingClass = isRailVariant ? "p-3" : "p-4 sm:p-5";
  const recommendationCardClass = isRailVariant ? "p-3" : "p-4 sm:p-5";
  const recommendationTitleClass = isRailVariant
    ? "text-[15px] font-bold leading-6"
    : "text-lg font-bold leading-8 sm:text-xl";
  const recommendationReasonClass = isRailVariant
    ? "mt-1.5 text-[13px] leading-5"
    : "mt-3 text-sm leading-7 sm:text-base";
  const shellRadiusClass = isFullscreenVariant ? "rounded-none" : isRailVariant ? "rounded-[7px]" : "rounded-lg";
  const promptCardPaddingClass = isRailVariant ? "p-3" : "p-4";
  const promptFocusClass = isDayMode
    ? "focus-within:border-violet-300/90 focus-within:shadow-none"
    : "focus-within:border-blue-300/35 focus-within:bg-white/[0.06]";
  const textareaSizeClass = isRailVariant
    ? "min-h-[70px] text-sm leading-6"
    : isFullscreenVariant
      ? "min-h-[96px] text-sm leading-7 sm:text-base"
      : "min-h-[82px] text-sm leading-7 sm:text-base";
  const quickPromptButtonSizeClass = isRailVariant
    ? "min-h-[38px] px-2.5 py-2 text-[11px] leading-4"
    : "min-h-[44px] px-3 py-2 text-xs";
  const formMarginClass = isFullscreenVariant || isRailVariant ? "mt-3" : "mt-4";
  const controlRowClass = isRailVariant ? "mt-2.5 gap-2 pt-2.5" : "mt-3 gap-3 pt-3";
  const resetButtonSizeClass = isRailVariant ? "min-h-[36px] px-2.5 text-xs" : "min-h-[38px] px-3 text-sm";
  const submitButtonSizeClass = isRailVariant ? "min-h-[38px] px-3 py-2 text-xs" : "px-5 py-3 text-sm";
  const detailButtonClass = isRailVariant ? "mt-0.5 h-8 px-2.5" : "mt-1 h-10 px-3";
  const metaChipClass = isRailVariant ? "px-2 py-1" : "px-3 py-1.5";
  const feedbackButtonSizeClass = isRailVariant ? "h-8 w-8" : "h-9 w-9";
  const showInlineReset = isCompactVariant && (assistantState || originalQuery);

  return (
    <div className={`w-full ${isRailVariant ? "h-full min-h-0" : ""} ${className}`}>
      <div className={`relative overflow-hidden border transition-[background-color,border-color,box-shadow] ${isDayMode ? "" : "backdrop-blur-2xl"} ${shellRadiusClass} ${isRailVariant ? "flex h-full min-h-0 flex-col" : ""} ${shellClass}`}>
        <div className={`relative ${panelPaddingClass}`}>
          {isRailVariant ? (
            <div className={`sticky top-0 z-10 -mx-2.5 -mt-2.5 border-b px-2.5 py-2.5 ${isDayMode ? "border-violet-100/80 bg-white" : "border-white/10 bg-[#0d111a]/92 backdrop-blur-xl"}`}>
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex min-w-0 items-center gap-2 text-left">
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${isDayMode ? "border-pink-100 bg-white text-violet-700" : "border-blue-300/15 bg-blue-400/10 text-blue-200"}`}>
                    <Sparkles size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className={`truncate text-sm font-black ${textClass}`}>
                      {t("events.assistant.mobile_title", "AI 活动助手")}
                    </h3>
                    <p className={`mt-0.5 truncate text-xs ${faintClass}`}>
                      {t("events.assistant.mobile_subtitle", "一句话找活动")}
                    </p>
                  </div>
                </div>
                {onClose ? (
                  <button
                    type="button"
                    aria-label={t("common.close", "关闭")}
                    onClick={onClose}
                    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors ${controlChipClass}`}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          ) : !isFullscreenVariant ? (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl text-left">
                <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${chipClass}`}>
                  <Sparkles size={13} className={isDayMode ? "text-pink-500" : "text-cyan-300"} />
                  {t("events.assistant.card_badge", "AI 活动助手")}
                </span>
                <h3 className={`mt-3 text-xl font-bold tracking-normal sm:text-2xl ${textClass}`}>
                  {t("events.assistant.panel_title", "用一句话找活动")}
                </h3>
                <p className={`mt-2 text-sm leading-7 sm:text-base ${mutedClass}`}>
                  {t("events.assistant.panel_subtitle", "写主题、时间、地点或收益，我帮你挑出更合适的活动。")}
                </p>
              </div>

              {(assistantState || originalQuery) && (
                <button
                  type="button"
                  onClick={resetAssistant}
                  className={`inline-flex items-center gap-2 self-start rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${chipClass}`}
                >
                  <RotateCcw size={15} />
                  {t("events.assistant.reset", "重新提问")}
                </button>
              )}
            </div>
          ) : null}

          {!originalQuery && !assistantState ? (
            <div className={quickPromptGridClass}>
              {quickPrompts.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleQuickPrompt(item.prompt)}
                  disabled={loading}
                  className={`inline-flex items-center justify-center rounded-lg border font-bold transition-[background-color,border-color,transform] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${quickPromptButtonSizeClass} ${disabledActionClass} ${quickPromptClass}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={formMarginClass}>
            <div className={`relative overflow-hidden rounded-lg border transition-[background-color,border-color,box-shadow] ${promptCardPaddingClass} ${promptFocusClass} ${promptCardClass}`}>
              {originalQuery ? (
                <div className={`mb-3 inline-flex max-w-full items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${chipClass}`}>
                  <MessageSquareText size={13} />
                  <span className="truncate">{originalQuery}</span>
                </div>
              ) : null}
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
                    ? t("events.assistant.clarification_placeholder", "补充一点偏好，我就继续帮你缩小范围。")
                    : t("events.assistant.input_placeholder", "比如：这周末线下，适合新生，最好有综测或志愿时长")
                }
                className={`w-full resize-none bg-transparent px-1 py-1 outline-none ${textareaSizeClass} ${isDayMode ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-gray-500"}`}
              />

              <div className={`flex flex-col border-t sm:flex-row sm:items-center ${controlRowClass} ${showInlineReset ? "sm:justify-between" : "sm:justify-end"} ${isDayMode ? "border-slate-200/70" : "border-white/10"}`}>
                {showInlineReset ? (
                  <button
                    type="button"
                    onClick={resetAssistant}
                    className={`inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition-all ${resetButtonSizeClass} ${controlChipClass}`}
                  >
                    <RotateCcw size={14} />
                    {t("events.assistant.restart", "重来")}
                  </button>
                ) : null}

                <button
                  type="submit"
                  disabled={loading || input.trim() === ""}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg font-bold transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:translate-y-0 ${submitButtonSizeClass} ${disabledActionClass} ${isRailVariant ? "w-full sm:w-auto" : "min-w-[148px]"} ${actionClass}`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("events.assistant.loading", "思考中...")}
                    </>
                  ) : (
                    <>
                      <SendHorizontal size={16} />
                      {assistantState?.type === "clarify"
                        ? t("events.assistant.submit_clarification", "继续推荐")
                        : t("events.assistant.submit", "开始推荐")}
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
                initial={{ opacity: 0, y: isRailVariant ? 8 : 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: isRailVariant ? 0.2 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mt-4"
              >
                <div className={`rounded-lg border ${resultPaddingClass} ${resultPanelClass}`}>
                  {assistantState.summary ? (
                    <p className={`text-base font-semibold leading-7 ${textClass}`}>
                      {assistantState.summary}
                    </p>
                  ) : null}

                  {assistantState.recommendationMode === "historical_fallback" && assistantState.coverage ? (
                    <p className={`mt-2 text-sm leading-6 ${faintClass}`}>
                      {t("events.assistant.historical_fallback_note", "没有足够匹配的未来活动，下面是可关注的历史线索。")}
                    </p>
                  ) : null}

                  {(assistantState.warnings || []).length > 0 ? (
                    <div className={`mt-3 rounded-lg border px-4 py-3 text-sm leading-6 ${isDayMode ? "bg-amber-50 text-amber-800 border-amber-200/80" : "bg-amber-400/10 text-amber-100 border-amber-300/20"}`}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                        <span>{assistantState.warnings[0]}</span>
                      </div>
                    </div>
                  ) : null}

                  {assistantState.type === "clarify" && (
                    <div className="mt-2 max-w-2xl">
                      <p className={`text-sm font-semibold ${faintClass}`}>
                        {t("events.assistant.clarify_label", "还需要确认")}
                      </p>
                      <p className={`mt-2 text-lg font-semibold leading-8 ${textClass}`}>
                        {assistantState.question}
                      </p>
                    </div>
                  )}

                  {assistantState.type === "empty" && (
                    <div className={`mt-4 rounded-lg border px-5 py-6 text-center ${softPanelClass}`}>
                      <p className={`text-base font-semibold leading-8 sm:text-lg ${textClass}`}>
                        {emptyStateText}
                      </p>
                      <p className={`mt-2 text-sm leading-7 ${mutedClass}`}>
                        {assistantState.canExpandScope
                          ? t("events.assistant.expand_hint", "可以放宽到进行中或历史活动，看有没有后续可关注的线索。")
                          : t("events.assistant.empty_hint", "你可以换一个主题、校区或收益条件再试。")}
                      </p>

                      {assistantState.canExpandScope && (
                        <button
                          type="button"
                          onClick={handleExpandScope}
                          disabled={loading}
                          className={`mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${actionClass}`}
                        >
                          <ArrowRight size={15} />
                          {t("events.assistant.expand_button", "看看进行中或历史活动")}
                        </button>
                      )}
                    </div>
                  )}

                  {assistantState.type === "recommend" && (
                    <div className={recommendationGridClass}>
                      {(assistantState.recommendations || []).map((item, index) => {
                        const decisionPreview = getDecisionPreview(item.opportunityMatch);
                        const recommendationRank = getRecommendationRank(item, index);
                        return (
                          <div
                            key={item.id}
                            className={`rounded-lg border transition-[background-color,border-color,box-shadow,transform] ${recommendationCardClass} ${isDayMode ? "bg-white border-slate-200 shadow-none hover:border-violet-200 hover:bg-white hover:shadow-none" : "bg-white/[0.045] border-white/10 hover:-translate-y-0.5 hover:border-blue-300/20 hover:bg-white/[0.065]"}`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                recordDecisionAction(item, "view_detail", {
                                  surface: "recommendation_card",
                                  recommendationRank,
                                  nextAction: item.opportunityMatch?.decisionSupport?.nextAction || "",
                                });
                                onOpenEvent?.(item.event, {
                                  assistantRunId: assistantState.assistantRunId,
                                  recommendationRank,
                                  source: variant === "fullscreen" ? "event_assistant_mobile" : "event_assistant_card",
                                  surface: "recommendation_card",
                                  nextAction: item.opportunityMatch?.decisionSupport?.nextAction || "",
                                });
                              }}
                              className="group w-full text-left"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  {item.isHistorical ? (
                                    <span className={`mb-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${isDayMode ? "bg-amber-50 text-amber-700 border-amber-200/80" : "bg-amber-400/10 text-amber-200 border-amber-300/15"}`}>
                                      <Clock3 size={12} />
                                      {t("events.assistant.historical_event", "历史活动")}
                                    </span>
                                  ) : null}
                                  <p className={`${recommendationTitleClass} ${textClass}`}>
                                    {item.event.title}
                                  </p>
                                  <p className={`${recommendationReasonClass} ${mutedClass}`}>
                                    {item.reason}
                                  </p>
                                </div>
                                <span className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-md border text-xs font-semibold transition-transform group-hover:translate-x-1 ${detailButtonClass} ${chipClass}`}>
                                  <span className="sm:hidden">{t("events.assistant.view_details", "详情")}</span>
                                  <span className="hidden sm:inline">{t("events.assistant.view_details", "看详情")}</span>
                                  <ArrowRight size={16} />
                                </span>
                              </div>
                            </button>

                            {decisionPreview?.nextAction ? (
                              <p className={`mt-3 flex items-start gap-2 text-sm leading-6 ${isDayMode ? "text-emerald-700" : "text-emerald-100"}`}>
                                <ArrowRight size={14} className="mt-1 shrink-0" />
                                <span className="font-semibold">
                                  {t("events.assistant.next_step", "下一步")}
                                  :
                                </span>
                                <span>{decisionPreview.nextAction}</span>
                              </p>
                            ) : decisionPreview?.decisionHint ? (
                              <p className={`mt-3 text-sm leading-6 ${mutedClass}`}>
                                {decisionPreview.decisionHint}
                              </p>
                            ) : null}

                            <div className={`mt-4 flex flex-wrap items-center gap-2 text-xs ${faintClass}`}>
                              {item.event.date && (
                                <span className={`inline-flex items-center gap-1.5 rounded-md border ${metaChipClass} ${chipClass}`}>
                                  <Calendar size={13} />
                                  {formatEventDate(item.event.date)}
                                </span>
                              )}
                              {item.event.location && (
                                <span className={`inline-flex items-center gap-1.5 rounded-md border ${metaChipClass} ${chipClass}`}>
                                  <MapPin size={13} />
                                  <span className="max-w-[180px] truncate">{item.event.location}</span>
                                </span>
                              )}
                              {item.event.target_audience && (
                                <span className={`inline-flex items-center gap-1.5 rounded-md border ${metaChipClass} ${chipClass}`}>
                                  {item.event.target_audience}
                                </span>
                              )}
                            </div>

                            <div className={`${isRailVariant ? "mt-3 pt-2.5" : "mt-4 pt-3"} flex items-center justify-between border-t ${isDayMode ? "border-slate-200/70" : "border-white/10"}`}>
                              <span className={`text-xs ${faintClass}`}>
                                {t("events.assistant.feedback_question", "有用吗？")}
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label={t("events.assistant.feedback_up_aria", "推荐适合我")}
                                  title={t("events.assistant.feedback_up_title", "适合我")}
                                  onClick={() => submitFeedback(item, "up", "", recommendationRank)}
                                  className={`inline-flex items-center justify-center rounded-md border transition-[background-color,border-color,color,transform] hover:-translate-y-px active:translate-y-0 ${feedbackButtonSizeClass} ${feedbackMap[item.id] === "up" ? "bg-emerald-500 text-white border-emerald-500" : chipClass}`}
                                >
                                  <ThumbsUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  aria-label={t("events.assistant.feedback_down_aria", "推荐不适合我")}
                                  title={t("events.assistant.feedback_down_title", "不适合我")}
                                  onClick={() => {
                                    if (feedbackMap[item.id] === "down") {
                                      submitFeedback(item, "down", feedbackReasonMap[item.id] || "not_relevant", recommendationRank);
                                    } else {
                                      setFeedbackMap((previous) => ({ ...previous, [item.id]: "down" }));
                                      setFeedbackReasonMap((previous) => ({ ...previous, [item.id]: "not_relevant" }));
                                    }
                                  }}
                                  className={`inline-flex items-center justify-center rounded-md border transition-[background-color,border-color,color,transform] hover:-translate-y-px active:translate-y-0 ${feedbackButtonSizeClass} ${feedbackMap[item.id] === "down" ? "bg-rose-500 text-white border-rose-500" : chipClass}`}
                                >
                                  <ThumbsDown size={15} />
                                </button>
                              </div>
                            </div>

                            {feedbackMap[item.id] === "down" && (
                              <div className={`mt-3 rounded-lg border p-3 ${isDayMode ? "border-rose-100 bg-rose-50/60" : "border-rose-300/15 bg-rose-400/10"}`}>
                                <div className="flex flex-wrap gap-2">
                                  {feedbackReasonOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setFeedbackReasonMap((previous) => ({ ...previous, [item.id]: option.value }));
                                        submitFeedback(item, "down", option.value, recommendationRank);
                                      }}
                                      className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        feedbackReasonMap[item.id] === option.value
                                          ? "border-rose-500 bg-rose-500 text-white"
                                          : chipClass
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
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
