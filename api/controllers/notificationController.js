import { Notification, Reservation, Workspace } from '../../database/models/index.js';
import { 
  markNotificationAsRead, 
  getUnreadNotifications 
} from '../services/notificationService.js';

/**
 * Obtiene las notificaciones de un usuario
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de notificaciones
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { read, limit = 20, page = 1 } = req.query;
    
    // Construir la consulta
    const whereClause = { user_id: userId };
    
    // Si se especifica filtrar por leídas/no leídas
    if (read !== undefined) {
      whereClause.is_read = read === 'true';
    }
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    // Obtener notificaciones con paginación
    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Reservation,
          attributes: ['id', 'start_time', 'end_time'],
          include: [
            {
              model: Workspace,
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    });
    
    // Formatear las notificaciones
    const formattedNotifications = notifications.rows.map(notification => {
      const formattedNotification = {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        isRead: notification.is_read,
        createdAt: notification.created_at
      };
      
      // Incluir datos de la reserva si existe
      if (notification.Reservation) {
        formattedNotification.reservation = {
          id: notification.Reservation.id,
          startTime: notification.Reservation.start_time,
          endTime: notification.Reservation.end_time,
          workspace: {
            id: notification.Reservation.Workspace?.id,
            name: notification.Reservation.Workspace?.name
          }
        };
      }
      
      return formattedNotification;
    });
    
    // Calcular información de paginación
    const totalPages = Math.ceil(notifications.count / limit);
    
    return res.status(200).json({
      message: 'Notificaciones obtenidas correctamente',
      notifications: formattedNotifications,
      pagination: {
        total: notifications.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
    
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Marca una notificación como leída
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Confirmación de la operación
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const success = await markNotificationAsRead(id, userId);
    
    if (!success) {
      return res.status(404).json({ message: 'Notificación no encontrada' });
    }
    
    return res.status(200).json({
      message: 'Notificación marcada como leída correctamente',
      notificationId: id
    });
    
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Marca todas las notificaciones de un usuario como leídas
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Confirmación de la operación
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } }
    );
    
    return res.status(200).json({
      message: 'Todas las notificaciones marcadas como leídas correctamente'
    });
    
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtiene el conteo de notificaciones no leídas
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Conteo de notificaciones
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const count = await Notification.count({
      where: { user_id: userId, is_read: false }
    });
    
    return res.status(200).json({
      unreadCount: count
    });
    
  } catch (error) {
    console.error('Error al obtener conteo de notificaciones no leídas:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};