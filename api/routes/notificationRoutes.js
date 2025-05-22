import express from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../controllers/notificationController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authenticateToken);

// Rutas de notificaciones
router.get('/', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;