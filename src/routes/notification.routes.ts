import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth';
import * as notificationController from '../controllers/notification.controller';
import { apiLimiter } from '../middleware/rateLimit';

const router = Router();

// Apply general rate limiting to all notification routes
router.use(apiLimiter);

/**
 * Get user notifications
 */
router.get('/', authenticateJWT, notificationController.getNotifications);

/**
 * Mark notification as read
 */
router.patch('/:id/read', authenticateJWT, notificationController.markAsRead);

/**
 * Mark all notifications as read
 */
router.patch('/read-all', authenticateJWT, notificationController.markAllAsRead);

/**
 * Delete notification
 */
router.delete('/:id', authenticateJWT, notificationController.deleteNotification);

/**
 * Get notification preferences
 */
router.get('/preferences', authenticateJWT, notificationController.getPreferences);

/**
 * Update notification preferences
 */
router.patch('/preferences', authenticateJWT, notificationController.updatePreferences);

export default router;
