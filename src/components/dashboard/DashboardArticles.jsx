import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ArrowRight } from 'lucide-react';
import SmartImage from '../SmartImage';
import { getThumbnailUrl } from '../../utils/imageUtils';

const DashboardArticles = ({ articles, onSelect }) => {
  const { t } = useTranslation();
  return (
  <div className="h-full overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
      {articles.map((article) => (
        <div 
          key={article.id}
          onClick={() => onSelect(article)}
          className="bg-[#0a0a0a]/80 border border-white/10 rounded-3xl p-6 hover:border-red-500/30 transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden min-h-[180px]"
        >
        {article.image && (
          <>
            <SmartImage 
                src={getThumbnailUrl(article.image)} 
                alt={article.title} 
                type="event"
                className="absolute inset-0 w-full h-full"
                imageClassName="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-500" 
                iconSize={32}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
          </>
        )}
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/20 transition-colors" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-red-400" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">{article.date}</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-red-400 transition-colors line-clamp-2">{article.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">{article.description}</p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs font-bold text-white mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
          {t('common.view_details')} <ArrowRight size={12} />
        </div>
      </div>
    ))}
    </div>
  </div>
)};

export default DashboardArticles;
