const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Middleware
const upload = require('../middleware/upload');
const cacheMiddleware = require('../middleware/cache');

// Controllers
const resourceController = require('../controllers/resourceController');
const favoriteController = require('../controllers/favoriteController');
const commentController = require('../controllers/commentController');
const categoryController = require('../controllers/categoryController');
const settingsController = require('../controllers/settingsController');
const systemController = require('../controllers/systemController');
const fsController = require('../controllers/fsController');
const eventController = require('../controllers/eventController');
const userController = require('../controllers/userController');

const { authenticateToken, isAdmin } = require('../middleware/auth');
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

// Favorite Routes
router.post('/favorites/toggle', authenticateToken, favoriteController.toggleFavorite);
router.get('/favorites', authenticateToken, favoriteController.getFavorites);
router.get('/favorites/check', authenticateToken, favoriteController.checkFavoriteStatus);

// System Routes
router.get('/search', systemController.searchContent);
router.get('/stats', systemController.getStats);
router.post('/upload', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), systemController.handleUpload);
router.get('/db/backup', systemController.downloadDbBackup);
router.get('/featured', systemController.getFeaturedContent);
router.post('/events/crawl', systemController.crawlEvents);
router.get('/audit-logs', systemController.getAuditLogs);
router.get('/admin/pending', systemController.getPendingContent);

// Settings Routes
router.get('/settings', settingsController.getSettings);
router.post('/settings', settingsController.updateSetting);

// File System Routes
router.get('/fs/list', fsController.listFiles);
router.get('/fs/content', fsController.getFileContent);
router.post('/fs/content', fsController.saveFileContent);

// Resource Routes (Generic)
const resources = ['photos', 'music', 'videos', 'articles', 'events'];

// Specific routes that shouldn't be overridden by the loop
// Event Registration Routes
router.post('/events/:id/register', authenticateToken, eventController.registerEvent);
router.get('/events/:id/registration', authenticateToken, eventController.getRegistrationStatus);

// Comments Routes
router.get('/articles/:id/comments', commentController.getComments);
router.post('/articles/:id/comments', commentController.addComment);

resources.forEach(resource => {
    // Get All
    router.get(`/${resource}`, resourceController.getAllHandler(resource));
    
    // Get One
    router.get(`/${resource}/:id`, resourceController.getOneHandler(resource));

    // Get Categories
    router.get(`/${resource}/categories`, categoryController.getCategories(resource));
    
    // Manage Categories (Independent Management)
    router.post(`/${resource}/categories`, categoryController.addCategory(resource));
    router.put(`/${resource}/categories/:oldName`, categoryController.updateCategory(resource));
    router.delete(`/${resource}/categories/:name`, categoryController.deleteCategory(resource));

    // Create
    router.post(`/${resource}`, resourceController.createHandler(resource, resourceController.fields[resource]));
    
    // Update
    router.put(`/${resource}/:id`, resourceController.updateHandler(resource, resourceController.fields[resource]));
    
    // Delete (Soft Delete)
    router.delete(`/${resource}/:id`, resourceController.deleteHandler(resource));

    // Permanent Delete
    router.delete(`/${resource}/:id/permanent`, resourceController.permanentDeleteHandler(resource));

    // Restore
    router.post(`/${resource}/:id/restore`, resourceController.restoreHandler(resource));

    // Like
    router.post(`/${resource}/:id/like`, resourceController.toggleLike(resource));

    // Update Status
    router.put(`/${resource}/:id/status`, resourceController.updateStatus(resource));
});

module.exports = router;