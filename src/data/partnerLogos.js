export const ECOSYSTEM_PARTNER_CATEGORIES = [
  { id: "school", label: "学校支持", shortLabel: "学校", code: "School Support" },
  { id: "organization", label: "社团协作", shortLabel: "社团", code: "Campus Force" },
  { id: "enterprise", label: "企业生态", shortLabel: "企业", code: "Enterprise Partners" },
];

export const defaultEcosystemPartners = [
  {
    id: "default-school-future-learning",
    category: "school",
    name: "未来学习中心",
    name_en: "Future Learning Center",
    description: "提供场景、空间、组织协同与长期机制支持。",
    sort_order: 10,
    enabled: true,
    featured: true,
  },
  {
    id: "default-school-ai-lab",
    category: "school",
    name: "AI 联合实验室",
    name_en: "AI Joint Lab",
    description: "提供校内 AI 实践与联合探索支持。",
    sort_order: 20,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-xlab",
    category: "organization",
    name: "XLAB",
    description: "协同选手招募、志愿执行与赛后社群承接。",
    sort_order: 10,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-zjuai",
    category: "organization",
    name: "ZJUAI",
    description: "协同校园 AI 学习者与开发者社群连接。",
    sort_order: 20,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-eai",
    category: "organization",
    name: "EAI",
    description: "协同活动运营、现场执行与实践人群组织。",
    sort_order: 30,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-aira",
    category: "organization",
    name: "AIRA",
    description: "协同 AI 实践社群共建与项目交流。",
    sort_order: 40,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-kab",
    category: "organization",
    name: "KAB",
    description: "协同创新创业人群组织与活动承接。",
    sort_order: 50,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-minimax",
    category: "enterprise",
    name: "MiniMax",
    description: "提供模型能力、技术资源与生态支持。",
    logo_url: "/images/partner-logos/minimax.png",
    dark_logo_url: "/images/partner-logos/minimax-dark.png",
    sort_order: 10,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-modelscope",
    category: "enterprise",
    name: "ModelScope 魔搭社区",
    name_en: "ModelScope",
    description: "提供模型社区、技术资源与开发者生态支持。",
    logo_url: "/images/partner-logos/modelscope.png",
    dark_logo_url: "/images/partner-logos/modelscope-dark.png",
    sort_order: 20,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-bonjour",
    category: "enterprise",
    name: "Bonjour",
    description: "提供数字名片与合作传播支持。",
    logo_url: "/images/partner-logos/company-3.png",
    dark_logo_url: "/images/partner-logos/company-3-dark.png",
    darkClassName: "brightness-0 invert",
    sort_order: 30,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-aliyun",
    category: "enterprise",
    name: "阿里云",
    name_en: "Alibaba Cloud",
    description: "提供云资源与技术基础设施支持。",
    logo_url: "/images/partner-logos/aliyun-cn.svg?v=2",
    dark_logo_url: "/images/partner-logos/aliyun-cn-white.svg?v=2",
    size: "h-5 sm:h-6 lg:h-7",
    sort_order: 40,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-qoder",
    category: "enterprise",
    name: "Qoder",
    description: "提供 AI 开发工具与工程实践支持。",
    logo_url: "/images/partner-logos/qoder.png",
    dark_logo_url: "/images/partner-logos/qoder-dark.png",
    text: "Qoder",
    size: "h-5 sm:h-6 lg:h-7",
    sort_order: 50,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-stepfun",
    category: "enterprise",
    name: "阶跃 StepFun",
    name_en: "StepFun",
    description: "提供模型、平台与技术生态支持。",
    logo_url: "/images/partner-logos/stepfun.png",
    dark_logo_url: "/images/partner-logos/stepfun-white.png",
    sort_order: 60,
    enabled: true,
    featured: true,
  },
];

const categoryOrder = new Map(
  ECOSYSTEM_PARTNER_CATEGORIES.map((category, index) => [category.id, index]),
);

export const normalizeEcosystemPartner = (partner = {}) => ({
  ...partner,
  id: partner.id ?? `${partner.category || "partner"}-${partner.name || Math.random()}`,
  category: partner.category || "enterprise",
  name: partner.name || "",
  description: partner.description || "",
  logo_url: partner.logo_url || partner.logoUrl || partner.src || "",
  dark_logo_url: partner.dark_logo_url || partner.darkLogoUrl || partner.darkSrc || "",
  link_url: partner.link_url || partner.linkUrl || "",
  sort_order: Number.parseInt(partner.sort_order ?? partner.sortOrder ?? 0, 10) || 0,
  enabled: partner.enabled !== false,
  featured: partner.featured !== false,
});

export const sortEcosystemPartners = (partners = []) =>
  [...partners].sort((left, right) => {
    const categoryDiff =
      (categoryOrder.get(left.category) ?? 99) - (categoryOrder.get(right.category) ?? 99);
    if (categoryDiff !== 0) return categoryDiff;
    const orderDiff = (left.sort_order || 0) - (right.sort_order || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(left.name || "").localeCompare(String(right.name || ""), "zh-CN");
  });

export const getPartnersByCategory = (partners = [], category) =>
  sortEcosystemPartners(partners.map(normalizeEcosystemPartner)).filter(
    (partner) => partner.category === category && partner.enabled && partner.featured,
  );

export const groupEcosystemPartners = (partners = []) => {
  const normalized = sortEcosystemPartners(
    partners.map(normalizeEcosystemPartner).filter((partner) => partner.enabled && partner.featured),
  );
  return ECOSYSTEM_PARTNER_CATEGORIES.map((category) => ({
    ...category,
    partners: normalized.filter((partner) => partner.category === category.id),
  }));
};

export const getPartnerDisplayName = (partner = {}) => {
  if (partner.text) return partner.text;
  if (partner.name) return partner.name;
  return String(partner.alt || "").replace(/\s*logo$/i, "").trim() || "合作方";
};

export const getPartnerLogoSrc = (partner = {}, isDayMode = true) => {
  const lightLogo = partner.logo_url || partner.logoUrl || partner.src || "";
  const darkLogo = partner.dark_logo_url || partner.darkLogoUrl || partner.darkSrc || "";
  return isDayMode ? lightLogo || darkLogo : darkLogo || lightLogo;
};

export const toLegacyLogo = (partner = {}) => ({
  ...partner,
  src: partner.logo_url || partner.src || "",
  darkSrc: partner.dark_logo_url || partner.darkSrc || partner.logo_url || partner.src || "",
  alt: partner.alt || `${partner.name || "合作方"} logo`,
  text:
    partner.text ||
    (String(partner.name || "").trim().toLowerCase() === "qoder" ? "Qoder" : ""),
  size: partner.size,
  darkClassName: partner.darkClassName,
});

export const chunkPartners = (partners = [], size = 3) => {
  const chunks = [];
  for (let index = 0; index < partners.length; index += size) {
    chunks.push(partners.slice(index, index + size));
  }
  return chunks;
};

export const defaultEnterprisePartners = getPartnersByCategory(
  defaultEcosystemPartners,
  "enterprise",
);

export const hackathonPartnerLogos = defaultEnterprisePartners.map(toLegacyLogo);

export const hackathonPartnerLogoRows = chunkPartners(hackathonPartnerLogos, 3);
