const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Upload configuration
const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024, // 500MB default
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  allowedTypes: {
    image: {
      // FIX: BUG-05 — Remove SVG to prevent stored XSS via event handlers (onload, onerror, etc.)
      extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      maxSize: 50 * 1024 * 1024 // 50MB for images
    },
    video: {
      extensions: ['.mp4', '.webm', '.mov'],
      mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      maxSize: 500 * 1024 * 1024 // 500MB for videos
    },
    audio: {
      extensions: ['.mp3', '.wav', '.ogg', '.m4a'],
      mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
      maxSize: 100 * 1024 * 1024 // 100MB for audio
    },
    document: {
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.md', '.markdown'],
      mimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'text/x-markdown',
      ],
      maxSize: 20 * 1024 * 1024 // 20MB for documents
    },
    wechatAccountList: {
      extensions: ['.csv', '.tsv', '.json'],
      mimeTypes: [
        'text/csv',
        'text/tab-separated-values',
        'application/json',
        'application/vnd.ms-excel',
      ],
      maxSize: 5 * 1024 * 1024 // 5MB for account list imports
    }
  }
};

const DEFAULT_CONTENT_TYPES = ['image', 'video', 'audio', 'document'];
const DANGEROUS_UPLOAD_EXTENSION_RE = /\.(php|php5|php7|phtml|asp|aspx|jsp|pl|py|sh|bash|zsh|bat|cmd|exe|dll|vbs|com|scr|jar|js|mjs|cjs|html|htm|svg|xml)(?:$|\.)/i;
const DANGEROUS_STATIC_UPLOAD_RE = /\.(html?|svg|xml|js|mjs|cjs)$/i;

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_CONFIG.uploadDir)) {
  fs.mkdirSync(UPLOAD_CONFIG.uploadDir, { recursive: true });
}

// Create subdirectories for different file types
const subdirs = ['images', 'videos', 'audio', 'documents', 'avatars', 'temp'];
subdirs.forEach(dir => {
  const dirPath = path.join(UPLOAD_CONFIG.uploadDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

/**
 * Generate secure filename
 */
const generateFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomBytes}${ext}`;
};

/**
 * Get subdirectory based on file type
 */
const getSubdirectory = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'images';
  if (mimetype.startsWith('video/')) return 'videos';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'documents';
};

/**
 * Check if file type is allowed
 */
const isAllowedFile = (file, allowedTypeNames = DEFAULT_CONTENT_TYPES) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;
  
  // Block dangerous extensions (double extension attack protection)
  if (DANGEROUS_UPLOAD_EXTENSION_RE.test(file.originalname)) {
    return { allowed: false, reason: 'Security: Dangerous file type not allowed' };
  }
  
  // Check against allowed types
  for (const type of allowedTypeNames) {
    const config = UPLOAD_CONFIG.allowedTypes[type];
    if (!config) continue;

    const extAllowed = config.extensions.includes(ext);
    const mimeAllowed = config.mimeTypes.includes(mimetype);
    
    if (extAllowed && mimeAllowed) {
      // Check file size
      if (file.size > config.maxSize) {
        return { 
          allowed: false, 
          reason: `File too large. Maximum size for ${type} is ${(config.maxSize / 1024 / 1024).toFixed(0)}MB` 
        };
      }
      return { allowed: true, type };
    }
  }
  
  return { allowed: false, reason: 'Invalid file type' };
};

const normalizeFieldTypeMap = (fieldTypeMap = {}) => ({
  default: fieldTypeMap.default || DEFAULT_CONTENT_TYPES,
  ...fieldTypeMap,
});

const createUpload = (fieldTypeMap = {}) => {
  const allowedTypesByField = normalizeFieldTypeMap(fieldTypeMap);

  return multer({
    storage,
    limits: {
      fileSize: UPLOAD_CONFIG.maxFileSize,
      files: 5,
      fields: 20,
    },
    fileFilter: (_req, file, cb) => {
      const allowedTypeNames = allowedTypesByField[file.fieldname] || allowedTypesByField.default;
      const result = isAllowedFile(file, allowedTypeNames);

      if (result.allowed) {
        file.fileType = result.type;
        cb(null, true);
      } else {
        cb(new Error(result.reason), false);
      }
    },
  });
};

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const subdir = getSubdirectory(file.mimetype);
    const destPath = path.join(UPLOAD_CONFIG.uploadDir, subdir);
    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    const filename = generateFilename(file.originalname);
    cb(null, filename);
  }
});

const contentUpload = createUpload({
  file: ['image', 'video', 'audio', 'document'],
  cover: ['image'],
});

const documentUpload = createUpload({
  document: ['document'],
  file: ['document'],
});

const wechatAccountListUpload = createUpload({
  file: ['wechatAccountList'],
});

// Backwards-compatible alias for legacy imports.
const upload = contentUpload;

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, path.join(UPLOAD_CONFIG.uploadDir, 'avatars'));
    },
    filename: function (_req, file, cb) {
      cb(null, generateFilename(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 4
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedExtensions.includes(ext) || !allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error('Avatar must be a JPG, PNG, or WebP image'), false);
      return;
    }
    cb(null, true);
  }
});

const isDangerousStaticUploadPath = (requestPath = '') => {
  try {
    const decodedPath = decodeURIComponent(String(requestPath || ''));
    return DANGEROUS_STATIC_UPLOAD_RE.test(decodedPath);
  } catch {
    return DANGEROUS_STATIC_UPLOAD_RE.test(String(requestPath || ''));
  }
};

const blockDangerousUploadRequest = (req, res, next) => {
  if (isDangerousStaticUploadPath(req.path || req.url || '')) {
    return res.status(404).json({ error: 'File not found' });
  }
  return next();
};

const setUploadStaticSecurityHeaders = (res, filePath) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (DANGEROUS_STATIC_UPLOAD_RE.test(String(filePath || ''))) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }
};

/**
 * Error handling middleware for multer
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          error: 'File too large',
          message: `Maximum file size is ${(UPLOAD_CONFIG.maxFileSize / 1024 / 1024).toFixed(0)}MB`
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(413).json({
          error: 'Too many files',
          message: 'Maximum 5 files allowed per upload'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          error: 'Unexpected field',
          message: 'Upload field name not recognized'
        });
      default:
        return res.status(400).json({
          error: 'Upload error',
          message: err.message
        });
    }
  }
  
  if (err) {
    return res.status(400).json({
      error: 'Upload failed',
      message: err.message
    });
  }
  
  next();
};

/**
 * Scan file for malware signatures (basic check)
 * In production, use a proper antivirus solution
 */
const scanFile = async (filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    
    // Check file size consistency
    if (stats.size === 0) {
      throw new Error('Empty file');
    }
    
    // FIX: BUG-07 — Only read first 8KB to prevent OOM on large files (videos, audio)
    const ext = path.extname(filePath).toLowerCase();
    if (!['.php', '.phtml'].includes(ext)) {
      const MAX_SCAN_BYTES = 8192;
      const fd = await fs.promises.open(filePath, 'r');
      const scanBuffer = Buffer.alloc(Math.min(MAX_SCAN_BYTES, stats.size));
      await fd.read(scanBuffer, 0, scanBuffer.length, 0);
      await fd.close();
      const buffer = scanBuffer.toString('utf8');
      const dangerousPatterns = [
        /<?php/i,
        /<script\b[^>]*>[\s\S]*?<\/script>/i,
        /eval\s*\(/i,
        /exec\s*\(/i,
        /system\s*\(/i,
        /passthru\s*\(/i,
        /shell_exec\s*\(/i
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(buffer)) {
          throw new Error('Potentially malicious content detected');
        }
      }
    }
    
    return { clean: true };
  } catch (error) {
    return { clean: false, reason: error.message };
  }
};

/**
 * Cleanup temporary files
 */
const cleanupTempFiles = async (files) => {
  if (!files) return;
  
  const filesArray = Array.isArray(files) ? files : [files];
  
  for (const file of filesArray) {
    try {
      if (file && file.path && fs.existsSync(file.path)) {
        await fs.promises.unlink(file.path);
        console.log(`🗑️ Cleaned up temp file: ${file.filename}`);
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
};

/**
 * Move file to permanent location
 */
const moveToPermanent = async (tempPath, filename, fileType) => {
  const subdir = fileType || 'documents';
  const destDir = path.join(UPLOAD_CONFIG.uploadDir, subdir);
  const destPath = path.join(destDir, filename);
  
  await fs.promises.rename(tempPath, destPath);
  return destPath;
};

module.exports = {
  upload,
  contentUpload,
  documentUpload,
  wechatAccountListUpload,
  avatarUpload,
  handleUploadError,
  scanFile,
  cleanupTempFiles,
  moveToPermanent,
  UPLOAD_CONFIG,
  generateFilename,
  isAllowedFile,
  createUpload,
  blockDangerousUploadRequest,
  isDangerousStaticUploadPath,
  setUploadStaticSecurityHeaders,
};
