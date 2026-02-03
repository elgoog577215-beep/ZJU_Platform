const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Middleware
const upload = require('../middleware/upload');
const cacheMiddleware = require('../middleware/cache');

// Controllers
const resourceController = require('../controllers/resourceController');
const favoriteController = require('../controllers/favoriteController');
const settingsController = require('../controllers/settingsController');
const systemController = require('../controllers/systemController');
const fsController = require('../controllers/fsController');
const eventController = require('../controllers/eventController');
const userController = require('../controllers/userController');
const messageController = require('../controllers/messageController');
const tagController = require('../controllers/tagController');
const notificationController = require('../controllers/notificationController');
const commentController = require('../controllers/commentController');
const viewController = require('../controllers/viewController');

const { authenticateToken, isAdmin, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Auth Routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/admin-login', authController.adminLogin);
router.get('/auth/me', authenticateToken, authController.me);
router.post('/auth/change-password', authenticateToken, authController.changePassword);
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

// View Routes
router.post('/views/:type/:id', viewController.incrementView);

// System Routes
router.get('/search', systemController.searchContent);
router.get('/stats', systemController.getStats);
router.post('/upload', authenticateToken, upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), systemController.handleUpload);
router.get('/db/backup', systemController.downloadDbBackup);
router.get('/featured', systemController.getFeaturedContent);
router.post('/events/crawl', systemController.crawlEvents);
router.get('/audit-logs', systemController.getAuditLogs);
router.get('/admin/pending', authenticateToken, isAdmin, systemController.getPendingContent);

// Settings Routes
router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.updateSetting);

// File System Routes
router.get('/fs/list', authenticateToken, isAdmin, fsController.listFiles);
router.get('/fs/content', authenticateToken, isAdmin, fsController.getFileContent);
router.post('/fs/content', authenticateToken, isAdmin, fsController.saveFileContent);

// Resource Routes (Generic)
const resources = ['photos', 'music', 'videos', 'articles', 'events'];

// Specific routes that shouldn't be overridden by the loop
// Event Registration Routes
router.post('/events/:id/register', authenticateToken, eventController.registerEvent);
router.get('/events/:id/registration', authenticateToken, eventController.getRegistrationStatus);

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

    // Like
    router.post(`/${resource}/:id/like`, resourceController.toggleLike(resource));

    // Update Status
    router.put(`/${resource}/:id/status`, authenticateToken, isAdmin, resourceController.updateStatus(resource));
});

module.exports = router;
