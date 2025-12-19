import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const FavoriteButton = ({ 
  itemId, 
  itemType, 
  initialFavorited = false, 
  favorited, // Controlled state
  className = "", 
  size = 20, 
  showCount = false,
  count = 0,
  onToggle
}) => {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(typeof count === 'number' ? count : 0);
  const { user } = useAuth();
  
  // Sync with controlled prop if provided
  useEffect(() => {
    if (favorited !== undefined) {
      setIsFavorited(favorited);
    }
  }, [favorited]);

  useEffect(() => {
    setLikeCount(typeof count === 'number' ? count : 0);
  }, [count]);

  // Check status on mount if not provided or if we want to be sure
  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async () => {
      if (!user || !itemId || !itemType) return;
      
      // If initialFavorited is provided, we might trust it, but checking ensures sync
      // However, to save requests, we might skip if we are sure. 
      // For now, let's rely on initialFavorited if passed, otherwise check.
      // Actually, checking is safer to avoid UI mismatch.
      try {
        const res = await api.get(`/favorites/check?itemId=${itemId}&itemType=${itemType}`);
        if (mounted) setIsFavorited(res.data.favorited);
      } catch (error) {
        console.error("Failed to check favorite status", error);
      }
    };

    // Only check if we didn't receive an explicit initial state or if we want to verify
    // For this implementation, let's check if user is logged in
    if (user) {
        checkStatus();
    } else {
        setIsFavorited(false);
    }

    return () => { mounted = false; };
  }, [itemId, itemType, user]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('请先登录以收藏');
      return;
    }

    if (loading) return;

    // Optimistic update
    const previousState = isFavorited;
    const previousLikes = likeCount;
    setIsFavorited(!previousState);
    setLikeCount(previousState ? Math.max(0, previousLikes - 1) : previousLikes + 1);
    setLoading(true);

    try {
      const res = await api.post('/favorites/toggle', { itemId, itemType });
      // Backend returns { favorited: true/false }
      setIsFavorited(res.data.favorited);
      if (typeof res.data.likes === 'number') {
        setLikeCount(res.data.likes);
      }
      
      if (res.data.favorited) {
        // toast.success('已收藏');
      } else {
        // toast.success('已取消收藏');
      }

      if (onToggle) onToggle(res.data.favorited, res.data.likes);
    } catch (error) {
      // Revert on error
      setIsFavorited(previousState);
      setLikeCount(previousLikes);
      toast.error('操作失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={handleToggle}
      className={`relative flex items-center justify-center transition-colors ${className} ${
        isFavorited ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
      }`}
      disabled={loading}
    >
      <AnimatePresence mode='wait'>
        {isFavorited ? (
            <motion.div
                key="filled"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <Heart size={size} fill="currentColor" />
            </motion.div>
        ) : (
            <motion.div
                key="outline"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
            >
                <Heart size={size} />
            </motion.div>
        )}
      </AnimatePresence>
      {showCount && likeCount > 0 && (
        <span className="ml-1 text-[10px]">{likeCount}</span>
      )}
    </motion.button>
  );
};

export default FavoriteButton;
