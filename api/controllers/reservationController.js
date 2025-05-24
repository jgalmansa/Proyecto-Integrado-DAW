import { Reservation, Workspace, User, Notification } from '../../database/models/index.js';
import { Op } from 'sequelize';
import { createPersonalNotification, createGlobalNotification } from '../services/notificationService.js';


/**
 * Función auxiliar para parsear guests de forma segura
 * @param {string|Array} guestsData - Datos de guests desde la BD o request
 * @returns {Array} - Array de guests parseado
 */
const parseGuestsData = (guestsData) => {
  if (!guestsData) return [];
  if (Array.isArray(guestsData)) return guestsData;
  
  try {
    return JSON.parse(guestsData);
  } catch (error) {
    console.error('Error parsing guests data:', error);
    return [];
  }
};

/**
 * Función auxiliar para calcular número de personas
 * @param {Array} guests - Array de invitados
 * @returns {number} - Número total de personas (creador + invitados)
 */
const calculateNumberOfPeople = (guests = []) => {
  return 1 + guests.length; // 1 (creador) + número de invitados
};

/**
 * Crea una nueva reserva de espacio
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Reserva creada
 */
export const createReservation = async (req, res) => {
  try {
    const { workspaceId, guests = [], startTime, endTime } = req.body;
    const userId = req.user.id;
    const companyId = req.user.company_id;
    
    // Calcular automáticamente el número de personas
    const numberOfPeople = calculateNumberOfPeople(guests);
    
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
        message: `El número de personas (${numberOfPeople}) excede la capacidad del espacio (máximo: ${workspace.capacity})` 
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

    // Obtener los usuarios invitados que existen en la empresa
    const userGuestIds = guests.filter(guest => Number.isInteger(guest));
    let invitedUsers = [];
    
    if (userGuestIds.length > 0) {
      invitedUsers = await User.findAll({
        where: { id: userGuestIds, company_id: companyId, is_active: true }
      });
    }
    
    // Crear lista de todos los participantes (creador + invitados válidos)
    const allParticipants = [
      { id: userId, isCreator: true },
      ...invitedUsers.map(user => ({ id: user.id, isCreator: false }))
    ];
    
    // Crear reservas para todos los participantes
    const createdReservations = [];
    
    for (const participant of allParticipants) {
      const reservation = await Reservation.create({
        user_id: participant.id,
        workspace_id: workspaceId,
        guests: JSON.stringify(guests), // Mantener la lista completa de invitados en cada reserva
        number_of_people: numberOfPeople,
        start_time: start,
        end_time: end,
        status: 'confirmed'
      });
      
      createdReservations.push({
        reservationId: reservation.id,
        userId: participant.id,
        isCreator: participant.isCreator
      });
    }

    // Crear notificación para el usuario creador
    const creatorReservation = createdReservations.find(r => r.isCreator);
    await createPersonalNotification(
      userId,
      `Has reservado ${workspace.name} para el ${start.toLocaleDateString()} de ${start.toLocaleTimeString()} a ${end.toLocaleTimeString()}.`,
      creatorReservation.reservationId
    );

    // Notificar a los administradores si es necesario
    if (process.env.NOTIFY_ADMINS_ON_RESERVATION === 'true') {
      const admins = await User.findAll({
        where: { company_id: companyId, role: 'admin', is_active: true }
      });
      
      for (const admin of admins) {
        await createPersonalNotification(
          admin.id,
          `Nueva reserva creada por ${req.user.first_name} ${req.user.last_name} para ${workspace.name}.`,
          creatorReservation.reservationId
        );
      }
    }

    // Notificar a los invitados que son usuarios de la empresa
    for (const guestUser of invitedUsers) {
      const guestReservation = createdReservations.find(r => r.userId === guestUser.id);
      
      await createPersonalNotification(
        guestUser.id,
        `Has sido invitado por ${req.user.first_name} ${req.user.last_name} ` +
        `a la reserva de ${workspace.name} el ${start.toLocaleDateString()} ` +
        `de ${start.toLocaleTimeString()} a ${end.toLocaleTimeString()}.`,
        guestReservation.reservationId
      );
    }
    
    // Responder con información de todas las reservas creadas
    return res.status(201).json({
      message: 'Reservas creadas exitosamente para todos los participantes',
      reservation: {
        id: creatorReservation.reservationId, // ID de la reserva del creador como principal
        workspaceId: workspaceId,
        workspaceName: workspace.name,
        startTime: start,
        endTime: end,
        numberOfPeople: numberOfPeople,
        guests: guests,
        status: 'confirmed',
        participantReservations: createdReservations.map(r => ({
          reservationId: r.reservationId,
          userId: r.userId,
          isCreator: r.isCreator
        }))
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
      guests: parseGuestsData(reservation.guests), // Parseamos de vuelta a array
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
      guests: parseGuestsData(reservation.guests), // Parseamos de vuelta a array
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
 * Actualiza una reserva existente
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Reserva actualizada
 */
export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { guests, startTime, endTime } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Buscar la reserva principal incluyendo el workspace asociado
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

    // Encontrar todas las reservas relacionadas (mismo workspace, mismas fechas, mismo número de personas)
    const relatedReservations = await Reservation.findAll({
      where: {
        workspace_id: reservation.workspace_id,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        number_of_people: reservation.number_of_people,
        status: 'confirmed',
        deleted_at: null
      }
    });

    // Preparar datos para actualizar
    const updateData = {};
    let newNumberOfPeople = reservation.number_of_people;
    
    // Si se actualizan los guests, recalcular número de personas
    if (guests !== undefined) {
      newNumberOfPeople = calculateNumberOfPeople(guests);
      
      // Validar capacidad
      if (newNumberOfPeople > reservation.Workspace.capacity) {
        return res.status(400).json({
          message: `El número de personas (${newNumberOfPeople}) excede la capacidad del espacio (máximo: ${reservation.Workspace.capacity})`
        });
      }
      
      updateData.guests = JSON.stringify(guests);
      updateData.number_of_people = newNumberOfPeople;
    }

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

      // Verificar conflictos con otras reservas (excluyendo las relacionadas actuales)
      const relatedIds = relatedReservations.map(r => r.id);
      const conflictingReservation = await Reservation.findOne({
        where: {
          id: { [Op.notIn]: relatedIds },
          workspace_id: reservation.workspace_id,
          status: 'confirmed',
          [Op.or]: [
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

    // Manejar cambios en los invitados
    let newParticipantIds = [reservation.user_id]; // Siempre incluir al creador original
    let invitedUsers = [];
    
    if (guests !== undefined) {
      const userGuestIds = guests.filter(guest => Number.isInteger(guest));
      
      if (userGuestIds.length > 0) {
        invitedUsers = await User.findAll({
          where: { 
            id: userGuestIds, 
            company_id: reservation.Workspace.company_id, 
            is_active: true 
          }
        });
        
        newParticipantIds = [...newParticipantIds, ...invitedUsers.map(u => u.id)];
      }
    } else {
      // Si no se modifican los guests, mantener los participantes actuales
      newParticipantIds = relatedReservations.map(r => r.user_id);
    }

    // Actualizar todas las reservas relacionadas existentes
    const updatedReservations = [];
    for (const relatedReservation of relatedReservations) {
      if (newParticipantIds.includes(relatedReservation.user_id)) {
        await relatedReservation.update(updateData);
        updatedReservations.push(relatedReservation.id);
      } else {
        // Si el usuario ya no está en la lista, cancelar su reserva
        await relatedReservation.update({ status: 'cancelled' });
      }
    }

    // Crear nuevas reservas para participantes que no tenían una
    const existingUserIds = relatedReservations.map(r => r.user_id);
    const newUserIds = newParticipantIds.filter(id => !existingUserIds.includes(id));
    
    for (const newUserId of newUserIds) {
      const newReservation = await Reservation.create({
        user_id: newUserId,
        workspace_id: reservation.workspace_id,
        guests: updateData.guests || reservation.guests,
        number_of_people: updateData.number_of_people || reservation.number_of_people,
        start_time: updateData.start_time || reservation.start_time,
        end_time: updateData.end_time || reservation.end_time,
        status: 'confirmed'
      });
      updatedReservations.push(newReservation.id);
    }

    // Notificar a todos los participantes actuales
    for (const participantId of newParticipantIds) {
      await createPersonalNotification(
        participantId,
        `La reserva para ${reservation.Workspace.name} ha sido modificada.`,
        participantId === reservation.user_id ? reservation.id : 
        updatedReservations.find(rId => {
          // Encontrar la reserva correspondiente a este usuario
          const userReservation = relatedReservations.find(r => r.user_id === participantId) ||
                                 { id: updatedReservations[updatedReservations.length - 1] };
          return userReservation.id;
        })
      );
    }

    // Notificar a usuarios removidos (si los hay)
    const removedUserIds = existingUserIds.filter(id => !newParticipantIds.includes(id));
    for (const removedUserId of removedUserIds) {
      await createPersonalNotification(
        removedUserId,
        `Has sido removido de la reserva de ${reservation.Workspace.name}.`,
        relatedReservations.find(r => r.user_id === removedUserId)?.id
      );
    }

    // Responder con la reserva actualizada (la del creador original)
    const updatedMainReservation = await Reservation.findByPk(reservation.id, {
      include: [
        {
          model: Workspace,
          attributes: ['id', 'name']
        }
      ]
    });

    return res.status(200).json({
      message: 'Reservas actualizadas correctamente para todos los participantes',
      reservation: {
        id: updatedMainReservation.id,
        workspaceId: updatedMainReservation.workspace_id,
        workspaceName: updatedMainReservation.Workspace.name,
        startTime: updatedMainReservation.start_time,
        endTime: updatedMainReservation.end_time,
        numberOfPeople: updatedMainReservation.number_of_people,
        guests: parseGuestsData(updatedMainReservation.guests),
        status: updatedMainReservation.status,
        participantReservations: updatedReservations
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

    // Buscar la reserva principal
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
          attributes: ['id', 'name', 'company_id']
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

    // Encontrar todas las reservas relacionadas (mismo workspace, mismas fechas, mismo número de personas)
    const relatedReservations = await Reservation.findAll({
      where: {
        workspace_id: reservation.workspace_id,
        start_time: reservation.start_time,
        end_time: reservation.end_time,
        number_of_people: reservation.number_of_people,
        status: 'confirmed',
        deleted_at: null
      },
      include: [
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ]
    });

    // Cancelar todas las reservas relacionadas
    const cancelledReservationIds = [];
    const affectedUsers = [];

    for (const relatedReservation of relatedReservations) {
      await relatedReservation.update({ status: 'cancelled' });
      cancelledReservationIds.push(relatedReservation.id);
      
      // Recopilar información de usuarios afectados
      if (relatedReservation.User) {
        affectedUsers.push({
          id: relatedReservation.User.id,
          name: `${relatedReservation.User.first_name} ${relatedReservation.User.last_name}`,
          email: relatedReservation.User.email,
          reservationId: relatedReservation.id,
          isOriginalUser: relatedReservation.user_id === userId
        });
      }
    }

    // Determinar quién canceló la reserva para las notificaciones
    const cancelledBy = req.user;
    const cancellerName = `${cancelledBy.first_name} ${cancelledBy.last_name}`;
    
    // Crear notificaciones personalizadas para cada usuario afectado
    for (const userInfo of affectedUsers) {
      let notificationMessage;
      
      if (userInfo.isOriginalUser) {
        // Mensaje para el usuario que canceló
        notificationMessage = `Has cancelado tu reserva para ${reservation.Workspace.name}.`;
      } else if (isAdmin && userId !== userInfo.id) {
        // Mensaje cuando un admin cancela la reserva de otro usuario
        notificationMessage = `Tu reserva para ${reservation.Workspace.name} ha sido cancelada por un administrador.`;
      } else {
        // Mensaje para otros participantes
        notificationMessage = `La reserva de ${reservation.Workspace.name} en la que participabas ha sido cancelada por ${cancellerName}.`;
      }
      
      await createPersonalNotification(
        userInfo.id,
        notificationMessage,
        userInfo.reservationId
      );
    }

    // Notificar a los administradores si la cancelación fue hecha por un usuario regular
    if (!isAdmin && process.env.NOTIFY_ADMINS_ON_CANCELLATION === 'true') {
      const admins = await User.findAll({
        where: { 
          company_id: reservation.Workspace.company_id, 
          role: 'admin', 
          is_active: true 
        }
      });
      
      for (const admin of admins) {
        await createPersonalNotification(
          admin.id,
          `${cancellerName} ha cancelado una reserva para ${reservation.Workspace.name}.`,
          reservation.id
        );
      }
    }

    return res.status(200).json({
      message: 'Reservas canceladas correctamente para todos los participantes',
      details: {
        originalReservationId: reservation.id,
        cancelledReservations: cancelledReservationIds,
        affectedUsers: affectedUsers.map(user => ({
          userId: user.id,
          userName: user.name,
          reservationId: user.reservationId
        })),
        totalCancelled: cancelledReservationIds.length
      }
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
      guests: parseGuestsData(reservation.guests), // CORREGIDO: ahora parsea los guests
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

/**
 * Obtiene todas las reservas de la empresa para el día actual (solo admins)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas del día
 */
export const getTodaysReservations = async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const isAdmin = req.user.role === 'admin';
    
    // Solo los administradores pueden ver todas las reservas del día
    if (!isAdmin) {
      return res.status(403).json({ message: 'No tienes permisos para ver estas reservas' });
    }
    
    // Obtener inicio y fin del día actual
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const reservations = await Reservation.findAll({
      where: {
        start_time: { 
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        },
        status: { [Op.in]: ['confirmed', 'pending'] },
        deleted_at: null
      },
      include: [
        {
          model: Workspace,
          where: { company_id: companyId },
          attributes: ['id', 'name', 'description', 'capacity']
        },
        {
          model: User,
          attributes: ['id', 'first_name', 'last_name', 'email']
        }
      ],
      order: [['start_time', 'ASC']]
    });
    
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      workspaceId: reservation.workspace_id,
      workspace: {
        id: reservation.Workspace.id,
        name: reservation.Workspace.name,
        description: reservation.Workspace.description,
        capacity: reservation.Workspace.capacity
      },
      user: {
        id: reservation.User.id,
        name: `${reservation.User.first_name} ${reservation.User.last_name}`,
        email: reservation.User.email
      },
      startTime: reservation.start_time,
      endTime: reservation.end_time,
      numberOfPeople: reservation.number_of_people,
      guests: parseGuestsData(reservation.guests),
      status: reservation.status,
      createdAt: reservation.created_at
    }));
    
    return res.status(200).json({
      message: 'Reservas del día obtenidas correctamente',
      date: now.toISOString().split('T')[0],
      totalReservations: formattedReservations.length,
      reservations: formattedReservations
    });
    
  } catch (error) {
    console.error('Error al obtener reservas del día:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Obtiene todas las reservas activas en este momento
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Array>} - Lista de reservas activas en este momento
 */
export const getActiveReservationsNow = async (req, res) => {
  try {
    const now = new Date();
    console.log('Buscando reservas activas para:', now);

    const activeReservations = await Reservation.findAll({
      where: {
        start_time: { [Op.lte]: now },
        end_time: { [Op.gte]: now },
        status: 'confirmed',
        deleted_at: null
      },
      attributes: ['id', 'workspace_id', 'start_time', 'end_time'],
      order: [['start_time', 'ASC']]
    });

    console.log('Reservas activas encontradas:', activeReservations.length);
    console.log('Datos:', activeReservations);

    return res.status(200).json(activeReservations);
  } catch (error) {
    console.error('Error al obtener reservas activas:', error);
    return res.status(500).json({ message: 'Error al obtener reservas activas' });
  }
};