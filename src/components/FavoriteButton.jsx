import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const FavoriteButton = ({ 
  itemId, 
  itemType, 
  initialFavorited, 
  favorited, // Controlled state
  className = "", 
  size = 20, 
  showCount = false,
  count = 0,
  onToggle
}) => {
  const [isFavorited, setIsFavorited] = useState(() => {
    if (favorited !== undefined) return favorited;
    return !!initialFavorited;
  });
  const [loading, setLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(typeof count === 'number' ? count : 0);
  const { user } = useAuth();
  
  // Sync with controlled prop if provided
  useEffect(() => {
    if (favorited !== undefined) {
      setIsFavorited(favorited);
    }
  }, [favorited]);

  // Sync with initialFavorited if it changes (e.g. from parent re-fetch)
  // But be careful not to overwrite local optimistic state if we are interacting
  useEffect(() => {
      if (initialFavorited !== undefined && favorited === undefined) {
          setIsFavorited(initialFavorited);
      }
  }, [initialFavorited, favorited]);

  useEffect(() => {
    setLikeCount(typeof count === 'number' ? count : 0);
  }, [count]);

  // Check status on mount if not provided or if we want to be sure
  useEffect(() => {
    let mounted = true;
    
    const checkStatus = async () => {
      // If we have explicit state (controlled or initial), skip check
      if (!user || !itemId || !itemType) return;
      if (favorited !== undefined) return;
      if (initialFavorited !== undefined) return; // Trust parent if provided
      
      try {
        const res = await api.get(`/favorites/check?itemId=${itemId}&itemType=${itemType}`);
        if (mounted) setIsFavorited(res.data.favorited);
      } catch (error) {
        console.error("Failed to check favorite status", error);
      }
    };

    if (user) {
        checkStatus();
    } else {
        setIsFavorited(false);
    }

    return () => { mounted = false; };
  }, [itemId, itemType, user, favorited, initialFavorited]);

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error(t('auth.login_required', 'Please login first'));
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
      
      if (onToggle) onToggle(res.data.favorited, res.data.likes);
    } catch (error) {
      // Revert on error
      setIsFavorited(previousState);
      setLikeCount(previousLikes);
      console.error("Failed to toggle favorite", error);
      toast.error(t('common.error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      whileHover={{ scale: 1.1 }}
      onClick={handleToggle}
      className={`flex items-center justify-center gap-1.5 group ${className}`}
      disabled={loading}
    >
      <div className="relative">
        <Heart 
          size={size} 
          className={`transition-colors duration-300 ${isFavorited ? 'fill-pink-500 text-pink-500' : 'text-current group-hover:text-pink-500'}`} 
        />
        {isFavorited && (
             <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full bg-pink-500/30"
             />
        )}
      </div>
      {showCount && likeCount > 0 && (
        <span className="text-xs font-medium">{likeCount}</span>
      )}
    </motion.button>
  );
};

export default FavoriteButton;
