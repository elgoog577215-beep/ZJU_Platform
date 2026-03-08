const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

// Database configuration
const DB_CONFIG = {
  filename: process.env.DATABASE_FILE || path.join(__dirname, '../../database.sqlite'),
  driver: sqlite3.Database,
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
};

// Connection pool simulation
class DatabasePool {
  constructor() {
    this.db = null;
    this.isInitializing = false;
    this.initQueue = [];
    this.queryCount = 0;
    this.lastActivity = Date.now();
    
    // Health check interval
    this.healthCheckInterval = setInterval(() => this.healthCheck(), 30000);
  }
  
  /**
   * Initialize database connection with optimizations
   */
  async initialize() {
    if (this.db) return this.db;
    if (this.isInitializing) {
      return new Promise((resolve) => {
        this.initQueue.push(resolve);
      });
    }
    
    this.isInitializing = true;
    
    try {
      // Ensure directory exists
      const dbDir = path.dirname(DB_CONFIG.filename);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
      
      this.db = await open(DB_CONFIG);
      
      // Performance optimizations
      await this.db.exec(`
        -- Enable WAL mode for better concurrency
        PRAGMA journal_mode = WAL;
        
        -- Synchronous mode: NORMAL for better performance, FULL for safety
        PRAGMA synchronous = NORMAL;
        
        -- Cache size: 2000 pages (about 8MB)
        PRAGMA cache_size = -2000;
        
        -- Temp store in memory
        PRAGMA temp_store = MEMORY;
        
        -- Enable foreign keys
        PRAGMA foreign_keys = ON;
        
        -- Optimize for query performance
        PRAGMA query_only = OFF;
        
        -- Memory map size (64MB)
        PRAGMA mmap_size = 67108864;
        
        -- Page size optimization
        PRAGMA page_size = 4096;
        
        -- Auto vacuum for space optimization
        PRAGMA auto_vacuum = INCREMENTAL;
      `);
      
      // Create indexes for performance
      await this.createIndexes();
      
      console.log('✅ Database initialized with optimizations');
      
      // Resolve queued promises
      this.initQueue.forEach(resolve => resolve(this.db));
      this.initQueue = [];
      
      return this.db;
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }
  
  /**
   * Create database indexes for better query performance
   */
  async createIndexes() {
    const indexes = [
      // Users
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)',
      
      // Resources - Photos
      'CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status)',
      'CREATE INDEX IF NOT EXISTS idx_photos_uploader ON photos(uploader_id)',
      'CREATE INDEX IF NOT EXISTS idx_photos_featured ON photos(featured)',
      'CREATE INDEX IF NOT EXISTS idx_photos_likes ON photos(likes DESC)',
      
      // Resources - Music
      'CREATE INDEX IF NOT EXISTS idx_music_status ON music(status)',
      'CREATE INDEX IF NOT EXISTS idx_music_uploader ON music(uploader_id)',
      'CREATE INDEX IF NOT EXISTS idx_music_featured ON music(featured)',
      
      // Resources - Videos
      'CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)',
      'CREATE INDEX IF NOT EXISTS idx_videos_uploader ON videos(uploader_id)',
      'CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(featured)',
      
      // Resources - Articles
      'CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status)',
      'CREATE INDEX IF NOT EXISTS idx_articles_uploader ON articles(uploader_id)',
      'CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(featured)',
      'CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(date)',
      
      // Resources - Events
      'CREATE INDEX IF NOT EXISTS idx_events_status ON events(status)',
      'CREATE INDEX IF NOT EXISTS idx_events_uploader ON events(uploader_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_featured ON events(featured)',
      'CREATE INDEX IF NOT EXISTS idx_events_date ON events(date)',
      
      // Comments
      'CREATE INDEX IF NOT EXISTS idx_comments_resource ON comments(resource_id, resource_type)',
      'CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC)',
      
      // Favorites
      'CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id, item_type)',
      
      // Notifications
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read)',
      
      // Audit Logs
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)',
      
      // Tags
      'CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)',
    ];
    
    for (const index of indexes) {
      try {
        await this.db.exec(index);
      } catch (err) {
        // Index might already exist, continue
        if (!err.message.includes('already exists')) {
          console.warn('Index creation warning:', err.message);
        }
      }
    }
    
    console.log('✅ Database indexes created');
  }
  
  /**
   * Get database connection
   */
  async getConnection() {
    this.lastActivity = Date.now();
    this.queryCount++;
    return this.initialize();
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    if (!this.db) return;
    
    try {
      await this.db.get('SELECT 1');
      console.log('💚 Database health check: OK');
    } catch (error) {
      console.error('💔 Database health check failed:', error);
      // Attempt to reconnect
      this.db = null;
      await this.initialize();
    }
  }
  
  /**
   * Run database migration
   */
  async migrate(migrations) {
    const db = await this.getConnection();
    
    // Create migrations table if not exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    for (const migration of migrations) {
      const existing = await db.get('SELECT id FROM migrations WHERE name = ?', [migration.name]);
      if (!existing) {
        console.log(`🔄 Running migration: ${migration.name}`);
        await migration.up(db);
        await db.run('INSERT INTO migrations (name) VALUES (?)', [migration.name]);
        console.log(`✅ Migration completed: ${migration.name}`);
      }
    }
  }
  
  /**
   * Backup database
   */
  async backup(backupPath) {
    const db = await this.getConnection();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = backupPath || path.join(
      path.dirname(DB_CONFIG.filename),
      `backup-${timestamp}.sqlite`
    );
    
    await db.exec(`VACUUM INTO '${backupFile}'`);
    console.log(`💾 Database backed up to: ${backupFile}`);
    return backupFile;
  }
  
  /**
   * Get database statistics
   */
  async getStats() {
    const db = await this.getConnection();
    
    const tables = ['users', 'photos', 'music', 'videos', 'articles', 'events', 'comments', 'favorites'];
    const stats = {};
    
    for (const table of tables) {
      const result = await db.get(`SELECT COUNT(*) as count FROM ${table}`);
      stats[table] = result.count;
    }
    
    const dbSize = fs.existsSync(DB_CONFIG.filename) 
      ? fs.statSync(DB_CONFIG.filename).size 
      : 0;
    
    return {
      tables: stats,
      size: dbSize,
      sizeFormatted: `${(dbSize / 1024 / 1024).toFixed(2)} MB`,
      queryCount: this.queryCount,
      uptime: Date.now() - this.lastActivity
    };
  }
  
  /**
   * Close database connection
   */
  async close() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.log('📕 Database connection closed');
    }
  }
}

// Singleton instance
const pool = new DatabasePool();

// Backward compatibility
async function getDb() {
  return pool.getConnection();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Received SIGINT, closing database...');
  await pool.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n👋 Received SIGTERM, closing database...');
  await pool.close();
  process.exit(0);
});

module.exports = { 
  getDb, 
  pool,
  DatabasePool 
};
