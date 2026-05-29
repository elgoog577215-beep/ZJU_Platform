import { useEffect, useState } from "react";
import api from "../services/api";

const categoryCache = {
  public: null,
  admin: null,
};

const useMediaCategories = ({ admin = false, enabled = true } = {}) => {
  const cacheKey = admin ? "admin" : "public";
  const endpoint = admin ? "/admin/media-categories" : "/media-categories";
  const [categories, setCategories] = useState(categoryCache[cacheKey] || []);
  const [loading, setLoading] = useState(enabled && !categoryCache[cacheKey]);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const abortController = new AbortController();
    setLoading(!categoryCache[cacheKey]);
    setError(null);

    api
      .get(endpoint, { signal: abortController.signal })
      .then((response) => {
        if (abortController.signal.aborted) return;
        const nextCategories = Array.isArray(response.data) ? response.data : [];
        categoryCache[cacheKey] = nextCategories;
        setCategories(nextCategories);
      })
      .catch((err) => {
        if (abortController.signal.aborted) return;
        setError(err);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => abortController.abort();
  }, [cacheKey, enabled, endpoint, refreshKey]);

  const refresh = ({ clearCache = true } = {}) => {
    if (clearCache) {
      categoryCache[cacheKey] = null;
      if (admin) categoryCache.public = null;
    }
    setRefreshKey((prev) => prev + 1);
  };

  return { categories, loading, error, refresh };
};

export default useMediaCategories;
