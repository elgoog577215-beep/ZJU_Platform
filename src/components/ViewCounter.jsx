import React, { useEffect } from 'react';
import { Eye } from 'lucide-react';
import useViewCount from '../hooks/useViewCount';

const ViewCounter = ({ type, item, onViewsUpdate, className = "", iconSize = 14, showIcon = true }) => {
  const { views, incrementView } = useViewCount(type, item);

  useEffect(() => {
    incrementView();
  }, [incrementView]);

  useEffect(() => {
    if (onViewsUpdate && views !== item.views) {
      onViewsUpdate(item.id, views);
    }
  }, [views, item.views, item.id, onViewsUpdate]);

  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      {showIcon && <Eye size={iconSize} />}
      {views}
    </span>
  );
};

export default ViewCounter;
