const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generate a cryptographically secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random hex string
 */
const generateSecureKey = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash password with bcrypt (async)
 * @param {string} password - Plain text password
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password, saltRounds = 12) => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const maxLength = 128;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (password.length > maxLength) {
    errors.push(`Password must not exceed ${maxLength} characters`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChars) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password)
  };
};

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {number} Strength score (0-100)
 */
const calculatePasswordStrength = (password) => {
  let score = 0;
  
  // Length contribution (up to 40 points)
  score += Math.min(password.length * 2, 40);
  
  // Character variety (up to 40 points)
  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;
  
  // Complexity bonus (up to 20 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars, 20);
  
  return Math.min(score, 100);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate CSRF token
 * @returns {string} CSRF token
 */
const generateCsrfToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify CSRF token
 * @param {string} token - Token to verify
 * @param {string} storedToken - Stored token
 * @returns {boolean} Verification result
 */
const verifyCsrfToken = (token, storedToken) => {
  if (!token || !storedToken) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(token, 'hex'),
      Buffer.from(storedToken, 'hex')
    );
  } catch {
    return false;
  }
};

/**
 * Rate limiter storage (in-memory, use Redis in production)
 */
class RateLimiter {
  constructor(windowMs = 900000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map();
    
    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }
  
  /**
   * Check if request is allowed
   * @param {string} key - Identifier (IP, user ID, etc.)
   * @returns {Object} Rate limit info
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const timestamps = this.requests.get(key);
    
    // Remove old requests outside the window
    const validTimestamps = timestamps.filter(ts => ts > windowStart);
    this.requests.set(key, validTimestamps);
    
    const remaining = Math.max(0, this.maxRequests - validTimestamps.length);
    const resetTime = validTimestamps.length > 0 
      ? validTimestamps[0] + this.windowMs 
      : now + this.windowMs;
    
    return {
      allowed: validTimestamps.length < this.maxRequests,
      remaining,
      resetTime,
      total: validTimestamps.length
    };
  }
  
  /**
   * Record a request
   * @param {string} key - Identifier
   */
  record(key) {
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    this.requests.get(key).push(Date.now());
  }
  
  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(ts => ts > windowStart);
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

/**
 * Login attempt tracker for brute force protection
 */
class LoginAttemptTracker {
  constructor(maxAttempts = 5, lockoutMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.lockoutMs = lockoutMinutes * 60000;
    this.attempts = new Map();
  }
  
  /**
   * Record a failed login attempt
   * @param {string} identifier - Username or IP
   */
  recordFailed(identifier) {
    const now = Date.now();
    if (!this.attempts.has(identifier)) {
      this.attempts.set(identifier, { count: 0, firstAttempt: now, lockedUntil: null });
    }
    
    const record = this.attempts.get(identifier);
    record.count++;
    
    if (record.count >= this.maxAttempts) {
      record.lockedUntil = now + this.lockoutMs;
    }
  }
  
  /**
   * Check if account is locked
   * @param {string} identifier - Username or IP
   * @returns {Object} Lock status
   */
  isLocked(identifier) {
    const record = this.attempts.get(identifier);
    if (!record) return { locked: false };
    
    const now = Date.now();
    if (record.lockedUntil && record.lockedUntil > now) {
      return {
        locked: true,
        remainingMinutes: Math.ceil((record.lockedUntil - now) / 60000)
      };
    }
    
    // Reset if lockout period has passed
    if (record.lockedUntil && record.lockedUntil <= now) {
      this.attempts.delete(identifier);
    }
    
    return { locked: false, attemptsRemaining: this.maxAttempts - record.count };
  }
  
  /**
   * Clear attempts on successful login
   * @param {string} identifier - Username or IP
   */
  clear(identifier) {
    this.attempts.delete(identifier);
  }
}

module.exports = {
  generateSecureKey,
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  calculatePasswordStrength,
  sanitizeInput,
  generateCsrfToken,
  verifyCsrfToken,
  RateLimiter,
  LoginAttemptTracker
};
