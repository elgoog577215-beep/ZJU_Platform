import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Shared hook: mobile sort label displayed in toolbar.
 * Duplicated across Gallery, Videos, Articles, Music, Events — now unified.
 */
export const useMobileSortLabel = (sort, t) => {
  return useMemo(() => {
    switch (sort) {
      case 'oldest':
      case 'date_asc':
        return t('sort_filter.oldest', '最旧');
      case 'date_desc':
        return t('sort_filter.date_desc', '最晚');
      case 'likes':
        return t('sort_filter.likes', '最热');
      case 'title':
        return t('sort_filter.title', '标题');
      default:
        return t('sort_filter.newest', '最新');
    }
  }, [sort, t]);
};

/**
 * Shared hook: listen for global window events dispatched by Navbar.
 * Handles open-upload-modal, toggle-mobile-filter, toggle-mobile-sort.
 * @param {string} contentType - e.g. 'image', 'video', 'audio', 'article', 'event'
 * @param {Function} setIsUploadOpen
 * @param {Function} setIsMobileFilterOpen
 * @param {Function} setIsMobileSortOpen
 */
export const useContentPageEvents = (
  contentType,
  setIsUploadOpen,
  setIsMobileFilterOpen,
  setIsMobileSortOpen,
) => {
  useEffect(() => {
    const handleOpenUpload = (e) => {
      if (e.detail.type === contentType) setIsUploadOpen(true);
    };
    const handleToggleFilter = () => {
      setIsMobileSortOpen(false);
      setIsMobileFilterOpen((prev) => !prev);
    };
    const handleToggleSort = () => {
      setIsMobileFilterOpen(false);
      setIsMobileSortOpen((prev) => !prev);
    };

    window.addEventListener('open-upload-modal', handleOpenUpload);
    window.addEventListener('toggle-mobile-filter', handleToggleFilter);
    window.addEventListener('toggle-mobile-sort', handleToggleSort);
    return () => {
      window.removeEventListener('open-upload-modal', handleOpenUpload);
      window.removeEventListener('toggle-mobile-filter', handleToggleFilter);
      window.removeEventListener('toggle-mobile-sort', handleToggleSort);
    };
  }, [contentType, setIsUploadOpen, setIsMobileFilterOpen, setIsMobileSortOpen]);
};

/**
 * Shared hook: sync mobile toolbar badge state whenever filters/sort change.
 */
export const useMobileToolbarSync = (selectedTagsLength, mobileSortLabel) => {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('set-mobile-toolbar-state', {
        detail: {
          filterCount: selectedTagsLength,
          sortLabel: mobileSortLabel,
        },
      }),
    );
  }, [selectedTagsLength, mobileSortLabel]);
};

/**
 * Shared hook: paginated display list with infinite-scroll append support.
 * Replaces the duplicated useEffect in Gallery, Videos, Articles, Events.
 * @param {Array} items - raw data from API
 * @param {number} currentPage
 * @param {boolean} isPaginationEnabled
 * @returns {[Array, Function]} [displayItems, setDisplayItems]
 */
export const usePaginatedDisplay = (items, currentPage, isPaginationEnabled) => {
  const [displayItems, setDisplayItems] = useState([]);

  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayItems(items);
      return;
    }

    setDisplayItems((prev) => {
      if (currentPage === 1) return items;
      const seen = new Set(prev.map((item) => item.id));
      const next = items.filter((item) => !seen.has(item.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [items, currentPage, isPaginationEnabled]);

  return [displayItems, setDisplayItems];
};
