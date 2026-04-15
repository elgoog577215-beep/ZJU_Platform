require('dotenv').config();

const { getDb, pool } = require('../src/config/db');
const { runMigrations } = require('../src/config/runMigrations');

const ensureDemoUsers = async (db) => {
  const admin = await db.get(`SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`);
  const user = await db.get(`SELECT id FROM users WHERE role = 'user' ORDER BY id ASC LIMIT 1`);
  return {
    adminId: admin?.id || null,
    userId: user?.id || admin?.id || null,
  };
};

const helpPosts = [
  ['求助：PyTorch 分布式训练在 Windows 上卡住', '训练在 init_process_group 阶段阻塞，怀疑端口配置冲突。', 'PyTorch,分布式,Windows', 'open'],
  ['已解决：RAG 检索召回率低', '把 chunk 从 1000 改到 300 后召回显著提升。', 'RAG,检索,已解决', 'solved'],
  ['求助：Agent 调度异常回环', '多 Agent 工作流中 reviewer 节点偶发死循环。', 'Agent,LangGraph,调度', 'open'],
];

const helpComments = [
  ['求助：PyTorch 分布式训练在 Windows 上卡住', '先确认 MASTER_ADDR 和 MASTER_PORT 是否被占用。', false],
  ['求助：PyTorch 分布式训练在 Windows 上卡住', '建议加 `NCCL_P2P_DISABLE=1` 做对照实验。', false],
  ['已解决：RAG 检索召回率低', 'chunk 从 1000 调到 300 后，命中率提升明显。', true],
  ['求助：Agent 调度异常回环', '给 reviewer 增加 max_iter 和状态守卫，能避免回环。', false],
];

const techArticles = [
  ['LoRA 微调参数基线建议', '给出课程项目可直接使用的 LoRA 参数基线。', 'LoRA,微调,实践', 'approved'],
  ['Draft：提示词质量检查表', '用于提交前自检的提示词 checklist。', 'Prompt,草稿,质量', 'draft'],
  ['Pending：多模态检索实验记录', '等待管理员审核的实验记录。', '多模态,检索,待审', 'pending'],
  ['Trash：旧版实验日志', '用于回收站恢复场景测试。', '回收站,恢复,测试', 'approved'],
];

const groups = [
  ['AI 社区总群', '综合交流与公告发布', 'wechat', 'https://example.com/groups/main', 186, '综合交流', 'approved', 1, 12, '2026-12-31', 0, null],
  ['模型压缩交流群', '剪枝量化蒸馏实践', 'qq', 'https://example.com/groups/compress', 63, '技术交流', 'pending', 0, 4, '2026-10-01', 0, null],
  ['过期示例群', '用于展示过期卡片样式', 'discord', 'https://example.com/groups/expired', 21, '测试', 'approved', 0, 1, '2025-12-31', 1, '二维码已过期'],
  ['驳回示例群', '用于展示驳回备注', 'telegram', 'https://example.com/groups/rejected', 8, '测试', 'rejected', 0, 0, '2026-08-01', 0, '邀请链接失效，请更新'],
];

const newsRows = [
  ['AI 社区周报：活动与资源更新', '汇总本周重点活动、讲座与协作任务。', '汇总本周重点活动、讲座与协作任务。', 'tuotuzju.com', 'https://tuotuzju.com/news/weekly-01', 'manual', 168, 1, 12, 1, 'approved'],
  ['浙大 AI 公开讲座开放报名', '本周末将举办大模型工程化专题讲座。', '本周末将举办大模型工程化专题讲座。', 'zju.edu.cn', 'https://www.zju.edu.cn/lecture/ai-engineering', 'external', 96, 0, 0, 1, 'approved'],
  ['GPU 公共算力时段调整通知', '实验教学周期间开放时段调整。', '实验教学周期间开放时段调整。', 'lab.zju.edu.cn', 'https://lab.zju.edu.cn/notice/gpu-schedule', 'external', 82, 0, 0, 0, 'approved'],
  ['导入草稿示例：LLM Benchmark 新榜单', '用于测试导入后编辑确认流程。', '用于测试导入后编辑确认流程。', 'benchmark.example.com', 'https://benchmark.example.com/llm/rankings', 'external', 20, 0, 0, 0, 'draft'],
  ['待审核示例：校园 AI 创客营', '用于测试 pending 审核流。', '用于测试 pending 审核流。', 'maker.example.com', 'https://maker.example.com/ai-camp', 'manual', 35, 0, 0, 0, 'pending'],
  ['驳回示例：失效来源新闻', '用于测试失效来源 fallback 提示。', '用于测试失效来源 fallback 提示。', 'legacy.example.org', 'https://legacy.example.org/unreachable-news', 'external', 10, 0, 0, 0, 'rejected'],
];

async function upsertHelpPosts(db, adminId) {
  for (const [title, content, tags, postStatus] of helpPosts) {
    const exists = await db.get(`SELECT id FROM community_posts WHERE section='help' AND title = ?`, [title]);
    if (exists) continue;
    await db.run(
      `INSERT INTO community_posts (
        section, title, content, tags, status, post_status, author_id, author_name, created_at, updated_at
      ) VALUES ('help', ?, ?, ?, 'approved', ?, ?, '种子管理员', datetime('now'), datetime('now'))`,
      [title, content, tags, postStatus, adminId]
    );
  }
}

async function upsertHelpComments(db, userId) {
  for (const [postTitle, content, bestAnswer] of helpComments) {
    const post = await db.get(
      `SELECT id, post_status FROM community_posts WHERE section='help' AND title = ? LIMIT 1`,
      [postTitle]
    );
    if (!post) continue;
    const exists = await db.get(
      `SELECT id FROM comments
       WHERE resource_type='community_post' AND resource_id = ?
         AND content = ?`,
      [post.id, content]
    );
    if (exists) continue;
    const result = await db.run(
      `INSERT INTO comments (resource_type, resource_id, user_id, author, content, created_at)
       VALUES ('community_post', ?, ?, '演示用户', ?, datetime('now'))`,
      [post.id, userId, content]
    );
    if (bestAnswer) {
      await db.run(
        `UPDATE community_posts
         SET solved_comment_id = ?, post_status = 'solved', updated_at = datetime('now')
         WHERE id = ?`,
        [result.lastID, post.id]
      );
    }
  }

  await db.run(`
    UPDATE community_posts
    SET comments_count = (
      SELECT COUNT(*)
      FROM comments
      WHERE resource_type = 'community_post' AND resource_id = community_posts.id
    ),
    last_replied_at = (
      SELECT MAX(created_at)
      FROM comments
      WHERE resource_type = 'community_post' AND resource_id = community_posts.id
    )
    WHERE section = 'help'
  `);
}

async function upsertTechArticles(db, adminId, userId) {
  for (let i = 0; i < techArticles.length; i += 1) {
    const [title, excerpt, tags, status] = techArticles[i];
    const exists = await db.get(`SELECT id FROM articles WHERE title = ?`, [title]);
    if (exists) continue;
    const deletedAt = title.startsWith('Trash') ? "datetime('now')" : null;
    await db.run(
      `INSERT INTO articles (
        title, date, excerpt, tag, tags, content, category, status, uploader_id, featured, created_at, deleted_at
      ) VALUES (?, date('now'), ?, '技术分享', ?, ?, 'tech', ?, ?, 0, datetime('now', ?), ${deletedAt ? deletedAt : 'NULL'})`,
      [
        title,
        excerpt,
        tags,
        `<p>${excerpt}</p>`,
        status,
        i % 2 === 0 ? adminId : userId,
        `-${i + 1} day`,
      ]
    );
  }
}

async function upsertGroups(db, adminId) {
  for (const row of groups) {
    const [name, description, platform, inviteLink, memberCount, category, reviewStatus, recommended, sortOrder, validUntil, expired, reviewNote] = row;
    const exists = await db.get(`SELECT id FROM community_groups WHERE name = ?`, [name]);
    if (exists) continue;
    await db.run(
      `INSERT INTO community_groups (
        name, description, platform, invite_link, member_count, category, created_by,
        review_status, is_recommended, sort_order, valid_until, is_expired, review_note, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [name, description, platform, inviteLink, memberCount, category, adminId, reviewStatus, recommended, sortOrder, validUntil, expired, reviewNote]
    );
  }
}

async function upsertNews(db, adminId) {
  for (const row of newsRows) {
    const [title, excerpt, content, sourceName, sourceUrl, importType, hotScore, isPinned, pinWeight, featured, status] = row;
    const exists = await db.get(`SELECT id FROM news WHERE title = ?`, [title]);
    if (exists) continue;
    await db.run(
      `INSERT INTO news (
        title, excerpt, content, source_name, source_url, import_type, hot_score, is_pinned, pin_weight, featured,
        status, uploader_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [title, excerpt, content, sourceName, sourceUrl, importType, hotScore, isPinned, pinWeight, featured, status, adminId]
    );
  }
}

async function run() {
  const db = await getDb();
  await runMigrations(db);
  const { adminId, userId } = await ensureDemoUsers(db);
  if (!adminId) {
    throw new Error('未找到管理员用户，请先执行 `npm --prefix server run seed` 初始化基础账号。');
  }

  await upsertHelpPosts(db, adminId);
  await upsertHelpComments(db, userId);
  await upsertTechArticles(db, adminId, userId);
  await upsertGroups(db, adminId);
  await upsertNews(db, adminId);

  console.log('✅ AI 社区演示数据已注入（help/tech/groups/news）');
  await pool.close();
}

run().catch(async (error) => {
  console.error('❌ 注入失败:', error.message);
  try { await pool.close(); } catch {}
  process.exit(1);
});
