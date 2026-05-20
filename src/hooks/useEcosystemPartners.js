import { useEffect, useMemo } from "react";

import { useCachedResource } from "./useCachedResource";
import {
  chunkPartners,
  defaultEcosystemPartners,
  getPartnersByCategory,
  groupEcosystemPartners,
  normalizeEcosystemPartner,
  sortEcosystemPartners,
  toLegacyLogo,
} from "../data/partnerLogos";

export const ECOSYSTEM_PARTNERS_UPDATED_EVENT = "ecosystem-partners:updated";
const ECOSYSTEM_PARTNERS_CACHE_PREFIX = "ecosystem-partners:v1:";

export const clearEcosystemPartnersCache = () => {
  if (typeof window === "undefined") return;
  try {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(ECOSYSTEM_PARTNERS_CACHE_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Cache invalidation is a convenience; failed storage access should not block saving.
  }
};

export const notifyEcosystemPartnersUpdated = () => {
  if (typeof window === "undefined") return;
  clearEcosystemPartnersCache();
  window.dispatchEvent(new Event(ECOSYSTEM_PARTNERS_UPDATED_EVENT));
};

const normalizePartnerList = (data, shouldUseFallback) => {
  if (!Array.isArray(data) || shouldUseFallback) {
    return defaultEcosystemPartners;
  }
  return sortEcosystemPartners(data.map(normalizeEcosystemPartner));
};

export const useEcosystemPartners = () => {
  const { data, loading, error, refresh } = useCachedResource(
    "/ecosystem-partners",
    {},
    {
      keyPrefix: "ecosystem-partners:v1:",
      ttl: 5 * 60 * 1000,
      silent: true,
    },
  );

  const shouldUseFallback =
    Boolean(error) || (loading && (!Array.isArray(data) || data.length === 0));
  const partners = useMemo(
    () => normalizePartnerList(data, shouldUseFallback),
    [data, shouldUseFallback],
  );
  const groups = useMemo(() => groupEcosystemPartners(partners), [partners]);
  const schoolPartners = useMemo(
    () => getPartnersByCategory(partners, "school"),
    [partners],
  );
  const organizationPartners = useMemo(
    () => getPartnersByCategory(partners, "organization"),
    [partners],
  );
  const enterprisePartners = useMemo(
    () => getPartnersByCategory(partners, "enterprise"),
    [partners],
  );
  const enterpriseLogos = useMemo(
    () => enterprisePartners.map(toLegacyLogo),
    [enterprisePartners],
  );
  const enterpriseLogoRows = useMemo(
    () => chunkPartners(enterpriseLogos, 3),
    [enterpriseLogos],
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePartnersUpdated = () => refresh({ clearCache: true });
    const handleStorage = (event) => {
      if (!event.key || event.key.startsWith(ECOSYSTEM_PARTNERS_CACHE_PREFIX)) {
        refresh({ clearCache: true });
      }
    };
    window.addEventListener(ECOSYSTEM_PARTNERS_UPDATED_EVENT, handlePartnersUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(ECOSYSTEM_PARTNERS_UPDATED_EVENT, handlePartnersUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refresh]);

  return {
    partners,
    groups,
    schoolPartners,
    organizationPartners,
    enterprisePartners,
    enterpriseLogos,
    enterpriseLogoRows,
    loading,
    error,
    refresh,
  };
};
