import { useState, useEffect, useMemo, useCallback } from 'react';
import api, { isCanceledRequest } from '../services/api';

const memoryCache = new Map();
const inflightRequests = new Map();

const buildRequestKey = (keyPrefix, endpoint, params = {}) => {
    const sortedParams = Object.keys(params).sort().reduce((acc, key) => {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
        }
        return acc;
    }, {});

    const queryString = new URLSearchParams(sortedParams).toString();
    const cacheKey = `${keyPrefix}${endpoint}?${queryString}`;
    return { cacheKey, queryString };
};

const readStoredCache = (cacheKey) => {
    const memoryValue = memoryCache.get(cacheKey);
    if (memoryValue) return memoryValue;

    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    try {
        const parsed = JSON.parse(cached);
        memoryCache.set(cacheKey, parsed);
        return parsed;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('Cache parse error', error);
        }
        localStorage.removeItem(cacheKey);
        memoryCache.delete(cacheKey);
        return null;
    }
};

const persistCache = (cacheKey, payload) => {
    memoryCache.set(cacheKey, payload);
    setTimeout(() => {
        try {
            localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.warn('Failed to save to cache', error);
            }
        }
    }, 0);
};

// FIX: BUG-09 — Accept signal option for AbortController support
const fetchAndCacheResource = async (endpoint, requestParams, cacheKey, requestOptions = {}) => {
    const existingRequest = inflightRequests.get(cacheKey);
    if (existingRequest) return existingRequest;

    const requestPromise = api.get(endpoint, { params: requestParams, signal: requestOptions.signal, ...requestOptions }).then((res) => {
        const newData = res.data.data !== undefined ? res.data.data : res.data;
        const newPagination = res.data.pagination || {};
        const payload = {
            data: newData,
            pagination: newPagination,
            timestamp: Date.now()
        };
        persistCache(cacheKey, payload);
        return payload;
    }).finally(() => {
        inflightRequests.delete(cacheKey);
    });

    inflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
};

export const prefetchCachedResource = async (endpoint, params = {}, options = {}) => {
    const { keyPrefix = 'cache:', ttl = 24 * 60 * 60 * 1000, silent = false } = options;
    const { cacheKey, queryString } = buildRequestKey(keyPrefix, endpoint, params);
    const cached = readStoredCache(cacheKey);

    if (cached && Date.now() - cached.timestamp < ttl) {
        return cached;
    }

    const requestParams = Object.fromEntries(new URLSearchParams(queryString));
    return fetchAndCacheResource(endpoint, requestParams, cacheKey, { silent });
};

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
        dependencies = [], // Extra dependencies to trigger refresh
        silent = false
    } = options;

    const [data, setData] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const { cacheKey, queryString } = useMemo(() => buildRequestKey(keyPrefix, endpoint, params), [keyPrefix, endpoint, params]);

    const dependenciesKey = useMemo(() => {
        try {
            return JSON.stringify(dependencies);
        } catch {
            return String(dependencies?.length ?? 0);
        }
    }, [dependencies]);

    const refresh = useCallback((opts) => {
        const shouldClearCache = opts === true || opts?.clearCache === true;
        if (shouldClearCache) {
            localStorage.removeItem(cacheKey);
            memoryCache.delete(cacheKey);
        }
        setRefreshKey((prev) => prev + 1);
    }, [cacheKey]);

    // FIX: BUG-09 — Add AbortController to cancel stale requests and prevent setState after unmount
    useEffect(() => {
        if (!enabled) return;

        const abortController = new AbortController();

        const fetchData = async () => {
            const now = Date.now();
            const cached = readStoredCache(cacheKey);
            let hasCache = false;
            let isFreshCache = false;

            if (cached) {
                if (cached.data !== undefined) {
                    setData(cached.data);
                    if (cached.pagination) setPagination(cached.pagination);
                    setLoading(false);
                    hasCache = true;
                    isFreshCache = now - (cached.timestamp || 0) < ttl;
                }
            }

            if (!hasCache) {
                setLoading(true);
            }

            if (isFreshCache && refreshKey === 0) {
                setError(null);
                return;
            }

            try {
                const requestParams = Object.fromEntries(new URLSearchParams(queryString));
                const payload = await fetchAndCacheResource(endpoint, requestParams, cacheKey, { silent, signal: abortController.signal });
                if (!abortController.signal.aborted) {
                    setData(payload.data);
                    setPagination(payload.pagination || {});
                    setError(null);
                }
            } catch (err) {
                if (abortController.signal.aborted || isCanceledRequest(err)) return;
                if (!silent && process.env.NODE_ENV === 'development') {
                    console.error(`Fetch error for ${endpoint}`, err);
                }
                if (!hasCache) {
                    setError(err);
                }
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => abortController.abort();
    }, [enabled, cacheKey, endpoint, queryString, refreshKey, ttl, dependenciesKey, silent]);

    return { data, pagination, loading, error, setData, refresh };
};
