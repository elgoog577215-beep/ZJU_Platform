import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  Loader2,
  MapPin,
  MessageSquareText,
  RotateCcw,
  SendHorizontal,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../services/api';

const formatEventDate = (value) => {
  if (!value || typeof value !== 'string') return '';

  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) return value;

  if (timePart && timePart !== '00:00') {
    return `${Number(month)}.${Number(day)} ${timePart.slice(0, 5)}`;
  }

  return `${Number(month)}.${Number(day)}`;
};

const EventAssistantPanel = ({ isDayMode, onOpenEvent, className = '' }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [assistantState, setAssistantState] = useState(null);
  const [originalQuery, setOriginalQuery] = useState('');
  const [clarificationAsked, setClarificationAsked] = useState(false);

  const scopeLabel = useMemo(() => {
    switch (assistantState?.scope) {
      case 'ongoing':
        return t('events.assistant.scope_ongoing', '进行中活动');
      case 'past':
        return t('events.assistant.scope_past', '历史活动');
      case 'upcoming':
      default:
        return t('events.assistant.scope_upcoming', '未开始活动');
    }
  }, [assistantState?.scope, t]);

  const emptyStateText = useMemo(() => {
    switch (assistantState?.emptyReason) {
      case 'assistant_unreliable':
        return t('events.assistant.empty_unreliable', '这次 AI 给出的结果不够可靠，或暂时没有符合您要求的活动。您可以换个说法再试试。');
      case 'clarification_limit_reached':
        return t('events.assistant.empty_after_clarify', '这次我还是没法更稳地收敛结果了，你可以换个说法再试。');
      case 'no_matches':
        return t('events.assistant.empty_no_matches', '这个范围里暂时没有特别贴近你需求的活动。');
      case 'no_upcoming':
      default:
        return t('events.assistant.empty_no_upcoming', '当前暂无未开始活动。');
    }
  }, [assistantState?.emptyReason, t]);

  const getErrorMessage = (error) => {
    const code = error?.response?.data?.error;

    switch (code) {
      case 'EVENT_ASSISTANT_UNAVAILABLE':
        return t('events.assistant.unavailable', '活动 AI 助手暂时不可用。');
      case 'EVENT_ASSISTANT_TIMEOUT':
        return t('events.assistant.timeout', '活动 AI 助手响应超时，请稍后重试。');
      default:
        return error?.response?.data?.message || t('events.assistant.error', '活动 AI 助手开小差了，请稍后再试。');
    }
  };

  const sendAssistantRequest = async (payload, nextOriginalQuery, nextClarificationAsked) => {
    setLoading(true);

    try {
      const response = await api.post('/events/assistant', payload);
      setAssistantState(response.data);
      setOriginalQuery(nextOriginalQuery);
      setClarificationAsked(response.data?.type === 'clarify' ? true : nextClarificationAsked);
      setInput('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    if (assistantState?.type === 'clarify' && originalQuery) {
      await sendAssistantRequest(
        {
          query: originalQuery,
          clarificationAnswer: trimmed,
          clarificationUsed: true
        },
        originalQuery,
        true
      );
      return;
    }

    await sendAssistantRequest(
      {
        query: trimmed
      },
      trimmed,
      false
    );
  };

  const handleExpandScope = async () => {
    if (!originalQuery || loading) return;

    await sendAssistantRequest(
      {
        query: originalQuery,
        clarificationUsed: clarificationAsked,
        allowScopeExpansion: true
      },
      originalQuery,
      clarificationAsked
    );
  };

  const resetAssistant = () => {
    setInput('');
    setAssistantState(null);
    setOriginalQuery('');
    setClarificationAsked(false);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`relative overflow-hidden rounded-[2rem] border backdrop-blur-2xl ${isDayMode ? 'bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(246,249,255,0.94))] border-slate-200/85 shadow-[0_20px_54px_rgba(148,163,184,0.14)]' : 'bg-[linear-gradient(145deg,rgba(8,10,26,0.86),rgba(17,19,39,0.82))] border-white/10 shadow-[0_18px_44px_rgba(0,0,0,0.26)]'}`}>
        <div className="pointer-events-none absolute inset-0">
          <div className={`absolute top-0 right-[12%] h-32 w-32 rounded-full blur-3xl ${isDayMode ? 'bg-cyan-200/45' : 'bg-cyan-400/12'}`} />
          <div className={`absolute -bottom-10 left-0 h-36 w-36 rounded-full blur-3xl ${isDayMode ? 'bg-indigo-200/35' : 'bg-indigo-500/12'}`} />
        </div>

        <div className="relative p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl text-left">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-[11px] font-semibold uppercase tracking-[0.22em] ${isDayMode ? 'bg-white/92 text-slate-500 border-slate-200/80 shadow-[0_10px_22px_rgba(148,163,184,0.1)]' : 'bg-white/10 text-white/70 border-white/10'}`}>
                  <Sparkles size={13} className={isDayMode ? 'text-cyan-500' : 'text-cyan-300'} />
                  {t('events.assistant.badge', 'AI 助手')}
                </span>
                <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-medium border ${isDayMode ? 'bg-amber-50 text-amber-700 border-amber-200/80' : 'bg-amber-400/10 text-amber-200 border-amber-300/15'}`}>
                  {t('events.assistant.beta_hint', 'Beta 测试，可能不稳定')}
                </span>
              </div>

              <h3 className={`mt-3 text-xl sm:text-2xl font-bold tracking-tight ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                {t('events.assistant.embedded_title', '试试自然语言找活动')}
              </h3>
              <p className={`mt-2 text-sm sm:text-base leading-7 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                {t('events.assistant.embedded_subtitle', '直接说你的主题、时间或收益偏好，我会先从公开的未开始活动里帮你挑。')}
              </p>
            </div>

            {(assistantState || originalQuery) && (
              <button
                type="button"
                onClick={resetAssistant}
                className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold transition-all border ${isDayMode ? 'bg-white/88 text-slate-600 border-slate-200/80 hover:border-slate-300 hover:text-slate-900 shadow-[0_10px_22px_rgba(148,163,184,0.1)]' : 'bg-white/10 text-gray-200 border-white/10 hover:bg-white/15 hover:text-white'}`}
              >
                <RotateCcw size={15} />
                {t('events.assistant.reset', '重新提问')}
              </button>
            )}
          </div>

          {originalQuery && (
            <div className={`mt-4 inline-flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-sm border ${isDayMode ? 'bg-slate-50/90 text-slate-600 border-slate-200/80' : 'bg-white/8 text-white/75 border-white/10'}`}>
              <MessageSquareText size={14} className={isDayMode ? 'text-slate-400' : 'text-white/60'} />
              <span className="truncate">{originalQuery}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className={`rounded-[1.55rem] border p-4 ${isDayMode ? 'bg-white/88 border-slate-200/80 shadow-[0_14px_34px_rgba(148,163,184,0.12)]' : 'bg-black/18 border-white/10'}`}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSubmit(event);
                  }
                }}
                rows={2}
                placeholder={assistantState?.type === 'clarify'
                  ? t('events.assistant.clarification_placeholder', '补充一点你的偏好，我就继续帮你缩小范围。')
                  : t('events.assistant.input_placeholder', '比如：想找这周末线下、适合新生、最好有综测或志愿时长的活动')}
                className={`w-full min-h-[96px] resize-none bg-transparent px-1 py-1 text-sm sm:text-base leading-7 outline-none ${isDayMode ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-gray-500'}`}
              />

              <div className={`mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-t pt-4 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
                <p className={`max-w-2xl text-xs sm:text-sm leading-6 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                  {assistantState?.type === 'clarify'
                    ? t('events.assistant.clarification_hint', '这是一轮补充说明，下一次我会直接给结果。')
                    : t('events.assistant.helper', '推荐结果会保持轻量，只展示少量活动和一句理由。')}
                </p>

                <button
                  type="submit"
                  disabled={loading || input.trim() === ''}
                  className={`inline-flex min-w-[148px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDayMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_14px_28px_rgba(99,102,241,0.24)]' : 'bg-white text-black hover:bg-gray-200 shadow-[0_12px_24px_rgba(255,255,255,0.08)]'}`}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('events.assistant.loading', '思考中...')}
                    </>
                  ) : (
                    <>
                      <SendHorizontal size={16} />
                      {assistantState?.type === 'clarify'
                        ? t('events.assistant.submit_clarification', '继续推荐')
                        : t('events.assistant.submit', '开始推荐')}
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
                <div className={`rounded-[1.55rem] border p-4 sm:p-5 ${isDayMode ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] border-slate-200/80 shadow-[0_14px_32px_rgba(148,163,184,0.1)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] border-white/10 shadow-[0_14px_34px_rgba(0,0,0,0.2)]'}`}>
                  <div className={`flex ${assistantState.type === 'recommend' ? 'justify-start' : 'justify-center'} flex-wrap items-center gap-2`}>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] border ${isDayMode ? 'bg-white text-slate-500 border-slate-200/80' : 'bg-white/10 text-white/70 border-white/10'}`}>
                      <Sparkles size={13} className={isDayMode ? 'text-cyan-500' : 'text-cyan-300'} />
                      {scopeLabel}
                    </span>
                  </div>

                  {assistantState.type === 'clarify' && (
                    <div className="mt-4 max-w-2xl">
                      <p className={`text-sm uppercase tracking-[0.22em] ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                        {t('events.assistant.need_more', '我还想确认一点')}
                      </p>
                      <p className={`mt-3 text-lg leading-8 font-semibold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                        {assistantState.question}
                      </p>
                    </div>
                  )}

                  {assistantState.type === 'empty' && (
                    <div className={`mt-4 mx-auto max-w-2xl rounded-[1.35rem] border px-5 py-6 text-center sm:px-7 sm:py-7 ${isDayMode ? 'bg-white/78 border-slate-200/80 shadow-[0_12px_28px_rgba(148,163,184,0.12)]' : 'bg-white/[0.04] border-white/10'}`}>
                      <p className={`text-base sm:text-lg leading-8 font-semibold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                        {emptyStateText}
                      </p>
                      <p className={`mt-2 text-sm leading-7 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                        {assistantState.emptyReason === 'assistant_unreliable'
                          ? t('events.assistant.unreliable_hint', '您可以换个更具体的说法，或者放宽一些条件再试试。')
                          : assistantState.canExpandScope
                          ? t('events.assistant.expand_hint', '如果你愿意，我可以继续帮你看看进行中或历史活动。')
                          : t('events.assistant.empty_hint', '你可以换个说法，或者放宽一些条件再试试。')}
                      </p>

                      {assistantState.canExpandScope && (
                        <button
                          type="button"
                          onClick={handleExpandScope}
                          disabled={loading}
                          className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all ${isDayMode ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_12px_24px_rgba(99,102,241,0.22)]' : 'bg-white text-black hover:bg-gray-200 shadow-[0_12px_24px_rgba(255,255,255,0.08)]'}`}
                        >
                          <ArrowRight size={15} />
                          {t('events.assistant.expand_button', '看看进行中或历史活动')}
                        </button>
                      )}
                    </div>
                  )}

                  {assistantState.type === 'recommend' && (
                    <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {/* FIX: BUG-19 — Guard against null recommendations */}
                      {(assistantState.recommendations || []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onOpenEvent(item.event)}
                          className={`text-left rounded-[1.35rem] border p-4 sm:p-5 transition-all group h-full ${isDayMode ? 'bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.96))] border-slate-200/85 hover:border-cyan-200/90 hover:-translate-y-0.5 shadow-[0_14px_30px_rgba(148,163,184,0.1)]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.04))] border-white/10 hover:border-cyan-400/30 hover:-translate-y-0.5'}`}
                        >
                          <div className="flex h-full flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`text-lg sm:text-xl font-bold leading-8 ${isDayMode ? 'text-slate-900' : 'text-white'}`}>
                                  {item.event.title}
                                </p>
                                <p className={`mt-3 text-sm sm:text-base leading-7 ${isDayMode ? 'text-slate-600' : 'text-gray-300'}`}>
                                  {item.reason}
                                </p>
                              </div>
                              <span className={`mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-transform group-hover:translate-x-1 ${isDayMode ? 'bg-slate-50 text-slate-700 border-slate-200/80 shadow-[0_8px_18px_rgba(148,163,184,0.12)]' : 'bg-white/10 text-white border-white/10'}`}>
                                <ArrowRight size={16} />
                              </span>
                            </div>

                            <div className={`mt-5 flex flex-wrap items-center gap-2 text-xs ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                              {item.event.date && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${isDayMode ? 'bg-slate-50 border-slate-200/80' : 'bg-white/8 border-white/10'}`}>
                                  <Calendar size={13} />
                                  {formatEventDate(item.event.date)}
                                </span>
                              )}
                              {item.event.location && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${isDayMode ? 'bg-slate-50 border-slate-200/80' : 'bg-white/8 border-white/10'}`}>
                                  <MapPin size={13} />
                                  <span className="truncate max-w-[180px]">{item.event.location}</span>
                                </span>
                              )}
                              {item.event.target_audience && (
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${isDayMode ? 'bg-slate-50 border-slate-200/80' : 'bg-white/8 border-white/10'}`}>
                                  {item.event.target_audience}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
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
