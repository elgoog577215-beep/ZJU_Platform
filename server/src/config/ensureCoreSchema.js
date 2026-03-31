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
      thumbnail TEXT,
      video TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved',
      uploader_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
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
