import { Notification, Reservation, Workspace, User } from '../../database/models/index.js';
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
    const { read, limit = 20, page = 1, unreadOnly = false } = req.query;

    // Construir la consulta
    const whereClause = { user_id: userId };
    
    // Detectar si es la ruta /unread
    const isUnreadRoute = req.path.includes('/unread');
    const shouldFilterUnread = unreadOnly === 'true' || isUnreadRoute;

    // Filtrar solo no leídas si se especifica o es la ruta /unread
    if (shouldFilterUnread) {
      whereClause.is_read = false;  
    }
    
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
          attributes: ['id', 'start_time', 'end_time', 'number_of_people', 'guests'],
          include: [
            {
              model: Workspace,
              attributes: ['id', 'name', 'description', 'capacity', 'equipment']
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
          numberOfPeople: notification.Reservation.number_of_people,
          guests: notification.Reservation.guests,
          workspace: {
            id: notification.Reservation.Workspace?.id,
            name: notification.Reservation.Workspace?.name,
            description: notification.Reservation.Workspace?.description,
            capacity: notification.Reservation.Workspace?.capacity,
            equipment: notification.Reservation.Workspace?.equipment
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

/**
 * Crea una notificación global (solo administradores)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Notificación creada
 */
export const createGlobalNotification = async (req, res) => {
  try {
    const { message, type = 'global' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verificar que el usuario sea administrador
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado. Solo los administradores pueden crear notificaciones globales' 
      });
    }

    // Validar mensaje
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'El mensaje de la notificación es obligatorio' 
      });
    }

    if (message.length > 500) {
      return res.status(400).json({ 
        message: 'El mensaje no puede exceder los 500 caracteres' 
      });
    }

    // Obtener todos los usuarios activos de la misma empresa
    const companyUsers = await User.findAll({
      where: {
        company_id: req.user.company_id,
        is_active: true
      },
      attributes: ['id']
    });

    if (companyUsers.length === 0) {
      return res.status(400).json({ 
        message: 'No se encontraron usuarios en la empresa' 
      });
    }

    // Crear notificaciones para todos los usuarios
    const notifications = [];
    for (const user of companyUsers) {
      const notification = await Notification.create({
        user_id: user.id,
        type: type,
        message: message.trim(),
        is_read: false
      });
      notifications.push(notification);
    }

    console.log(`✅ Notificación global creada para ${notifications.length} usuarios por admin ${req.user.email}`);

    return res.status(201).json({
      message: 'Notificación global creada exitosamente',
      notification: {
        id: notifications[0].id, // ID de referencia
        type: type,
        message: message.trim(),
        recipients: notifications.length,
        createdBy: {
          id: userId,
          email: req.user.email,
          name: `${req.user.first_name} ${req.user.last_name}`
        }
      }
    });

  } catch (error) {
    console.error('Error al crear notificación global:', error);
    return res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
};

/**
 * Obtiene estadísticas de notificaciones (solo administradores)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Estadísticas de notificaciones
 */
export const getNotificationStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const companyId = req.user.company_id;

    // Verificar que el usuario sea administrador
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado. Solo los administradores pueden ver estadísticas' 
      });
    }

    // Obtener usuarios de la empresa
    const totalUsers = await User.count({
      where: {
        company_id: companyId,
        is_active: true
      }
    });

    // Obtener estadísticas de notificaciones
    const totalNotifications = await Notification.count({
      include: [{
        model: User,
        where: { company_id: companyId },
        attributes: []
      }]
    });

    const unreadNotifications = await Notification.count({
      where: { is_read: false },
      include: [{
        model: User,
        where: { company_id: companyId },
        attributes: []
      }]
    });

    const globalNotifications = await Notification.count({
      where: { type: 'global' },
      include: [{
        model: User,
        where: { company_id: companyId },
        attributes: []
      }]
    });

    return res.status(200).json({
      stats: {
        totalUsers,
        totalNotifications,
        unreadNotifications,
        globalNotifications,
        readRate: totalNotifications > 0 ? 
          Math.round(((totalNotifications - unreadNotifications) / totalNotifications) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return res.status(500).json({ 
      message: 'Error interno del servidor' 
    });
  }
};