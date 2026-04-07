/**
 * 社区路由 slug ↔ i18n；求助演示行数据结构对齐 ui 原型 HTML
 */
export const COMMUNITY_SECTIONS = [
  { slug: 'help', labelKey: 'nav.community_help', plannedQuery: { tag: 'community-help' } },
  { slug: 'tech', labelKey: 'nav.community_tech', plannedQuery: { tag: 'community-tech' } },
  { slug: 'news', labelKey: 'nav.community_news', plannedQuery: { tag: 'community-news' } },
  { slug: 'team', labelKey: 'nav.community_team', plannedQuery: { tag: 'community-team' } },
  { slug: 'groups', labelKey: 'nav.community_groups', plannedQuery: { tag: 'community-groups' } },
  { slug: 'rules', labelKey: 'nav.community_rules', plannedQuery: { tag: 'community-rules' } },
];

export const COMMUNITY_SECTION_SLUGS = new Set(COMMUNITY_SECTIONS.map((s) => s.slug));

/** @typedef {{ stripe: 'help'|'discuss', titleKey: string, metaKey: string, tagKeys: string[], badges?: { cls: string, labelKey: string }[] }} HelpPreviewRow */

/** @type {HelpPreviewRow[]} */
export const HELP_PREVIEW_ROWS = [
  {
    stripe: 'help',
    titleKey: 'community.demo_1_title',
    metaKey: 'community.demo_1_meta',
    tagKeys: ['community.demo_tag_pt', 'community.demo_tag_cuda', 'community.demo_tag_nvrtc'],
    badges: [{ cls: 'state', labelKey: 'community.badge_pending' }],
  },
  {
    stripe: 'help',
    titleKey: 'community.demo_2_title',
    metaKey: 'community.demo_2_meta',
    tagKeys: ['community.demo_tag_agent', 'community.demo_tag_mcp'],
    badges: [
      { cls: 'expert', labelKey: 'community.badge_expert' },
      { cls: 'tag', labelKey: 'community.badge_pin' },
    ],
  },
  {
    stripe: 'discuss',
    titleKey: 'community.demo_3_title',
    metaKey: 'community.demo_3_meta',
    tagKeys: ['community.demo_tag_pool'],
  },
  {
    stripe: 'help',
    titleKey: 'community.demo_4_title',
    metaKey: 'community.demo_4_meta',
    tagKeys: ['community.demo_tag_docker', 'community.demo_tag_cuda'],
  },
];

/** i18n key 列表 → 标签筛选条（可点击切换 .on） */
export const HELP_TAG_KEYS = [
  'community.filter_tag_pytorch',
  'community.filter_tag_cuda',
  'community.filter_tag_nvrtc',
  'community.filter_tag_docker',
  'community.filter_tag_agent',
  'community.filter_tag_mcp',
  'community.filter_tag_pool',
];
