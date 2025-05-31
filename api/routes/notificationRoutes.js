import express from 'express';
import { getUserNotifications, markAsRead, markAllAsRead, getUnreadCount, createGlobalNotification, getNotificationStats } from '../controllers/notificationController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authenticateToken);

// Rutas de notificaciones
router.get('/', getUserNotifications);
router.get('/unread', getUserNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

// Crear notificación global (solo admins)
router.post('/global', authorizeRole('admin'), createGlobalNotification);

// Obtener estadísticas (solo admins)
router.get('/stats', authorizeRole('admin'), getNotificationStats);

export default router;