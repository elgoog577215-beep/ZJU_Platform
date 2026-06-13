export const COLLEGE_NOTICE_CATEGORY_VALUE = "college_notice";
export const COLLEGE_NOTICE_TAG = "学院通知";

export const COLLEGE_NOTICE_TYPES = [
  { value: "academic", label: "学业通知" },
  { value: "evaluation", label: "评奖评优" },
  { value: "bonus", label: "加分活动" },
  { value: "volunteer", label: "志愿招募" },
  { value: "lecture", label: "讲座通知" },
  { value: "competition", label: "竞赛通知" },
  { value: "administrative", label: "事务通知" },
  { value: "registration", label: "报名通知" },
  { value: "voting", label: "投票通知" },
  { value: "other", label: "其他通知" },
];

export const COLLEGE_NOTICE_TYPE_LABELS = {
  zh: {
    academic: "学业通知",
    evaluation: "评奖评优",
    bonus: "加分活动",
    volunteer: "志愿招募",
    lecture: "讲座通知",
    competition: "竞赛通知",
    administrative: "事务通知",
    registration: "报名通知",
    voting: "投票通知",
    other: "其他通知",
  },
  en: {
    academic: "Academic Notice",
    evaluation: "Awards & Evaluation",
    bonus: "Bonus Credit",
    volunteer: "Volunteer Recruitment",
    lecture: "Lecture Notice",
    competition: "Competition Notice",
    administrative: "Administrative Notice",
    registration: "Registration Notice",
    voting: "Voting Notice",
    other: "Other Notice",
  },
};

export const EVENT_CATEGORIES = [
  { value: "lecture", label: "讲座" },
  { value: "competition", label: "竞赛" },
  { value: "volunteer", label: "志愿" },
  { value: "recruitment", label: "招新" },
  { value: "culture_sports", label: "文体" },
  { value: "exchange", label: "交流" },
  { value: "other", label: "其他" },
];

export const EVENT_CATEGORY_LABELS = {
  zh: {
    lecture: "讲座",
    competition: "竞赛",
    volunteer: "志愿",
    recruitment: "招新",
    culture_sports: "文体",
    exchange: "交流",
    other: "其他",
    [COLLEGE_NOTICE_CATEGORY_VALUE]: COLLEGE_NOTICE_TAG,
  },
  en: {
    lecture: "Lectures",
    competition: "Competitions",
    volunteer: "Volunteer",
    recruitment: "Recruiting",
    culture_sports: "Culture & Sports",
    exchange: "Exchange",
    other: "Other",
    [COLLEGE_NOTICE_CATEGORY_VALUE]: "College Notices",
  },
};

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

  if (
    normalized === COLLEGE_NOTICE_CATEGORY_VALUE ||
    normalized === COLLEGE_NOTICE_TAG ||
    normalized.toLowerCase() === "college notices"
  ) {
    return COLLEGE_NOTICE_CATEGORY_VALUE;
  }

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
      "人工智能学院",
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

export const EVENT_SOURCE_COLLEGE_OPTIONS = EVENT_AUDIENCE_OPTIONS.filter(
  (item) => item !== "全校",
);

const PRIORITY_SOURCE_COLLEGES = [
  "云峰学园",
  "丹青学园",
  "蓝田学园",
  "紫云碧峰学园",
  "港湾家园",
  "海宁国际校区",
];

const EVENT_SOURCE_COLLEGE_MATCH_OPTIONS = [
  ...PRIORITY_SOURCE_COLLEGES.filter((item) =>
    EVENT_SOURCE_COLLEGE_OPTIONS.includes(item),
  ),
  ...EVENT_SOURCE_COLLEGE_OPTIONS.filter(
    (item) => !PRIORITY_SOURCE_COLLEGES.includes(item),
  ),
];

export const EVENT_AUDIENCE_LABELS_EN = {
  全校: "All Campus",
  求是学院: "Qiushi College",
  丹青学园: "Danqing College",
  云峰学园: "Yunfeng College",
  蓝田学园: "Lantian College",
  竺可桢学院: "Chu Kochen Honors College",
  工程师学院: "Polytechnic Institute",
  国际联合学院: "International Campus",
  国际教育学院: "International College",
  文学院: "School of Chinese Language and Literature",
  历史学院: "School of History",
  哲学学院: "School of Philosophy",
  外国语学院: "School of International Studies",
  传媒与国际文化学院: "College of Media and International Culture",
  艺术与考古学院: "School of Art and Archaeology",
  经济学院: "School of Economics",
  光华法学院: "Guanghua Law School",
  教育学院: "College of Education",
  管理学院: "School of Management",
  公共管理学院: "School of Public Affairs",
  马克思主义学院: "School of Marxism",
  数学科学学院: "School of Mathematical Sciences",
  物理学院: "School of Physics",
  化学系: "Department of Chemistry",
  地球科学学院: "School of Earth Sciences",
  心理与行为科学系: "Department of Psychology and Behavioral Sciences",
  机械工程学院: "School of Mechanical Engineering",
  材料科学与工程学院: "School of Materials Science and Engineering",
  能源工程学院: "College of Energy Engineering",
  电气工程学院: "College of Electrical Engineering",
  建筑工程学院: "College of Civil Engineering and Architecture",
  化学工程与生物工程学院: "College of Chemical and Biological Engineering",
  海洋学院: "Ocean College",
  航空航天学院: "School of Aeronautics and Astronautics",
  高分子科学与工程学系: "Department of Polymer Science and Engineering",
  光电科学与工程学院: "College of Optical Science and Engineering",
  信息与电子工程学院: "College of Information Science and Electronic Engineering",
  控制科学与工程学院: "College of Control Science and Engineering",
  计算机科学与技术学院: "College of Computer Science and Technology",
  人工智能学院: "College of Artificial Intelligence",
  软件学院: "School of Software Technology",
  生物医学工程与仪器科学学院: "College of Biomedical Engineering and Instrument Science",
  集成电路学院: "School of Integrated Circuits",
  生命科学学院: "College of Life Sciences",
  生物系统工程与食品科学学院: "College of Biosystems Engineering and Food Science",
  环境与资源学院: "College of Environmental and Resource Sciences",
  农业与生物技术学院: "College of Agriculture and Biotechnology",
  动物科学学院: "College of Animal Sciences",
  医学院: "School of Medicine",
  药学院: "College of Pharmaceutical Sciences",
  浙江大学伊利诺伊大学厄巴纳香槟校区联合学院: "ZJU-UIUC Institute",
  浙江大学爱丁堡大学联合学院: "ZJU-UoE Institute",
};

export const EVENT_AUDIENCE_GROUP_LABELS_EN = {
  学园与特殊培养单位: "Residential Colleges & Special Programs",
  人文与社科: "Humanities & Social Sciences",
  理学与工学: "Science & Engineering",
  信息学部: "Information Science",
  农生环与医学: "Agriculture, Life, Environment & Medicine",
  中外合作办学: "International Joint Institutes",
};

export const getEventCategoryLabel = (value, language = "zh") => {
  const normalized = normalizeEventCategoryValue(value);
  const lang = String(language || "zh").startsWith("en") ? "en" : "zh";
  return (
    EVENT_CATEGORY_LABELS[lang]?.[normalized] ||
    EVENT_CATEGORIES.find((item) => item.value === normalized)?.label ||
    value ||
    ""
  );
};

export const normalizeCollegeNoticeType = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const direct = COLLEGE_NOTICE_TYPES.find(
    (item) => item.value === normalized || item.label === normalized,
  );
  if (direct) return direct.value;

  if (/保研|推免|课程|学业|培养|考试|选课|教务/.test(normalized)) return "academic";
  if (/评奖|评优|奖学金|荣誉|十佳/.test(normalized)) return "evaluation";
  if (/加分|综测|素质分|二课|第二课堂|第三课堂/.test(normalized)) return "bonus";
  if (/志愿|志愿者|公益|社会实践/.test(normalized)) return "volunteer";
  if (/讲座|报告|论坛|分享/.test(normalized)) return "lecture";
  if (/竞赛|比赛|挑战杯|黑客松/.test(normalized)) return "competition";
  if (/报名|招募|申请|征集/.test(normalized)) return "registration";
  if (/投票|评选|点赞/.test(normalized)) return "voting";
  if (/通知|事务|安排|调整|汇总|提醒|公示/.test(normalized)) return "administrative";
  return "other";
};

export const getCollegeNoticeTypeLabel = (value, language = "zh") => {
  const normalized = normalizeCollegeNoticeType(value) || "other";
  const lang = String(language || "zh").startsWith("en") ? "en" : "zh";
  return COLLEGE_NOTICE_TYPE_LABELS[lang]?.[normalized] || value || "";
};

export const inferEventSourceCollege = (event = {}) => {
  const source = [
    event.source_college,
    event.organizer,
    event.target_audience,
    event.title,
    event.description,
  ]
    .filter(Boolean)
    .join(" ");

  if (!source.trim()) return "";

  const direct = EVENT_SOURCE_COLLEGE_MATCH_OPTIONS.find((item) =>
    source.includes(item),
  );
  if (direct) return direct;

  if (/云峰/.test(source)) return "云峰学园";
  if (/丹青/.test(source)) return "丹青学园";
  if (/蓝田/.test(source)) return "蓝田学园";
  if (/求是/.test(source)) return "求是学院";
  if (/竺可桢|竺院/.test(source)) return "竺可桢学院";
  if (/计算机/.test(source)) return "计算机科学与技术学院";
  if (/软件/.test(source)) return "软件学院";
  if (/人工智能/.test(source)) return "人工智能学院";
  if (/集成电路/.test(source)) return "集成电路学院";

  return "";
};

export const getEventAudienceLabel = (value, language = "zh") =>
  String(language || "zh").startsWith("en")
    ? EVENT_AUDIENCE_LABELS_EN[value] || value || ""
    : value || "";

export const getEventAudienceGroupLabel = (value, language = "zh") =>
  String(language || "zh").startsWith("en")
    ? EVENT_AUDIENCE_GROUP_LABELS_EN[value] || value || ""
    : value || "";
