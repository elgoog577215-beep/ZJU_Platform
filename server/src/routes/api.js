const express = require('express');
const router = express.Router();

// Middleware
const { upload } = require('../middleware/upload');

// Controllers
const resourceController = require('../controllers/resourceController');
const favoriteController = require('../controllers/favoriteController');
const settingsController = require('../controllers/settingsController');
const systemController = require('../controllers/systemController');
const fsController = require('../controllers/fsController');
const eventController = require('../controllers/eventController');
const eventAssistantController = require('../controllers/eventAssistantController');
const userController = require('../controllers/userController');
const messageController = require('../controllers/messageController');
const tagController = require('../controllers/tagController');
const notificationController = require('../controllers/notificationController');
const commentController = require('../controllers/commentController');

const { authenticateToken, isAdmin, optionalAuth } = require('../middleware/auth');
const { validate, registerValidation, loginValidation, changePasswordValidation, settingsValidation } = require('../middleware/validate');
const authController = require('../controllers/authController');

// Note: Rate limiting is configured globally in server/index.js
// No need for additional rate limiters here to avoid double-counting

// Auth Routes
router.post('/auth/register', validate(registerValidation), authController.register);
router.post('/auth/login', validate(loginValidation), authController.login);
router.post('/auth/admin-login', authController.adminLogin);
router.get('/auth/me', authenticateToken, authController.me);
router.post('/auth/change-password', authenticateToken, validate(changePasswordValidation), authController.changePassword);
router.put('/auth/profile', authenticateToken, (req, res) => {
    // Alias to userController.updateUser but forcing the ID to be the logged-in user
    req.params.id = req.user.id;
    userController.updateUser(req, res);
});

// User Management Routes (Admin)
router.get('/admin/users', authenticateToken, isAdmin, userController.getAllUsers);
router.put('/admin/users/:id', authenticateToken, isAdmin, userController.updateUser);
router.delete('/admin/users/:id', authenticateToken, isAdmin, userController.deleteUser);

// Public Profile Routes
router.get('/users/:id/profile', userController.getPublicProfile);
router.get('/users/:id/resources', optionalAuth, userController.getUserResources);

// Notification Routes
router.get('/notifications', authenticateToken, notificationController.getNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/notifications/:id', authenticateToken, notificationController.deleteNotification);

// Comment Routes
router.get('/comments', commentController.getComments);
router.post('/comments', authenticateToken, commentController.createComment);
router.delete('/comments/:id', authenticateToken, commentController.deleteComment);

// Favorite Routes
router.post('/favorites/toggle', authenticateToken, favoriteController.toggleFavorite);
router.get('/favorites', authenticateToken, favoriteController.getFavorites);
router.get('/favorites/check', authenticateToken, favoriteController.checkFavoriteStatus);

// System Routes
router.get('/search', systemController.searchContent);
router.get('/stats', authenticateToken, isAdmin, systemController.getStats);
router.get('/site-metrics', systemController.getSiteMetrics);
router.post('/site-metrics/visit', optionalAuth, systemController.trackVisit);
router.post('/upload', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), systemController.handleUpload);
router.get('/db/backup', authenticateToken, isAdmin, systemController.downloadDbBackup);
router.get('/featured', systemController.getFeaturedContent);
router.post('/events/crawl', authenticateToken, isAdmin, systemController.crawlEvents);
router.get('/audit-logs', authenticateToken, isAdmin, systemController.getAuditLogs);
router.get('/admin/pending', authenticateToken, isAdmin, systemController.getPendingContent);

// Settings Routes
router.get('/settings', settingsController.getSettings);
router.post('/settings', authenticateToken, isAdmin, validate(settingsValidation), settingsController.updateSetting);

// File System Routes
router.get('/fs/list', authenticateToken, isAdmin, fsController.listFiles);
router.get('/fs/content', authenticateToken, isAdmin, fsController.getFileContent);
router.post('/fs/content', authenticateToken, isAdmin, fsController.saveFileContent);

// Resource Routes (Generic)
const resources = ['photos', 'music', 'videos', 'articles', 'events'];

// Specific routes that shouldn't be overridden by the loop
// Event Registration Routes
router.post('/events/assistant', optionalAuth, eventAssistantController.handleEventAssistant);
router.post('/events/:id/register', authenticateToken, eventController.registerEvent);
router.get('/events/:id/registration', authenticateToken, eventController.getRegistrationStatus);
router.post('/events/:id/view', optionalAuth, eventController.trackEventView);

// Contact / Messages Routes
router.post('/contact', messageController.submitMessage);
router.get('/admin/messages', authenticateToken, isAdmin, messageController.getMessages);
router.delete('/admin/messages/:id', authenticateToken, isAdmin, messageController.deleteMessage);
router.put('/admin/messages/:id/read', authenticateToken, isAdmin, messageController.markAsRead);

// Tag Routes
router.get('/tags', tagController.getTags);
router.post('/tags', authenticateToken, isAdmin, tagController.createTag);
router.put('/tags/:id', authenticateToken, isAdmin, tagController.updateTag);
router.delete('/tags/:id', authenticateToken, isAdmin, tagController.deleteTag);
router.post('/tags/sync', authenticateToken, isAdmin, tagController.syncTags);

resources.forEach(resource => {
    // Get All
    router.get(`/${resource}`, optionalAuth, resourceController.getAllHandler(resource));
    
    // Get One
    router.get(`/${resource}/:id`, optionalAuth, resourceController.getOneHandler(resource));

    // Get Related
    router.get(`/${resource}/:id/related`, optionalAuth, resourceController.getRelatedHandler(resource));
    
    // Get Distinct Values for a Field
    router.get(`/${resource}/distinct/:field`, resourceController.getDistinctValues(resource));

    // Create
    router.post(`/${resource}`, authenticateToken, resourceController.createHandler(resource, resourceController.fields[resource]));
    
    // Update
    router.put(`/${resource}/:id`, authenticateToken, resourceController.updateHandler(resource, resourceController.fields[resource]));
    
    // Delete (Soft Delete)
    router.delete(`/${resource}/:id`, authenticateToken, resourceController.deleteHandler(resource));

    // Permanent Delete
    router.delete(`/${resource}/:id/permanent`, authenticateToken, isAdmin, resourceController.permanentDeleteHandler(resource));

    // Restore
    router.post(`/${resource}/:id/restore`, authenticateToken, isAdmin, resourceController.restoreHandler(resource));

    // Like (requires authentication to prevent abuse)
    router.post(`/${resource}/:id/like`, authenticateToken, resourceController.toggleLike(resource));

    // Update Status
    router.put(`/${resource}/:id/status`, authenticateToken, isAdmin, resourceController.updateStatus(resource));
});

// Performance Metrics Endpoint
router.post('/analytics/performance', (req, res) => {
    // Store performance metrics (in production, send to analytics service)
    const metric = req.body;
    
    // Log slow metrics for monitoring
    if (metric.value > 1000 || metric.duration > 1000) {
        console.warn('[Performance] Slow metric detected:', metric);
    }
    
    res.status(204).send();
});

// Health check endpoint with performance info
router.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    };
    
    res.json(health);
});

module.exports = router;
