async function ensureCoreSchema(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      nickname TEXT,
      gender TEXT,
      age INTEGER,
      organization TEXT,
      organization_cr TEXT,
      profile_slogan TEXT,
      profile_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT,
      tags TEXT,
      category_id INTEGER,
      size TEXT,
      gameType TEXT,
      gameDescription TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS music (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      duration INTEGER,
      cover TEXT,
      audio TEXT,
      tags TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      tags TEXT,
      category_id INTEGER,
      thumbnail TEXT,
      video TEXT,
      gameType TEXT,
      gameDescription TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

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

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      excerpt TEXT,
      tag TEXT,
      tags TEXT,
      content TEXT,
      content_blocks TEXT,
      cover TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      end_date TEXT,
      location TEXT,
      tags TEXT,
      status TEXT DEFAULT 'approved',
      image TEXT,
      description TEXT,
      content TEXT,
      link TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      views INTEGER DEFAULT 0,
      uploader_id INTEGER,
      score TEXT,
      target_audience TEXT,
      organizer TEXT,
      volunteer_time TEXT,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      event_date TEXT,
      cover_image TEXT,
      is_featured INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS competition_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL,
      cover_url TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER,
      reviewed_by INTEGER,
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS competition_works (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      summary TEXT NOT NULL,
      git_url TEXT,
      award TEXT,
      rank TEXT,
      cover_url TEXT,
      honor_title TEXT,
      grade TEXT,
      major TEXT,
      highlight TEXT,
      experience TEXT,
      story_file_url TEXT,
      public_consent INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER,
      reviewed_by INTEGER,
      review_note TEXT,
      reviewed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY (competition_id) REFERENCES competitions(id) ON DELETE CASCADE,
      FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      message TEXT NOT NULL,
      date TEXT NOT NULL,
      read BOOLEAN DEFAULT 0
    );
  `);

  console.log('✅ Core schema ready');
}

module.exports = {
  ensureCoreSchema
};
