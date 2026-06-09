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
    if (!eventsColumns.includes('category')) {
      await db.exec(`ALTER TABLE events ADD COLUMN category TEXT`);
      console.log('✅ Added category to events table');
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
    await ensureColumns('comments', {
      user_id: 'INTEGER',
      parent_id: 'INTEGER',
      author: 'TEXT',
      author_name: 'TEXT',
      avatar: 'TEXT',
      root_id: 'INTEGER',
      reply_to_comment_id: 'INTEGER',
      floor_number: 'INTEGER',
      quote_snapshot: 'TEXT',
      likes: 'INTEGER DEFAULT 0',
      updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    }, 'comments');

    const commentsInfo = await db.all(`PRAGMA table_info(comments)`);
    const commentColumns = commentsInfo.map(col => col.name);
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
    await ensureColumns('notifications', {
      title: 'TEXT',
      message: 'TEXT',
      content: 'TEXT',
      data: 'TEXT',
    }, 'notifications');

    const notifInfo = await db.all('PRAGMA table_info(notifications)');
    const notifColumns = new Set(notifInfo.map((c) => c.name));
    if (!notifColumns.has('content')) {
      await db.exec(`ALTER TABLE notifications ADD COLUMN content TEXT`);
      console.log('✅ Added notifications.content column');
    }
    await db.run(`
      UPDATE notifications
      SET content = COALESCE(content, message, title)
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
  for (const table of ['photos', 'music', 'videos', 'articles', 'events', 'news', 'community_posts']) {
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
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_identity_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'team', 'club')),
        display_name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS competition_work_identity_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        work_id INTEGER NOT NULL,
        claim_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        matched_text TEXT,
        match_source TEXT DEFAULT 'auto' CHECK (match_source IN ('auto', 'manual_user', 'manual_admin')),
        status TEXT DEFAULT 'candidate' CHECK (status IN ('candidate', 'confirmed', 'rejected', 'revoked')),
        confidence REAL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TEXT,
        UNIQUE(work_id, claim_id),
        FOREIGN KEY (work_id) REFERENCES competition_works(id) ON DELETE CASCADE,
        FOREIGN KEY (claim_id) REFERENCES user_identity_claims(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_identity_claims_user_status
        ON user_identity_claims(user_id, status, type);
      CREATE INDEX IF NOT EXISTS idx_user_identity_claims_match
        ON user_identity_claims(normalized_name, type, status);
      CREATE INDEX IF NOT EXISTS idx_competition_work_identity_links_user_status
        ON competition_work_identity_links(user_id, status, work_id);
      CREATE INDEX IF NOT EXISTS idx_competition_work_identity_links_work_status
        ON competition_work_identity_links(work_id, status, user_id);
      CREATE INDEX IF NOT EXISTS idx_competition_work_identity_links_claim
        ON competition_work_identity_links(claim_id, status);
    `);
    console.log('User identity claim and outcome binding tables ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (identity claims/outcome links):', err.message);
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

      if (!userColumns.includes('profile_slogan')) {
        await db.exec(`ALTER TABLE users ADD COLUMN profile_slogan TEXT`);
        console.log('Added profile_slogan to users table');
      }

      if (!userColumns.includes('profile_status')) {
        await db.exec(`ALTER TABLE users ADD COLUMN profile_status TEXT`);
        console.log('Added profile_status to users table');
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

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS user_profile_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_social_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        platform TEXT NOT NULL,
        label TEXT,
        url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_profile_cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT,
        body TEXT,
        note TEXT,
        card_type TEXT DEFAULT 'other',
        custom_type TEXT,
        cover_url TEXT,
        description TEXT,
        link_url TEXT,
        crop_x REAL DEFAULT 0,
        crop_y REAL DEFAULT 0,
        crop_width REAL DEFAULT 1,
        crop_height REAL DEFAULT 1,
        aspect_ratio TEXT DEFAULT 'wide',
        tags_json TEXT,
        images_json TEXT,
        links_json TEXT,
        sort_order INTEGER DEFAULT 0,
        is_visible INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_user_profile_tags_user_sort
        ON user_profile_tags(user_id, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_user_social_links_user_sort
        ON user_social_links(user_id, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_user_profile_cards_user_sort
        ON user_profile_cards(user_id, sort_order, id);
    `);

    const profileCardColumns = await db.all(`PRAGMA table_info(user_profile_cards)`);
    const profileCardColumnNames = profileCardColumns.map((column) => column.name);
    const profileCardColumnAdds = [
      ['card_type', `ALTER TABLE user_profile_cards ADD COLUMN card_type TEXT DEFAULT 'other'`],
      ['custom_type', `ALTER TABLE user_profile_cards ADD COLUMN custom_type TEXT`],
      ['cover_url', `ALTER TABLE user_profile_cards ADD COLUMN cover_url TEXT`],
      ['description', `ALTER TABLE user_profile_cards ADD COLUMN description TEXT`],
      ['link_url', `ALTER TABLE user_profile_cards ADD COLUMN link_url TEXT`],
      ['crop_x', `ALTER TABLE user_profile_cards ADD COLUMN crop_x REAL DEFAULT 0`],
      ['crop_y', `ALTER TABLE user_profile_cards ADD COLUMN crop_y REAL DEFAULT 0`],
      ['crop_width', `ALTER TABLE user_profile_cards ADD COLUMN crop_width REAL DEFAULT 1`],
      ['crop_height', `ALTER TABLE user_profile_cards ADD COLUMN crop_height REAL DEFAULT 1`],
      ['aspect_ratio', `ALTER TABLE user_profile_cards ADD COLUMN aspect_ratio TEXT DEFAULT 'wide'`],
    ];
    for (const [columnName, sql] of profileCardColumnAdds) {
      if (!profileCardColumnNames.includes(columnName)) {
        await db.exec(sql);
      }
    }
    console.log('User profile card tables ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (profile card tables):', err.message);
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
      CREATE INDEX IF NOT EXISTS idx_events_status_deleted_category ON events(status, deleted_at, category);
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
    rejection_reason: 'TEXT',
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
    rejection_reason: 'TEXT',
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

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS hackathon_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        student_id TEXT NOT NULL UNIQUE,
        major TEXT NOT NULL,
        grade TEXT NOT NULL,
        ai_tools TEXT NOT NULL,
        experience TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_student_id ON hackathon_registrations(student_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_created_at ON hackathon_registrations(created_at DESC)`);
    // Add experience column to existing tables
    await db.exec(`ALTER TABLE hackathon_registrations ADD COLUMN experience TEXT DEFAULT ''`);
    console.log('✅ Hackathon registrations table ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (hackathon registrations):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS future_learning_registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        gender TEXT NOT NULL,
        organization TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        message TEXT DEFAULT '',
        status TEXT DEFAULT 'new',
        admin_note TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await ensureColumns('future_learning_registrations', {
      status: "TEXT DEFAULT 'new'",
      admin_note: "TEXT DEFAULT ''",
      updated_at: 'DATETIME',
    }, 'future_learning_registrations');
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_future_learning_registrations_created_at
        ON future_learning_registrations(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_future_learning_registrations_status
        ON future_learning_registrations(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_future_learning_registrations_contact
        ON future_learning_registrations(email, phone);
    `);
    await db.exec(`
      UPDATE future_learning_registrations
      SET status = COALESCE(NULLIF(status, ''), 'new'),
          admin_note = COALESCE(admin_note, ''),
          updated_at = COALESCE(updated_at, created_at, datetime('now'))
    `);
    console.log('✅ Future learning registrations table ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (future learning registrations):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ecosystem_partners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        dark_logo_url TEXT,
        link_url TEXT,
        sort_order INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        featured INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted_at DATETIME
      )
    `);

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ecosystem_partners_public
        ON ecosystem_partners(enabled, featured, category, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_ecosystem_partners_admin
        ON ecosystem_partners(category, sort_order, id);
    `);

    const partnerCount = await db.get('SELECT COUNT(*) AS count FROM ecosystem_partners');
    if ((partnerCount?.count || 0) === 0) {
      const defaults = [
        ['school', '未来学习中心', '提供场景、空间、组织协同与长期机制支持。', null, null, null, 10],
        ['school', 'AI 联合实验室', '提供校内 AI 实践与联合探索支持。', null, null, null, 20],
        ['organization', 'XLAB', '协同选手招募、志愿执行与赛后社群承接。', null, null, null, 10],
        ['organization', 'ZJUAI', '协同校园 AI 学习者与开发者社群连接。', null, null, null, 20],
        ['organization', 'EAI', '协同活动运营、现场执行与实践人群组织。', null, null, null, 30],
        ['organization', 'AIRA', '协同 AI 实践社群共建与项目交流。', null, null, null, 40],
        ['organization', 'KAB', '协同创新创业人群组织与活动承接。', null, null, null, 50],
        ['enterprise', 'MiniMax', '提供模型能力、技术资源与生态支持。', '/images/partner-logos/minimax.png', '/images/partner-logos/minimax-dark.png', null, 10],
        ['enterprise', 'ModelScope 魔搭社区', '提供模型社区、技术资源与开发者生态支持。', '/images/partner-logos/modelscope.png', '/images/partner-logos/modelscope-dark.png', null, 20],
        ['enterprise', 'Bonjour', '提供数字名片与合作传播支持。', '/images/partner-logos/company-3.png', '/images/partner-logos/company-3-dark.png', null, 30],
        ['enterprise', '阿里云', '提供云资源与技术基础设施支持。', '/images/partner-logos/aliyun-cn.svg?v=2', '/images/partner-logos/aliyun-cn-white.svg?v=2', null, 40],
        ['enterprise', 'Qoder', '提供 AI 开发工具与工程实践支持。', '/images/partner-logos/qoder.png', '/images/partner-logos/qoder-dark.png', null, 50],
        ['enterprise', '阶跃 StepFun', '提供模型、平台与技术生态支持。', '/images/partner-logos/stepfun.png', '/images/partner-logos/stepfun-white.png', null, 60],
      ];

      for (const partner of defaults) {
        await db.run(
          `INSERT INTO ecosystem_partners (
            category, name, description, logo_url, dark_logo_url, link_url,
            sort_order, enabled, featured, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, datetime('now'), datetime('now'))`,
          partner,
        );
      }
      console.log('✅ Ecosystem partners seeded');
    }

    console.log('✅ Ecosystem partners table ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (ecosystem partners):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS media_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME
      );
    `);

    await ensureColumns('media_categories', {
      name: 'TEXT NOT NULL DEFAULT ""',
      description: 'TEXT',
      sort_order: 'INTEGER DEFAULT 0',
      status: "TEXT DEFAULT 'active'",
      created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      deleted_at: 'DATETIME',
    }, 'media_categories');

    await ensureColumns('photos', {
      category_id: 'INTEGER',
    }, 'photos');

    await ensureColumns('videos', {
      category_id: 'INTEGER',
    }, 'videos');

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_media_categories_public
        ON media_categories(status, deleted_at, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_photos_category_status
        ON photos(category_id, status, deleted_at, id DESC);
      CREATE INDEX IF NOT EXISTS idx_videos_category_status
        ON videos(category_id, status, deleted_at, id DESC);
    `);

    console.log('Media categories ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (media categories):', err.message);
    }
  }

  try {
    await ensureColumns('competitions', {
      slug: 'TEXT',
      title: 'TEXT NOT NULL DEFAULT ""',
      subtitle: 'TEXT',
      description: 'TEXT',
      event_date: 'TEXT',
      cover_image: 'TEXT',
      is_featured: 'INTEGER DEFAULT 0',
      status: "TEXT DEFAULT 'active'",
      created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      deleted_at: 'DATETIME',
    }, 'competitions');

    await ensureColumns('competition_media', {
      competition_id: 'INTEGER',
      type: 'TEXT',
      title: 'TEXT NOT NULL DEFAULT ""',
      description: 'TEXT',
      url: 'TEXT NOT NULL DEFAULT ""',
      cover_url: 'TEXT',
      sort_order: 'INTEGER DEFAULT 0',
      status: "TEXT DEFAULT 'pending'",
      uploader_id: 'INTEGER',
      reviewed_by: 'INTEGER',
      review_note: 'TEXT',
      reviewed_at: 'TEXT',
      created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      deleted_at: 'DATETIME',
    }, 'competition_media');

    await ensureColumns('competition_works', {
      competition_id: 'INTEGER',
      title: 'TEXT NOT NULL DEFAULT ""',
      author: 'TEXT NOT NULL DEFAULT ""',
      summary: 'TEXT NOT NULL DEFAULT ""',
      git_url: 'TEXT',
      award: 'TEXT',
      rank: 'TEXT',
      cover_url: 'TEXT',
      honor_title: 'TEXT',
      grade: 'TEXT',
      major: 'TEXT',
      highlight: 'TEXT',
      experience: 'TEXT',
      story_file_url: 'TEXT',
      public_consent: 'INTEGER DEFAULT 1',
      sort_order: 'INTEGER DEFAULT 0',
      status: "TEXT DEFAULT 'pending'",
      uploader_id: 'INTEGER',
      reviewed_by: 'INTEGER',
      review_note: 'TEXT',
      reviewed_at: 'TEXT',
      created_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      updated_at: 'TEXT DEFAULT CURRENT_TIMESTAMP',
      deleted_at: 'DATETIME',
    }, 'competition_works');

    await ensureColumns('photos', {
      category_id: 'INTEGER',
      gameType: 'TEXT',
      gameDescription: 'TEXT',
    }, 'photos');

    await ensureColumns('videos', {
      category_id: 'INTEGER',
      gameType: 'TEXT',
      gameDescription: 'TEXT',
    }, 'videos');

    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_competitions_featured
        ON competitions(is_featured, status, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_competition_media_comp_status_type
        ON competition_media(competition_id, status, type, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_competition_media_status_created
        ON competition_media(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_competition_works_comp_status
        ON competition_works(competition_id, status, sort_order, id);
      CREATE INDEX IF NOT EXISTS idx_competition_works_status_created
        ON competition_works(status, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_competition_works_uploader_status
        ON competition_works(uploader_id, status, deleted_at, public_consent, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_videos_game_type_status
        ON videos(gameType, status, deleted_at, id DESC);
      CREATE INDEX IF NOT EXISTS idx_photos_game_type_status
        ON photos(gameType, status, deleted_at, id DESC);
    `);
    const activeCompetitionCount = await db.get(
      "SELECT COUNT(*) AS count FROM competitions WHERE deleted_at IS NULL",
    );
    if ((activeCompetitionCount?.count || 0) === 0) {
      await db.run(
        `INSERT INTO competitions (
          slug, title, subtitle, description, event_date, is_featured, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, 'active', datetime('now'), datetime('now'))`,
        [
          'ai-full-stack-hackathon-outcome',
          'AI 全栈极速黑客松',
          '比赛成果展示',
          '赛事宣传片、赛场照片和优秀作品会在审核通过后展示在这里。',
          '2026',
        ],
      );
    }
    console.log('Competition outcome tables ready');
  } catch (err) {
    if (!err.message.includes('already exists') && !err.message.includes('duplicate column')) {
      console.warn('Migration warning (competition outcomes):', err.message);
    }
  }

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ai_model_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        provider TEXT DEFAULT 'openai-compatible',
        base_url TEXT NOT NULL,
        model TEXT NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        priority INTEGER DEFAULT 100,
        enabled INTEGER DEFAULT 1,
        last_status TEXT,
        last_error TEXT,
        last_checked_at DATETIME,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ai_model_configs_enabled_priority
        ON ai_model_configs(enabled, priority, id);

      CREATE TABLE IF NOT EXISTS user_event_preferences (
        user_id INTEGER PRIMARY KEY,
        college TEXT,
        division TEXT,
        grade TEXT,
        campus TEXT,
        availability TEXT,
        interest_tags TEXT,
        preferred_categories TEXT,
        preferred_benefits TEXT,
        preferred_format TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS assistant_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        source TEXT DEFAULT 'event_assistant',
        weight REAL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_assistant_memory_user_type
        ON assistant_memory(user_id, memory_type, updated_at DESC);

      CREATE TABLE IF NOT EXISTS event_recommendation_feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        feedback TEXT NOT NULL,
        query TEXT,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_event_recommendation_feedback_user
        ON event_recommendation_feedback(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_recommendation_feedback_event
        ON event_recommendation_feedback(event_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS ai_assistant_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        requested_by INTEGER,
        summary_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ai_assistant_runs_module_created
        ON ai_assistant_runs(module, created_at DESC);

      CREATE TABLE IF NOT EXISTS event_recommendation_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER,
        user_id INTEGER,
        visitor_key TEXT,
        event_id INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        source TEXT,
        recommendation_rank INTEGER,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES ai_assistant_runs(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_event_recommendation_actions_run
        ON event_recommendation_actions(run_id, event_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_recommendation_actions_user
        ON event_recommendation_actions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_recommendation_actions_event
        ON event_recommendation_actions(event_id, action_type, created_at DESC);

      CREATE TABLE IF NOT EXISTS ai_event_governance_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        confidence REAL DEFAULT 0,
        reason TEXT,
        source TEXT,
        status TEXT DEFAULT 'suggested',
        applied_by INTEGER,
        applied_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES ai_assistant_runs(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (applied_by) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_ai_event_governance_suggestions_run
        ON ai_event_governance_suggestions(run_id, status, confidence DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_event_governance_suggestions_event
        ON ai_event_governance_suggestions(event_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS event_ai_profiles (
        event_id INTEGER PRIMARY KEY,
        profile_version INTEGER DEFAULT 1,
        source_hash TEXT NOT NULL,
        profile_json TEXT NOT NULL,
        summary TEXT,
        category TEXT,
        topic_terms TEXT,
        benefit_terms TEXT,
        campus_terms TEXT,
        audience_terms TEXT,
        organizer_terms TEXT,
        confidence REAL DEFAULT 0,
        status TEXT DEFAULT 'ready',
        last_error TEXT,
        model_name TEXT,
        model_provider TEXT,
        refreshed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_event_ai_profiles_status
        ON event_ai_profiles(status, refreshed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_event_ai_profiles_category
        ON event_ai_profiles(category);
      CREATE INDEX IF NOT EXISTS idx_event_ai_profiles_source_hash
        ON event_ai_profiles(source_hash);

      CREATE TABLE IF NOT EXISTS resource_search_index (
        resource_type TEXT NOT NULL,
        resource_id INTEGER NOT NULL,
        group_key TEXT NOT NULL,
        source_hash TEXT NOT NULL,
        title TEXT,
        summary TEXT,
        content_text TEXT,
        image_url TEXT,
        resource_date TEXT,
        keyword_terms TEXT,
        facet_json TEXT,
        embedding_text TEXT,
        vector_json TEXT,
        quality_score REAL DEFAULT 0,
        popularity_score REAL DEFAULT 0,
        status TEXT DEFAULT 'ready',
        last_error TEXT,
        source_updated_at TEXT,
        indexed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (resource_type, resource_id)
      );

      CREATE INDEX IF NOT EXISTS idx_resource_search_index_group
        ON resource_search_index(group_key, status, indexed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_resource_search_index_source_hash
        ON resource_search_index(source_hash);
      CREATE INDEX IF NOT EXISTS idx_resource_search_index_updated
        ON resource_search_index(status, updated_at DESC);
    `);
    await ensureColumns('user_event_preferences', {
      availability: 'TEXT',
    }, 'user_event_preferences');
    await ensureColumns('resource_search_index', {
      image_url: 'TEXT',
      resource_date: 'TEXT',
      popularity_score: 'REAL DEFAULT 0',
      last_error: 'TEXT',
      source_updated_at: 'TEXT',
    }, 'resource_search_index');
    console.log('AI assistant tables ready');
  } catch (err) {
    if (!err.message.includes('already exists')) {
      console.warn('Migration warning (AI assistant tables):', err.message);
    }
  }

}

module.exports = {
  runMigrations
};
