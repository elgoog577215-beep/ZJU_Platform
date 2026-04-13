require('dotenv').config();

const path = require('path');
const bcrypt = require('bcryptjs');
const { getDb, pool } = require('./src/config/db');
const { runMigrations } = require('./src/config/runMigrations');

const databaseFile = process.env.DATABASE_FILE || path.join(__dirname, 'database.sqlite');

const settingsSeed = {
  pagination_enabled: 'false',
  theme: 'cyber',
  language: 'zh',
  site_title: '拓途浙享 | TUOTUZJU',
  hero_title: '浙江大学信息聚合平台',
  hero_subtitle: '打破信息差，共建信息网络',
  about_title: '浙江大学信息聚合平台',
  about_subtitle: '打破信息差，共建信息网络',
  about_intro: '我们致力于消除信息差，提供一个优质信息共享平台。',
  about_detail: '欢迎加入我们！在这里，你可以参与优质活动，并分享活动有关的影像、文章、音乐，共建一个有温度、有情怀的优质社区！',
  contact_email: 'service@tuotuzju.com',
  contact_phone: '0571-87950000',
  contact_address: '浙江大学 SQTP 项目：拓途浙享团队'
};

const usersSeed = [
  {
    username: process.env.SEED_ADMIN_USERNAME || 'seed_admin',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin123456',
    role: 'admin',
    nickname: '种子管理员',
    organization_cr: '拓途浙享',
    created_at: '2026-03-01 09:00:00'
  },
  {
    username: process.env.SEED_USER_USERNAME || 'demo_user',
    password: process.env.SEED_USER_PASSWORD || 'Demo123456',
    role: 'user',
    nickname: '演示用户',
    organization_cr: '浙江大学',
    created_at: '2026-03-02 10:30:00'
  }
];

const photosSeed = [
  {
    title: '求是晨光',
    url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&auto=format&fit=crop&q=80',
    tags: '校园,摄影,晨光',
    size: 'large',
    featured: 1,
    created_at: '2026-03-20 08:00:00'
  },
  {
    title: '图书馆一角',
    url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=1200&auto=format&fit=crop&q=80',
    tags: '学习,空间,记录',
    size: 'wide',
    featured: 0,
    created_at: '2026-03-24 14:00:00'
  },
  {
    title: '夜色跑道',
    url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&auto=format&fit=crop&q=80',
    tags: '运动,夜景,校园',
    size: 'tall',
    featured: 0,
    created_at: '2026-03-26 20:00:00'
  }
];

const musicSeed = [
  {
    title: '求是之声',
    artist: '拓途乐队',
    duration: 228,
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&auto=format&fit=crop&q=80',
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    tags: '校园,原创,轻音乐',
    featured: 1,
    created_at: '2026-03-18 19:30:00'
  },
  {
    title: '西溪晚风',
    artist: '湖畔录音室',
    duration: 203,
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&auto=format&fit=crop&q=80',
    audio: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    tags: '治愈,校园,夜晚',
    featured: 0,
    created_at: '2026-03-22 21:00:00'
  }
];

const videosSeed = [
  {
    title: '社团招新回顾',
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1200&auto=format&fit=crop&q=80',
    video: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
    tags: '社团,活动,招新',
    featured: 1,
    created_at: '2026-03-17 12:00:00'
  },
  {
    title: '实验室开放日',
    thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    video: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
    tags: '科研,实验室,开放日',
    featured: 0,
    created_at: '2026-03-25 15:30:00'
  }
];

const articlesSeed = [
  {
    title: '如何高效发现校内活动',
    date: '2026-03-21',
    excerpt: '从讲座、比赛到公益志愿，整理一套更适合学生的信息获取方式。',
    tag: '校园指南',
    tags: '校园指南,活动,信息整合',
    cover: 'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&auto=format&fit=crop&q=80',
    content: '<p>拓途浙享希望减少“知道得晚、错过报名”的问题。好的活动信息，应该被更早、更清晰地看见。</p>',
    category: 'tech',
    featured: 1,
    created_at: '2026-03-16 09:30:00'
  },
  {
    title: '志愿活动记录模板',
    date: '2026-03-23',
    excerpt: '给活动发起者和参与者一套更清晰的记录方式，方便后续沉淀和复盘。',
    tag: '志愿服务',
    tags: '志愿服务,模板,复盘',
    cover: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&auto=format&fit=crop&q=80',
    content: '<p>一篇活动记录不只用于存档，也能帮助后来者快速理解活动价值和参与方式。</p>',
    category: 'tech',
    featured: 0,
    created_at: '2026-03-24 11:15:00'
  },
  {
    title: '校园创作者为什么需要统一展示平台',
    date: '2026-03-26',
    excerpt: '作品、活动和文章如果分散在多个渠道，往往很难形成长期影响。',
    tag: '平台思考',
    tags: '平台思考,创作,展示',
    cover: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&auto=format&fit=crop&q=80',
    content: '<p>统一的平台能让创作、活动、互动之间形成连接，也更方便后续做数据分析和运营。</p>',
    category: 'tech',
    featured: 0,
    created_at: '2026-03-27 16:45:00'
  },
  {
    title: '学院 AI 讲座周报（第 12 期）',
    date: '2026-03-29',
    excerpt: '整理本周校内外 AI 方向公开讲座、开放课程与参赛通知。',
    tag: '社区新闻',
    tags: '新闻,讲座,AI,周报',
    cover: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    content: '<p>本期收录 7 场公开讲座与 2 场比赛说明会，建议按研究方向提前预约。</p>',
    category: 'news',
    featured: 1,
    created_at: '2026-03-29 10:20:00'
  },
  {
    title: '开源社群动态：四月协作日程',
    date: '2026-03-30',
    excerpt: '发布四月开源协作安排，含新手 onboarding 与 maintainer office hour。',
    tag: '社区新闻',
    tags: '新闻,开源,社区',
    cover: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&auto=format&fit=crop&q=80',
    content: '<p>欢迎对开源感兴趣的同学报名参与，本月新增文档翻译与 issue triage 专场。</p>',
    category: 'news',
    featured: 0,
    created_at: '2026-03-30 18:00:00'
  },
  {
    title: '校园算力开放时段调整公告',
    date: '2026-04-01',
    excerpt: '实验教学周期间，公共 GPU 机房开放时段与预约规则更新。',
    tag: '社区新闻',
    tags: '新闻,算力,GPU',
    cover: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&auto=format&fit=crop&q=80',
    content: '<p>夜间时段将优先保障课程实验，科研任务建议提前两天提交预约申请。</p>',
    category: 'news',
    featured: 0,
    created_at: '2026-04-01 09:00:00'
  }
];

const communityPostsSeed = [
  {
    section: 'help',
    title: 'PyTorch 2.4 在 Windows 上编译扩展报错，求排查思路',
    content: '在 VS Build Tools 和 CUDA 环境都安装后，编译自定义 op 仍然报符号缺失，想请教大家怎么定位。',
    tags: 'PyTorch,CUDA,Windows',
    status: 'approved',
    post_status: 'open',
    content_blocks: JSON.stringify([
      { type: 'text', text: '环境：Python 3.11、CUDA 12.1、PyTorch 2.4。' },
      { type: 'text', text: '错误信息集中在 C++ extension 链接阶段。' }
    ]),
    created_at: '2026-04-02 10:00:00'
  },
  {
    section: 'help',
    title: '大模型微调显存不足问题已解决，分享排查记录',
    content: '把 batch size 与 gradient checkpointing 调整后，24GB 显存可以稳定训练。',
    tags: 'LLM,显存,微调',
    status: 'approved',
    post_status: 'solved',
    content_blocks: JSON.stringify([
      { type: 'text', text: '最终配置：batch size 2 + accumulation 8。' },
      { type: 'text', text: '建议先用 profile 工具观察激活占用。' }
    ]),
    created_at: '2026-04-03 09:30:00'
  },
  {
    section: 'help',
    title: '求推荐适合课程项目的 RAG 基线实现',
    content: '课程项目要求两周内出结果，希望选择上手快、可解释性好的方案。',
    tags: 'RAG,课程项目,检索',
    status: 'approved',
    post_status: 'open',
    content_blocks: JSON.stringify([
      { type: 'text', text: '优先考虑 LangChain 或 LlamaIndex 的轻量组合。' }
    ]),
    created_at: '2026-04-04 15:40:00'
  },
  {
    section: 'team',
    title: 'CVPR 复现小队招募：视频理解方向',
    content: '希望招募 3 名同学一起做论文复现，按周推进实验与报告。',
    tags: 'CV,论文复现,组队',
    status: 'approved',
    post_status: 'recruiting',
    deadline: '2026-05-10',
    max_members: 4,
    current_members: 2,
    link: 'https://example.com/team/cvpr-reproduce',
    content_blocks: JSON.stringify([
      { type: 'text', text: '方向：视频动作识别与多模态融合。' },
      { type: 'text', text: '每周两次站会，要求能稳定投入。' }
    ]),
    created_at: '2026-04-02 20:00:00'
  },
  {
    section: 'team',
    title: 'AI 黑客松队伍补位：前端 + Prompt 工程',
    content: '已有后端和算法同学，缺 1 位前端与 1 位 prompt 工程同学。',
    tags: '黑客松,前端,Prompt',
    status: 'approved',
    post_status: 'full',
    deadline: '2026-04-20',
    max_members: 5,
    current_members: 5,
    link: 'https://example.com/team/hackathon-ai',
    content_blocks: JSON.stringify([
      { type: 'text', text: '目标是完成可演示的 AI 助手产品 MVP。' }
    ]),
    created_at: '2026-04-01 18:20:00'
  },
  {
    section: 'team',
    title: '校园数据可视化项目协作招募',
    content: '寻找对数据分析与交互可视化感兴趣的同学，共建公开展示站点。',
    tags: '数据可视化,协作,开源',
    status: 'approved',
    post_status: 'recruiting',
    deadline: '2026-05-30',
    max_members: 6,
    current_members: 3,
    link: 'https://example.com/team/dataviz-campus',
    content_blocks: JSON.stringify([
      { type: 'text', text: '使用 React + ECharts，数据源来自公开校园统计。' }
    ]),
    created_at: '2026-04-05 11:10:00'
  }
];

const communityCommentsSeed = [
  {
    postTitle: 'PyTorch 2.4 在 Windows 上编译扩展报错，求排查思路',
    author: '演示用户',
    content: '可以先检查一下 `cl` 和 `nvcc` 的 PATH 顺序，我之前是这个问题。',
    created_at: '2026-04-02 11:00:00'
  },
  {
    postTitle: '求推荐适合课程项目的 RAG 基线实现',
    author: '种子管理员',
    content: '建议先用 BM25 + 向量检索双路召回，评估指标更稳。',
    created_at: '2026-04-04 16:10:00'
  }
];

const eventsSeed = [
  {
    title: '春季校园市集志愿招募',
    date: '2026-04-12 09:00:00',
    end_date: '2026-04-12 17:30:00',
    location: '紫金港校区主广场',
    tags: '志愿,市集,校园',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&auto=format&fit=crop&q=80',
    description: '协助春季校园市集的现场指引、秩序维护与摊位协调。',
    content: '<p>欢迎希望积累活动组织经验的同学参与。活动结束后会提供志愿服务证明。</p>',
    link: 'https://example.com/events/spring-market',
    featured: 1,
    score: '4.8',
    target_audience: '本科生,研究生',
    organizer: '拓途浙享团队',
    volunteer_time: '8 小时',
    category: '志愿服务',
    views: 18,
    created_at: '2026-03-20 09:00:00'
  },
  {
    title: 'AI 工具效率分享会',
    date: '2026-04-18 14:00:00',
    end_date: '2026-04-18 16:00:00',
    location: '图书馆报告厅',
    tags: '讲座,AI,学习效率',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
    description: '围绕学习、资料整理、活动运营三类场景，分享 AI 工具的真实使用经验。',
    content: '<p>本次活动会结合校内场景，介绍信息整合、内容生产和协作流程的实践案例。</p>',
    link: 'https://example.com/events/ai-workshop',
    featured: 0,
    score: '4.7',
    target_audience: '全校师生',
    organizer: '信息素养协会',
    volunteer_time: '',
    category: '学术讲座',
    views: 11,
    created_at: '2026-03-22 13:00:00'
  },
  {
    title: '社区助老数字服务日',
    date: '2026-03-28 09:30:00',
    end_date: '2026-03-28 12:00:00',
    location: '文三路社区中心',
    tags: '公益,助老,数字服务',
    status: 'approved',
    image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=1200&auto=format&fit=crop&q=80',
    description: '帮助社区老人解决手机支付、挂号和线上出行等常见问题。',
    content: '<p>活动已顺利结束，欢迎上传现场照片与心得，帮助更多团队复用活动经验。</p>',
    link: 'https://example.com/events/community-service',
    featured: 0,
    score: '4.9',
    target_audience: '志愿者',
    organizer: '青年志愿者协会',
    volunteer_time: '3 小时',
    category: '公益实践',
    views: 26,
    created_at: '2026-03-12 10:00:00'
  },
  {
    title: '跨学科项目招募说明会',
    date: '2026-04-25 19:00:00',
    end_date: '2026-04-25 20:30:00',
    location: '线上会议',
    tags: '项目,招募,跨学科',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?w=1200&auto=format&fit=crop&q=80',
    description: '面向想做真实项目的同学，介绍选题方向、协作机制和报名方式。',
    content: '<p>该活动仍在审核中，用于验证后台审核流和待审核列表。</p>',
    link: 'https://example.com/events/project-open-call',
    featured: 0,
    score: '4.6',
    target_audience: '本科生,研究生',
    organizer: '创新实践中心',
    volunteer_time: '',
    category: '项目招募',
    views: 0,
    created_at: '2026-03-27 18:20:00'
  }
];

const messagesSeed = [
  {
    name: '王同学',
    email: 'student@example.com',
    message: '希望后续可以增加按学院筛选活动的功能。',
    date: '2026-03-28T08:30:00.000Z',
    read: 0
  }
];

async function resetDatabase(db) {
  console.log('🧹 Resetting database...');
  await db.exec('PRAGMA foreign_keys = OFF');
  await db.exec(`
    DROP TABLE IF EXISTS event_registrations;
    DROP TABLE IF EXISTS event_view_events;
    DROP TABLE IF EXISTS site_daily_visitors;
    DROP TABLE IF EXISTS site_visit_events;
    DROP TABLE IF EXISTS notifications;
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS community_post_members;
    DROP TABLE IF EXISTS community_post_likes;
    DROP TABLE IF EXISTS community_posts;
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS tags;
    DROP TABLE IF EXISTS messages;
    DROP TABLE IF EXISTS settings;
    DROP TABLE IF EXISTS events;
    DROP TABLE IF EXISTS articles;
    DROP TABLE IF EXISTS videos;
    DROP TABLE IF EXISTS music;
    DROP TABLE IF EXISTS photos;
    DROP TABLE IF EXISTS users;
  `);
  await db.exec('PRAGMA foreign_keys = ON');
}

async function insertSettings(db) {
  for (const [key, value] of Object.entries(settingsSeed)) {
    await db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }
}

async function insertUsers(db) {
  const insertedUsers = [];

  for (const user of usersSeed) {
    const password = await bcrypt.hash(user.password, 10);
    const result = await db.run(
      `
        INSERT INTO users (username, password, role, nickname, organization_cr, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [user.username, password, user.role, user.nickname, user.organization_cr, user.created_at]
    );

    insertedUsers.push({ ...user, id: result.lastID });
  }

  return insertedUsers;
}

async function insertContent(db, users) {
  const adminId = users.find(user => user.role === 'admin')?.id || null;

  for (const photo of photosSeed) {
    await db.run(
      `
        INSERT INTO photos (url, title, tags, size, gameType, gameDescription, featured, status, uploader_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `,
      [photo.url, photo.title, photo.tags, photo.size, null, null, photo.featured, adminId, photo.created_at]
    );
  }

  for (const track of musicSeed) {
    await db.run(
      `
        INSERT INTO music (title, artist, duration, cover, audio, featured, tags, status, uploader_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `,
      [track.title, track.artist, track.duration, track.cover, track.audio, track.featured, track.tags, adminId, track.created_at]
    );
  }

  for (const video of videosSeed) {
    await db.run(
      `
        INSERT INTO videos (title, tags, thumbnail, video, featured, status, uploader_id, created_at)
        VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)
      `,
      [video.title, video.tags, video.thumbnail, video.video, video.featured, adminId, video.created_at]
    );
  }

  for (const article of articlesSeed) {
    await db.run(
      `
        INSERT INTO articles (title, date, excerpt, tag, tags, content, cover, category, featured, status, uploader_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `,
      [article.title, article.date, article.excerpt, article.tag, article.tags, article.content, article.cover, article.category || 'tech', article.featured, adminId, article.created_at]
    );
  }

  for (const event of eventsSeed) {
    await db.run(
      `
        INSERT INTO events (
          title, date, end_date, location, tags, status, image, description, content, link,
          featured, likes, views, uploader_id, score, target_audience, organizer, volunteer_time, category, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        event.title,
        event.date,
        event.end_date,
        event.location,
        event.tags,
        event.status,
        event.image,
        event.description,
        event.content,
        event.link,
        event.featured,
        event.views,
        adminId,
        event.score,
        event.target_audience,
        event.organizer,
        event.volunteer_time,
        event.category,
        event.created_at
      ]
    );
  }

  for (const message of messagesSeed) {
    await db.run(
      'INSERT INTO messages (name, email, message, date, read) VALUES (?, ?, ?, ?, ?)',
      [message.name, message.email, message.message, message.date, message.read]
    );
  }
}

async function insertCommunityData(db, users) {
  const adminUser = users.find(user => user.role === 'admin');
  const demoUser = users.find(user => user.role === 'user');
  const adminId = adminUser?.id || null;
  const demoId = demoUser?.id || adminId;

  const postIdByTitle = new Map();
  for (const item of communityPostsSeed) {
    const result = await db.run(
      `
        INSERT INTO community_posts (
          section, title, content, content_blocks, tags, status, post_status, deadline, max_members, current_members,
          link, author_id, author_name, author_avatar, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `,
      [
        item.section,
        item.title,
        item.content,
        item.content_blocks || null,
        item.tags || '',
        item.status || 'approved',
        item.post_status || (item.section === 'team' ? 'recruiting' : item.section === 'help' ? 'open' : 'published'),
        item.deadline || null,
        item.max_members || null,
        item.current_members || 0,
        item.link || null,
        adminId,
        adminUser?.nickname || adminUser?.username || '管理员',
        item.created_at,
        item.created_at
      ]
    );
    postIdByTitle.set(item.title, result.lastID);
  }

  for (const item of communityCommentsSeed) {
    const postId = postIdByTitle.get(item.postTitle);
    if (!postId) continue;
    await db.run(
      `
        INSERT INTO comments (resource_type, resource_id, user_id, author, content, avatar, created_at)
        VALUES ('community_post', ?, ?, ?, ?, NULL, ?)
      `,
      [postId, demoId, item.author, item.content, item.created_at]
    );
  }

  await db.run(
    `
      UPDATE community_posts
      SET comments_count = (
        SELECT COUNT(*) FROM comments
        WHERE resource_type = 'community_post' AND resource_id = community_posts.id
      )
    `
  );

  const recruitingPosts = await db.all(
    `SELECT id, author_id, max_members, current_members FROM community_posts WHERE section = 'team'`
  );
  for (const post of recruitingPosts) {
    const ownerId = post.author_id || adminId;
    if (ownerId) {
      await db.run(
        `INSERT OR IGNORE INTO community_post_members (post_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
        [post.id, ownerId]
      );
    }
    if (demoId && demoId !== ownerId && (post.current_members || 0) > 1) {
      await db.run(
        `INSERT OR IGNORE INTO community_post_members (post_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
        [post.id, demoId]
      );
    }
  }
}

async function syncTags(db) {
  const resources = ['photos', 'music', 'videos', 'articles', 'events'];
  const tagCounter = new Map();

  for (const table of resources) {
    const rows = await db.all(`SELECT tags FROM ${table} WHERE tags IS NOT NULL AND TRIM(tags) <> ''`);
    for (const row of rows) {
      const tags = String(row.tags).split(',').map(tag => tag.trim()).filter(Boolean);
      for (const tag of tags) {
        tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1);
      }
    }
  }

  for (const [tag, count] of tagCounter.entries()) {
    await db.run('INSERT INTO tags (name, count, created_at) VALUES (?, ?, datetime(\'now\'))', [tag, count]);
  }
}

async function seedAnalytics(db, users) {
  const demoUser = users.find(user => user.role === 'user');
  const events = await db.all('SELECT id, title FROM events ORDER BY id ASC');
  const eventByTitle = Object.fromEntries(events.map(event => [event.title, event]));

  const siteVisits = [
    { visitorKey: 'visitor-a', pagePath: '/', dateKey: '2026-03-26', createdAt: '2026-03-26 09:00:00' },
    { visitorKey: 'visitor-b', pagePath: '/events', dateKey: '2026-03-27', createdAt: '2026-03-27 10:00:00' },
    { visitorKey: 'visitor-c', pagePath: '/articles', dateKey: '2026-03-28', createdAt: '2026-03-28 11:00:00' },
    { visitorKey: 'visitor-a', pagePath: '/events', dateKey: '2026-03-28', createdAt: '2026-03-28 15:30:00' },
    { visitorKey: 'visitor-d', pagePath: '/', dateKey: '2026-03-29', createdAt: '2026-03-29 09:45:00' },
    { visitorKey: 'visitor-e', pagePath: '/events/1', dateKey: '2026-03-30', createdAt: '2026-03-30 16:20:00' }
  ];

  for (const visit of siteVisits) {
    await db.run(
      'INSERT INTO site_visit_events (visitor_key, page_path, date_key, created_at) VALUES (?, ?, ?, ?)',
      [visit.visitorKey, visit.pagePath, visit.dateKey, visit.createdAt]
    );

    await db.run(
      'INSERT OR IGNORE INTO site_daily_visitors (date_key, visitor_key, first_path, created_at) VALUES (?, ?, ?, ?)',
      [visit.dateKey, visit.visitorKey, visit.pagePath, visit.createdAt]
    );
  }

  const eventViews = [
    { title: '春季校园市集志愿招募', visitorKey: 'visitor-a', dateKey: '2026-03-28', createdAt: '2026-03-28 09:00:00' },
    { title: '春季校园市集志愿招募', visitorKey: 'visitor-b', dateKey: '2026-03-29', createdAt: '2026-03-29 11:20:00' },
    { title: 'AI 工具效率分享会', visitorKey: 'visitor-c', dateKey: '2026-03-29', createdAt: '2026-03-29 13:10:00' },
    { title: '社区助老数字服务日', visitorKey: 'visitor-d', dateKey: '2026-03-27', createdAt: '2026-03-27 08:40:00' }
  ];

  for (const view of eventViews) {
    const event = eventByTitle[view.title];
    if (!event) continue;

    await db.run(
      'INSERT INTO event_view_events (event_id, visitor_key, date_key, created_at) VALUES (?, ?, ?, ?)',
      [event.id, view.visitorKey, view.dateKey, view.createdAt]
    );
  }

  if (demoUser) {
    const registrationTargets = ['春季校园市集志愿招募', 'AI 工具效率分享会'];
    for (const title of registrationTargets) {
      const event = eventByTitle[title];
      if (!event) continue;

      await db.run(
        'INSERT OR IGNORE INTO event_registrations (event_id, user_id, created_at) VALUES (?, ?, ?)',
        [event.id, demoUser.id, '2026-03-30 12:00:00']
      );
    }
  }
}

async function seed() {
  console.log(`📦 Target database: ${databaseFile}`);
  const db = await getDb();

  await resetDatabase(db);
  await runMigrations(db);

  console.log('🌱 Seeding essential demo data...');
  await insertSettings(db);
  const users = await insertUsers(db);
  await insertContent(db, users);
  await insertCommunityData(db, users);
  await syncTags(db);
  await seedAnalytics(db, users);

  await pool.close();

  console.log('✅ Seed completed');
  console.log(`👤 Admin user: ${usersSeed[0].username} / ${usersSeed[0].password}`);
  console.log(`👤 Demo user: ${usersSeed[1].username} / ${usersSeed[1].password}`);
}

seed().catch(async (error) => {
  console.error('❌ Seed failed:', error);
  try {
    await pool.close();
  } catch {}
  process.exit(1);
});
