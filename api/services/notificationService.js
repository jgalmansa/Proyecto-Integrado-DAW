import { Notification } from '../../database/models/index.js';



/**
 * Crea una notificación personal para un usuario
 * @param {Number} userId - ID del usuario
 * @param {String} message - Mensaje de la notificación
 * @param {Number} reservationId - ID de la reserva relacionada (opcional)
 * @returns {Promise<Object>} - Notificación creada
 */
export const createPersonalNotification = async (userId, message, reservationId = null) => {
  try {
    return await Notification.create({
      user_id: userId,
      type: 'personal',
      message,
      is_read: false,
      reservation_id: reservationId
    });
  } catch (error) {
    console.error('Error al crear notificación personal:', error);
    throw new Error('No se pudo crear la notificación');
  }
};



/**
 * Crea una notificación de confirmación de reserva
 * @param {Number} reservationId - ID de la reserva
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const createReservationConfirmation = async (reservationId) => {
  try {
    // Importar los modelos necesarios
    const { Reservation, Workspace } = await import('../../database/models/index.js');
    
    // Obtener la reserva con datos del espacio
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Workspace, attributes: ['name'] }]
    });
    
    if (!reservation) {
      return { success: false, message: 'Reserva no encontrada' };
    }
    
    // Formatear fecha para el mensaje
    const startTime = new Date(reservation.start_time);
    const formattedDate = startTime.toLocaleDateString('es-ES');
    const formattedTime = startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Crear mensaje de confirmación simple
    const message = `Reserva confirmada para ${reservation.Workspace.name} el ${formattedDate} a las ${formattedTime}`;
    
    // Crear la notificación
    await createPersonalNotification(reservation.user_id, message, reservationId);
    
    return { success: true };
  } catch (error) {
    console.error('Error al crear confirmación de reserva:', error);
    throw new Error('No se pudo crear la confirmación');
  }
};



/**
 * Crea una notificación global para los usuarios de una empresa
 * @param {Number} companyId - ID de la empresa
 * @param {String} message - Mensaje de la notificación
 * @param {Array} excludeUserIds - Lista de IDs de usuarios a excluir (opcional)
 * @returns {Promise<Array>} - Lista de notificaciones creadas
 */
export const createGlobalNotification = async (companyId, message, excludeUserIds = []) => {
  try {
    // Importar el modelo User aquí para evitar dependencias circulares
    const { User } = await import('../../database/models/index.js');
    
    // Obtener todos los usuarios de la empresa
    const users = await User.findAll({
      where: {
        company_id: companyId,
        is_active: true,
        id: { [Op.notIn]: excludeUserIds }
      }
    });
    
    // Crear notificaciones para cada usuario
    const notifications = await Promise.all(
      users.map(user => 
        Notification.create({
          user_id: user.id,
          type: 'global',
          message,
          is_read: false
        })
      )
    );
    
    return notifications;
  } catch (error) {
    console.error('Error al crear notificación global:', error);
    throw new Error('No se pudo crear la notificación global');
  }
};

/**
 * Crea una notificación de recordatorio para una reserva próxima
 * @param {Number} reservationId - ID de la reserva
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const createReservationReminder = async (reservationId) => {
  try {
    // Importar los modelos necesarios
    const { Reservation, Workspace } = await import('../../database/models/index.js');
    
    // Obtener la reserva con datos del espacio
    const reservation = await Reservation.findByPk(reservationId, {
      include: [{ model: Workspace, attributes: ['name'] }]
    });
    
    if (!reservation || reservation.status !== 'confirmed') {
      return { success: false, message: 'Reserva no encontrada o no confirmada' };
    }
    
    // Formatear fecha para el mensaje
    const startTime = new Date(reservation.start_time);
    const formattedDate = startTime.toLocaleDateString('es-ES');
    const formattedTime = startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Crear mensaje de recordatorio
    const message = `RECORDATORIO: Tienes una reserva para ${reservation.Workspace.name} hoy ${formattedDate} a las ${formattedTime}.`;
    
    // Crear la notificación
    await Notification.create({
      user_id: reservation.user_id,
      type: 'personal',
      message,
      is_read: false,
      reservation_id: reservationId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error al crear recordatorio de reserva:', error);
    throw new Error('No se pudo crear el recordatorio');
  }
};

/**
 * Marca una notificación como leída
 * @param {Number} notificationId - ID de la notificación
 * @param {Number} userId - ID del usuario
 * @returns {Promise<Boolean>} - Verdadero si se actualizó correctamente
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        user_id: userId
      }
    });
    
    if (!notification) {
      return false;
    }
    
    await notification.update({ is_read: true });
    return true;
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return false;
  }
};

/**
 * Obtiene las notificaciones no leídas de un usuario
 * @param {Number} userId - ID del usuario
 * @param {Number} limit - Límite de resultados (opcional)
 * @returns {Promise<Array>} - Lista de notificaciones
 */
export const getUnreadNotifications = async (userId, limit = 10) => {
  try {
    return await Notification.findAll({
      where: {
        user_id: userId,
        is_read: false
      },
      order: [['created_at', 'DESC']],
      limit
    });
  } catch (error) {
    console.error('Error al obtener notificaciones no leídas:', error);
    throw new Error('No se pudieron obtener las notificaciones');
  }
};

// No olvides importar Op de Sequelize en la parte superior del archivo
import { Op } from 'sequelize';


