import React, { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, ArrowRight, Calendar, Upload, Clock } from 'lucide-react';
import SmartImage from './SmartImage';
import UploadModal from './UploadModal';
import FavoriteButton from './FavoriteButton';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CommunityDetailModal from './CommunityDetailModal';
import CommunityFeedPanel from './CommunityFeedPanel';
import { parseContentBlocks, calculateReadingTime } from './communityUtils';
import { useCommunityFeed } from '../hooks/useCommunityFeed';

const NewsCard = memo(({ article, index, onClick, onToggleFavorite, canAnimate, isDayMode }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={canAnimate ? { opacity: 0, y: 14 } : false}
      animate={canAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={canAnimate ? { duration: 0.24, delay: Math.min(index, 5) * 0.03 } : undefined}
      onClick={() => onClick(article)}
      className={`group relative backdrop-blur-xl border rounded-3xl p-6 transition-all duration-300 hover:border-blue-500/30 cursor-pointer overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.15)] hover:-translate-y-1 ${isDayMode ? 'bg-white/82 hover:bg-white border-slate-200/80 shadow-[0_18px_42px_rgba(148,163,184,0.12)]' : 'bg-[#1a1a1a]/60 hover:bg-[#1a1a1a]/80 border-white/10'}`}
    >
      <div className="flex flex-col md:flex-row gap-6">
        {article.cover && (
          <div className="w-full md:w-48 h-48 md:h-32 rounded-xl overflow-hidden flex-shrink-0">
            <SmartImage src={article.cover} alt={article.title} type="article" className="w-full h-full" imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" iconSize={32} />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center space-y-3">
          <div className={`flex items-center gap-3 text-xs font-mono ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1"><Calendar size={12} />{article.date}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={12} />{calculateReadingTime(article.content, t)}</span>
          </div>
          <h3 className={`text-2xl font-bold group-hover:text-blue-400 transition-colors ${isDayMode ? 'text-slate-900' : 'text-white'}`}>{article.title}</h3>
          <p className={`line-clamp-2 ${isDayMode ? 'text-slate-500' : 'text-gray-400'}`}>{article.excerpt}</p>
          <div className="pt-2 flex items-center justify-end gap-3 mt-auto">
            <FavoriteButton itemId={article.id} itemType="article" size={18} showCount count={article.likes || 0} initialFavorited={article.favorited} className={`p-2 rounded-full transition-colors hover:text-blue-500 ${isDayMode ? 'hover:bg-blue-50 text-slate-500' : 'hover:bg-white/10 text-gray-400'}`} onToggle={(f, l) => onToggleFavorite(article.id, f, l)} />
            <div className={`p-2 rounded-full group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 ${isDayMode ? 'bg-blue-50 text-blue-500' : 'bg-white/5'}`}>
              <ArrowRight size={18} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});
NewsCard.displayName = 'NewsCard';

const CommunityNews = () => {
  const { t } = useTranslation();
  const { uiMode } = useSettings();
  const { user } = useAuth();
  const isDayMode = uiMode === 'day';
  const isAdmin = user?.role === 'admin';
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  const feed = useCommunityFeed({ endpoint: '/articles', category: 'news', deepLinkParam: 'id', defaultPageSize: 6 });

  const contentBlocks = useMemo(() => parseContentBlocks(feed.selectedItem?.content_blocks), [feed.selectedItem?.content_blocks]);

  const renderCard = (article, index, { canAnimate, isDayMode: dm }) => (
    <NewsCard key={article.id} article={article} index={index} onClick={feed.handleItemClick} onToggleFavorite={feed.handleToggleFavorite} canAnimate={canAnimate} isDayMode={dm} />
  );

  const handleUpload = async (newItem) => {
    await api.post('/articles', { ...newItem, category: 'news' });
    feed.handleRefresh();
  };

  const renderDetail = () => (
    <CommunityDetailModal
      item={feed.selectedItem}
      onClose={() => feed.setSelectedItem(null)}
      isDayMode={isDayMode}
      gradientFrom="from-blue-900/40"
      headerHeight="h-72 sm:h-96"
      coverImage={feed.selectedItem?.cover}
      headerContent={feed.selectedItem && (
        <>
          <div className={`flex items-center gap-3 font-bold text-lg md:text-xl uppercase tracking-[0.2em] mb-4 ${isDayMode ? 'text-blue-500' : 'text-blue-300 drop-shadow-lg'}`}>
            <span>{feed.selectedItem.date}</span>
          </div>
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

  return (
    <CommunityFeedPanel
      feed={feed}
      isDayMode={isDayMode}
      renderCard={renderCard}
      renderDetail={renderDetail}
      emptyIcon={Newspaper}
      emptyTitle={t('community.news_empty', '暂无新闻')}
      emptyDesc={t('community.news_empty_desc', '新闻内容正在建设中，敬请期待。')}
      accentColor="blue"
      onNewPost={isAdmin ? () => setIsUploadOpen(true) : undefined}
      renderSkeleton={(i) => (
        <div key={i} className={`backdrop-blur-xl border rounded-3xl p-6 animate-pulse flex flex-col md:flex-row gap-6 ${isDayMode ? 'bg-white/82 border-slate-200/80' : 'bg-[#1a1a1a]/40 border-white/5'}`}>
          <div className={`w-full md:w-48 h-48 md:h-32 rounded-xl shrink-0 ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
          <div className="flex-1 space-y-4 py-2">
            <div className={`h-8 rounded w-3/4 ${isDayMode ? 'bg-slate-100' : 'bg-white/10'}`} />
            <div className={`h-4 rounded w-full ${isDayMode ? 'bg-slate-100' : 'bg-white/5'}`} />
          </div>
        </div>
      )}
      extraBottom={<UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} onUpload={handleUpload} type="article" />}
    />
  );
};

export default CommunityNews;
