import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Send, Trash2, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const Comments = ({ resourceId, resourceType }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchComments();
    }, [resourceId, resourceType]);

    const fetchComments = async () => {
        try {
            const res = await api.get(`/comments?resourceId=${resourceId}&resourceType=${resourceType}`);
            setComments(res.data);
        } catch (error) {
            console.error('Failed to fetch comments', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        if (!user) {
            toast.error(t('auth.login_required'));
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/comments', {
                resourceId,
                resourceType,
                content: newComment
            });
            setComments([res.data, ...comments]);
            setNewComment('');
            toast.success(t('comments.posted'));
        } catch (error) {
            console.error('Failed to post comment', error);
            toast.error(t('comments.post_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('common.confirm_delete'))) return;
        
        try {
            await api.delete(`/comments/${id}`);
            setComments(comments.filter(c => c.id !== id));
            toast.success(t('comments.deleted'));
        } catch (error) {
            console.error('Failed to delete comment', error);
            toast.error(t('comments.delete_failed'));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {t('comments.title')} <span className="text-sm font-normal text-gray-500">({comments.length})</span>
            </h3>

            <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 pr-2 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        {t('comments.empty')}
                    </div>
                ) : (
                    <AnimatePresence initial={false}>
                        {comments.map((comment) => (
                            <motion.div 
                                key={comment.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/5 rounded-xl p-3 border border-white/5"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold overflow-hidden">
                                            {comment.avatar ? (
                                                <img src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
                                            ) : (
                                                comment.author?.charAt(0).toUpperCase() || '?'
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-white block leading-tight">{comment.author}</span>
                                            <span className="text-[10px] text-gray-500">{new Date(comment.created_at).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    {(user && (user.id === comment.user_id || user.role === 'admin')) && (
                                        <button 
                                            onClick={() => handleDelete(comment.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-gray-300 pl-10 whitespace-pre-wrap">{comment.content}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
                <form onSubmit={handleSubmit} className="relative">
                    <div className="relative">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value.slice(0, 500))}
                            placeholder={t('comments.placeholder')}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all resize-none h-20 text-sm custom-scrollbar"
                        />
                        <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 font-mono">
                            {newComment.length}/500
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={!newComment.trim() || submitting}
                        className="absolute top-2 right-2 p-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                    >
                        {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Comments;
