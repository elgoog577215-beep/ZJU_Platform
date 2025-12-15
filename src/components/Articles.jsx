import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowRight, Calendar, X, User, Tag, Upload, Clock, Share2, Check, Heart } from 'lucide-react';
import UploadModal from './UploadModal';
import { useTranslation } from 'react-i18next';
import Pagination from './Pagination';
import { useSettings } from '../context/SettingsContext';
import ImageWithLoader from './ImageWithLoader';
import useSWR, { mutate } from 'swr';
import api, { fetcher } from '../services/api';
import SortSelector from './SortSelector';

const CommentSection = ({ articleId }) => {
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  
  const { data: comments = [] } = useSWR(`/articles/${articleId}/comments`, fetcher);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !authorName.trim()) return;

    api.post(`/articles/${articleId}/comments`, {
        author: authorName,
        content: newComment,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`
    })
    .then(() => {
      mutate(`/articles/${articleId}/comments`); // Trigger re-fetch
      setNewComment('');
    })
    .catch(err => console.error(err));
  };

  return (
    <div className="mt-12 pt-12 border-t border-white/10">
      <h3 className="text-2xl font-bold text-white mb-8">Comments ({comments.length})</h3>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-10 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
           <input 
             type="text" 
             placeholder="Your Name"
             value={authorName}
             onChange={e => setAuthorName(e.target.value)}
             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 w-full sm:w-1/3 transition-colors"
           />
           <input 
             type="text" 
             placeholder="Add a comment..."
             value={newComment}
             onChange={e => setNewComment(e.target.value)}
             className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 flex-1 transition-colors"
           />
           <button 
             type="submit"
             className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition-colors whitespace-nowrap"
           >
             Post
           </button>
        </div>
      </form>

      {/* List */}
      <div className="space-y-6">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <img src={comment.avatar} alt={comment.author} className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white">{comment.author}</span>
                <span className="text-xs text-gray-500">{comment.date}</span>
              </div>
              <p className="text-gray-300 text-sm">{comment.content}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-gray-500 text-sm italic">No comments yet. Be the first to share your thoughts!</p>}
      </div>
    </div>
  );
};

const Articles = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState(null);
  const [sort, setSort] = useState('newest');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const limit = settings.pagination_enabled === 'true' ? 6 : 1000;
  
  // Use SWR for fetching articles
  const { data: articlesData, error, isLoading } = useSWR(
    `/articles?page=${currentPage}&limit=${limit}&sort=${sort}`,
    fetcher
  );

  const articles = articlesData?.data || [];
  const totalPages = articlesData?.pagination?.totalPages || 1;

  // Deep linking
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
        api.get(`/articles/${id}`)
           .then(res => {
               if (res.data) setSelectedArticle(res.data);
           })
           .catch(err => console.error("Failed to fetch deep linked article", err));
    }
  }, [searchParams]);

  const calculateReadingTime = (text) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleShare = (e, article) => {
    e.stopPropagation();
    const url = window.location.href; // In a real app, this would be a specific article URL
    navigator.clipboard.writeText(`${article.title} - ${url}`);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLike = (e, id) => {
      e.stopPropagation();
      api.post(`/articles/${id}/like`)
        .then(() => {
            mutate(`/articles?page=${currentPage}&limit=${limit}&sort=${sort}`);
        })
        .catch(err => console.error("Failed to like article", err));
  };

  const addArticle = (newItem) => {
    api.post('/articles', newItem)
    .then(() => {
        mutate(`/articles?page=${currentPage}&limit=${limit}&sort=${sort}`);
    })
    .catch(err => console.error("Failed to save article", err));
  };

  const handleUpload = (newItem) => {
    addArticle(newItem);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <section className="py-12 md:py-24 px-4 md:px-8 min-h-screen flex items-center justify-center relative z-10">
      <div className="max-w-5xl w-full mx-auto relative">
        <div className="absolute right-0 top-0 flex items-center gap-4 z-20">
             <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white p-2 md:p-3 rounded-full backdrop-blur-md border border-white/10 transition-all"
              title="Upload Article"
            >
              <Upload size={18} className="md:w-5 md:h-5" />
            </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-8 md:mb-12 text-center"
        >
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold font-serif mb-3 md:mb-4">{t('articles.title')}</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-sm md:text-base">{t('articles.subtitle')}</p>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-12">
          <SortSelector sort={sort} onSortChange={setSort} />
        </div>

        <div className="space-y-6">
          {articles.length === 0 && !isLoading && (
            <div className="text-center py-20 text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p>No articles found. Start writing!</p>
            </div>
          )}
          {articles.map((article, index) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              onClick={() => setSelectedArticle(article)}
              className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all hover:border-white/20 cursor-pointer overflow-hidden hover:shadow-2xl hover:shadow-orange-500/10"
            >
              {/* Shine Effect */}
              <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl">
                  <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full shine-effect" />
              </div>

              <div className="flex flex-col md:flex-row gap-6">
                {/* Cover Image */}
                {article.cover && (
                  <div className="w-full md:w-48 h-48 md:h-32 rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithLoader 
                      src={article.cover} 
                      alt={article.title} 
                      className="w-full h-full"
                      imageClassName="h-full object-cover"
                    />
                  </div>
                )}

                <div className="absolute top-4 right-4 flex gap-2">
                  <button 
                    onClick={(e) => handleLike(e, article.id)}
                    className="p-2 bg-black/50 hover:bg-orange-500 rounded-full backdrop-blur-md transition-all group/btn border border-white/10"
                    title="Like"
                  >
                    <div className="flex items-center gap-1">
                       <Heart size={16} className={`transition-colors ${article.likes > 0 ? 'fill-white text-white' : 'text-gray-300 group-hover/btn:text-white'}`} />
                       {article.likes > 0 && <span className="text-xs font-bold text-white">{article.likes}</span>}
                    </div>
                  </button>
                  <button 
                    onClick={(e) => handleShare(e, article)}
                    className="p-2 bg-black/50 hover:bg-white rounded-full backdrop-blur-md transition-all group/btn border border-white/10"
                    title="Share"
                  >
                    {copiedId === article.id ? (
                      <Check size={16} className="text-green-500" />
                    ) : (
                      <Share2 size={16} className="text-gray-300 group-hover/btn:text-black" />
                    )}
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-3">
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {article.date}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {calculateReadingTime(article.content)}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-orange-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>

                <div className="hidden md:flex flex-col items-center justify-between pl-4 border-l border-white/5 py-2">
                   <button 
                    onClick={(e) => handleShare(e, article)}
                    className="p-2 text-gray-500 hover:text-white transition-colors relative"
                    title="Share"
                   >
                      {copiedId === article.id ? <Check size={18} className="text-green-500" /> : <Share2 size={18} />}
                   </button>
                   <div className="p-3 rounded-full bg-white/5 group-hover:bg-orange-500 group-hover:text-black transition-all duration-300">
                      <ArrowRight size={20} className="-rotate-45 group-hover:rotate-0 transition-transform duration-300" />
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {settings.pagination_enabled === 'true' && (
            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
            />
        )}
      </div>

      <AnimatePresence>
        {selectedArticle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 overflow-y-auto"
            onClick={() => setSelectedArticle(null)}
          >
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Header Image / Gradient */}
              <div 
                className="h-48 bg-gradient-to-br from-orange-900/40 to-black relative bg-cover bg-center"
                style={selectedArticle.cover ? { backgroundImage: `url(${selectedArticle.cover})` } : {}}
              >
                {!selectedArticle.cover && <div className="absolute inset-0 bg-gradient-to-br from-orange-900/40 to-black" />}
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors z-10"
                >
                  <X size={24} />
                </button>
                <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-[#0a0a0a] to-transparent">
                  <div className="flex items-center gap-3 text-xs font-mono text-orange-300 mb-2">
                     <span>{selectedArticle.date}</span>
                     <span>•</span>
                     <span>{calculateReadingTime(selectedArticle.content)}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold font-serif text-white leading-tight">
                    {selectedArticle.title}
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 md:p-12 pt-4">
                <div className="flex items-center justify-between gap-3 mb-8 pb-8 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      <User size={20} className="text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Lumos Admin</div>
                      <div className="text-xs text-gray-500">Author</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => handleShare(e, selectedArticle)}
                    className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all"
                  >
                    {copiedId === selectedArticle.id ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                    Share
                  </button>
                </div>

                <div 
                  className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />

                <CommentSection articleId={selectedArticle.id} />
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <UploadModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        type="article"
      />
    </section>
  );
};

export { CommentSection };
export default Articles;
