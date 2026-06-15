import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, HelpCircle, Newspaper, Users, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';

export const COMMUNITY_POST_TYPES = [
  {
    key: 'tech',
    labelKey: 'community.tab_tech',
    fallback: '技术分享',
    descKey: 'community.type_desc_tech',
    descFallback: '沉淀教程、实践经验、代码方案',
    icon: BookOpen,
  },
  {
    key: 'help',
    labelKey: 'community.tab_help_qa',
    fallback: '求助问答',
    descKey: 'community.type_desc_help',
    descFallback: '提问、排错、寻找思路和解法',
    icon: HelpCircle,
  },
  {
    key: 'news',
    labelKey: 'community.tab_news_hot',
    fallback: '新闻热点',
    descKey: 'community.type_desc_news',
    descFallback: '分享 AI 新闻、模型动态和行业观察',
    icon: Newspaper,
  },
  {
    key: 'team',
    labelKey: 'community.tab_team_collab',
    fallback: '组队协作',
    descKey: 'community.type_desc_team',
    descFallback: '招募队友、项目合作、活动协作',
    icon: Users,
  },
];

const CommunityPostTypePicker = ({ isOpen, activeType = 'tech', onSelect, onClose }) => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const isDayMode = uiMode === 'day';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[118] flex items-end justify-center p-0 backdrop-blur-md md:items-center md:p-4 ${
            isDayMode ? 'bg-slate-950/20' : 'bg-black/70'
          }`}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('community.choose_post_type', '选择发布类型')}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 28, scale: 0.98 }}
            transition={{ type: 'spring', damping: 30, stiffness: 360 }}
            onClick={(event) => event.stopPropagation()}
            className={`w-full overflow-hidden rounded-t-lg border shadow-2xl md:max-w-3xl md:rounded-lg ${
              isDayMode ? 'border-slate-200 bg-white text-slate-950' : 'border-white/10 bg-neutral-950 text-white'
            }`}
          >
            <header className={`flex items-start justify-between gap-4 border-b px-5 py-4 md:px-6 ${isDayMode ? 'border-slate-200' : 'border-white/10'}`}>
              <div>
                <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDayMode ? 'text-slate-500' : 'text-gray-500'}`}>
                  {t('community.publish_to_community', '发布到社区')}
                </p>
                <h2 className="mt-1 text-xl font-black md:text-2xl">
                  {t('community.choose_post_type', '选择发布类型')}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', '关闭')}
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                  isDayMode ? 'border-slate-200 text-slate-600 hover:bg-slate-50' : 'border-white/10 text-gray-300 hover:bg-white/10'
                }`}
              >
                <X size={18} />
              </button>
            </header>

            <div className="grid gap-2 p-4 md:grid-cols-2 md:gap-3 md:p-6">
              {COMMUNITY_POST_TYPES.map(({ key, labelKey, fallback, descKey, descFallback, icon: Icon }) => {
                const isActive = activeType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelect?.(key)}
                    className={`group flex min-h-[92px] items-start gap-3 rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 ${
                      isActive
                        ? isDayMode
                          ? 'border-violet-200 bg-violet-50 text-violet-900 shadow-[0_12px_28px_rgba(124,58,237,0.10)]'
                          : 'border-orange-300/60 bg-orange-400 text-slate-950 shadow-[0_0_36px_rgba(251,146,60,0.22)]'
                        : isDayMode
                          ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                          : 'border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.07]'
                    }`}
                  >
                    <span
                      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                        isActive
                          ? isDayMode
                            ? 'border-violet-200 bg-white text-violet-700'
                            : 'border-slate-950/10 bg-slate-950/10 text-slate-950'
                          : isDayMode
                            ? 'border-slate-200 bg-white text-slate-700'
                            : 'border-white/10 bg-black/20 text-orange-200'
                      }`}
                    >
                      <Icon size={19} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-base font-black">{t(labelKey, fallback)}</span>
                      <span className={`mt-1 block text-sm leading-5 ${isActive ? 'opacity-85' : isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
                        {t(descKey, descFallback)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default CommunityPostTypePicker;
