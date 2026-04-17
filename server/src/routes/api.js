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
const communityController = require('../controllers/communityController');
const newsController = require('../controllers/newsController');
const { logger } = require('../utils/logger');

const { authenticateToken, isAdmin, optionalAuth } = require('../middleware/auth');
const { validate, registerValidation, loginValidation, changePasswordValidation, settingsValidation, resourceValidation } = require('../middleware/validate');
const authController = require('../controllers/authController');
// FIX: BUG-04 — Import bruteForceProtection middleware
const { bruteForceProtection, customRateLimit } = require('../middleware/security');

// Note: Rate limiting is configured globally in server/index.js
// No need for additional rate limiters here to avoid double-counting
const communityPostCreateLimiter = customRateLimit({
  windowMs: 10 * 60 * 1000,
  maxRequests: 12,
  keyGenerator: (req) => req.user?.id ? `community-post:${req.user.id}` : `community-post:${req.ip}`,
  handler: (_req, res) => {
    res.status(429).json({
      error: '发帖过于频繁，请稍后再试',
      retryAfter: 10 * 60,
    });
  },
});

const communityCommentCreateLimiter = customRateLimit({
  windowMs: 5 * 60 * 1000,
  maxRequests: 30,
  keyGenerator: (req) => req.user?.id ? `community-comment:${req.user.id}` : `community-comment:${req.ip}`,
  handler: (_req, res) => {
    res.status(429).json({
      error: '回复过于频繁，请稍后再试',
      retryAfter: 5 * 60,
    });
  },
});

// Auth Routes
router.post('/auth/register', validate(registerValidation), authController.register);
// FIX: BUG-04 — Mount bruteForceProtection on login routes
router.post('/auth/login', bruteForceProtection, validate(loginValidation), authController.login);
router.post('/auth/admin-login', bruteForceProtection, authController.adminLogin);
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
router.get('/users/:id/profile', optionalAuth, userController.getPublicProfile);
router.get('/users/:id/resources', optionalAuth, userController.getUserResources);
router.post('/users/:id/follow', authenticateToken, userController.toggleFollowUser);
router.delete('/users/:id/follow', authenticateToken, userController.toggleFollowUser);
router.get('/users/:id/followers', optionalAuth, userController.listFollowers);
router.get('/users/:id/following', optionalAuth, userController.listFollowing);
router.get('/users/following/ids', authenticateToken, userController.getFollowingIds);
router.get('/users/following/feed', authenticateToken, userController.getFollowingFeed);
router.get('/users/recommendations/follow', authenticateToken, userController.getFollowRecommendations);

// Notification Routes
router.get('/notifications', authenticateToken, notificationController.getNotifications);
router.put('/notifications/:id/read', authenticateToken, notificationController.markAsRead);
router.delete('/notifications/:id', authenticateToken, notificationController.deleteNotification);

// Comment Routes
router.get('/comments', commentController.getComments);
router.post('/comments', authenticateToken, commentController.createComment);
router.delete('/comments/:id', authenticateToken, commentController.deleteComment);

// Community Routes
router.get('/community/posts', optionalAuth, communityController.listPosts);
router.get('/community/posts/:id', optionalAuth, communityController.getPost);
router.post('/community/posts', authenticateToken, communityPostCreateLimiter, communityController.createPost);
router.put('/community/posts/:id', authenticateToken, communityController.updatePost);
router.delete('/community/posts/:id', authenticateToken, communityController.deletePost);
router.post('/community/posts/:id/report', authenticateToken, communityController.reportPostContent);
router.post('/community/posts/:id/like', authenticateToken, communityController.togglePostLike);
router.get('/community/posts/:id/comments', optionalAuth, communityController.listPostComments);
router.post('/community/posts/:id/comments', authenticateToken, communityCommentCreateLimiter, communityController.createPostComment);
router.delete('/community/posts/:id/comments/:commentId', authenticateToken, communityController.deletePostComment);
router.put('/community/posts/:id/status', authenticateToken, communityController.updatePostStatus);
router.put('/community/posts/:id/solve', authenticateToken, communityController.solvePost);
router.post('/community/posts/:id/join', authenticateToken, communityController.joinTeamPost);
router.delete('/community/posts/:id/join', authenticateToken, communityController.leaveTeamPost);
router.get('/community/posts/:id/members', optionalAuth, communityController.listTeamMembers);
router.get('/community/search', optionalAuth, communityController.searchPosts);

// Community Groups
router.get('/community/groups', optionalAuth, communityController.listGroups);
router.get('/community/groups/:id', optionalAuth, communityController.getGroup);
router.post('/community/groups', authenticateToken, communityController.createGroup);
router.put('/community/groups/:id', authenticateToken, communityController.updateGroup);
router.delete('/community/groups/:id', authenticateToken, communityController.deleteGroup);

// News
router.get('/news', optionalAuth, newsController.listNews);
router.get('/news/:id', optionalAuth, newsController.getNews);
router.get('/news/:id/source-health', optionalAuth, newsController.checkNewsSourceHealth);
router.post('/news', authenticateToken, newsController.createNews);
router.post('/news/import', authenticateToken, newsController.importNews);
router.put('/news/:id', authenticateToken, newsController.updateNews);
router.put('/news/:id/review', authenticateToken, isAdmin, newsController.reviewNews);
router.delete('/news/:id', authenticateToken, newsController.deleteNews);

// Admin Community Routes
router.get('/admin/community/stats', authenticateToken, isAdmin, communityController.adminCommunityStats);
router.get('/admin/community/metrics', authenticateToken, isAdmin, communityController.adminCommunityMetrics);
router.post('/community/metrics/track', optionalAuth, communityController.trackCommunityMetric);
router.put('/admin/community/posts/:id/review', authenticateToken, isAdmin, communityController.reviewPost);
router.post('/admin/community/posts/batch-review', authenticateToken, isAdmin, communityController.batchReviewPosts);

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

// Allow article owners to restore their own soft-deleted drafts/submissions.
router.post('/articles/:id/recover', authenticateToken, resourceController.restoreOwnHandler('articles'));

// Specific routes that shouldn't be overridden by the loop
// Event Registration Routes
router.post('/events/assistant', optionalAuth, eventAssistantController.handleEventAssistant);
router.get('/events/distinct-options', resourceController.getEventDistinctOptions);
router.post('/events/:id/register', authenticateToken, eventController.registerEvent);
router.get('/events/:id/registration', authenticateToken, eventController.getRegistrationStatus);
router.post('/events/:id/view', optionalAuth, eventController.trackEventView);

// Contact / Messages Routes
router.post('/contact', messageController.submitMessage);
router.get('/admin/messages', authenticateToken, isAdmin, messageController.getMessages);
router.delete('/admin/messages/:id', authenticateToken, isAdmin, messageController.deleteMessage);
router.put('/admin/messages/:id/read', authenticateToken, isAdmin, messageController.markAsRead);

// Client-side error reporting
router.post('/errors', (req, res) => {
    const { errors } = req.body || {};

    if (!Array.isArray(errors)) {
        return res.status(400).json({
            error: 'Invalid payload',
            message: '`errors` must be an array'
        });
    }

    if (errors.length > 0) {
        logger.warn('Client errors reported', {
            count: errors.length,
            sample: errors.slice(0, 3).map((error) => ({
                type: error?.type,
                message: error?.message || error?.reason || error?.error,
                path: error?.path || error?.context?.url,
                filename: error?.filename,
                lineno: error?.lineno,
                colno: error?.colno,
                stack: error?.stack,
                timestamp: error?.timestamp
            })),
            ip: req.ip
        });
    }

    res.status(204).send();
});

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

    // FIX: BUG-22 — Add input validation middleware for resource create/update
    // Create
    router.post(`/${resource}`, authenticateToken, validate(resourceValidation), resourceController.createHandler(resource, resourceController.fields[resource]));

    // Update
    router.put(`/${resource}/:id`, authenticateToken, validate(resourceValidation), resourceController.updateHandler(resource, resourceController.fields[resource]));
    
    // Delete (Soft Delete)
    router.delete(`/${resource}/:id`, authenticateToken, resourceController.deleteHandler(resource));

    // Permanent Delete
    router.delete(`/${resource}/:id/permanent`, authenticateToken, isAdmin, resourceController.permanentDeleteHandler(resource));

    // Restore
    router.post(`/${resource}/:id/restore`, authenticateToken, isAdmin, resourceController.restoreHandler(resource));

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
