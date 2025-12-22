const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function rebuild() {
  console.log('Starting database rebuild...');

  // 1. Delete existing database
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      console.log('Deleted existing database.');
    } catch (e) {
      console.error('Error deleting database:', e.message);
      // Proceeding anyway, might be locked but we'll try to open it
    }
  }

  // 2. Clean uploads directory
  if (fs.existsSync(UPLOADS_DIR)) {
    const files = fs.readdirSync(UPLOADS_DIR);
    for (const file of files) {
      if (file !== '.gitkeep' && !file.startsWith('cat_') && !file.startsWith('homepage_hero') && !file.startsWith('placeholder')) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    }
    console.log('Cleaned uploads directory (kept category images and placeholders).');
  } else {
    fs.mkdirSync(UPLOADS_DIR);
  }

  // 3. Initialize new Database
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // 4. Create Tables
  // Standardized Schema:
  // - users: Standard user table
  // - resources: Unified table for all content types (photo, music, video, article, event)
  // - settings: Key-value store
  // - tags: Normalized tags (optional, but good for standardization)
  // - comments: For articles/events
  
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'photo', 'music', 'video', 'article', 'event'
      title TEXT NOT NULL,
      description TEXT, -- Short description / excerpt
      content TEXT, -- Long content / HTML
      file_url TEXT, -- Main file (image, audio, video)
      cover_url TEXT, -- Thumbnail / Cover image
      category TEXT, -- Simple category string
      tags TEXT, -- Comma separated tags
      featured BOOLEAN DEFAULT 0,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected'
      uploader_id INTEGER,
      extra_data TEXT, -- JSON string for type-specific fields (artist, duration, location, date, etc.)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      deleted_at DATETIME,
      FOREIGN KEY(uploader_id) REFERENCES users(id)
    );

    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_id INTEGER,
      user_id INTEGER,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(resource_id) REFERENCES resources(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Tables created.');

  // 5. Seed Admin User
  // Default password: 'admin' (hashed)
  const adminPass = '$2a$10$YourHashedPasswordHere'; // Placeholder, ideally use bcrypt
  // We'll use a simple hash for now or just insert 'admin' if the auth system allows plain text (dev mode)
  // Or better, let's assume the existing auth uses bcrypt.
  // I'll try to keep it simple. If the previous system used bcrypt, I should too.
  // userController.js imports bcryptjs.
  
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('admin', 10);
  
  await db.run(`
    INSERT INTO users (username, password, role, nickname)
    VALUES ('admin', ?, 'admin', 'System Admin')
  `, [hash]);

  console.log('Admin user seeded (admin/admin).');
  
  // 6. Seed Initial Settings
  await db.run(`INSERT INTO settings (key, value) VALUES ('site_title', 'LUMOS')`);
  await db.run(`INSERT INTO settings (key, value) VALUES ('hero_title', 'Explore the Future')`);
  await db.run(`INSERT INTO settings (key, value) VALUES ('hero_subtitle', 'Discover amazing digital content')`);
  // Use local path for hero background
  await db.run(`INSERT INTO settings (key, value) VALUES ('hero_bg_url', '/uploads/homepage_hero.jpg')`);

  console.log('Database rebuild complete.');
}

rebuild().catch(console.error);
