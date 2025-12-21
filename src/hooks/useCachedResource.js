import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Custom hook to fetch data with local storage caching (Stale-While-Revalidate)
 * @param {string} endpoint - API endpoint (e.g., '/photos')
 * @param {Object} params - Query parameters
 * @param {Object} options - Configuration options
 * @returns {Object} { data, pagination, loading, error, setData, refresh }
 */
export const useCachedResource = (endpoint, params = {}, options = {}) => {
    const { 
        keyPrefix = 'cache:', 
        ttl = 24 * 60 * 60 * 1000, // 24 hours default
        enabled = true,
        dependencies = [] // Extra dependencies to trigger refresh
    } = options;

    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Create a stable query string for the cache key
    // We sort keys to ensure object order doesn't affect the key
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
            acc[key] = params[key];
        }
        return acc;
    }, {});
    
    const queryString = new URLSearchParams(sortedParams).toString();
    const cacheKey = `${keyPrefix}${endpoint}?${queryString}`;

    const refresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    useEffect(() => {
        if (!enabled) return;

        const fetchData = async () => {
            // 1. Try to load from cache
            const cached = localStorage.getItem(cacheKey);
            let hasCache = false;
            
            // Only use cache if this is the first load (loading is true) or we want to show stale data
            // Usually we want to show cache immediately.
            
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    const now = Date.now();
                    // Check TTL
                    if (!parsed.timestamp || (now - parsed.timestamp) < ttl) {
                         setData(parsed.data);
                         if (parsed.pagination) setPagination(parsed.pagination);
                         // If we found cache, we can stop "loading" indicator for the user
                         // but we still want to fetch fresh data.
                         // However, if we set loading=false, we must ensure we don't flicker back to true.
                         setLoading(false); 
                         hasCache = true;
                    }
                } catch (e) {
                    console.warn('Cache parse error', e);
                    localStorage.removeItem(cacheKey);
                }
            }

            if (!hasCache) {
                setLoading(true);
            }

            // 2. Network request (Stale-while-revalidate)
            try {
                const res = await api.get(endpoint, { params: sortedParams });
                
                // Support both standard envelope { data: [...], pagination: {...} } and direct array
                const newData = res.data.data !== undefined ? res.data.data : res.data; 
                const newPagination = res.data.pagination || {};

                // Only update if data actually changed (deep compare is expensive, so we just set it)
                // React handles reference equality.
                
                setData(newData);
                setPagination(newPagination);
                setError(null);

                // Save to cache
                const cachePayload = {
                    data: newData,
                    pagination: newPagination,
                    timestamp: Date.now()
                };
                localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
            } catch (err) {
                console.error(`Fetch error for ${endpoint}`, err);
                if (!hasCache) {
                    setError(err);
                    // If we have cache, we keep showing it, maybe show a toast in UI if needed?
                    // For now, we just set error state, consumer can decide.
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [endpoint, queryString, refreshKey, enabled, ...dependencies]);

    return { data, pagination, loading, error, setData, refresh };
};
