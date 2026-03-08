/**
 * Audit Middleware
 * Tracks user actions for security and compliance
 */

const { createLogger } = require('../utils/logger');
const logger = createLogger('Audit');

// Actions to audit
const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  UPLOAD: 'UPLOAD',
  DOWNLOAD: 'DOWNLOAD',
  SETTINGS_CHANGE: 'SETTINGS_CHANGE',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  FAILED_LOGIN: 'FAILED_LOGIN',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS'
};

/**
 * Audit middleware factory
 */
const audit = (action, getDetails = null) => {
  return (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;
    
    // Override end to capture response
    res.end = function(...args) {
      // Only audit successful requests
      if (res.statusCode < 400) {
        const details = getDetails ? getDetails(req, res) : {
          body: sanitizeBody(req.body),
          params: req.params,
          query: req.query
        };

        logger.audit(action, req.user?.id, {
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('user-agent'),
          details,
          resource: req.baseUrl,
          resourceId: req.params.id
        });
      }

      // Call original end
      originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Sanitize sensitive data from request body
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

/**
 * Audit specific events
 */
const auditEvent = (action, req, details = {}) => {
  logger.audit(action, req.user?.id, {
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('user-agent'),
    details: sanitizeBody(details),
    resource: req.baseUrl,
    resourceId: req.params.id
  });
};

/**
 * Failed login attempt tracking
 */
const trackFailedLogin = (username, ip, reason) => {
  logger.security('FAILED_LOGIN_ATTEMPT', {
    username,
    ip,
    reason,
    timestamp: new Date().toISOString()
  });
};

/**
 * Suspicious activity detection
 */
const detectSuspiciousActivity = (req) => {
  const indicators = [];
  
  // Check for common attack patterns
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(from|into|table|database)\b)/i,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /(\b(eval|exec|system|passthru|shell_exec)\b)/i,
    /\.\.(\/|\\)/g  // Path traversal
  ];
  
  const checkValue = (value, path) => {
    if (typeof value !== 'string') return;
    
    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(value)) {
        indicators.push({
          type: ['SQL_INJECTION', 'XSS', 'COMMAND_INJECTION', 'PATH_TRAVERSAL'][index],
          path,
          value: value.substring(0, 100) // Truncate for logging
        });
      }
    });
  };
  
  // Check query parameters
  Object.entries(req.query).forEach(([key, value]) => {
    checkValue(value, `query.${key}`);
  });
  
  // Check body
  if (req.body) {
    Object.entries(req.body).forEach(([key, value]) => {
      checkValue(value, `body.${key}`);
    });
  }
  
  // Check headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-http-host-override'];
  suspiciousHeaders.forEach(header => {
    if (req.headers[header]) {
      indicators.push({
        type: 'SUSPICIOUS_HEADER',
        header,
        value: req.headers[header]
      });
    }
  });
  
  // Log if suspicious activity detected
  if (indicators.length > 0) {
    logger.security('SUSPICIOUS_ACTIVITY_DETECTED', {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      url: req.originalUrl,
      method: req.method,
      indicators
    });
  }
  
  return indicators.length > 0;
};

module.exports = {
  audit,
  auditEvent,
  trackFailedLogin,
  detectSuspiciousActivity,
  AUDIT_ACTIONS
};
