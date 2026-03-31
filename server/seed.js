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
    featured: 0,
    created_at: '2026-03-27 16:45:00'
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
        INSERT INTO articles (title, date, excerpt, tag, tags, content, cover, featured, status, uploader_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?)
      `,
      [article.title, article.date, article.excerpt, article.tag, article.tags, article.content, article.cover, article.featured, adminId, article.created_at]
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
