const { ensureCoreSchema } = require('./ensureCoreSchema');

async function runMigrations(db) {
  console.log('🔄 Running database migrations...');
  await ensureCoreSchema(db);

  const ensureColumns = async (table, columns, label) => {
    try {
      const info = await db.all(`PRAGMA table_info(${table})`);
      const existing = info.map((col) => col.name);
      if (existing.length === 0) return;

      for (const [name, definition] of Object.entries(columns)) {
        if (!existing.includes(name)) {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
          console.log(`鉁?Added ${name} to ${label || table}`);
        }
      }
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.warn(`Migration warning (${label || table} columns):`, err.message);
      }
    }
  };

  try {
    const eventsInfo = await db.all(`PRAGMA table_info(events)`);
    const eventsColumns = eventsInfo.map(col => col.name);
    
    if (!eventsColumns.includes('uploader_id')) {
      await db.exec(`ALTER TABLE events ADD COLUMN uploader_id INTEGER`);
      console.log('✅ Added uploader_id to events table');
    }
    if (!eventsColumns.includes('status')) {
      await db.exec(`ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'approved'`);
      console.log('✅ Added status to events table');
    }
    if (!eventsColumns.includes('end_date')) {
      await db.exec(`ALTER TABLE events ADD COLUMN end_date TEXT`);
      console.log('✅ Added end_date to events table');
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (events):', err.message);
    }
  }

  try {
    const articlesInfo = await db.all(`PRAGMA table_info(articles)`);
    const articlesColumns = articlesInfo.map(col => col.name);

    if (articlesColumns.length > 0 && !articlesColumns.includes('content_blocks')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN content_blocks TEXT`);
      console.log('✅ Added content_blocks to articles table');
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (articles):', err.message);
    }
  }
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_type TEXT NOT NULL,
        resource_id INTEGER NOT NULL,
        user_id INTEGER,
        author_name TEXT,
        content TEXT NOT NULL,
        parent_id INTEGER,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Comments table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (comments):', err.message);
    }
  }

  try {
    const commentsInfo = await db.all(`PRAGMA table_info(comments)`);
    const commentColumns = commentsInfo.map(col => col.name);

    if (commentColumns.length > 0 && !commentColumns.includes('author')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN author TEXT`);
    }
    if (commentColumns.length > 0 && !commentColumns.includes('avatar')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN avatar TEXT`);
    }
    if (commentColumns.length > 0 && !commentColumns.includes('root_id')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN root_id INTEGER`);
    }
    if (commentColumns.length > 0 && !commentColumns.includes('reply_to_comment_id')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN reply_to_comment_id INTEGER`);
    }
    if (commentColumns.length > 0 && !commentColumns.includes('floor_number')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN floor_number INTEGER`);
    }
    if (commentColumns.length > 0 && !commentColumns.includes('quote_snapshot')) {
      await db.exec(`ALTER TABLE comments ADD COLUMN quote_snapshot TEXT`);
    }
    if (commentColumns.length > 0 && commentColumns.includes('author_name')) {
      await db.exec(`
        UPDATE comments
        SET author = author_name
        WHERE (author IS NULL OR TRIM(author) = '')
          AND author_name IS NOT NULL
          AND TRIM(author_name) != ''
      `);
    }
    console.log('✅ Comments columns synced');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (comments columns):', err.message);
    }
  }
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        message TEXT,
        data TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Notifications table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (notifications):', err.message);
    }
  }

  // Migration: unify notification content to single `content` column.
  // See openspec/changes/unify-notification-content/ for full context.
  try {
    const notifInfo = await db.all('PRAGMA table_info(notifications)');
    const notifColumns = new Set(notifInfo.map((c) => c.name));
    if (!notifColumns.has('content')) {
      await db.exec(`ALTER TABLE notifications ADD COLUMN content TEXT`);
      console.log('✅ Added notifications.content column');
    }
    await db.run(`
      UPDATE notifications
      SET content = COALESCE(message, title)
      WHERE content IS NULL
    `);
    console.log('✅ Notifications content column backfilled');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (notifications.content):', err.message);
    }
  }

  // Migration: ensure rejection_reason column exists on all reviewable resource
  // tables. resourceController.updateStatus writes this column when an admin
  // rejects an item, and CommunityTech reads it to display the reason to the
  // author. The column was missing from ensureCoreSchema, causing 500s on
  // every approval/rejection in the admin review center.
  for (const table of ['photos', 'music', 'videos', 'articles', 'events']) {
    try {
      const info = await db.all(`PRAGMA table_info(${table})`);
      const columns = new Set(info.map((c) => c.name));
      if (!columns.has('rejection_reason')) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN rejection_reason TEXT`);
        console.log(`✅ Added ${table}.rejection_reason column`);
      }
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.warn(`Migration warning (${table}.rejection_reason):`, err.message);
      }
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT,
        count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tags table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (tags):', err.message);
    }
  }
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER,
        resource_type TEXT,
        resource_id INTEGER,
        action TEXT,
        reason TEXT,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Audit logs table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (audit_logs):', err.message);
    }
  }
  
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id, item_type)
      )
    `);
    console.log('✅ Favorites table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (favorites):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id)`);
    console.log('✅ User follows table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (user_follows):', err.message);
    }
  }

  try {
    const usersInfo = await db.all(`PRAGMA table_info(users)`);
    const userColumns = usersInfo.map(col => col.name);

    if (userColumns.length > 0) {
      if (!userColumns.includes('organization_cr')) {
        await db.exec(`ALTER TABLE users ADD COLUMN organization_cr TEXT`);
        console.log('✅ Added organization_cr to users table');
      }

      if (!userColumns.includes('avatar')) {
        await db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
        console.log('✅ Added avatar to users table');
      }

      if (!userColumns.includes('gender')) {
        await db.exec(`ALTER TABLE users ADD COLUMN gender TEXT`);
        console.log('✅ Added gender to users table');
      }

      if (!userColumns.includes('age')) {
        await db.exec(`ALTER TABLE users ADD COLUMN age INTEGER`);
        console.log('✅ Added age to users table');
      }

      if (!userColumns.includes('nickname')) {
        await db.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
        console.log('✅ Added nickname to users table');
      }

      if (userColumns.includes('organization') && !userColumns.includes('organization_cr')) {
        await db.exec(`
          UPDATE users
          SET organization_cr = organization
          WHERE organization_cr IS NULL OR organization_cr = ''
        `);
        console.log('✅ Backfilled organization_cr from organization');
      }
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (users):', err.message);
    }
  }

  // Migration: Nickname partial unique index.
  // See openspec/changes/community-identity-and-follow-notifications/ for context.
  try {
    const nicknameCollisions = await db.all(
      `SELECT nickname, GROUP_CONCAT(id) AS ids, COUNT(*) AS cnt
       FROM users WHERE nickname IS NOT NULL AND nickname <> ''
       GROUP BY nickname HAVING cnt > 1`
    );
    if (nicknameCollisions.length > 0) {
      console.warn(
        '[Migration warning] nickname collisions detected, resolve before UNIQUE enforcement:',
        nicknameCollisions,
      );
    }
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nickname
                   ON users(nickname) WHERE nickname IS NOT NULL`);
    console.log('✅ users.nickname partial UNIQUE index ready');
  } catch (err) {
    console.warn('Migration warning (users.nickname unique):', err.message);
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS site_visit_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        visitor_key TEXT NOT NULL,
        page_path TEXT,
        date_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS site_daily_visitors (
        date_key TEXT NOT NULL,
        visitor_key TEXT NOT NULL,
        first_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (date_key, visitor_key)
      )
    `);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_site_visit_events_date_key ON site_visit_events(date_key)`);
    console.log('✅ Site analytics tables ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (analytics):', err.message);
    }
  }

  try {
    const contentTables = ['photos', 'music', 'videos', 'articles', 'events'];

    for (const table of contentTables) {
      const tableInfo = await db.all(`PRAGMA table_info(${table})`);
      const columnNames = tableInfo.map(col => col.name);

      if (columnNames.length === 0) continue;

      if (!columnNames.includes('created_at')) {
        await db.exec(`ALTER TABLE ${table} ADD COLUMN created_at TEXT`);
        console.log(`✅ Added created_at to ${table}`);
      }

      const fallbackDateExpression = columnNames.includes('date')
        ? `CASE
            WHEN date IS NOT NULL AND TRIM(date) <> '' THEN substr(date, 1, 19)
            ELSE datetime('now', '-' || ((ABS(id) * 3) % 21) || ' days')
          END`
        : `datetime('now', '-' || ((ABS(id) * 3) % 21) || ' days')`;

      await db.exec(`
        UPDATE ${table}
        SET created_at = ${fallbackDateExpression}
        WHERE created_at IS NULL OR TRIM(created_at) = ''
      `);
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (content created_at):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_photos_status_deleted_created_at ON photos(status, deleted_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_music_status_deleted_created_at ON music(status, deleted_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_videos_status_deleted_created_at ON videos(status, deleted_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_articles_status_deleted_created_at ON articles(status, deleted_at, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_events_status_deleted_date ON events(status, deleted_at, date DESC);
      CREATE INDEX IF NOT EXISTS idx_events_status_deleted_views ON events(status, deleted_at, views DESC);
      CREATE INDEX IF NOT EXISTS idx_events_uploader_id ON events(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_articles_uploader_id ON articles(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_videos_uploader_id ON videos(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_music_uploader_id ON music(uploader_id);
      CREATE INDEX IF NOT EXISTS idx_photos_uploader_id ON photos(uploader_id);
    `);
    console.log('✅ Resource indexes ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (resource indexes):', err.message);
    }
  }

  try {
    const eventsInfo = await db.all(`PRAGMA table_info(events)`);
    const eventColumns = eventsInfo.map(col => col.name);

    if (eventColumns.length > 0 && !eventColumns.includes('views')) {
      await db.exec(`ALTER TABLE events ADD COLUMN views INTEGER DEFAULT 0`);
      console.log('✅ Added views to events table');
    }

    await db.exec(`
      CREATE TABLE IF NOT EXISTS event_view_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        visitor_key TEXT NOT NULL,
        date_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_view_events_event_id ON event_view_events(event_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_view_events_visitor_key ON event_view_events(visitor_key)`);
    await db.exec(`UPDATE events SET views = COALESCE(views, 0) WHERE views IS NULL`);
    console.log('✅ Event view analytics ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (event views):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id),
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const registrationInfo = await db.all(`PRAGMA table_info(event_registrations)`);
    const registrationColumns = registrationInfo.map(col => col.name);

    if (registrationColumns.length > 0 && !registrationColumns.includes('created_at')) {
      await db.exec(`ALTER TABLE event_registrations ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
      console.log('✅ Added created_at to event_registrations table');
    }

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id)`);
    await db.exec(`
      UPDATE event_registrations
      SET created_at = datetime('now')
      WHERE created_at IS NULL OR TRIM(created_at) = ''
    `);
    console.log('✅ Event registrations analytics ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (event registrations):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        section TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        status TEXT DEFAULT 'approved',
        post_status TEXT,
        deadline TEXT,
        max_members INTEGER,
        current_members INTEGER DEFAULT 0,
        author_id INTEGER NOT NULL,
        author_name TEXT,
        author_avatar TEXT,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_post_likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_post_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_posts_section_status_created ON community_posts(section, status, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts(author_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_posts_likes ON community_posts(likes_count DESC, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_posts_post_status ON community_posts(section, post_status, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_post_likes_post ON community_post_likes(post_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_post_likes_user ON community_post_likes(user_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_post_members_post ON community_post_members(post_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_post_members_user ON community_post_members(user_id)`);
    console.log('✅ Community posts tables ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (community posts):', err.message);
    }
  }

  // Migration: community_posts.is_anonymous opt-in flag (help posts only).
  try {
    const postsInfo = await db.all('PRAGMA table_info(community_posts)');
    const postsColumns = new Set(postsInfo.map((c) => c.name));
    if (!postsColumns.has('is_anonymous')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN is_anonymous INTEGER DEFAULT 0`);
      console.log('✅ Added community_posts.is_anonymous column');
    }
  } catch (err) {
    console.warn('Migration warning (community_posts.is_anonymous):', err.message);
  }

  // --- Articles: add category column ---
  try {
    const articlesInfo2 = await db.all(`PRAGMA table_info(articles)`);
    const articlesColumns2 = articlesInfo2.map(col => col.name);

    if (articlesColumns2.length > 0 && !articlesColumns2.includes('category')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN category TEXT NOT NULL DEFAULT 'tech'`);
      console.log('✅ Added category column to articles table');
    }
    if (articlesColumns2.length > 0 && !articlesColumns2.includes('reading_time')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN reading_time INTEGER DEFAULT 0`);
      console.log('✅ Added reading_time column to articles table');
    }
    if (articlesColumns2.length > 0 && !articlesColumns2.includes('slug')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN slug TEXT`);
      console.log('✅ Added slug column to articles table');
    }
    if (articlesColumns2.length > 0 && !articlesColumns2.includes('views_count')) {
      await db.exec(`ALTER TABLE articles ADD COLUMN views_count INTEGER DEFAULT 0`);
      console.log('✅ Added views_count column to articles table');
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (articles category):', err.message);
    }
  }

  await ensureColumns('articles', {
    related_article_ids: 'TEXT',
    related_post_ids: 'TEXT',
    related_news_ids: 'TEXT',
    related_group_ids: 'TEXT',
  }, 'articles');

  // --- Community posts: add content_blocks and link columns ---
  try {
    const cpInfo = await db.all(`PRAGMA table_info(community_posts)`);
    const cpColumns = cpInfo.map(col => col.name);

    if (cpColumns.length > 0 && !cpColumns.includes('content_blocks')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN content_blocks TEXT`);
      console.log('✅ Added content_blocks column to community_posts');
    }
    if (cpColumns.length > 0 && !cpColumns.includes('link')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN link TEXT`);
      console.log('✅ Added link column to community_posts');
    }
    if (cpColumns.length > 0 && !cpColumns.includes('post_status')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN post_status TEXT`);
      console.log('✅ Added post_status column to community_posts');
    }
    if (cpColumns.length > 0 && !cpColumns.includes('deadline')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN deadline TEXT`);
      console.log('✅ Added deadline column to community_posts');
    }
    if (cpColumns.length > 0 && !cpColumns.includes('max_members')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN max_members INTEGER`);
      console.log('✅ Added max_members column to community_posts');
    }
    if (cpColumns.length > 0 && !cpColumns.includes('current_members')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN current_members INTEGER DEFAULT 0`);
      console.log('✅ Added current_members column to community_posts');
    }

    await db.exec(`
      UPDATE community_posts
      SET post_status = CASE
        WHEN section = 'help' THEN COALESCE(post_status, 'open')
        WHEN section = 'team' THEN COALESCE(post_status, 'recruiting')
        ELSE COALESCE(post_status, 'published')
      END
      WHERE post_status IS NULL OR TRIM(post_status) = ''
    `);
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (community_posts columns):', err.message);
    }
  }

  await ensureColumns('community_posts', {
    related_article_ids: 'TEXT',
    related_post_ids: 'TEXT',
    related_news_ids: 'TEXT',
    related_group_ids: 'TEXT',
  }, 'community_posts');

  // --- Community posts: add solved_comment_id ---
  try {
    const cpInfo2 = await db.all(`PRAGMA table_info(community_posts)`);
    const cpCols2 = cpInfo2.map(col => col.name);
    if (cpCols2.length > 0 && !cpCols2.includes('solved_comment_id')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN solved_comment_id INTEGER`);
      console.log('✅ Added solved_comment_id column to community_posts');
    }
    if (cpCols2.length > 0 && !cpCols2.includes('is_pinned')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN is_pinned INTEGER DEFAULT 0`);
      console.log('✅ Added is_pinned column to community_posts');
    }
    if (cpCols2.length > 0 && !cpCols2.includes('pin_weight')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN pin_weight INTEGER DEFAULT 0`);
      console.log('✅ Added pin_weight column to community_posts');
    }
    if (cpCols2.length > 0 && !cpCols2.includes('last_replied_at')) {
      await db.exec(`ALTER TABLE community_posts ADD COLUMN last_replied_at DATETIME`);
      console.log('✅ Added last_replied_at column to community_posts');
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (solved_comment_id):', err.message);
    }
  }

  // --- Community groups table ---
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        platform TEXT NOT NULL DEFAULT 'wechat',
        qr_code_url TEXT,
        invite_link TEXT,
        member_count INTEGER DEFAULT 0,
        category TEXT,
        created_by INTEGER,
        review_note TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    console.log('✅ Community groups table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (community_groups):', err.message);
    }
  }

  console.log('✅ Database migrations completed');
  try {
    const groupInfo = await db.all(`PRAGMA table_info(community_groups)`);
    const groupColumns = groupInfo.map(col => col.name);
    if (groupColumns.length > 0 && !groupColumns.includes('review_status')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN review_status TEXT DEFAULT 'approved'`);
    }
    if (groupColumns.length > 0 && !groupColumns.includes('is_recommended')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN is_recommended INTEGER DEFAULT 0`);
    }
    if (groupColumns.length > 0 && !groupColumns.includes('sort_order')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN sort_order INTEGER DEFAULT 0`);
    }
    if (groupColumns.length > 0 && !groupColumns.includes('valid_until')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN valid_until TEXT`);
    }
    if (groupColumns.length > 0 && !groupColumns.includes('is_expired')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN is_expired INTEGER DEFAULT 0`);
    }
    if (groupColumns.length > 0 && !groupColumns.includes('review_note')) {
      await db.exec(`ALTER TABLE community_groups ADD COLUMN review_note TEXT`);
    }
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('Migration warning (community_groups columns):', err.message);
    }
  }

  await ensureColumns('community_groups', {
    primary_tags: 'TEXT',
    related_article_ids: 'TEXT',
    related_post_ids: 'TEXT',
    related_news_ids: 'TEXT',
    related_group_ids: 'TEXT',
  }, 'community_groups');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        comment_id INTEGER,
        target_type TEXT NOT NULL DEFAULT 'post',
        reason TEXT,
        reporter_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_reports_post ON community_reports(post_id, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_reports_reporter ON community_reports(reporter_id, created_at DESC)`);
    await db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_community_reports_unique_target ON community_reports(post_id, COALESCE(comment_id, 0), reporter_id, target_type)`);
    console.log('✅ Community reports table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (community_reports):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        excerpt TEXT,
        content TEXT,
        content_blocks TEXT,
        cover TEXT,
        source_name TEXT,
        source_url TEXT,
        import_type TEXT DEFAULT 'manual',
        external_id TEXT,
        hot_score INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        pin_weight INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'approved',
        uploader_id INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at DATETIME
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_news_status_created ON news(status, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_news_hot_score ON news(status, is_pinned DESC, pin_weight DESC, hot_score DESC, created_at DESC)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_news_source_url ON news(source_url)`);
    console.log('✅ News table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (news):', err.message);
    }
  }

  console.log('✅ Database migrations completed');
  await ensureColumns('news', {
    related_article_ids: 'TEXT',
    related_post_ids: 'TEXT',
    related_news_ids: 'TEXT',
    related_group_ids: 'TEXT',
  }, 'news');

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS community_metrics_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        metric_type TEXT NOT NULL,
        source_type TEXT,
        source_id INTEGER,
        target_type TEXT,
        target_id INTEGER,
        actor_id INTEGER,
        date_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_metrics_type_date ON community_metrics_events(metric_type, date_key)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_community_metrics_source ON community_metrics_events(source_type, source_id, date_key)`);
    console.log('✅ Community metrics events table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (community metrics):', err.message);
    }
  }

}

module.exports = {
  runMigrations
};
