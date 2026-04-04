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
const { runMigrations } = require('./src/config/runMigrations');
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
const {
  enhancedCompression,
  cacheControl,
  staticCacheControl,
  performanceMonitor,
  conditionalRequest
} = require('./src/middleware/performance');

const app = express();
app.disable('x-powered-by');

// 端口配置：优先使用环境变量，否则使用 5181
const PORT = process.env.PORT || 5181;
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

// Performance Monitoring (early in stack)
app.use(performanceMonitor);

// Enhanced Compression
app.use(enhancedCompression);

// Conditional Request Handling (ETags)
app.use(conditionalRequest);

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
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000, // Increased significantly
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
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 2000, // Increased significantly to effectively disable for normal use
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
  process.env.CORS_ORIGIN,
  'http://localhost:5180',
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed === origin) return true;
      try {
        const allowedUrl = new URL(allowed);
        const originUrl = new URL(origin);
        return allowedUrl.hostname === originUrl.hostname;
      } catch {
        return false;
      }
    });
    
    if (isAllowed || NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    console.warn(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('CORS policy violation: Origin not allowed'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400
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

// Uploads directory with security headers and cache control
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use('/uploads', 
  staticCacheControl, // Apply optimized cache headers
  express.static(uploadDir, {
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
  })
);

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
const { scrapeWeChat, parseWithLLM, cleanWeChatUrl, wechatCache, CACHE_TTL, downloadWeChatImage } = require('./src/utils/wechat');

app.post('/api/resources/parse-wechat', authenticateToken, async (req, res, next) => {
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL - support more WeChat URL patterns
  const urlRegex = /^https?:\/\/(mp\.weixin\.qq\.com|www\.weixin\.qq\.com)/i;
  if (!urlRegex.test(url)) {
    return res.status(400).json({ 
      error: 'Invalid WeChat URL',
      message: 'URL must be from mp.weixin.qq.com or www.weixin.qq.com'
    });
  }

  try {
    // Clean URL
    const cleanedUrl = cleanWeChatUrl(url);
    console.log(`📝 Processing WeChat URL: ${cleanedUrl}`);
    
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
    console.log(`🔍 Starting scrape for: ${cleanedUrl}`);
    const scrapedData = await scrapeWeChat(cleanedUrl);
    
    if (!scrapedData || !scrapedData.content) {
      return res.status(422).json({ 
        error: 'Failed to extract content',
        message: 'Could not extract content from the provided URL. The article might be protected or require authentication.'
      });
    }
    
    // Parse with LLM
    console.log(`🧠 Starting LLM parsing...`);
    const parsedData = await parseWithLLM(scrapedData);
    
    if (!parsedData) {
      return res.status(500).json({ 
        error: 'LLM parsing failed',
        message: 'Failed to parse content with AI. Please try again or fill in the information manually.'
      });
    }

    // Merge original content if LLM didn't provide it
    if (!parsedData.content) {
      parsedData.content = scrapedData.content;
    }
    
    // Ensure required fields have defaults
    parsedData.title = parsedData.title || scrapedData.title || 'Untitled';
    parsedData.description = parsedData.description || scrapedData.content?.substring(0, 200) || '';
    
    // Download cover image to local server (bypass WeChat hotlink protection)
    console.log(`🔍 Checking cover image: ${scrapedData.coverImage ? 'Found' : 'Not found'}`);
    if (scrapedData.coverImage) {
      console.log(`📥 Downloading cover image from: ${scrapedData.coverImage.substring(0, 100)}...`);
      try {
        const localImagePath = await downloadWeChatImage(scrapedData.coverImage);
        if (localImagePath) {
          parsedData.coverImage = localImagePath;
          console.log(`✅ Cover image saved: ${localImagePath}`);
        } else {
          console.log(`⚠️ Download returned null, using original URL`);
          parsedData.coverImage = scrapedData.coverImage;
        }
      } catch (downloadError) {
        console.error(`❌ Download error: ${downloadError.message}`);
        parsedData.coverImage = scrapedData.coverImage;
      }
    }

    // Cache Result
    wechatCache.set(cleanedUrl, {
      data: parsedData,
      timestamp: Date.now()
    });
    
    console.log(`✅ Successfully parsed WeChat article: ${parsedData.title}`);

    res.json(parsedData);

  } catch (error) {
    console.error('❌ WeChat parse error:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = error.message || 'An unexpected error occurred while parsing the WeChat article';
    
    if (error.message && error.message.includes('LLM_API_KEY_INVALID')) {
      statusCode = 401;
      errorMessage = 'LLM API密钥无效或已过期，请联系管理员检查配置';
    } else if (error.message && error.message.includes('LLM_RATE_LIMIT')) {
      statusCode = 429;
      errorMessage = '请求过于频繁，请稍后再试';
    }
    
    res.status(statusCode).json({ 
      error: 'WeChat parse failed', 
      message: errorMessage 
    });
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
    const db = await getDb();
    await runMigrations(db);
    
    // 尝试启动服务器，如果端口被占用则尝试下一个端口
    const startOnPort = (port) => {
      return new Promise((resolve, reject) => {
        const server = app.listen(port, () => {
          console.log(`
🚀 Server running on port ${port}
📊 Environment: ${NODE_ENV}
🔒 Security: ${NODE_ENV === 'production' ? 'Enabled' : 'Development Mode'}
📁 Upload directory: ${uploadDir}
          `);
          resolve(server);
        });
        
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            reject({ code: 'EADDRINUSE', port });
          } else {
            reject(err);
          }
        });
      });
    };
    
    // 尝试端口：配置的端口 -> 配置的端口 +1 -> 配置的端口 +2
    let server;
    try {
      server = await startOnPort(PORT);
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${PORT} is in use, trying ${PORT + 1}...`);
        try {
          server = await startOnPort(PORT + 1);
        } catch (err2) {
          if (err2.code === 'EADDRINUSE') {
            console.warn(`⚠️  Port ${PORT + 1} is in use, trying ${PORT + 2}...`);
            server = await startOnPort(PORT + 2);
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }
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
  process.exit(1);
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
