require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');

const { getDb } = require('./src/config/db');
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middleware/errorHandler');
const { authenticateToken, isAdmin } = require('./src/middleware/auth');

const app = express();
app.disable('x-powered-by'); // Hide Tech Stack
const PORT = process.env.PORT || 3001;

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging (shorter, no colors)
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400 // Only log errors in production to save space/IO
  }));
}

// Security & Optimization Middleware
app.use(compression({
  level: 6, // 压缩级别，平衡压缩率和性能
  threshold: 1024, // 只有超过 1KB 的响应才压缩
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // 默认压缩过滤器
    return compression.filter(req, res);
  }
}));

// Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // 'unsafe-eval' required for some dev tools
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "*"], // Allow external images
      connectSrc: ["'self'", "https:", "ws:", "wss:"], // Allow WebSocket for HMR
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "data:", "blob:"],
      frameSrc: ["'self'", "https:"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Trust proxy for correct protocol/secure cookies behind Nginx/ALB
app.set('trust proxy', 1);

// Prevent HTTP Parameter Pollution
app.use(hpp());

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

// CORS: Restrict to Frontend URL
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:5173'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      // In development, you might want to allow localhost
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Reduced default limit to 10mb for security
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

const { scrapeWeChat, parseWithLLM } = require('./src/utils/wechat');

// WeChat Parsing Endpoint
app.post('/api/resources/parse-wechat', authenticateToken, isAdmin, async (req, res, next) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // 1. Scrape
        const scrapedData = await scrapeWeChat(url);
        
        // 2. Parse with LLM
        const parsedData = await parseWithLLM(scrapedData);
        
        if (!parsedData) {
             return res.status(500).json({ error: 'Failed to parse content with LLM' });
        }

        // Merge original content into the response for the editor
        // We use the cleaned text from scraping as a starting point for the content field
        parsedData.content = scrapedData.content;

        res.json(parsedData);

    } catch (error) {
        next(error);
    }
});

// API Routes
app.use('/api', apiRoutes);

// Catch-all for SPA (must be after API routes)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    // Disable caching for index.html to ensure PWA updates are detected
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Database Initialization
getDb().then(async (db) => {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      date TEXT,
      location TEXT,
      status TEXT,
      image TEXT,
      description TEXT,
      content TEXT,
      link TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      volunteer_time TEXT,
      score TEXT
    );
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      resource_id INTEGER,
      resource_type TEXT,
      author TEXT,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      avatar TEXT
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      content TEXT,
      related_resource_id INTEGER,
      related_resource_type TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT,
      title TEXT,
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
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      uploader_id INTEGER
    );
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      thumbnail TEXT,
      video TEXT,
      featured BOOLEAN DEFAULT 0,
      likes INTEGER DEFAULT 0,
      -- views INTEGER DEFAULT 0,
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
      -- views INTEGER DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      content TEXT,
      related_resource_id INTEGER,
      related_resource_type TEXT,
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_photos_status_deleted ON photos(status, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_music_status_deleted ON music(status, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_videos_status_deleted ON videos(status, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_articles_status_deleted ON articles(status, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_events_status_deleted ON events(status, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_id, resource_type);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
  `);

  // Add default settings if not exist
  
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
      
      // Ensure all tables have tags column
      try {
          await db.exec(`ALTER TABLE ${table} ADD COLUMN tags TEXT`);
      } catch (e) {}
      
      // Ensure events has link column
      if (table === 'events') {
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN link TEXT`);
          } catch (e) {}
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN organizer TEXT`);
          } catch (e) {}
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN target_audience TEXT`);
          } catch (e) {}
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN volunteer_time TEXT`);
          } catch (e) {}
          try {
                await db.exec(`ALTER TABLE events ADD COLUMN score TEXT`);
            } catch (e) {}
            try {
                await db.exec(`ALTER TABLE events ADD COLUMN end_date TEXT`);
            } catch (e) {}
            try {
                await db.exec(`ALTER TABLE events ADD COLUMN time TEXT`);
            } catch (e) {}
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN max_participants INTEGER`);
          } catch (e) {}
          try {
              await db.exec(`ALTER TABLE events ADD COLUMN registration_deadline TEXT`);
          } catch (e) {}
      }

      // Create Indices for Performance
      try {
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_status ON ${table}(status)`);
          
          if (table === 'articles') {
             await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tag ON ${table}(tag)`);
          }
          
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_tags ON ${table}(tags)`);
          await db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_uploader_id ON ${table}(uploader_id)`);
      } catch (e) {
          console.error(`Failed to create indices for ${table}:`, e);
      }
  }
  
  // Migration: Add likes column to events if not exists
  try {
    await db.run('ALTER TABLE events ADD COLUMN likes INTEGER DEFAULT 0');
    console.log('Added likes column to events table');
  } catch (error) {
    // Ignore error if column already exists
    if (!error.message.includes('duplicate column name')) {
      console.error('Failed to add likes column to events:', error);
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

  // View count migration removed

  // Check and Fix comments table schema (item_id -> resource_id)
    try {
      const columns = await db.all("PRAGMA table_info(comments)");
      const columnNames = columns.map(c => c.name);
      console.log('[Migration] Current comments table columns:', columnNames);

      const hasResourceId = columnNames.includes('resource_id');
      const hasItemId = columnNames.includes('item_id');
      const hasResourceType = columnNames.includes('resource_type');
      
      if (!hasResourceId) {
         if (hasItemId) {
            console.log('[Migration] Renaming item_id to resource_id in comments table');
            await db.exec('ALTER TABLE comments RENAME COLUMN item_id TO resource_id');
         } else {
            console.log('[Migration] Adding missing resource_id column to comments table');
             await db.exec('ALTER TABLE comments ADD COLUMN resource_id INTEGER');
          }
        }

        // Migrate data from articleId if it exists (run this check regardless of column creation)
        if (columnNames.includes('articleId')) {
             // Only update if we have null resource_ids
             const check = await db.get("SELECT count(*) as count FROM comments WHERE resource_id IS NULL AND articleId IS NOT NULL");
             if (check && check.count > 0) {
                 console.log(`[Migration] Migrating ${check.count} records from articleId to resource_id`);
                 await db.exec("UPDATE comments SET resource_id = articleId, resource_type = 'article' WHERE articleId IS NOT NULL AND resource_id IS NULL");
             }
        }
  
        if (!hasResourceType) {
           console.log('[Migration] Adding missing resource_type column to comments table');
           await db.exec('ALTER TABLE comments ADD COLUMN resource_type TEXT');
       }

       // Check for created_at vs date
       const hasCreatedAt = columnNames.includes('created_at');
       const hasDate = columnNames.includes('date');
       
       if (!hasCreatedAt) {
           if (hasDate) {
               console.log('[Migration] Renaming date to created_at in comments table');
               await db.exec('ALTER TABLE comments RENAME COLUMN date TO created_at');
           } else {
               console.log('[Migration] Adding missing created_at column to comments table');
               await db.exec('ALTER TABLE comments ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP');
           }
       }

    } catch (e) {
      console.error('[Migration] Failed to migrate comments table:', e);
    }

    // Check and Fix notifications table schema
    try {
      const columns = await db.all("PRAGMA table_info(notifications)");
      const columnNames = columns.map(c => c.name);
      console.log('[Migration] Current notifications table columns:', columnNames);

      if (!columnNames.includes('related_resource_id')) {
           console.log('[Migration] Adding missing related_resource_id column to notifications table');
           await db.exec('ALTER TABLE notifications ADD COLUMN related_resource_id INTEGER');
       }
       
       // Migrate data from resource_id if it exists (run independent of column creation)
       if (columnNames.includes('resource_id')) {
          const check = await db.get("SELECT count(*) as count FROM notifications WHERE related_resource_id IS NULL AND resource_id IS NOT NULL");
          if (check && check.count > 0) {
              console.log(`[Migration] Migrating ${check.count} records from resource_id to related_resource_id in notifications`);
              await db.exec("UPDATE notifications SET related_resource_id = resource_id WHERE related_resource_id IS NULL AND resource_id IS NOT NULL");
          }
       }
 
       if (!columnNames.includes('related_resource_type')) {
           console.log('[Migration] Adding missing related_resource_type column to notifications table');
           await db.exec('ALTER TABLE notifications ADD COLUMN related_resource_type TEXT');
       }

       // Migrate data from resource_type if it exists
       if (columnNames.includes('resource_type')) {
          const check = await db.get("SELECT count(*) as count FROM notifications WHERE related_resource_type IS NULL AND resource_type IS NOT NULL");
          if (check && check.count > 0) {
              console.log(`[Migration] Migrating ${check.count} records from resource_type to related_resource_type in notifications`);
              await db.exec("UPDATE notifications SET related_resource_type = resource_type WHERE related_resource_type IS NULL AND resource_type IS NOT NULL");
          }
       }
    } catch (e) {
      console.error('[Migration] Failed to migrate notifications table:', e);
    }

    console.log('Database initialized');
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
});
