import { Reservation, Workspace, User, Notification } from '../../database/models/index.js';
import { Op } from 'sequelize';
import { createPersonalNotification, createGlobalNotification, createReservationConfirmation } from '../services/notificationService.js';


/**
 * Crea una nueva reserva de espacio
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Reserva creada
 */
export const createReservation = async (req, res) => {
  try {
    const { workspaceId, guests, numberOfPeople, startTime, endTime } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;
    
    // Verificar que el espacio de trabajo existe y pertenece a la misma empresa
    const workspace = await Workspace.findOne({ 
      where: { 
        id: workspaceId, 
        company_id: companyId,
        is_available: true
      } 
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado o no disponible' });
    }
    
    // Verificar si el número de personas excede la capacidad
    if (numberOfPeople > workspace.capacity) {
      return res.status(400).json({ 
        message: `El número de personas excede la capacidad del espacio (máximo: ${workspace.capacity})` 
      });
    }
    
    // Convertir a objetos Date para comparaciones
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Validar que la fecha de inicio sea anterior a la de fin
    if (start >= end) {
      return res.status(400).json({ message: 'La hora de inicio debe ser anterior a la hora de fin' });
    }
    
    // Validar que la reserva sea para una fecha futura
    const now = new Date();
    if (start < now) {
      return res.status(400).json({ message: 'No se pueden hacer reservas para fechas pasadas' });
    }
    
    // Verificar disponibilidad (que no haya otra reserva en ese horario)
    const conflictingReservation = await Reservation.findOne({
      where: {
        workspace_id: workspaceId,
        status: 'confirmed',
        [Op.or]: [
          // La nueva reserva empieza durante una existente
          {
            start_time: { [Op.lt]: end },
            end_time: { [Op.gt]: start }
          }
        ],
        deleted_at: null
      }
    });
    
    if (conflictingReservation) {
      return res.status(409).json({ message: 'El espacio ya está reservado en ese horario' });
    }
    
    // Crear la reserva
    const newReservation = await Reservation.create({
      user_id: userId,
      workspace_id: workspaceId,
      guests: guests || null,
      number_of_people: numberOfPeople,
      start_time: start,
      end_time: end,
      status: 'confirmed'  // Confirmada por defecto
    });
    
    // Crear notificación de confirmación de reserva
    try {
      await createReservationConfirmation(newReservation.id);
    } catch (notificationError) {
      console.error('Error al crear notificación de confirmación:', notificationError);
      // No fallar la reserva por esto
    }

    // Notificar a los administradores si es necesario
    if (process.env.NOTIFY_ADMINS_ON_RESERVATION === 'true') {
      const admins = await User.findAll({
        where: { company_id: companyId, role: 'admin', is_active: true }
      });
      
      for (const admin of admins) {
        await createPersonalNotification(
          admin.id,
          `Nueva reserva creada por ${req.user.first_name} ${req.user.last_name} reservó ${workspace.name} para el ${start.toLocaleDateString('es-ES')}`,
          newReservation.id
        );
      }
    }
    
    // Responder con la reserva creada
    return res.status(201).json({
      message: 'Reserva creada exitosamente',
      reservation: {
        id: newReservation.id,
        workspaceId: newReservation.workspace_id,
        workspaceName: workspace.name,
        startTime: newReservation.start_time,
        endTime: newReservation.end_time,
        numberOfPeople: newReservation.number_of_people,
        guests: newReservation.guests,
        status: newReservation.status
      }
    });
    
  } catch (error) {
    console.error('Error al crear reserva:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtiene todas las reservas del usuario actual
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas
 */
export const getUserReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, timeframe } = req.query;
    
    let whereClause = { user_id: userId, deleted_at: null };
    
    // Filtrar por estado si se proporciona
    if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
      whereClause.status = status;
    }
    
    // Filtrar por periodo de tiempo
    const now = new Date();
    if (timeframe === 'upcoming') {
      whereClause.start_time = { [Op.gt]: now };
    } else if (timeframe === 'past') {
      whereClause.end_time = { [Op.lt]: now };
    } else if (timeframe === 'current') {
      whereClause.start_time = { [Op.lte]: now };
      whereClause.end_time = { [Op.gte]: now };
    }
    
    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name', 'description', 'capacity']
        }
      ],
      order: [['start_time', 'ASC']]
    });
    
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      workspaceId: reservation.workspace_id,
      workspaceName: reservation.Workspace.name,
      workspaceDescription: reservation.Workspace.description,
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      numberOfPeople: reservation.number_of_people,
      guests: reservation.guests,
      status: reservation.status,
      createdAt: reservation.created_at
    }));
    
    return res.status(200).json({
      message: 'Reservas obtenidas correctamente',
      reservations: formattedReservations
    });
    
  } catch (error) {
    console.error('Error al obtener reservas del usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtiene una reserva específica por su ID
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Detalles de la reserva
 */
export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    // Construir la consulta
    let whereClause = { id, deleted_at: null };
    
    // Si no es admin, solo puede ver sus propias reservas
    if (!isAdmin) {
      whereClause.user_id = userId;
    }
    
    const reservation = await Reservation.findOne({
      where: whereClause,
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name', 'description', 'capacity', 'equipment']
        },
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });
    
    if (!reservation) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    
    const formattedReservation = {
      id: reservation.id,
      workspaceId: reservation.workspace_id,
      workspace: {
        id: reservation.Workspace.id,
        name: reservation.Workspace.name,
        description: reservation.Workspace.description,
        capacity: reservation.Workspace.capacity,
        equipment: reservation.Workspace.equipment
      },
      user: {
        id: reservation.User.id,
        firstName: reservation.User.first_name,
        lastName: reservation.User.last_name,
        email: reservation.User.email
      },
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      numberOfPeople: reservation.number_of_people,
      guests: reservation.guests,
      status: reservation.status,
      createdAt: reservation.created_at,
      updatedAt: reservation.updated_at
    };
    
    return res.status(200).json({
      message: 'Reserva obtenida correctamente',
      reservation: formattedReservation
    });
    
  } catch (error) {
    console.error('Error al obtener reserva por ID:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Obtiene las reservas del usuario para el día actual (para recordatorios)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas de hoy
 */
export const getMyTodayReservations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener inicio y fin del día actual
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const reservations = await Reservation.findAll({
      where: {
        user_id: userId,
        start_time: {
          [Op.gte]: startOfDay,
          [Op.lt]: endOfDay
        },
        status: 'confirmed',
        deleted_at: null
      },
      include: [
        {
          model: Workspace,
          attributes: ['name']
        }
      ],
      order: [['start_time', 'ASC']]
    });
    
    // Formatear para el frontend (específico para notificaciones)
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      start_time: reservation.start_time,
      end_time: reservation.end_time,
      workspace_name: reservation.Workspace.name,
      status: reservation.status
    }));
    
    return res.status(200).json({
      message: 'Reservas de hoy obtenidas correctamente',
      reservations: formattedReservations
    });
    
  } catch (error) {
    console.error('Error al obtener reservas de hoy:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtiene todas las reservas con filtros opcionales
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas filtradas
 */
export const getAllReservations = async (req, res) => {
  try {
    const { date, status } = req.query;
    const userId = req.user.id;
    const userCompanyId = req.user.company_id;
    
    let whereClause = { 
      deleted_at: null 
    };

    // Solo mostrar reservas de la misma empresa
    const companyWorkspaces = await Workspace.findAll({
      where: { company_id: userCompanyId },
      attributes: ['id']
    });
    
    const workspaceIds = companyWorkspaces.map(w => w.id);
    whereClause.workspace_id = { [Op.in]: workspaceIds };

    // Filtrar por fecha si se proporciona
    if (date) {
      const filterDate = new Date(date);
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
      const endOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate() + 1);
      
      whereClause.start_time = {
        [Op.gte]: startOfDay,
        [Op.lt]: endOfDay
      };
    }

    // Filtrar por estado si se proporciona
    if (status) {
      whereClause.status = status;
    }

    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name']
        },
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name']
        }
      ],
      order: [['start_time', 'ASC']]
    });

    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      workspaceId: reservation.workspace_id,
      workspaceName: reservation.Workspace?.name,
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      numberOfPeople: reservation.number_of_people,
      status: reservation.status,
      user: {
        id: reservation.User?.id,
        name: `${reservation.User?.first_name} ${reservation.User?.last_name}`
      }
    }));

    return res.status(200).json({
      message: 'Reservas obtenidas correctamente',
      reservations: formattedReservations
    });

  } catch (error) {
    console.error('Error al obtener todas las reservas:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Actualiza una reserva existente
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Reserva actualizada
 */
export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { numberOfPeople, guests, startTime, endTime } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Buscar la reserva incluyendo el workspace asociado
    const reservation = await Reservation.findOne({
      where: {
        id,
        deleted_at: null,
        // Si no es admin, solo puede editar sus propias reservas
        ...(isAdmin ? {} : { user_id: userId })
      },
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name', 'capacity', 'company_id']
        }
      ]
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reserva no encontrada o sin permisos para modificarla' });
    }

    // Verificar que la reserva no esté cancelada
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ message: 'No se puede modificar una reserva cancelada' });
    }

    // Verificar que la reserva no haya pasado ya
    const now = new Date();
    if (new Date(reservation.start_time) < now) {
      return res.status(400).json({ message: 'No se pueden modificar reservas pasadas o en curso' });
    }

    // Validar número de personas
    if (numberOfPeople && numberOfPeople > reservation.Workspace.capacity) {
      return res.status(400).json({
        message: `El número de personas excede la capacidad del espacio (máximo: ${reservation.Workspace.capacity})`
      });
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (numberOfPeople) updateData.number_of_people = numberOfPeople;
    if (guests !== undefined) updateData.guests = guests;

    // Si se modifican las fechas, verificar disponibilidad
    let start = reservation.start_time;
    let end = reservation.end_time;

    if (startTime) start = new Date(startTime);
    if (endTime) end = new Date(endTime);

    // Validar fechas
    if (start >= end) {
      return res.status(400).json({ message: 'La hora de inicio debe ser anterior a la hora de fin' });
    }

    if (start < now) {
      return res.status(400).json({ message: 'No se pueden hacer reservas para fechas pasadas' });
    }

    // Si cambian las fechas, actualizar y verificar conflictos
    if (startTime || endTime) {
      updateData.start_time = start;
      updateData.end_time = end;

      // Verificar conflictos con otras reservas (excluyendo la actual)
      const conflictingReservation = await Reservation.findOne({
        where: {
          id: { [Op.ne]: parseInt(id) }, // Asegurarse de que id sea un número
          workspace_id: reservation.workspace_id,
          status: 'confirmed',
          [Op.or]: [
            // La reserva modificada empieza durante una existente
            {
              start_time: { [Op.lt]: end },
              end_time: { [Op.gt]: start }
            }
          ],
          deleted_at: null
        }
      });

      if (conflictingReservation) {
        return res.status(409).json({ message: 'El espacio ya está reservado en ese horario' });
      }
    }

    // Actualizar la reserva
    await reservation.update(updateData);

    // Crear notificación para el usuario usando el servicio de notificaciones
    await createPersonalNotification(
      reservation.user_id,
      `Tu reserva para ${reservation.Workspace.name} ha sido modificada.`,
      reservation.id
    );

    // Responder con la reserva actualizada
    const updatedReservation = await Reservation.findByPk(id, {
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name']
        }
      ]
    });

    return res.status(200).json({
      message: 'Reserva actualizada correctamente',
      reservation: {
        id: updatedReservation.id,
        workspaceId: updatedReservation.workspace_id,
        workspaceName: updatedReservation.Workspace.name,
        startTime: updatedReservation.start_time,
        endTime: updatedReservation.end_time,
        numberOfPeople: updatedReservation.number_of_people,
        guests: updatedReservation.guests,
        status: updatedReservation.status
      }
    });

  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

/**
 * Cancela una reserva existente
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Confirmación de cancelación
 */
export const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Buscar la reserva
    const reservation = await Reservation.findOne({
      where: {
        id,
        deleted_at: null,
        // Si no es admin, solo puede cancelar sus propias reservas
        ...(isAdmin ? {} : { user_id: userId })
      },
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name']
        }
      ]
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Reserva no encontrada o sin permisos para cancelarla' });
    }

    // Verificar que la reserva no esté ya cancelada
    if (reservation.status === 'cancelled') {
      return res.status(400).json({ message: 'Esta reserva ya ha sido cancelada' });
    }

    // Verificar que la reserva no haya pasado ya
    const now = new Date();
    if (new Date(reservation.end_time) < now) {
      return res.status(400).json({ message: 'No se pueden cancelar reservas que ya han finalizado' });
    }

    // Cancelar la reserva
    await reservation.update({ status: 'cancelled' });

    // Crear notificación para el usuario usando el servicio de notificaciones
    await createPersonalNotification(
      reservation.user_id,
      `Tu reserva para ${reservation.Workspace.name} ha sido cancelada.`,
      reservation.id
    );

    return res.status(200).json({
      message: 'Reserva cancelada correctamente',
      reservationId: reservation.id
    });

  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

/**
 * Verifica la disponibilidad de un espacio en un rango de fechas
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Estado de disponibilidad
 */
export const checkAvailability = async (req, res) => {
  try {
    const { workspaceId, startTime, endTime, excludeReservationId } = req.query;
    const companyId = req.user.company_id;
    
    // Verificar que el espacio existe y pertenece a la empresa
    const workspace = await Workspace.findOne({ 
      where: { 
        id: workspaceId, 
        company_id: companyId,
        is_available: true
      } 
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado o no disponible' });
    }
    
    // Convertir a objetos Date
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    // Validar fechas
    if (start >= end) {
      return res.status(400).json({ message: 'La hora de inicio debe ser anterior a la hora de fin' });
    }
    
    // Construir la consulta de conflictos
    let whereClause = {
      workspace_id: workspaceId,
      status: 'confirmed',
      [Op.or]: [
        // Nueva reserva empieza durante una existente
        {
          start_time: { [Op.lt]: end },
          end_time: { [Op.gt]: start }
        }
      ],
      deleted_at: null
    };
    
    // Si se proporciona ID de reserva a excluir (útil para actualizaciones)
    if (excludeReservationId) {
      whereClause.id = { [Op.ne]: excludeReservationId };
    }
    
    const conflictingReservation = await Reservation.findOne({ where: whereClause });
    
    return res.status(200).json({
      workspaceId: Number(workspaceId),
      startTime,
      endTime,
      available: !conflictingReservation,
      capacity: workspace.capacity
    });
    
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Obtiene todas las reservas de un espacio en un rango de fechas
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas
 */
export const getWorkspaceReservations = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;
    const companyId = req.user.company_id;
    
    // Verificar que el espacio existe y pertenece a la empresa
    const workspace = await Workspace.findOne({ 
      where: { 
        id: workspaceId, 
        company_id: companyId
      } 
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
    }
    
    // Construir consulta de fechas
    let whereClause = {
      workspace_id: workspaceId,
      status: 'confirmed',
      deleted_at: null
    };
    
    // Si se proporcionan fechas, filtrar por rango
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      whereClause[Op.or] = [
        // Reservas que empiezan dentro del rango
        {
          start_time: { 
            [Op.gte]: start,
            [Op.lte]: end
          }
        },
        // Reservas que terminan dentro del rango
        {
          end_time: { 
            [Op.gte]: start,
            [Op.lte]: end
          }
        },
        // Reservas que abarcan todo el rango
        {
          start_time: { [Op.lte]: start },
          end_time: { [Op.gte]: end }
        }
      ];
    }
    
    const reservations = await Reservation.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['start_time', 'ASC']]
    });
    
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      numberOfPeople: reservation.number_of_people,
      guests: reservation.guests,
      user: {
        id: reservation.User.id,
        name: `${reservation.User.first_name} ${reservation.User.last_name}`,
        email: reservation.User.email
      }
    }));
    
    return res.status(200).json({
      workspaceId: Number(workspaceId),
      workspaceName: workspace.name,
      reservations: formattedReservations
    });
    
  } catch (error) {
    console.error('Error al obtener reservas del espacio:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};