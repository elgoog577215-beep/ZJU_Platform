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
const cookieParser = require('cookie-parser');

const { getDb, pool } = require('./src/config/db');
const apiRoutes = require('./src/routes/api');
const errorHandler = require('./src/middleware/errorHandler');
const { authenticateToken, isAdmin } = require('./src/middleware/auth');
const { 
  helmetConfig, 
  additionalSecurityHeaders, 
  sanitizeRequest,
  customRateLimit 
} = require('./src/middleware/security');
const { scanFile } = require('./src/middleware/upload');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ====================
// Logging Configuration
// ====================
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Create write streams for logs
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'), 
  { flags: 'a' }
);
const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'error.log'), 
  { flags: 'a' }
);

// Morgan logging formats
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production: log to file
  app.use(morgan('combined', { stream: accessLogStream }));
  app.use(morgan('combined', {
    skip: (req, res) => res.statusCode < 400,
    stream: errorLogStream
  }));
}

// ====================
// Security Middleware
// ====================

// Compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Helmet security headers
app.use(helmet(helmetConfig));

// Additional security headers
app.use(additionalSecurityHeaders);

// Cookie parser (for CSRF tokens)
app.use(cookieParser(process.env.COOKIE_SECRET));

// Trust proxy for correct protocol behind reverse proxy
app.set('trust proxy', 1);

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Request sanitization
app.use(sanitizeRequest);

// ====================
// Rate Limiting
// ====================

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'Too many requests, please try again later.',
    retryAfter: '900'
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    });
  }
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  message: { 
    error: 'Too many login attempts, please try again later.',
    retryAfter: '900'
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// ====================
// CORS Configuration
// ====================
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('CORS policy violation: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));

// ====================
// Body Parsing
// ====================
app.use(express.json({ 
  limit: '10mb',
  strict: true, // Only accept arrays and objects
  verify: (req, res, buf) => {
    // Store raw body for webhook verification if needed
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  limit: '10mb', 
  extended: true,
  parameterLimit: 1000 // Limit number of form fields
}));

// ====================
// Static Files
// ====================

// Uploads directory with security headers
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir, {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res, path) => {
    // Add security headers for static files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent execution of uploaded files
    if (path.match(/\.(php|jsp|asp|aspx|exe|sh|bat)$/i)) {
      res.setHeader('Content-Type', 'text/plain');
    }
  }
}));

// Serve Frontend Static Files (Production)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Don't cache HTML files
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

// ====================
// WeChat Parsing Endpoint
// ====================
const { scrapeWeChat, parseWithLLM, cleanWeChatUrl, wechatCache, CACHE_TTL } = require('./src/utils/wechat');

app.post('/api/resources/parse-wechat', authenticateToken, isAdmin, async (req, res, next) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL
  const urlRegex = /^https?:\/\/(mp\.weixin\.qq\.com|www\.weixin\.qq\.com)/i;
  if (!urlRegex.test(url)) {
    return res.status(400).json({ error: 'Invalid WeChat URL' });
  }

  try {
    // Clean URL
    const cleanedUrl = cleanWeChatUrl(url);
    
    // Check Cache
    if (wechatCache.has(cleanedUrl)) {
      const { data, timestamp } = wechatCache.get(cleanedUrl);
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log(`🚀 Cache Hit for: ${cleanedUrl}`);
        return res.json(data);
      } else {
        wechatCache.delete(cleanedUrl);
      }
    }

    // Scrape
    const scrapedData = await scrapeWeChat(cleanedUrl);
    
    // Parse with LLM
    const parsedData = await parseWithLLM(scrapedData);
    
    if (!parsedData) {
      return res.status(500).json({ error: 'Failed to parse content with LLM' });
    }

    // Merge original content if LLM didn't provide it
    if (!parsedData.content) {
      parsedData.content = scrapedData.content;
    }

    // Cache Result
    wechatCache.set(cleanedUrl, {
      data: parsedData,
      timestamp: Date.now()
    });

    res.json(parsedData);

  } catch (error) {
    next(error);
  }
});

// ====================
// Health Check Endpoint
// ====================
app.get('/api/health', async (req, res) => {
  try {
    const db = await getDb();
    await db.get('SELECT 1');
    
    const stats = await pool.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      database: 'connected',
      stats: {
        tables: stats.tables,
        size: stats.sizeFormatted,
        queryCount: stats.queryCount
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ====================
// API Routes
// ====================
app.use('/api', apiRoutes);

// ====================
// SPA Fallback (Production)
// ====================
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ====================
// Global Error Handler
// ====================
app.use(errorHandler);

// ====================
// Database Initialization & Server Start
// ====================
const startServer = async () => {
  try {
    // Initialize database
    await getDb();
    
    // Run migrations if any
    // await pool.runMigrations();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`
🚀 Server running on port ${PORT}
📊 Environment: ${NODE_ENV}
🔒 Security: ${NODE_ENV === 'production' ? 'Enabled' : 'Development Mode'}
📁 Upload directory: ${uploadDir}
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  // Log to file
  errorLogStream.write(`[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.stack}\n`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  errorLogStream.write(`[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  await pool.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  await pool.close();
  process.exit(0);
});

startServer();

module.exports = app;
