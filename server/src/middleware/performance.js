const compression = require('compression');
const { createLogger } = require('../utils/logger');

const logger = createLogger('performance');

/**
 * Enhanced compression middleware
 * Optimizes response compression based on content type
 */
const enhancedCompression = compression({
  level: 6, // Balance between compression ratio and CPU usage
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Skip compression for already compressed formats
    const contentType = res.getHeader('Content-Type') || '';
    const skipTypes = [
      'image/',
      'video/',
      'audio/',
      'application/gzip',
      'application/zip',
      'application/pdf'
    ];
    
    if (skipTypes.some(type => contentType.includes(type))) {
      return false;
    }
    
    // Skip if client doesn't accept compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    return compression.filter(req, res);
  }
});

/**
 * Cache control middleware
 * Sets appropriate cache headers based on route
 */
const cacheControl = (options = {}) => {
  const {
    maxAge = 3600, // 1 hour default
    immutable = false,
    private: isPrivate = false,
    noCache = false
  } = options;

  return (req, res, next) => {
    if (noCache) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      const directives = [];
      
      if (isPrivate) {
        directives.push('private');
      } else {
        directives.push('public');
      }
      
      directives.push(`max-age=${maxAge}`);
      
      if (immutable) {
        directives.push('immutable');
      }
      
      res.setHeader('Cache-Control', directives.join(', '));
    }
    
    next();
  };
};

/**
 * Static asset caching strategy
 */
const staticCacheControl = (req, res, next) => {
  const path = req.path;
  
  // Different cache strategies for different file types
  if (path.match(/\.(js|css)$/)) {
    // Versioned assets - cache for 1 year
    if (path.includes('?v=') || path.match(/-[a-f0-9]{8,}\./)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      // Non-versioned - cache for 1 hour
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  } else if (path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    // Images - cache for 30 days
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  } else if (path.match(/\.(woff|woff2|ttf|otf|eot)$/)) {
    // Fonts - cache for 1 year
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  next();
};

/**
 * Performance monitoring middleware
 * Tracks request timing and logs slow requests
 */
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime.bigint();
  const startTime = Date.now();
  
  // Store start time on request
  req.startTime = startTime;
  
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const durationMs = Date.now() - startTime;
    
    // Log slow requests (> 1 second)
    if (durationMs > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${durationMs}ms`,
        statusCode: res.statusCode,
        ip: req.ip
      });
    }
    
    // Add performance headers in development
    if (process.env.NODE_ENV === 'development' && !res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }
  });
  
  next();
};

/**
 * Connection pooling optimization for database
 */
const dbConnectionPool = {
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS) || 10,
  minConnections: parseInt(process.env.DB_MIN_CONNECTIONS) || 2,
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 300000,
  
  // Monitor pool health
  monitor() {
    setInterval(() => {
      // Log pool statistics
      logger.debug('Database pool stats', {
        max: this.maxConnections,
        min: this.minConnections
      });
    }, 60000);
  }
};

/**
 * ETag generation for better caching
 */
const generateETag = (body) => {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(body).digest('hex');
};

/**
 * Conditional request handling
 * Returns 304 Not Modified when content hasn't changed
 */
const conditionalRequest = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only process for GET/HEAD requests
    if (!['GET', 'HEAD'].includes(req.method)) {
      return originalSend.call(this, body);
    }
    
    // Skip for error responses
    if (res.statusCode >= 400) {
      return originalSend.call(this, body);
    }
    
    // Generate ETag
    const etag = generateETag(Buffer.isBuffer(body) ? body : JSON.stringify(body));
    res.setHeader('ETag', `"${etag}"`);
    
    // Check If-None-Match
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === `"${etag}"`) {
      res.statusCode = 304;
      return originalSend.call(this, '');
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

module.exports = {
  enhancedCompression,
  cacheControl,
  staticCacheControl,
  performanceMonitor,
  dbConnectionPool,
  conditionalRequest
};
