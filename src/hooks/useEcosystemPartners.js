import { useMemo } from "react";

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

const normalizePartnerList = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
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

  const partners = useMemo(() => normalizePartnerList(data), [data]);
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
