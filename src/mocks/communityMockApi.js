const now = Date.now();

const mockStore = {
  posts: [
    {
      id: 9001,
      section: 'help',
      title: 'Transformer 课程作业复现时 loss 不收敛，哪里可能有问题？',
      content: '目前学习率 1e-4，batch size 16，训练 3 epoch 后 loss 卡在 3.2 附近。',
      tags: ['Transformer', '课程作业', '训练'],
      status: 'open',
      author_id: 2,
      author_name: '演示用户',
      author_avatar: null,
      likes_count: 6,
      comments_count: 3,
      views_count: 120,
      created_at: '2026-04-11 10:00:00',
      updated_at: '2026-04-11 10:00:00',
      solved_comment_id: null,
      is_pinned: false,
      pin_weight: 0,
      last_replied_at: '2026-04-11 12:30:00',
      excerpt: '目前学习率 1e-4，batch size 16，训练 3 epoch 后 loss 卡在 3.2 附近。',
    },
    {
      id: 9002,
      section: 'help',
      title: 'RAG 检索召回率低，已找到原因并解决',
      content: '根因是 chunk size 过大导致向量语义稀释，改成 300 tokens 后提升明显。',
      tags: ['RAG', '检索', '已解决'],
      status: 'solved',
      author_id: 1,
      author_name: '种子管理员',
      author_avatar: null,
      likes_count: 14,
      comments_count: 4,
      views_count: 265,
      created_at: '2026-04-10 09:00:00',
      updated_at: '2026-04-10 09:00:00',
      solved_comment_id: 99002,
      is_pinned: true,
      pin_weight: 4,
      last_replied_at: '2026-04-10 18:20:00',
      excerpt: '根因是 chunk size 过大导致向量语义稀释，改成 300 tokens 后提升明显。',
    },
    {
      id: 9011,
      section: 'tech',
      title: 'LoRA 微调实战：从数据清洗到评估',
      content: '本文给出完整训练配置、数据配比策略与评估脚本。',
      tags: ['LoRA', '微调', '实践'],
      status: 'published',
      author_id: 1,
      author_name: '种子管理员',
      author_avatar: null,
      likes_count: 22,
      comments_count: 0,
      views_count: 344,
      created_at: '2026-04-09 14:20:00',
      updated_at: '2026-04-09 14:20:00',
      solved_comment_id: null,
      is_pinned: false,
      pin_weight: 0,
      last_replied_at: null,
      excerpt: '本文给出完整训练配置、数据配比策略与评估脚本。',
    },
    {
      id: 9003,
      section: 'help',
      title: '求助：向量库检索结果重复且无关',
      content: '同一问题返回了大量重复段落，怀疑索引分片策略有问题。',
      tags: ['向量库', '检索', 'RAG'],
      status: 'open',
      author_id: 2,
      author_name: '演示用户',
      author_avatar: null,
      likes_count: 4,
      comments_count: 2,
      views_count: 88,
      created_at: '2026-04-12 09:20:00',
      updated_at: '2026-04-12 09:20:00',
      solved_comment_id: null,
      is_pinned: false,
      pin_weight: 0,
      last_replied_at: '2026-04-12 11:10:00',
      excerpt: '同一问题返回了大量重复段落，怀疑索引分片策略有问题。',
    },
  ],
  commentsByPost: {
    9001: [
      {
        id: 99001,
        resource_type: 'community_post',
        resource_id: 9001,
        user_id: 1,
        parent_id: null,
        root_id: null,
        reply_to_comment_id: null,
        floor_number: 1,
        quote_snapshot: null,
        author: '种子管理员',
        author_name: '种子管理员',
        avatar: null,
        content: '先检查 warmup 步数和数据是否打乱，很多时候是数据分布问题。',
        created_at: '2026-04-11 11:00:00',
        likes: 2,
        replies: [
          {
            id: 99501,
            resource_type: 'community_post',
            resource_id: 9001,
            user_id: 2,
            parent_id: 99001,
            root_id: 99001,
            reply_to_comment_id: 99001,
            floor_number: null,
            quote_snapshot: null,
            author: '演示用户',
            author_name: '演示用户',
            avatar: null,
            content: '收到，我今晚先按这个方向排查。',
            created_at: '2026-04-11 11:20:00',
            likes: 0,
          },
        ],
      },
    ],
    9002: [
      {
        id: 99002,
        resource_type: 'community_post',
        resource_id: 9002,
        user_id: 2,
        parent_id: null,
        root_id: null,
        reply_to_comment_id: null,
        floor_number: 1,
        quote_snapshot: null,
        author: '演示用户',
        author_name: '演示用户',
        avatar: null,
        content: '建议把 chunk size 调小，并加入 reranker。',
        created_at: '2026-04-10 10:00:00',
        likes: 6,
        replies: [],
      },
    ],
    9003: [
      {
        id: 99003,
        resource_type: 'community_post',
        resource_id: 9003,
        user_id: 1,
        parent_id: null,
        root_id: null,
        reply_to_comment_id: null,
        floor_number: 1,
        quote_snapshot: null,
        author: '种子管理员',
        author_name: '种子管理员',
        avatar: null,
        content: '先做去重：同向量 topK 结果按 doc_id 合并后再 rerank。',
        created_at: '2026-04-12 10:10:00',
        likes: 3,
        replies: [],
      },
      {
        id: 99004,
        resource_type: 'community_post',
        resource_id: 9003,
        user_id: 2,
        parent_id: null,
        root_id: null,
        reply_to_comment_id: null,
        floor_number: 2,
        quote_snapshot: null,
        author: '演示用户',
        author_name: '演示用户',
        avatar: null,
        content: '感谢，合并后重复率从 38% 降到 8%。',
        created_at: '2026-04-12 11:10:00',
        likes: 1,
        replies: [],
      },
    ],
  },
  articles: [
    {
      id: 8801,
      title: 'Agent 工作流拆解模板',
      excerpt: '从 planner/executor/reviewer 三段式切入，适合课程项目。',
      content: '<p>这是一份可直接复用的 Agent 工作流模板。</p>',
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
      tags: 'Agent,工作流,模板',
      likes: 16,
      favorited: false,
      category: 'tech',
      status: 'approved',
      uploader_id: 1,
      author_name: '种子管理员',
      date: '2026-04-08',
      created_at: '2026-04-08 09:00:00',
      deleted_at: null,
    },
    {
      id: 8802,
      title: '课程项目：RAG 最小可用方案',
      excerpt: '含索引策略、召回参数、评估指标建议。',
      content: '<p>适合 2 周内产出课程项目版本。</p>',
      cover: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&auto=format&fit=crop&q=80',
      tags: 'RAG,课程项目,评估',
      likes: 9,
      favorited: false,
      category: 'tech',
      status: 'pending',
      uploader_id: 2,
      author_name: '演示用户',
      date: '2026-04-09',
      created_at: '2026-04-09 12:00:00',
      deleted_at: null,
    },
    {
      id: 8803,
      title: 'Draft: 提示词审查清单',
      excerpt: '用于提交前的提示词质量自检。',
      content: '<p>草稿内容。</p>',
      cover: '',
      tags: 'Prompt,草稿',
      likes: 0,
      favorited: false,
      category: 'tech',
      status: 'draft',
      uploader_id: 2,
      author_name: '演示用户',
      date: '2026-04-10',
      created_at: '2026-04-10 08:00:00',
      deleted_at: null,
    },
    {
      id: 8804,
      title: 'Trash: 旧版实验记录',
      excerpt: '用于测试回收站恢复。',
      content: '<p>已删除。</p>',
      cover: '',
      tags: '回收站,测试',
      likes: 1,
      favorited: false,
      category: 'tech',
      status: 'approved',
      uploader_id: 2,
      author_name: '演示用户',
      date: '2026-04-01',
      created_at: '2026-04-01 08:00:00',
      deleted_at: '2026-04-12 08:00:00',
    },
  ],
  groups: [
    {
      id: 7701,
      name: 'AI 社区总群',
      description: '公告与活动速递。',
      platform: 'wechat',
      qr_code_url: null,
      invite_link: 'https://example.com/group/main',
      member_count: 186,
      category: '综合交流',
      review_status: 'approved',
      is_recommended: 1,
      sort_order: 20,
      valid_until: '2026-12-31',
      is_expired: 0,
      review_note: null,
      created_at: '2026-04-01 09:00:00',
      updated_at: '2026-04-01 09:00:00',
    },
    {
      id: 7702,
      name: '模型压缩实验群',
      description: '剪枝/量化/蒸馏实践。',
      platform: 'qq',
      qr_code_url: null,
      invite_link: 'https://example.com/group/compress',
      member_count: 63,
      category: '技术交流',
      review_status: 'pending',
      is_recommended: 0,
      sort_order: 6,
      valid_until: '2026-10-01',
      is_expired: 0,
      review_note: null,
      created_at: '2026-04-02 09:00:00',
      updated_at: '2026-04-02 09:00:00',
    },
    {
      id: 7703,
      name: '过期示例群',
      description: '用于测试过期样式。',
      platform: 'discord',
      qr_code_url: null,
      invite_link: 'https://example.com/group/expired',
      member_count: 21,
      category: '测试',
      review_status: 'approved',
      is_recommended: 0,
      sort_order: 1,
      valid_until: '2025-12-31',
      is_expired: 1,
      review_note: '二维码已失效',
      created_at: '2026-04-03 09:00:00',
      updated_at: '2026-04-03 09:00:00',
    },
  ],
  news: [
    {
      id: 6601,
      title: '浙大 AI 公开课周报',
      excerpt: '本周开放 6 场讲座与 2 场 workshop。',
      content: '本周开放 6 场讲座与 2 场 workshop。',
      content_blocks: null,
      cover: null,
      source_name: 'zju.edu.cn',
      source_url: 'https://www.zju.edu.cn/',
      import_type: 'manual',
      hot_score: 122,
      views_count: 480,
      is_pinned: true,
      pin_weight: 10,
      featured: true,
      status: 'approved',
      uploader_id: 1,
      created_at: '2026-04-11 08:00:00',
      updated_at: '2026-04-11 08:00:00',
    },
    {
      id: 6602,
      title: 'AIGC 实验室开放日报名中',
      excerpt: '报名通道开放至本周五。',
      content: '报名通道开放至本周五。',
      content_blocks: null,
      cover: null,
      source_name: 'lab.example.edu',
      source_url: 'https://lab.example.edu/open-day',
      import_type: 'external',
      hot_score: 75,
      views_count: 220,
      is_pinned: false,
      pin_weight: 0,
      featured: false,
      status: 'approved',
      uploader_id: 1,
      created_at: '2026-04-10 09:00:00',
      updated_at: '2026-04-10 09:00:00',
    },
    {
      id: 6603,
      title: 'GPU 公共算力时段调整通知',
      excerpt: '实验教学周期间开放时段调整。',
      content: '夜间时段优先保障课程实验任务，科研任务建议提前预约。',
      content_blocks: null,
      cover: null,
      source_name: 'lab.zju.edu.cn',
      source_url: 'https://lab.zju.edu.cn/notice/gpu-schedule',
      import_type: 'external',
      hot_score: 62,
      views_count: 146,
      is_pinned: false,
      pin_weight: 0,
      featured: false,
      status: 'approved',
      uploader_id: 1,
      created_at: '2026-04-12 08:40:00',
      updated_at: '2026-04-12 08:40:00',
    },
    {
      id: 6604,
      title: '导入草稿示例：LLM Benchmark 新榜单',
      excerpt: '用于测试导入后编辑确认流程。',
      content: '该条目处于草稿状态，用于测试管理员编辑与发布链路。',
      content_blocks: null,
      cover: null,
      source_name: 'benchmark.example.com',
      source_url: 'https://benchmark.example.com/llm/rankings',
      import_type: 'external',
      hot_score: 20,
      views_count: 21,
      is_pinned: false,
      pin_weight: 0,
      featured: false,
      status: 'draft',
      uploader_id: 1,
      created_at: '2026-04-12 09:40:00',
      updated_at: '2026-04-12 09:40:00',
    },
  ],
};

const mockUserId = () => {
  try {
    const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!raw) return 2;
    const parsed = JSON.parse(raw);
    return parsed?.id || 2;
  } catch {
    return 2;
  }
};

const toResponse = (payload) => ({
  data: payload,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

const applySort = (items, sort) => {
  if (sort === 'hot' || sort === 'likes') {
    return [...items].sort((a, b) => (b.likes_count || b.likes || 0) - (a.likes_count || a.likes || 0));
  }
  if (sort === 'oldest') {
    return [...items].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
  if (sort === 'title') {
    return [...items].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

const paginate = (items, page = 1, limit = 10) => {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.max(Number(limit) || 10, 1);
  const start = (p - 1) * l;
  const data = items.slice(start, start + l);
  return {
    data,
    pagination: {
      total: items.length,
      page: p,
      limit: l,
      totalPages: Math.max(Math.ceil(items.length / l), 1),
    },
  };
};

const normalizePath = (url) => String(url || '').split('?')[0];

const buildParams = (url, config = {}) => {
  const merged = { ...(config?.params || {}) };
  const [, query = ''] = String(url || '').split('?');
  if (query) {
    const q = new URLSearchParams(query);
    q.forEach((value, key) => { if (merged[key] === undefined) merged[key] = value; });
  }
  return merged;
};

const resolveGet = (url, config) => {
  const path = normalizePath(url);
  const params = buildParams(url, config);

  if (path === '/community/posts') {
    const section = String(params.section || '').trim();
    const status = String(params.status || 'all').trim();
    const tags = String(params.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
    const sort = String(params.sort || 'newest').trim();
    let rows = mockStore.posts.filter((post) => (!section || post.section === section));
    if (section === 'help' && status !== 'all') {
      rows = rows.filter((post) => post.status === status);
    }
    if (tags.length) {
      rows = rows.filter((post) => tags.every((t) => (post.tags || []).includes(t)));
    }
    rows = applySort(rows, sort);
    return toResponse(paginate(rows, params.page, params.limit));
  }

  const postDetail = path.match(/^\/community\/posts\/(\d+)$/);
  if (postDetail) {
    const id = Number(postDetail[1]);
    const post = mockStore.posts.find((item) => item.id === id);
    return toResponse(post || null);
  }

  const postComments = path.match(/^\/community\/posts\/(\d+)\/comments$/);
  if (postComments) {
    const postId = Number(postComments[1]);
    return toResponse(mockStore.commentsByPost[postId] || []);
  }

  if (path === '/articles') {
    const category = String(params.category || '').trim();
    const status = String(params.status || '').trim();
    const uploaderId = params.uploader_id ? Number(params.uploader_id) : null;
    const trashed = String(params.trashed || '').trim() === 'true';
    const tags = String(params.tags || '').split(',').map((s) => s.trim()).filter(Boolean);
    const sort = String(params.sort || 'newest').trim();

    let rows = mockStore.articles.filter((item) => (!category || item.category === category));
    rows = rows.filter((item) => (trashed ? item.deleted_at : !item.deleted_at));
    if (uploaderId) rows = rows.filter((item) => item.uploader_id === uploaderId);
    if (status && status !== 'all') rows = rows.filter((item) => item.status === status);
    if (tags.length) rows = rows.filter((item) => tags.every((t) => String(item.tags || '').includes(t)));
    rows = applySort(rows, sort);
    return toResponse(paginate(rows, params.page, params.limit));
  }

  const articleDetail = path.match(/^\/articles\/(\d+)$/);
  if (articleDetail) {
    const id = Number(articleDetail[1]);
    return toResponse(mockStore.articles.find((item) => item.id === id) || null);
  }

  if (path === '/community/groups') {
    const status = String(params.review_status || 'approved').trim().toLowerCase();
    const rows = status === 'all'
      ? [...mockStore.groups]
      : mockStore.groups.filter((item) => item.review_status === status);
    return toResponse(rows.sort((a, b) => (b.is_recommended - a.is_recommended) || (b.sort_order - a.sort_order)));
  }

  if (path === '/news') {
    const status = String(params.status || 'approved').trim().toLowerCase();
    const sort = String(params.sort || 'hot').trim().toLowerCase();
    let rows = [...mockStore.news];
    if (status !== 'all') rows = rows.filter((item) => item.status === status);
    rows.sort((a, b) => {
      if (sort === 'latest') return new Date(b.created_at) - new Date(a.created_at);
      return (b.is_pinned - a.is_pinned)
        || ((b.pin_weight || 0) - (a.pin_weight || 0))
        || ((b.hot_score || 0) - (a.hot_score || 0))
        || (new Date(b.created_at) - new Date(a.created_at));
    });
    return toResponse(paginate(rows, params.page, params.limit));
  }

  const newsDetail = path.match(/^\/news\/(\d+)$/);
  if (newsDetail) {
    const id = Number(newsDetail[1]);
    return toResponse(mockStore.news.find((item) => item.id === id) || null);
  }

  const newsHealth = path.match(/^\/news\/(\d+)\/source-health$/);
  if (newsHealth) {
    const id = Number(newsHealth[1]);
    const item = mockStore.news.find((n) => n.id === id);
    if (!item?.source_url) {
      return toResponse({ reachable: false, reason: 'missing_source_url' });
    }
    if (item.id % 2 === 0) {
      return toResponse({ reachable: false, status: 404 });
    }
    return toResponse({ reachable: true, status: 200 });
  }

  return null;
};

const resolveWrite = (method, url, data = {}) => {
  const path = normalizePath(url);

  if (method === 'post' && path === '/community/posts') {
    const id = Math.max(...mockStore.posts.map((i) => i.id), 9000) + 1;
    const section = String(data.section || 'help');
    const next = {
      id,
      section,
      title: data.title || '未命名帖子',
      content: data.content || '',
      tags: Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
      status: section === 'help' ? 'open' : 'published',
      author_id: mockUserId(),
      author_name: '当前用户',
      author_avatar: null,
      likes_count: 0,
      comments_count: 0,
      views_count: 0,
      created_at: new Date(now + id).toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date(now + id).toISOString().slice(0, 19).replace('T', ' '),
      solved_comment_id: null,
      is_pinned: false,
      pin_weight: 0,
      last_replied_at: null,
      excerpt: String(data.content || '').slice(0, 120),
    };
    mockStore.posts.unshift(next);
    return toResponse(next);
  }

  const addComment = path.match(/^\/community\/posts\/(\d+)\/comments$/);
  if (method === 'post' && addComment) {
    const postId = Number(addComment[1]);
    const rows = mockStore.commentsByPost[postId] || [];
    const id = rows.reduce((max, item) => Math.max(max, item.id), 99000) + 1;
    const next = {
      id,
      resource_type: 'community_post',
      resource_id: postId,
      user_id: mockUserId(),
      parent_id: null,
      root_id: null,
      reply_to_comment_id: null,
      floor_number: rows.filter((r) => !r.parent_id).length + 1,
      quote_snapshot: null,
      author: '当前用户',
      author_name: '当前用户',
      avatar: null,
      content: String(data.content || ''),
      created_at: new Date(now + id).toISOString().slice(0, 19).replace('T', ' '),
      likes: 0,
      replies: [],
    };
    mockStore.commentsByPost[postId] = [...rows, next];
    const post = mockStore.posts.find((item) => item.id === postId);
    if (post) {
      post.comments_count = (post.comments_count || 0) + 1;
      post.last_replied_at = next.created_at;
      post.updated_at = next.created_at;
    }
    return toResponse(next);
  }

  if (method === 'post' && path === '/articles') {
    const id = Math.max(...mockStore.articles.map((i) => i.id), 8800) + 1;
    const next = {
      id,
      title: data.title || '未命名技术稿',
      excerpt: data.excerpt || '',
      content: data.content || '',
      cover: data.cover || '',
      tags: data.tags || '',
      likes: 0,
      favorited: false,
      category: data.category || 'tech',
      status: data.status || 'draft',
      uploader_id: mockUserId(),
      author_name: '当前用户',
      date: new Date().toISOString().slice(0, 10),
      created_at: new Date(now + id).toISOString().slice(0, 19).replace('T', ' '),
      deleted_at: null,
    };
    mockStore.articles.unshift(next);
    return toResponse(next);
  }

  const updateArticle = path.match(/^\/articles\/(\d+)$/);
  if (method === 'put' && updateArticle) {
    const id = Number(updateArticle[1]);
    const index = mockStore.articles.findIndex((item) => item.id === id);
    if (index >= 0) {
      mockStore.articles[index] = { ...mockStore.articles[index], ...data };
      return toResponse(mockStore.articles[index]);
    }
  }

  const deleteArticle = path.match(/^\/articles\/(\d+)$/);
  if (method === 'delete' && deleteArticle) {
    const id = Number(deleteArticle[1]);
    const item = mockStore.articles.find((row) => row.id === id);
    if (item) item.deleted_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return toResponse({ success: true });
  }

  const recoverArticle = path.match(/^\/articles\/(\d+)\/recover$/);
  if (method === 'post' && recoverArticle) {
    const id = Number(recoverArticle[1]);
    const item = mockStore.articles.find((row) => row.id === id);
    if (item) item.deleted_at = null;
    return toResponse(item || { success: true });
  }

  return null;
};

export const resolveCommunityMock = (method, url, configOrData) => {
  const normalized = String(method || '').toLowerCase();
  if (normalized === 'get') return resolveGet(url, configOrData);
  if (['post', 'put', 'delete'].includes(normalized)) return resolveWrite(normalized, url, configOrData);
  return null;
};
