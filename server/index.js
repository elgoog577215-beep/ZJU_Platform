const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getDb } = require('./src/config/db');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Optimization Middleware
app.use(compression());
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow loading resources (images) from localhost
}));

// Trust proxy for correct protocol/secure cookies behind Nginx/ALB
app.set('trust proxy', 1);

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

// CORS: allow specific frontend origin if provided
const allowedOrigin = process.env.FRONTEND_URL;
if (allowedOrigin) {
  app.use(cors({ origin: allowedOrigin, credentials: true }));
} else {
  app.use(cors());
}
app.use(express.json());

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

// API Routes
app.use('/api', apiRoutes);

// Catch-all for SPA (must be after API routes)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Database Initialization
getDb().then(async (db) => {
  console.log('Database connected');
  // Auto-sanitization (optional, since we rebuilt)
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
