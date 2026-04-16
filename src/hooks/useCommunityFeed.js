import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useCachedResource } from './useCachedResource';
import { useBackClose } from './useBackClose';
import api from '../services/api';

/**
 * Unified data hook for all community feed sections.
 *
 * @param {object} opts
 * @param {string} opts.endpoint        – API path, e.g. '/community/posts' or '/articles'
 * @param {string} [opts.section]       – e.g. 'help' (appended as query param for posts)
 * @param {string} [opts.category]      – 'news'|'tech' (appended as query param for articles)
 * @param {string} [opts.deepLinkParam] – search-param key for deep link, e.g. 'post' or 'id'
 * @param {number} [opts.defaultPageSize] – items per page (default 10)
 */
export function useCommunityFeed({
  endpoint,
  section,
  category,
  deepLinkParam = 'post',
  defaultPageSize = 10,
  extraQueryParams = {},
  extraDependencies = [],
} = {}) {
  const { settings } = useSettings();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState('newest');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [displayItems, setDisplayItems] = useState([]);

  const isPaginationEnabled = settings.pagination_enabled === 'true';
  const pageSize = isPaginationEnabled ? defaultPageSize : defaultPageSize + 5;

  useBackClose(selectedItem !== null, () => setSelectedItem(null));

  const queryParams = useMemo(() => {
    const p = { page: currentPage, limit: pageSize, sort };
    if (section) p.section = section;
    if (category) p.category = category;
    if (statusFilter !== 'all') p.status = statusFilter;
    if (searchQuery.trim()) p.search = searchQuery.trim();
    if (selectedTags.length) p.tags = selectedTags.join(',');
    Object.entries(extraQueryParams || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        p[k] = v;
      }
    });
    return p;
  }, [currentPage, pageSize, sort, section, category, statusFilter, searchQuery, selectedTags, extraQueryParams]);

  const {
    data: items,
    pagination,
    loading: isLoading,
    error,
    setData: setItems,
    refresh,
  } = useCachedResource(endpoint, queryParams, {
    dependencies: [settings.pagination_enabled, statusFilter, selectedTags.join(','), ...extraDependencies],
    keyPrefix: 'cache:v2:',
  });

  const totalPages = pagination?.totalPages || 1;
  const hasMore = !isPaginationEnabled && currentPage < totalPages;

  // Reset page on filter / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [sort, statusFilter, searchQuery, selectedTags.join(','), settings.pagination_enabled, ...extraDependencies]);

  // Accumulate items for infinite-scroll or replace for pagination
  const effectiveItems = useMemo(() => items || [], [items]);
  useEffect(() => {
    if (isPaginationEnabled) {
      setDisplayItems(effectiveItems);
      return;
    }
    setDisplayItems((prev) => {
      if (currentPage === 1) return effectiveItems;
      const seen = new Set(prev.map((i) => i.id));
      const next = effectiveItems.filter((i) => !seen.has(i.id));
      return next.length === 0 ? prev : [...prev, ...next];
    });
  }, [effectiveItems, currentPage, isPaginationEnabled]);

  // Deep-link fetch
  useEffect(() => {
    const id = searchParams.get(deepLinkParam);
    if (!id) return;
    const ac = new AbortController();
    const url = section ? `${endpoint}/${id}` : `${endpoint}/${id}`;
    api.get(url, { signal: ac.signal })
      .then((res) => { if (res.data) setSelectedItem(res.data); })
      .catch(() => {});
    return () => ac.abort();
  }, [searchParams, deepLinkParam, endpoint, section]);

  // Handlers
  const handleItemClick = useCallback((item) => setSelectedItem(item), []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleRefresh = useCallback(() => refresh({ clearCache: true }), [refresh]);

  const handleToggleFavorite = useCallback((itemId, favorited, likes) => {
    const updater = (prev) => {
      if (!prev) return prev;
      return prev.map((a) =>
        a.id === itemId ? { ...a, likes: likes !== undefined ? likes : a.likes, favorited } : a,
      );
    };
    setItems(updater);
    setDisplayItems(updater);
    setSelectedItem((prev) => {
      if (prev && prev.id === itemId) {
        return { ...prev, likes: likes !== undefined ? likes : prev.likes, favorited };
      }
      return prev;
    });
  }, [setItems]);

  return {
    // Data
    displayItems,
    isLoading,
    error,
    selectedItem,
    setSelectedItem,

    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    hasMore,
    isPaginationEnabled,

    // Filters
    sort,
    setSort,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    selectedTags,
    setSelectedTags,

    // Actions
    handleItemClick,
    handlePageChange,
    handleRefresh,
    handleToggleFavorite,
    refresh,
    pageSize,
  };
}
