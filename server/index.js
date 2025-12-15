const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getDb } = require('./src/config/db');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = 3001;

// Security & Optimization Middleware
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow loading resources (images) from localhost
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiting to API routes
app.use('/api', limiter);

app.use(cors());
app.use(express.json());

// Static files
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir, {
  maxAge: '30d', // Cache uploads for 30 days
  immutable: true
}));

// Serve Frontend Static Files (Production)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// API Routes
app.use('/api', apiRoutes);

// Catch-all for SPA (must be after API routes)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Database Initialization
getDb().then(async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      location TEXT,
      category TEXT,
      status TEXT,
      image TEXT,
      description TEXT,
      content TEXT,
      link TEXT,
      featured BOOLEAN DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      articleId INTEGER,
      author TEXT,
      content TEXT,
      date TEXT,
      avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS event_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS photo_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS video_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS music_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS article_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT,
      category TEXT,
      size TEXT,
      gameType TEXT,
      gameDescription TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS music (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      artist TEXT,
      duration TEXT,
      cover TEXT,
      audio TEXT,
      category TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      category TEXT,
      thumbnail TEXT,
      video TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      excerpt TEXT,
      tag TEXT,
      content TEXT,
      cover TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user',
      avatar TEXT,
      organization_cr TEXT,
      gender TEXT,
      age INTEGER,
      nickname TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      item_id INTEGER,
      item_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, item_id, item_type)
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      resource_type TEXT,
      resource_id INTEGER,
      action TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER,
      user_id INTEGER,
      status TEXT DEFAULT 'registered',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_id, user_id)
    );
  `);
  
  // Migration for user table
  try {
      await db.exec(`ALTER TABLE users ADD COLUMN avatar TEXT`);
      await db.exec(`ALTER TABLE users ADD COLUMN organization_cr TEXT`);
      await db.exec(`ALTER TABLE users ADD COLUMN gender TEXT`);
      await db.exec(`ALTER TABLE users ADD COLUMN age INTEGER`);
      await db.exec(`ALTER TABLE users ADD COLUMN nickname TEXT`);
  } catch (e) {}

  // Migration for existing tables
  const tables = ['photos', 'music', 'videos', 'articles', 'events'];
  for (const table of tables) {
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN likes INTEGER DEFAULT 0`);
      } catch (e) {}
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN status TEXT DEFAULT 'approved'`); // Existing content is approved
      } catch (e) {}
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN uploader_id INTEGER`);
      } catch (e) {}
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN rejection_reason TEXT`);
      } catch (e) {}
      
      // Ensure music has category column if it was missing
      if (table === 'music') {
          try {
              await db.exec(`ALTER TABLE music ADD COLUMN category TEXT`);
          } catch (e) {}
      }
      
      // Ensure all tables have tags column
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN tags TEXT`);
      } catch (e) {}
      
      // Ensure events has link column
      if (table === 'events') {
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN link TEXT`);
          } catch (e) {}
      }

      // Create Indices for Performance
      try {
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_status ON ${table}(status)`);
          
          if (['photos', 'videos', 'events', 'music'].includes(table)) {
             await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_category ON ${table}(category)`);
          }
          
          if (table === 'articles') {
             await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tag ON ${table}(tag)`);
          }
          
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tags ON ${table}(tags)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_uploader_id ON ${table}(uploader_id)`);
      } catch (e) {
          console.error(`Failed to create indices for ${table}:`, e);
      }
  }
  
  // Seed Categories if empty
  const categoryResources = [
      { table: 'photos', catTable: 'photo_categories' },
      { table: 'videos', catTable: 'video_categories' },
      { table: 'music', catTable: 'music_categories' }, // Music might use 'category' or something else?
      { table: 'articles', catTable: 'article_categories', col: 'tag' },
      { table: 'events', catTable: 'event_categories' }
  ];

  for (const { table, catTable, col } of categoryResources) {
      try {
          const count = await db.get(`SELECT COUNT(*) as count FROM ${catTable}`);
          if (count.count === 0) {
              console.log(`Seeding ${catTable} from existing ${table}...`);
              const column = col || 'category';
              // Check if column exists first? 
              // Actually articles uses 'tag' not 'category' in the definition!
              // But wait, the table definition for articles says:
              // id, title, date, excerpt, tag, content, cover...
              // So for articles it is 'tag'.
              
              const distinctCats = await db.all(`SELECT DISTINCT ${column} FROM ${table}`);
              for (const row of distinctCats) {
                  if (row[column]) {
                      await db.run(`INSERT OR IGNORE INTO ${catTable} (name) VALUES (?)`, [row[column]]);
                  }
              }
          }
      } catch (e) {
          console.error(`Failed to seed ${catTable}:`, e);
      }
  }
  
  // Fix events status migration: Update legacy status to approved
  try {
      const legacyStatuses = ['Upcoming', 'Past', 'Ongoing', 'Open'];
      const placeholders = legacyStatuses.map(() => '?').join(',');
      const result = await db.run(`UPDATE events SET status = 'approved' WHERE status IN (${placeholders})`, legacyStatuses);
      if (result.changes > 0) console.log(`Migrated ${result.changes} events to approved status`);
  } catch (e) {
      console.error('Event status migration failed:', e);
  }

  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});