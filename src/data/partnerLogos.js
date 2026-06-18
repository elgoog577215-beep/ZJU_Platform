export const ECOSYSTEM_PARTNER_CATEGORIES = [
  { id: "school", label: "学校支持", shortLabel: "学校", code: "School Support" },
  { id: "organization", label: "社团协作", shortLabel: "社团", code: "Campus Force" },
  { id: "enterprise", label: "企业生态", shortLabel: "企业", code: "Enterprise Partners" },
];

const organizationLogoBase = "/images/partner-logos/organizations";

export const ORGANIZATION_PARTNER_LOGOS = {
  XLAB: `${organizationLogoBase}/xlab.svg`,
  ZJUAI: `${organizationLogoBase}/zjuai.svg`,
  EAI: `${organizationLogoBase}/eai.svg`,
  AIRA: `${organizationLogoBase}/aira.svg`,
  KAB: `${organizationLogoBase}/kab.svg`,
  浙江大学本科生院: `${organizationLogoBase}/undergraduate-school.svg`,
  浙江大学艺术与考古博物馆: `${organizationLogoBase}/museum-art-archaeology.svg`,
  浙江大学星辰汇: `${organizationLogoBase}/xingchenhui.svg`,
  浙大出国交流资讯: `${organizationLogoBase}/global-exchange-info.svg`,
  "浙江大学 CC98 论坛": `${organizationLogoBase}/cc98.svg`,
  浙江大学红十字会: `${organizationLogoBase}/red-cross.svg`,
  浙江大学图书馆: `${organizationLogoBase}/library.svg`,
  浙大体育与艺术: `${organizationLogoBase}/sports-arts.svg`,
  浙大生活: `${organizationLogoBase}/zju-life.svg`,
  浙江大学学生会: `${organizationLogoBase}/student-union.svg`,
  浙江大学求是学院: `${organizationLogoBase}/qiushi-college.svg`,
  浙江大学团委: `${organizationLogoBase}/youth-league.svg`,
  "浙大素拓 ZJUST": `${organizationLogoBase}/zjust.svg`,
  浙大微学工: `${organizationLogoBase}/student-affairs.svg`,
  蓝田学园: `${organizationLogoBase}/lantian-college.svg`,
  蓝田青年: `${organizationLogoBase}/lantian-youth.svg`,
  求是学院丹阳青溪学园: `${organizationLogoBase}/danyang-qingxi-college.svg`,
  云峰微讯: `${organizationLogoBase}/yunfeng-news.svg`,
  浙大竺院人: `${organizationLogoBase}/chu-kochen-college.svg`,
};

const withOrganizationLogo = (partner) => {
  const logoUrl = ORGANIZATION_PARTNER_LOGOS[partner.name];
  if (!logoUrl) return partner;
  return {
    ...partner,
    logo_url: partner.logo_url || logoUrl,
    dark_logo_url: partner.dark_logo_url || logoUrl,
  };
};

export const defaultEcosystemPartners = [
  {
    id: "default-school-future-learning",
    profile_handle: "partner-1",
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
    profile_handle: "partner-2",
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
    profile_handle: "partner-3",
    category: "organization",
    name: "XLAB",
    name_en: "XLAB",
    description: "协同选手招募、志愿执行与赛后社群承接。",
    description_en: "Supports participant recruitment, volunteer coordination, and post-event community operations.",
    cooperation_direction: "活动组织 / 社群承接",
    cooperation_direction_en: "Event organization / Community operations",
    event_organizer_aliases: ["XLAB"],
    sort_order: 10,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-zjuai",
    profile_handle: "partner-4",
    category: "organization",
    name: "ZJUAI",
    name_en: "ZJUAI",
    description: "协同校园 AI 学习者与开发者社群连接。",
    description_en: "Connects campus AI learners and developer communities.",
    cooperation_direction: "AI 社群 / 开发者连接",
    cooperation_direction_en: "AI community / Developer connection",
    event_organizer_aliases: ["ZJUAI"],
    sort_order: 20,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-eai",
    profile_handle: "partner-5",
    category: "organization",
    name: "EAI",
    name_en: "EAI",
    description: "协同活动运营、现场执行与实践人群组织。",
    description_en: "Supports event operations, on-site execution, and practitioner community organization.",
    cooperation_direction: "活动运营 / 现场执行",
    cooperation_direction_en: "Event operations / On-site execution",
    event_organizer_aliases: ["EAI"],
    sort_order: 30,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-aira",
    profile_handle: "partner-6",
    category: "organization",
    name: "AIRA",
    name_en: "AIRA",
    description: "协同 AI 实践社群共建与项目交流。",
    description_en: "Supports AI practice community building and project exchange.",
    cooperation_direction: "AI 实践 / 项目交流",
    cooperation_direction_en: "AI practice / Project exchange",
    event_organizer_aliases: ["AIRA"],
    sort_order: 40,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-kab",
    profile_handle: "partner-7",
    category: "organization",
    name: "KAB",
    name_en: "KAB",
    description: "协同创新创业人群组织与活动承接。",
    description_en: "Supports innovation and entrepreneurship groups, event organization, and campus outreach.",
    cooperation_direction: "创新创业 / 活动承接",
    cooperation_direction_en: "Innovation and entrepreneurship / Event support",
    event_organizer_aliases: ["KAB"],
    sort_order: 50,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-undergraduate-school",
    profile_handle: "partner-14",
    category: "organization",
    name: "浙江大学本科生院",
    name_en: "ZJU Undergraduate School",
    description: "协同发布本科生培养、报名与校园成长相关活动信息。",
    description_en: "Supports undergraduate-facing activity distribution and student development opportunities.",
    cooperation_direction: "活动联动 / 信息触达",
    cooperation_direction_en: "Event coordination / Student reach",
    event_organizer_aliases: ["浙江大学本科生院", "本科生院"],
    sort_order: 110,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-museum-art-archaeology",
    profile_handle: "partner-15",
    category: "organization",
    name: "浙江大学艺术与考古博物馆",
    name_en: "ZJU Museum of Art and Archaeology",
    description: "协同文化艺术、展览导览与博物馆教育活动触达。",
    description_en: "Supports cultural, exhibition, museum education, and guided activity outreach.",
    cooperation_direction: "文化艺术 / 展览共创",
    cooperation_direction_en: "Arts and culture / Exhibition co-creation",
    event_organizer_aliases: ["浙江大学艺术与考古博物馆", "艺术与考古博物馆"],
    sort_order: 120,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-xingchenhui",
    profile_handle: "partner-16",
    category: "organization",
    name: "浙江大学星辰汇",
    name_en: "ZJU Xingchenhui",
    description: "协同校园活动传播、青年成长与社群参与。",
    description_en: "Supports campus activity communication, youth development, and community participation.",
    cooperation_direction: "社群传播 / 青年成长",
    cooperation_direction_en: "Community communication / Youth development",
    event_organizer_aliases: ["浙江大学星辰汇", "星辰汇"],
    sort_order: 130,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-global-exchange-info",
    profile_handle: "partner-17",
    category: "organization",
    name: "浙大出国交流资讯",
    name_en: "ZJU Global Exchange Info",
    description: "协同出国交流、国际项目与留学相关信息触达。",
    description_en: "Supports global exchange, international program, and study-abroad information outreach.",
    cooperation_direction: "国际交流 / 信息服务",
    cooperation_direction_en: "Global exchange / Information service",
    event_organizer_aliases: ["浙大出国交流资讯", "出国交流资讯"],
    sort_order: 140,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-cc98",
    profile_handle: "partner-18",
    category: "organization",
    name: "浙江大学 CC98 论坛",
    name_en: "ZJU CC98 Forum",
    description: "协同校园社区讨论、活动扩散与学生信息互助。",
    description_en: "Supports campus forum discussion, activity distribution, and peer information exchange.",
    cooperation_direction: "社区扩散 / 学生互助",
    cooperation_direction_en: "Community distribution / Student support",
    event_organizer_aliases: ["浙江大学 CC98 论坛", "CC98", "浙江大学CC98论坛"],
    sort_order: 150,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-red-cross",
    profile_handle: "partner-19",
    category: "organization",
    name: "浙江大学红十字会",
    name_en: "ZJU Red Cross",
    description: "协同公益实践、志愿服务与健康安全相关活动。",
    description_en: "Supports public service, volunteering, health, and safety activities.",
    cooperation_direction: "公益实践 / 志愿服务",
    cooperation_direction_en: "Public service / Volunteering",
    event_organizer_aliases: ["浙江大学红十字会", "红十字会"],
    sort_order: 160,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-library",
    profile_handle: "partner-20",
    category: "organization",
    name: "浙江大学图书馆",
    name_en: "ZJU Library",
    description: "协同信息素养、阅读推广与学习资源相关活动。",
    description_en: "Supports information literacy, reading promotion, and learning resource activities.",
    cooperation_direction: "学习资源 / 信息素养",
    cooperation_direction_en: "Learning resources / Information literacy",
    event_organizer_aliases: ["浙江大学图书馆", "图书馆"],
    sort_order: 170,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-sports-arts",
    profile_handle: "partner-21",
    category: "organization",
    name: "浙大体育与艺术",
    name_en: "ZJU Sports and Arts",
    description: "协同体育艺术、校园美育与综合素质活动传播。",
    description_en: "Supports sports, arts, aesthetic education, and holistic development activities.",
    cooperation_direction: "体育艺术 / 素质拓展",
    cooperation_direction_en: "Sports and arts / Holistic development",
    event_organizer_aliases: ["浙大体育与艺术", "体育与艺术"],
    sort_order: 180,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-zju-life",
    profile_handle: "partner-22",
    category: "organization",
    name: "浙大生活",
    name_en: "ZJU Life",
    description: "协同校园生活服务、学生资讯与活动提醒。",
    description_en: "Supports campus life services, student information, and activity reminders.",
    cooperation_direction: "校园生活 / 信息触达",
    cooperation_direction_en: "Campus life / Information outreach",
    event_organizer_aliases: ["浙大生活"],
    sort_order: 190,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-student-union",
    profile_handle: "partner-23",
    category: "organization",
    name: "浙江大学学生会",
    name_en: "ZJU Student Union",
    description: "协同学生权益、校园活动与组织动员。",
    description_en: "Supports student affairs, campus events, and student mobilization.",
    cooperation_direction: "学生组织 / 活动执行",
    cooperation_direction_en: "Student organization / Event execution",
    event_organizer_aliases: ["浙江大学学生会", "学生会"],
    sort_order: 200,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-qiushi-college",
    profile_handle: "partner-24",
    category: "organization",
    name: "浙江大学求是学院",
    name_en: "ZJU Qiushi College",
    description: "协同书院育人、学业发展与校园活动触达。",
    description_en: "Supports college education, academic development, and campus activity outreach.",
    cooperation_direction: "书院协同 / 学生成长",
    cooperation_direction_en: "College coordination / Student growth",
    event_organizer_aliases: ["浙江大学求是学院", "求是学院"],
    sort_order: 210,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-youth-league",
    profile_handle: "partner-25",
    category: "organization",
    name: "浙江大学团委",
    name_en: "ZJU Youth League Committee",
    description: "协同团学活动、青年发展与志愿实践信息。",
    description_en: "Supports youth league activities, youth development, and volunteer practice information.",
    cooperation_direction: "团学活动 / 青年发展",
    cooperation_direction_en: "Youth league activities / Youth development",
    event_organizer_aliases: ["浙江大学团委", "团委"],
    sort_order: 220,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-zjust",
    profile_handle: "partner-26",
    category: "organization",
    name: "浙大素拓 ZJUST",
    name_en: "ZJUST",
    description: "协同素质拓展、第二课堂与综合成长活动触达。",
    description_en: "Supports holistic development, second-classroom, and growth activities.",
    cooperation_direction: "素质拓展 / 第二课堂",
    cooperation_direction_en: "Holistic development / Second classroom",
    event_organizer_aliases: ["浙大素拓 ZJUST", "ZJUST", "浙大素拓"],
    sort_order: 230,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-student-affairs",
    profile_handle: "partner-27",
    category: "organization",
    name: "浙大微学工",
    name_en: "ZJU Student Affairs",
    description: "协同学工资讯、学生服务与校园通知触达。",
    description_en: "Supports student affairs information, services, and campus notices.",
    cooperation_direction: "学工资讯 / 学生服务",
    cooperation_direction_en: "Student affairs / Student services",
    event_organizer_aliases: ["浙大微学工", "微学工"],
    sort_order: 240,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-lantian-college",
    profile_handle: "partner-28",
    category: "organization",
    name: "蓝田学园",
    name_en: "Lantian College",
    description: "协同学园育人、学生发展与活动信息触达。",
    description_en: "Supports college community development, student growth, and activity outreach.",
    cooperation_direction: "学园协同 / 学生成长",
    cooperation_direction_en: "College coordination / Student growth",
    event_organizer_aliases: ["蓝田学园"],
    sort_order: 250,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-lantian-youth",
    profile_handle: "partner-29",
    category: "organization",
    name: "蓝田青年",
    name_en: "Lantian Youth",
    description: "协同蓝田学园青年活动、志愿实践与信息传播。",
    description_en: "Supports Lantian youth activities, volunteer practice, and information distribution.",
    cooperation_direction: "青年活动 / 志愿实践",
    cooperation_direction_en: "Youth activities / Volunteer practice",
    event_organizer_aliases: ["蓝田青年"],
    sort_order: 260,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-danyang-qingxi-college",
    profile_handle: "partner-30",
    category: "organization",
    name: "求是学院丹阳青溪学园",
    name_en: "Danyang Qingxi College",
    description: "协同学园社区、书院活动与学生成长信息。",
    description_en: "Supports college community activities and student development information.",
    cooperation_direction: "学园社区 / 活动共创",
    cooperation_direction_en: "College community / Activity co-creation",
    event_organizer_aliases: ["求是学院丹阳青溪学园", "丹阳青溪学园"],
    sort_order: 270,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-yunfeng-news",
    profile_handle: "partner-31",
    category: "organization",
    name: "云峰微讯",
    name_en: "Yunfeng News",
    description: "协同学园资讯、校园活动与学生服务传播。",
    description_en: "Supports college information, campus activities, and student service communication.",
    cooperation_direction: "学园资讯 / 活动传播",
    cooperation_direction_en: "College news / Activity communication",
    event_organizer_aliases: ["云峰微讯"],
    sort_order: 280,
    enabled: true,
    featured: true,
  },
  {
    id: "default-org-chu-kochen-college",
    profile_handle: "partner-32",
    category: "organization",
    name: "浙大竺院人",
    name_en: "ZJU Chu Kochen College",
    description: "协同竺院资讯、荣誉教育与学生发展活动。",
    description_en: "Supports Chu Kochen College information, honors education, and student development activities.",
    cooperation_direction: "荣誉教育 / 学生成长",
    cooperation_direction_en: "Honors education / Student growth",
    event_organizer_aliases: ["浙大竺院人", "竺院人", "竺可桢学院"],
    sort_order: 290,
    enabled: true,
    featured: true,
  },
  {
    id: "default-enterprise-minimax",
    profile_handle: "partner-8",
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
    profile_handle: "partner-9",
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
    profile_handle: "partner-10",
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
    profile_handle: "partner-11",
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
    profile_handle: "partner-12",
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
    profile_handle: "partner-13",
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
].map(withOrganizationLogo);

const categoryOrder = new Map(
  ECOSYSTEM_PARTNER_CATEGORIES.map((category, index) => [category.id, index]),
);

export const normalizeEcosystemPartner = (partner = {}) => ({
  ...partner,
  id: partner.id ?? `${partner.category || "partner"}-${partner.name || Math.random()}`,
  category: partner.category || "enterprise",
  name: partner.name || "",
  name_en: partner.name_en || partner.nameEn || "",
  description: partner.description || "",
  description_en: partner.description_en || partner.descriptionEn || "",
  cooperation_direction:
    partner.cooperation_direction || partner.cooperationDirection || "",
  cooperation_direction_en:
    partner.cooperation_direction_en || partner.cooperationDirectionEn || "",
  event_organizer_aliases: Array.isArray(partner.event_organizer_aliases)
    ? partner.event_organizer_aliases
    : Array.isArray(partner.eventOrganizerAliases)
      ? partner.eventOrganizerAliases
      : [],
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

export const getPartnerProfilePath = (partner = {}) => {
  const explicitHandle = partner.profile_handle || partner.profileHandle || partner.handle;
  const fallbackHandle = /^\d+$/.test(String(partner.id || ""))
    ? `partner-${partner.id}`
    : "";
  const handle = explicitHandle || fallbackHandle;
  return handle ? `/org/${handle}` : "";
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
