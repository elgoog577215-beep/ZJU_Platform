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
