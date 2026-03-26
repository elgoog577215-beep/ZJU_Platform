const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { RateLimiter, LoginAttemptTracker, generateCsrfToken, verifyCsrfToken } = require('../utils/security');

// Initialize rate limiters
const loginAttemptTracker = new LoginAttemptTracker(500, 1); // 500 attempts, 1 min lockout (effectively disabled brute force)
const apiRateLimiter = new RateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5000
);

/**
 * Enhanced Helmet configuration
 */
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        ...(process.env.NODE_ENV !== 'production' ? ["'unsafe-eval'"] : [])
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:", "data:", "blob:"],
      frameSrc: ["'self'", "https:"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: false,
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};

/**
 * Custom API rate limiter middleware
 * More flexible than express-rate-limit
 */
const customRateLimit = (options = {}) => {
  const {
    windowMs = 900000,
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    handler = (req, res) => {
      res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  } = options;
  
  const limiter = new RateLimiter(windowMs, maxRequests);
  
  return (req, res, next) => {
    const key = keyGenerator(req);
    const result = limiter.check(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (!result.allowed) {
      return handler(req, res);
    }
    
    // Record the request
    if (!skipSuccessfulRequests) {
      limiter.record(key);
    } else {
      // Record after response
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          limiter.record(key);
        }
      });
    }
    
    next();
  };
};

/**
 * Brute force protection for login endpoints
 */
const bruteForceProtection = (req, res, next) => {
  const identifier = req.body.username || req.ip;
  const lockStatus = loginAttemptTracker.isLocked(identifier);
  
  if (lockStatus.locked) {
    return res.status(429).json({
      error: `Account temporarily locked. Please try again in ${lockStatus.remainingMinutes} minutes.`,
      locked: true,
      retryAfter: lockStatus.remainingMinutes * 60
    });
  }
  
  // Attach tracker to request for use in controller
  req.loginTracker = {
    recordFailed: () => loginAttemptTracker.recordFailed(identifier),
    clear: () => loginAttemptTracker.clear(identifier)
  };
  
  next();
};

/**
 * CSRF protection middleware
 * Note: For SPA with JWT, CSRF is less critical but still good to have for forms
 */
const csrfProtection = (options = {}) => {
  const {
    cookieName = 'csrfToken',
    headerName = 'X-CSRF-Token'
  } = options;
  
  return (req, res, next) => {
    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate and set CSRF token for forms
      if (!req.cookies || !req.cookies[cookieName]) {
        const token = generateCsrfToken();
        res.cookie(cookieName, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        res.locals.csrfToken = token;
      }
      return next();
    }
    
    // Verify token for state-changing requests
    const token = req.headers[headerName.toLowerCase()] || req.body._csrf;
    const storedToken = req.cookies ? req.cookies[cookieName] : null;
    
    if (!token || !storedToken || !verifyCsrfToken(token, storedToken)) {
      return res.status(403).json({ error: 'Invalid or missing CSRF token' });
    }
    
    next();
  };
};

/**
 * Request sanitization middleware
 * Only sanitizes specific fields that should not contain HTML
 * Does NOT sanitize content fields like description, content, excerpt, etc.
 */
const sanitizeRequest = (req, res, next) => {
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  };

  // Fields that should be sanitized (usernames, titles, names, etc.)
  // Content fields like 'content', 'description', 'excerpt' are NOT sanitized
  // as they may contain legitimate HTML/Markdown
  const fieldsToSanitize = [
    'username', 'password', 'email', 'name', 'nickname',
    'location', 'organizer', 'target_audience'
  ];

  if (req.body && typeof req.body === 'object') {
    for (const field of fieldsToSanitize) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitize(req.body[field]);
      }
    }
  }
  
  next();
};

/**
 * Security headers middleware (additional to Helmet)
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy (formerly Feature-Policy)
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * Input validation middleware factory
 */
const createValidation = (schema) => {
  return async (req, res, next) => {
    const validations = Object.entries(schema).map(([field, rules]) => {
      let validator = body(field);
      
      rules.forEach(rule => {
        if (typeof rule === 'string') {
          switch (rule) {
            case 'required':
              validator = validator.notEmpty();
              break;
            case 'email':
              validator = validator.isEmail();
              break;
            case 'url':
              validator = validator.isURL();
              break;
            case 'int':
              validator = validator.isInt();
              break;
            case 'float':
              validator = validator.isFloat();
              break;
            case 'boolean':
              validator = validator.isBoolean();
              break;
            case 'array':
              validator = validator.isArray();
              break;
          }
        } else if (typeof rule === 'object') {
          if (rule.min !== undefined) {
            validator = validator.isLength({ min: rule.min });
          }
          if (rule.max !== undefined) {
            validator = validator.isLength({ max: rule.max });
          }
          if (rule.matches) {
            validator = validator.matches(rule.matches);
          }
          if (rule.message) {
            validator = validator.withMessage(rule.message);
          }
        }
      });
      
      return validator;
    });
    
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array().map(e => ({
          field: e.path,
          message: e.msg
        }))
      });
    }
    
    next();
  };
};

/**
 * Audit logging middleware
 */
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      // Restore original method
      res.json = originalJson;
      
      // Log the action if user is authenticated
      if (req.user) {
        const { getDb } = require('../config/db');
        getDb().then(db => {
          db.run(
            `INSERT INTO audit_logs (admin_id, resource_type, resource_id, action, reason, ip_address, user_agent, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user.id,
              req.originalUrl,
              data?.id || null,
              action,
              JSON.stringify({ body: req.body, status: res.statusCode }),
              req.ip,
              req.headers['user-agent']?.substring(0, 255),
              new Date().toISOString()
            ]
          ).catch(err => console.error('Audit log error:', err));
        });
      }
      
      return res.json(data);
    };
    
    next();
  };
};

module.exports = {
  helmetConfig,
  customRateLimit,
  bruteForceProtection,
  csrfProtection,
  sanitizeRequest,
  additionalSecurityHeaders,
  createValidation,
  auditLogger,
  loginAttemptTracker
};
