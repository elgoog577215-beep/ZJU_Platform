const {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_ALIASES,
  EVENT_CATEGORY_LABELS,
  EVENT_AUDIENCE_GROUPS,
  EVENT_AUDIENCE_OPTIONS,
  EVENT_AUDIENCE_ALIASES,
  EVENT_CAMPUS_OPTIONS,
} = require('../constants/eventCatalog');

const CATEGORY_VALUES = new Set(EVENT_CATEGORIES.map((item) => item.value));
const CATEGORY_LABEL_LOOKUP = new Map(EVENT_CATEGORIES.map((item) => [item.label, item.value]));

const normalizeText = (value = '') => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeLookupText = (value = '') => normalizeText(value).toLowerCase();

const unique = (items) => [...new Set(items.filter(Boolean))];

const getStandardOption = (options, hints, fallback) => (
  options.find((item) => hints.some((hint) => String(item).includes(hint))) || fallback
);

const STANDARD_AUDIENCES = {
  all: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['全校'], '全校'),
  undergraduate: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['本科'], '本科生'),
  graduate: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['研究生'], '研究生'),
  master: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['硕士'], '硕士生'),
  doctor: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['博士'], '博士生'),
  freshman: getStandardOption(EVENT_AUDIENCE_OPTIONS, ['新生'], '新生'),
};

const STANDARD_CAMPUSES = {
  zijingang: getStandardOption(EVENT_CAMPUS_OPTIONS, ['紫金港'], '紫金港'),
  yuquan: getStandardOption(EVENT_CAMPUS_OPTIONS, ['玉泉'], '玉泉'),
  xixi: getStandardOption(EVENT_CAMPUS_OPTIONS, ['西溪'], '西溪'),
  huajiachi: getStandardOption(EVENT_CAMPUS_OPTIONS, ['华家池'], '华家池'),
  zhijiang: getStandardOption(EVENT_CAMPUS_OPTIONS, ['之江'], '之江'),
  zhoushan: getStandardOption(EVENT_CAMPUS_OPTIONS, ['舟山'], '舟山'),
  haining: getStandardOption(EVENT_CAMPUS_OPTIONS, ['海宁'], '海宁'),
  online: getStandardOption(EVENT_CAMPUS_OPTIONS, ['线上'], '线上'),
};

const CAMPUS_ALIAS_RULES = [
  { value: STANDARD_CAMPUSES.zijingang, pattern: /\b(zi\s*jin\s*gang|zijingang|zjg)\b/i },
  { value: STANDARD_CAMPUSES.yuquan, pattern: /\b(yu\s*quan|yuquan|yq)\b/i },
  { value: STANDARD_CAMPUSES.xixi, pattern: /\b(xi\s*xi|xixi)\b/i },
  { value: STANDARD_CAMPUSES.huajiachi, pattern: /\b(hua\s*jia\s*chi|huajiachi|hjc)\b/i },
  { value: STANDARD_CAMPUSES.zhijiang, pattern: /\b(zhi\s*jiang|zhijiang)\b/i },
  { value: STANDARD_CAMPUSES.zhoushan, pattern: /\b(zhou\s*shan|zhoushan)\b/i },
  { value: STANDARD_CAMPUSES.haining, pattern: /\b(hai\s*ning|haining|hn)\b/i },
  { value: STANDARD_CAMPUSES.online, pattern: /\b(online|live\s*stream|livestream|remote)\b/i },
];

const ENGLISH_AUDIENCE_RULES = [
  { value: STANDARD_AUDIENCES.all, pattern: /\b(all\s+(students|zju)|all\s+participants|everyone|whole\s+school|open\s+to\s+all)\b/i },
  { value: STANDARD_AUDIENCES.undergraduate, pattern: /\b(undergraduates?|undergrads?|bachelors?)\b/i },
  { value: STANDARD_AUDIENCES.graduate, pattern: /\b(graduate\s+students?|postgraduates?)\b/i },
  { value: STANDARD_AUDIENCES.master, pattern: /\b(masters?|master'?s)\b/i },
  { value: STANDARD_AUDIENCES.doctor, pattern: /\b(phd|doctoral|doctorate)\b/i },
  { value: STANDARD_AUDIENCES.freshman, pattern: /\b(freshmen|freshman|first[-\s]?year)\b/i },
];

const splitList = (value) => {
  if (Array.isArray(value)) return value;
  return normalizeText(value)
    .split(/[,，、;；\s/|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const CATEGORY_LOOKUP = (() => {
  const lookup = new Map();

  for (const item of EVENT_CATEGORIES) {
    lookup.set(normalizeLookupText(item.value), item.value);
    lookup.set(normalizeLookupText(item.label), item.value);
  }

  for (const [category, aliases] of Object.entries(EVENT_CATEGORY_ALIASES)) {
    lookup.set(normalizeLookupText(category), category);
    for (const alias of aliases) {
      lookup.set(normalizeLookupText(alias), category);
    }
  }

  return lookup;
})();

const CATEGORY_RULES = [
  ['lecture', /学术|科研|讲座|论坛|报告|论文|课题组|导师|实验室|读书会|分享会|宣讲会|沙龙|会议/i],
  ['competition', /竞赛|比赛|挑战赛|挑战杯|黑客松|训练营|路演|成果展/i],
  ['volunteer', /志愿|公益|社会实践|支教|助老|服务日|社区服务/i],
  ['recruitment', /招新|招募|招聘|实习|就业|职业|简历|面试|offer|学生会|研究生会|学生组织/i],
  ['culture_sports', /文体|美育|艺术|展览|演出|音乐|体育|运动|文化节|电影/i],
  ['exchange', /国际|交流|留学|交换|访学|海外|外事|校友|企业交流|跨校/i],
];

const getCategoryLabel = (category) => EVENT_CATEGORY_LABELS[category] || category || '';

const normalizeEventCategory = (value) => {
  const normalized = normalizeLookupText(value);
  if (!normalized) return '';
  if (CATEGORY_LOOKUP.has(normalized)) return CATEGORY_LOOKUP.get(normalized);

  for (const [key, category] of CATEGORY_LOOKUP.entries()) {
    if (key && normalized.includes(key)) return category;
  }

  return '';
};

const detectCategories = (text = '') => {
  const lowered = normalizeLookupText(text);
  if (!lowered) return [];

  const matches = [];
  for (const [category, aliases] of Object.entries(EVENT_CATEGORY_ALIASES)) {
    const allTerms = [category, EVENT_CATEGORY_LABELS[category], ...aliases]
      .map(normalizeLookupText)
      .filter(Boolean);
    if (allTerms.some((term) => lowered.includes(term))) {
      matches.push(category);
    }
  }

  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text) && !matches.includes(category)) {
      matches.push(category);
    }
  }

  return matches;
};

const buildEventSearchText = (event = {}) => [
  event.category,
  event.tags,
  event.title,
  event.description,
  event.content,
  event.organizer,
  event.location,
  event.target_audience,
].map((value) => {
  if (Array.isArray(value)) return value.join(' ');
  return normalizeText(value);
}).filter(Boolean).join(' ');

const classifyEventCategory = (event = {}) => {
  const explicit = normalizeEventCategory(event.category);
  if (explicit) {
    const canonical = CATEGORY_VALUES.has(normalizeText(event.category)) || CATEGORY_LABEL_LOOKUP.has(normalizeText(event.category));
    return {
      category: explicit,
      confidence: canonical ? 1 : 0.92,
      reason: canonical
        ? `已有标准分类：${getCategoryLabel(explicit)}`
        : `旧分类/别名「${normalizeText(event.category)}」映射为${getCategoryLabel(explicit)}`,
      source: canonical ? 'category' : 'alias',
    };
  }

  const tagCategories = splitList(event.tags)
    .map(normalizeEventCategory)
    .filter(Boolean);
  const strongTagCategory = tagCategories.find((category) => category !== 'other');
  if (strongTagCategory) {
    return {
      category: strongTagCategory,
      confidence: 0.82,
      reason: `标签信号映射为${getCategoryLabel(strongTagCategory)}`,
      source: 'tags',
    };
  }

  const text = buildEventSearchText(event);
  const detected = detectCategories(text).filter((category) => category !== 'other');
  if (detected.length > 0) {
    return {
      category: detected[0],
      confidence: 0.72,
      reason: `标题/简介关键词推断为${getCategoryLabel(detected[0])}`,
      source: 'text',
    };
  }

  if (tagCategories.includes('other') || detectCategories(text).includes('other')) {
    return {
      category: 'other',
      confidence: 0.65,
      reason: '仅匹配到泛校园活动信号，归为其他',
      source: 'text',
    };
  }

  return {
    category: 'other',
    confidence: 0.45,
    reason: '没有足够标准分类信号，需人工确认',
    source: 'fallback',
  };
};

const normalizeEventAudience = (value) => {
  const rawItems = splitList(value);
  const raw = normalizeText(Array.isArray(value) ? value.join(' ') : value);
  if (!raw && rawItems.length === 0) return '';

  if (/全校|所有学生|全体学生|全体师生|全校师生|师生/.test(raw)
    || ENGLISH_AUDIENCE_RULES[0].pattern.test(raw)) {
    return STANDARD_AUDIENCES.all;
  }

  const exact = rawItems.filter((item) => EVENT_AUDIENCE_OPTIONS.includes(item));
  const included = EVENT_AUDIENCE_OPTIONS.filter((item) => raw.includes(item));
  const broad = EVENT_AUDIENCE_ALIASES
    .filter((item) => raw.includes(item))
    .map((item) => {
      if (item === '本科') return '本科生';
      if (item === '硕士') return '硕士生';
      if (item === '博士') return '博士生';
      return item;
    })
    .filter((item) => EVENT_AUDIENCE_OPTIONS.includes(item) || item === '全校');
  const english = ENGLISH_AUDIENCE_RULES
    .filter((rule) => rule.pattern.test(raw))
    .map((rule) => rule.value)
    .filter((item) => EVENT_AUDIENCE_OPTIONS.includes(item));

  return unique([...exact, ...included, ...broad, ...english]).join(',');
};

const detectCampusTerms = (value) => {
  const raw = normalizeText(Array.isArray(value) ? value.join(' ') : value);
  if (!raw) return [];
  const direct = EVENT_CAMPUS_OPTIONS.filter((item) => raw.includes(item));
  const aliasMatches = CAMPUS_ALIAS_RULES
    .filter((rule) => rule.pattern.test(raw))
    .map((rule) => rule.value)
    .filter((item) => EVENT_CAMPUS_OPTIONS.includes(item));
  return unique([...direct, ...aliasMatches]);
};

const detectAudienceTerms = (value) => {
  const normalized = normalizeEventAudience(value);
  return splitList(normalized).filter((item) => (
    EVENT_AUDIENCE_OPTIONS.includes(item) || item === STANDARD_AUDIENCES.all
  ));
};

const buildEventCatalogPromptContext = () => ({
  categories: EVENT_CATEGORIES.map((item) => ({
    value: item.value,
    label: item.label,
    description: item.description,
    aliases: EVENT_CATEGORY_ALIASES[item.value] || [],
  })),
  campuses: EVENT_CAMPUS_OPTIONS,
  audiences: EVENT_AUDIENCE_OPTIONS,
  audienceGroups: EVENT_AUDIENCE_GROUPS,
});

const buildEventCatalogPromptText = () => {
  const context = buildEventCatalogPromptContext();
  return [
    '【网站标准活动库】',
    '活动大类只能从以下 value 中选择，返回时必须使用 value，不要返回中文标签或自造分类：',
    ...context.categories.map((item) => (
      `- ${item.value} (${item.label}): ${item.description}; 常见别名：${item.aliases.slice(0, 14).join('、')}`
    )),
    '',
    `校区/形式标准项：${context.campuses.join('、')}`,
    `面向对象标准项：${context.audiences.join('、')}`,
    '活动标签已停用；不要生成 tags，活动归类只使用 category。',
  ].join('\n');
};

const getEventCategoryFilterTerms = (value) => {
  const normalized = normalizeText(value);
  const canonical = normalizeEventCategory(normalized) || normalized;
  const category = EVENT_CATEGORIES.find((item) => item.value === canonical);
  const label = category?.label;
  const aliases = EVENT_CATEGORY_ALIASES[canonical] || [];

  return unique([
    canonical,
    label,
    ...aliases,
  ].map(normalizeText)).filter(Boolean);
};

const validateParsedEventPayload = (payload = {}, source = {}) => {
  const eventText = buildEventSearchText({
    ...source,
    ...payload,
    tags: Array.isArray(payload.tags) ? payload.tags.join(' ') : payload.tags,
  });
  const classification = classifyEventCategory({
    category: payload.category,
    tags: payload.tags,
    title: payload.title || source.title,
    description: payload.description,
    content: payload.content || source.content || eventText,
  });
  const normalizedAudience = normalizeEventAudience(payload.target_audience);
  const confidence = Number(payload.category_confidence);
  const modelCategory = normalizeEventCategory(payload.category);
  const modelCategoryAccepted = Boolean(modelCategory && modelCategory === classification.category);
  const categoryConfidence = Number.isFinite(confidence) && modelCategoryAccepted
    ? Math.min(Math.max(0, confidence), classification.confidence)
    : classification.confidence;
  const modelReason = normalizeText(payload.category_reason);

  return {
    ...payload,
    category: classification.category,
    category_label: getCategoryLabel(classification.category),
    category_confidence: categoryConfidence,
    category_reason: modelCategoryAccepted && modelReason ? modelReason : classification.reason,
    category_source: classification.source,
    target_audience: normalizedAudience || null,
    tags: [],
  };
};

module.exports = {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_ALIASES,
  EVENT_CATEGORY_LABELS,
  EVENT_AUDIENCE_OPTIONS,
  EVENT_AUDIENCE_ALIASES,
  EVENT_CAMPUS_OPTIONS,
  buildEventCatalogPromptContext,
  buildEventCatalogPromptText,
  classifyEventCategory,
  detectCategories,
  detectAudienceTerms,
  detectCampusTerms,
  getEventCategoryFilterTerms,
  getCategoryLabel,
  normalizeEventAudience,
  normalizeEventCategory,
  validateParsedEventPayload,
};
