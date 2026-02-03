import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const useViewCount = (type, item) => {
  const [views, setViews] = useState(item?.views || 0);
  const [hasViewed, setHasViewed] = useState(false);

  useEffect(() => {
    if (item?.views !== undefined) {
      setViews(item.views);
    }
  }, [item?.views]);

  const incrementView = useCallback(async () => {
    if (!item?.id || !type) return;

    // Check if already viewed in this session
    const storageKey = `viewed_${type}_${item.id}`;
    if (sessionStorage.getItem(storageKey)) {
      setHasViewed(true);
      return;
    }

    try {
      const response = await api.post(`/views/${type}/${item.id}`);
      if (response.data && response.data.views !== undefined) {
        setViews(response.data.views);
        setHasViewed(true);
        sessionStorage.setItem(storageKey, 'true');
      }
    } catch (error) {
      console.error('Failed to increment view count:', error);
    }
  }, [type, item?.id]);

  return { views, incrementView, hasViewed };
};

export default useViewCount;
