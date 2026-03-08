/**
 * Logger Utility
 * Structured logging with rotation, levels, and multiple transports
 */

const fs = require('fs').promises;
const path = require('path');

// Log Levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Current log level from environment
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

// Log file configuration
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5;

// Ensure log directory exists
const ensureLogDir = async () => {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
};

// Format log entry
const formatLogEntry = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level),
    message,
    ...meta,
    pid: process.pid
  };
  return JSON.stringify(entry);
};

// Write to file with rotation
const writeToFile = async (filename, data) => {
  try {
    const filepath = path.join(LOG_DIR, filename);
    
    // Check file size
    try {
      const stats = await fs.stat(filepath);
      if (stats.size > MAX_LOG_SIZE) {
        await rotateLog(filename);
      }
    } catch (e) {
      // File doesn't exist yet
    }
    
    await fs.appendFile(filepath, data + '\n');
  } catch (error) {
    console.error('Failed to write log:', error);
  }
};

// Rotate log files
const rotateLog = async (filename) => {
  try {
    const filepath = path.join(LOG_DIR, filename);
    
    // Remove oldest log
    const oldestLog = path.join(LOG_DIR, `${filename}.${MAX_LOG_FILES}`);
    try {
      await fs.unlink(oldestLog);
    } catch (e) {
      // File doesn't exist
    }
    
    // Shift existing logs
    for (let i = MAX_LOG_FILES - 1; i >= 1; i--) {
      const oldPath = path.join(LOG_DIR, `${filename}.${i}`);
      const newPath = path.join(LOG_DIR, `${filename}.${i + 1}`);
      try {
        await fs.rename(oldPath, newPath);
      } catch (e) {
        // File doesn't exist
      }
    }
    
    // Rename current log
    await fs.rename(filepath, path.join(LOG_DIR, `${filename}.1`));
  } catch (error) {
    console.error('Failed to rotate log:', error);
  }
};

// Console colors
const colors = {
  ERROR: '\x1b[31m',
  WARN: '\x1b[33m',
  INFO: '\x1b[36m',
  DEBUG: '\x1b[35m',
  RESET: '\x1b[0m'
};

// Logger class
class Logger {
  constructor(context = '') {
    this.context = context;
    ensureLogDir();
  }

  log(level, message, meta = {}) {
    if (level > CURRENT_LEVEL) return;

    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    const logEntry = formatLogEntry(level, message, {
      context: this.context,
      ...meta
    });

    // Console output
    const color = colors[levelName] || '';
    const reset = colors.RESET;
    const contextStr = this.context ? `[${this.context}] ` : '';
    
    if (level === LOG_LEVELS.ERROR) {
      console.error(`${color}[${levelName}]${reset} ${contextStr}${message}`);
      if (meta.error) {
        console.error(meta.error);
      }
    } else if (level === LOG_LEVELS.WARN) {
      console.warn(`${color}[${levelName}]${reset} ${contextStr}${message}`);
    } else {
      console.log(`${color}[${levelName}]${reset} ${contextStr}${message}`);
    }

    // File output
    const filename = level === LOG_LEVELS.ERROR ? 'error.log' : 'app.log';
    writeToFile(filename, logEntry);
  }

  error(message, meta = {}) {
    this.log(LOG_LEVELS.ERROR, message, meta);
  }

  warn(message, meta = {}) {
    this.log(LOG_LEVELS.WARN, message, meta);
  }

  info(message, meta = {}) {
    this.log(LOG_LEVELS.INFO, message, meta);
  }

  debug(message, meta = {}) {
    this.log(LOG_LEVELS.DEBUG, message, meta);
  }

  // HTTP request logging
  request(req, res, duration) {
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    };

    const level = res.statusCode >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;
    this.log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, meta);
  }

  // Security event logging
  security(event, meta = {}) {
    this.log(LOG_LEVELS.WARN, `SECURITY: ${event}`, {
      security: true,
      ...meta
    });
    writeToFile('security.log', formatLogEntry(LOG_LEVELS.WARN, event, {
      context: this.context,
      security: true,
      ...meta
    }));
  }

  // Audit logging
  audit(action, userId, meta = {}) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      ip: meta.ip,
      userAgent: meta.userAgent,
      details: meta.details,
      resource: meta.resource,
      resourceId: meta.resourceId
    };

    writeToFile('audit.log', JSON.stringify(auditEntry));
  }
}

// Create logger instance
const createLogger = (context) => new Logger(context);

// Default logger
const defaultLogger = createLogger();

module.exports = {
  Logger,
  createLogger,
  logger: defaultLogger,
  LOG_LEVELS
};
