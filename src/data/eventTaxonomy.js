export const EVENT_CATEGORIES = [
  { value: "lecture", label: "讲座" },
  { value: "competition", label: "竞赛" },
  { value: "volunteer", label: "志愿" },
  { value: "recruitment", label: "招新" },
  { value: "culture_sports", label: "文体" },
  { value: "exchange", label: "交流" },
  { value: "other", label: "其他" },
];

export const EVENT_CATEGORY_ALIASES = {
  lecture: [
    "academic_research",
    "学术科研",
    "学术讲座",
    "学术报告",
    "讲座",
    "报告",
    "论坛",
    "分享会",
    "宣讲会",
    "论文分享",
    "科研训练",
    "读书会",
  ],
  competition: [
    "competition_project",
    "竞赛项目",
    "竞赛",
    "比赛",
    "挑战杯",
    "黑客松",
    "训练营",
    "路演",
    "成果展示",
  ],
  volunteer: [
    "public_service",
    "公益实践",
    "志愿服务",
    "志愿活动",
    "志愿",
    "公益",
    "社会实践",
    "社区服务",
    "支教",
    "助老",
  ],
  recruitment: [
    "career_development",
    "职业发展",
    "club_organization",
    "社团组织",
    "招新",
    "招募",
    "项目招募",
    "团队招募",
    "社团招新",
    "学生组织招新",
    "部门招新",
    "招聘",
    "实习招聘",
  ],
  culture_sports: [
    "文体美育",
    "文体活动",
    "演出",
    "展览",
    "体育",
    "美育",
    "艺术",
    "文化节",
    "音乐会",
    "电影放映",
  ],
  exchange: [
    "international_exchange",
    "国际交流",
    "交流",
    "校友交流",
    "企业交流",
    "跨校交流",
    "留学",
    "交换",
    "访学",
    "海外",
    "外事",
  ],
  other: [
    "tech_innovation",
    "技术创新",
    "campus_life",
    "校园生活",
    "社团",
    "学生组织",
    "班团活动",
    "社群",
    "AI",
    "人工智能",
    "技术",
    "编程",
    "工作坊",
    "产品",
    "开源",
    "校园服务",
    "生活服务",
    "市集",
    "新生",
  ],
};

export const normalizeEventCategoryValue = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  const directMatch = EVENT_CATEGORIES.find(
    (item) => item.value === normalized || item.label === normalized,
  );
  if (directMatch) return directMatch.value;

  const aliasMatch = Object.entries(EVENT_CATEGORY_ALIASES).find(
    ([, aliases]) =>
      aliases.some(
        (alias) => normalized === alias || normalized.includes(alias),
      ),
  );

  return aliasMatch?.[0] || "";
};

export const EVENT_AUDIENCE_GROUPS = [
  {
    group: "学园与特殊培养单位",
    items: [
      "全校",
      "求是学院",
      "丹青学园",
      "云峰学园",
      "蓝田学园",
      "竺可桢学院",
      "工程师学院",
      "国际联合学院",
      "国际教育学院",
    ],
  },
  {
    group: "人文与社科",
    items: [
      "文学院",
      "历史学院",
      "哲学学院",
      "外国语学院",
      "传媒与国际文化学院",
      "艺术与考古学院",
      "经济学院",
      "光华法学院",
      "教育学院",
      "管理学院",
      "公共管理学院",
      "马克思主义学院",
    ],
  },
  {
    group: "理学与工学",
    items: [
      "数学科学学院",
      "物理学院",
      "化学系",
      "地球科学学院",
      "心理与行为科学系",
      "机械工程学院",
      "材料科学与工程学院",
      "能源工程学院",
      "电气工程学院",
      "建筑工程学院",
      "化学工程与生物工程学院",
      "海洋学院",
      "航空航天学院",
      "高分子科学与工程学系",
    ],
  },
  {
    group: "信息学部",
    items: [
      "光电科学与工程学院",
      "信息与电子工程学院",
      "控制科学与工程学院",
      "计算机科学与技术学院",
      "软件学院",
      "生物医学工程与仪器科学学院",
      "集成电路学院",
    ],
  },
  {
    group: "农生环与医学",
    items: [
      "生命科学学院",
      "生物系统工程与食品科学学院",
      "环境与资源学院",
      "农业与生物技术学院",
      "动物科学学院",
      "医学院",
      "药学院",
    ],
  },
  {
    group: "中外合作办学",
    items: [
      "浙江大学伊利诺伊大学厄巴纳香槟校区联合学院",
      "浙江大学爱丁堡大学联合学院",
    ],
  },
];

export const EVENT_AUDIENCE_OPTIONS = EVENT_AUDIENCE_GROUPS.flatMap(
  ({ items }) => items,
);

export const getEventCategoryLabel = (value) =>
  EVENT_CATEGORIES.find(
    (item) => item.value === normalizeEventCategoryValue(value),
  )?.label ||
  value ||
  "";
