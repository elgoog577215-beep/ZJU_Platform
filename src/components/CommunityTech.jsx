import React, { useState, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar, X, User, Clock, Paperclip } from 'lucide-react';
import SmartImage from './SmartImage';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../services/api';
import SortSelector from './SortSelector';
import TagFilter from './TagFilter';
import DOMPurify from 'dompurify';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import { parseContentBlocks, calculateReadingTime, formatBytes, getFileTypeLabel, getFileTypeBadgeClass } from './communityUtils';
import { useCommunityFeed } from '../hooks/useCommunityFeed';

const ArticleCard = memo(({ article, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(article)}
      className={`group relative backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:border-orange-500/30 cursor-pointer overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.15)] hover:-translate-y-1 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10'}`}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {article.cover && (
          <div className="w-full md:w-48 h-48 md:h-32 rounded-xl overflow-hidden flex-shrink-0">
            <SmartImage src={article.cover} alt={article.title} type="article" className="w-full h-full" imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" iconSize={32} />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          <div className={`flex items-center gap-3 text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            {article.author_name && (<><span className="flex items-center gap-1"><User size={12} />{article.author_name}</span><span>•</span></>)}
            <span className="flex items-center gap-1"><Calendar size={12} />{article.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} />{calculateReadingTime(article.content, t)}</span>
          </div>
          <h3 className={`text-2xl font-bold group-hover:text-orange-400 transition-colors ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{article.title}</h3>
          <p className={`line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{article.excerpt}</p>
          <div className="pt-2 flex items-center justify-end gap-3 mt-auto">
            <FavoriteButton itemId={article.id} itemType="article" size={18} showCount count={article.likes || 0} initialFavorited={article.favorited} className={`p-2 rounded-full transition-colors hover:text-orange-500 ${isDayMode ? 'hover:bg-orange-50 text-slate-500' : 'hover:bg-white/10 text-gray-400'}`} onToggle={(f, l) => onToggleFavorite(article.id, f, l)} />
            <div className={`p-2 rounded-full group-hover:bg-orange-500 group-hover:text-black transition-all duration-300 ${isDayMode ? 'bg-orange-50 text-orange-500' : 'bg-white/5'}`}>
              <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
ArticleCard.displayName = 'ArticleCard';

const CommunityTech = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSortOpen, setIsMobileSortOpen] = useState(false);

  const feed = useCommunityFeed({ endpoint: '/articles', category: 'tech', deepLinkParam: 'id', defaultPageSize: 6 });

  // Mobile toolbar events
  const mobileSortLabel = useMemo(() => {
    const labels = { oldest: t('sort_filter.oldest', '最旧'), likes: t('sort_filter.likes', '最热'), title: t('sort_filter.title', '标题') };
    return labels[feed.sort] || t('sort_filter.newest', '最新');
  }, [feed.sort, t]);

  useEffect(() => {
    const onUpload = (e) => { if (e.detail.type === 'article') setIsUploadOpen(true); };
    const onFilter = () => { setIsMobileSortOpen(false); setIsMobileFilterOpen((p) => !p); };
    const onSort = () => { setIsMobileFilterOpen(false); setIsMobileSortOpen((p) => !p); };
    window.addEventListener('open-upload-modal', onUpload);
    window.addEventListener('toggle-mobile-filter', onFilter);
    window.addEventListener('toggle-mobile-sort', onSort);
    return () => { window.removeEventListener('open-upload-modal', onUpload); window.removeEventListener('toggle-mobile-filter', onFilter); window.removeEventListener('toggle-mobile-sort', onSort); };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('set-mobile-toolbar-state', { detail: { filterCount: feed.selectedTags.length, sortLabel: mobileSortLabel } }));
  }, [feed.selectedTags.length, mobileSortLabel]);

  const contentBlocks = useMemo(() => parseContentBlocks(feed.selectedItem?.content_blocks), [feed.selectedItem?.content_blocks]);

  const renderCard = (article, idx, { canAnimate, isDayMode: dm }) => (
    <ArticleCard key={article.id} article={article} index={idx} onClick={feed.handleItemClick} onToggleFavorite={feed.handleToggleFavorite} canAnimate={canAnimate} isDayMode={dm} />
  );

  const handleUpload = async (item) => { await api.post('/articles', { ...item, category: 'tech' }); feed.handleRefresh(); };

  const renderDetail = () => (
    <CommunityDetailModal
      item={feed.selectedItem}
      onClose={() => feed.setSelectedItem(null)}
      isDayMode={isDayMode}
      gradientFrom="from-orange-900/40"
      headerHeight="h-72 sm:h-96"
      coverImage={feed.selectedItem?.cover}
      headerContent={feed.selectedItem && (
        <>
          <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 ${isDayMode ? 'text-orange-500' : 'text-orange-300 drop-shadow-lg'}`}><span>{feed.selectedItem.date}</span></div>
          <h2 className={`text-4xl md:text-6xl font-black leading-[0.95] tracking-tight font-serif ${isDayMode ? 'text-slate-900' : 'text-white drop-shadow-2xl'}`}>{feed.selectedItem.title}</h2>
        </>
      )}
      authorBar={feed.selectedItem && (
        <FavoriteButton itemId={feed.selectedItem.id} itemType="article" size={24} showCount count={feed.selectedItem.likes || 0} initialFavorited={feed.selectedItem.favorited} className={`p-3 rounded-full transition-all border ${isDayMode ? 'bg-white/85 hover:bg-red-50 text-slate-700 border-slate-200/80' : 'bg-white/5 hover:bg-red-500/20 text-white border border-white/10'}`} onToggle={(f, l) => feed.handleToggleFavorite(feed.selectedItem.id, f, l)} />
      )}
      contentBlocks={contentBlocks}
      htmlContent={feed.selectedItem?.content}
    />
  );

  // Mobile filter/sort portals
  const mobileDrawers = (
    <>
      {createPortal(<AnimatePresence>{isMobileFilterOpen && (<>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileFilterOpen(false)} className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? 'bg-white/55' : 'bg-black/60'}`} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-h-[80vh] max-w-md mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80' : 'bg-[#1a1a1a]/95 border-white/10'}`}>
          <div className={`p-4 border-b flex justify-between items-center ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
            <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.filters', '筛选')}</h3>
            <button onClick={() => setIsMobileFilterOpen(false)} className={`p-2 rounded-full ${isDayMode ? 'text-slate-500 bg-slate-100' : 'text-gray-400 bg-white/5'}`}><X size={20} /></button>
          </div>
          <div className="p-6 overflow-y-auto flex-1 min-h-0"><TagFilter selectedTags={feed.selectedTags} onChange={feed.setSelectedTags} type="articles" variant="sheet" /></div>
          <div className={`p-4 border-t flex gap-3 ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
            <button onClick={() => feed.setSelectedTags([])} disabled={!feed.selectedTags.length} className={`flex-1 py-3 rounded-2xl border disabled:opacity-40 ${isDayMode ? 'border-slate-200/80 bg-slate-100/90 text-slate-600' : 'border-white/10 bg-white/5 text-gray-200'}`}>{t('common.clear_all', '重置')}</button>
            <button onClick={() => setIsMobileFilterOpen(false)} className="flex-1 py-3 rounded-2xl bg-white text-black font-semibold">{t('common.done', '完成')}</button>
          </div>
        </motion.div>
      </>)}</AnimatePresence>, document.body)}
      {createPortal(<AnimatePresence>{isMobileSortOpen && (<>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSortOpen(false)} className={`fixed inset-0 backdrop-blur-sm z-[100] md:hidden ${isDayMode ? 'bg-white/55' : 'bg-black/60'}`} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} className={`fixed inset-0 m-auto w-[calc(100%-2rem)] h-fit backdrop-blur-xl border rounded-3xl z-[101] md:hidden flex flex-col max-w-sm mx-auto ${isDayMode ? 'bg-white/95 border-slate-200/80' : 'bg-[#1a1a1a]/95 border-white/10'}`}>
          <div className={`p-4 border-b flex justify-between items-center ${isDayMode ? 'border-slate-200/80' : 'border-white/10'}`}>
            <h3 className={`text-lg font-bold ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{t('common.sort', '排序')}</h3>
            <button onClick={() => setIsMobileSortOpen(false)} className={`p-2 rounded-full ${isDayMode ? 'text-slate-500 bg-slate-100' : 'text-gray-400 bg-white/5'}`}><X size={20} /></button>
          </div>
          <div className="p-4"><SortSelector sort={feed.sort} onSortChange={(v) => { feed.setSort(v); setTimeout(() => setIsMobileSortOpen(false), 300); }} className="w-full" renderMode="list" /></div>
        </motion.div>
      </>)}</AnimatePresence>, document.body)}
    </>
  );

  const extraControls = (
    <div className="hidden md:block flex-1">
      <TagFilter selectedTags={feed.selectedTags} onChange={feed.setSelectedTags} type="articles" />
    </div>
  );

  return (
    <>
      <CommunityFeedPanel
        feed={feed}
        isDayMode={isDayMode}
        renderCard={renderCard}
        renderDetail={renderDetail}
        emptyIcon={BookOpen}
        emptyTitle={t('articles.no_articles')}
        emptyDesc={t('articles.subtitle')}
        accentColor="orange"
        extraControls={extraControls}
        onNewPost={() => { if (!user) { toast.error(t('auth.signin_required')); return; } setIsUploadOpen(true); }}
        renderSkeleton={(i) => (
          <div key={i} className={`backdrop-blur-xl border rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
            <div className={`w-full md:w-48 h-48 md:h-32 rounded-xl shrink-0 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
            <div className="flex-1 space-y-4 py-2"><div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} /><div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} /></div>
          </div>
        )}
        extraBottom={<UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUpload={handleUpload} type="article" />}
      />
      {mobileDrawers}
    </>
  );
};

export default CommunityTech;
