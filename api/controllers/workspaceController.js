// backend/src/controllers/workspaceController.js
import { Workspace } from '../../database/models/index.js';
import { createGlobalNotification } from '../services/notificationService.js';
import { Reservation, User } from '../../database/models/index.js';
import { Op } from 'sequelize'; // Para operadores de consulta
/**
 * Obtiene todos los espacios de trabajo de la empresa asociada al usuario autenticado
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * 
 * @example
 * GET /workspaces
 * 
 * @throws {Error} Si hubo un error al obtener los espacios de trabajo
 */
export const getWorkspaces = async (req, res) => {
  try {
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de compañía no encontrado en el usuario autenticado' });
    }
    
    const workspaces = await Workspace.findAll({
      where: { 
        company_id: companyId,
        deleted_at: null
      }
    });
    
    return res.status(200).json({ workspaces });
  } catch (error) {
    console.error('Error al obtener espacios de trabajo:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Obtiene un espacio de trabajo específico
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * 
 * @example
 * GET /workspaces/:id
 * 
 * @throws {Error} Si hubo un error al obtener el espacio de trabajo
 */
export const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de compañía no encontrado en el usuario autenticado' });
    }
    
    const workspace = await Workspace.findOne({
      where: { 
        id,
        company_id: companyId,
        deleted_at: null
      }
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
    }
    
    return res.status(200).json({ workspace });
  } catch (error) {
    console.error('Error al obtener espacio de trabajo:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Crea un nuevo espacio de trabajo
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * 
 * @example
 * POST /workspaces
 * 
 * @throws {Error} Si hubo un error al crear el espacio de trabajo
 */

export const createWorkspace = async (req, res) => {
  try {
    const { name, description, capacity, equipment, isAvailable } = req.body;
    
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    // Verificar que companyId existe
    if (!companyId) {
      console.error('Error: company_id es null o undefined');
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: ['ID de compañía no encontrado en el usuario autenticado']
      });
    }
    
    // En lugar de generar un QR, simplemente dejamos el campo en null por ahora
    // Esto se puede implementar más adelante
    
    const workspace = await Workspace.create({
      name,
      description,
      capacity,
      company_id: companyId,
      qr: null, // Sin QR por ahora
      is_available: isAvailable !== undefined ? isAvailable : true,
      equipment: equipment || {}
    });
    
    return res.status(201).json({
      message: 'Espacio de trabajo creado exitosamente',
      workspace
    });
  } catch (error) {
    console.error('Error al crear espacio de trabajo:', error);
    console.error('Detalle del error:', error.message);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación',
        errors: error.errors.map(err => err.message)
      });
    }
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Actualiza un espacio de trabajo existente
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * 
 * @example
 * PUT /workspaces/:id
 * 
 * @throws {Error} Si hubo un error al actualizar el espacio de trabajo
 */
export const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, capacity, equipment, isAvailable } = req.body;
    
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de compañía no encontrado en el usuario autenticado' });
    }
    
    const workspace = await Workspace.findOne({
      where: { 
        id,
        company_id: companyId,
        deleted_at: null
      }
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
    }
    
    const updatedWorkspace = await workspace.update({
      name: name !== undefined ? name : workspace.name,
      description: description !== undefined ? description : workspace.description,
      capacity: capacity !== undefined ? capacity : workspace.capacity,
      is_available: isAvailable !== undefined ? isAvailable : workspace.is_available,
      equipment: equipment !== undefined ? equipment : workspace.equipment
    });

    // Añadir notificación global si el espacio se marca como no disponible
    if (req.body.isAvailable === false) {
      await createGlobalNotification(
        workspace.company_id,
        `AVISO: El espacio "${workspace.name}" ya no está disponible para reservas.`,
        [] // No excluir a ningún usuario
      );
    } else if (req.body.isAvailable === true) {
      // Notificar que el espacio vuelve a estar disponible
      await createGlobalNotification(
        workspace.company_id,
        `AVISO: El espacio "${workspace.name}" vuelve a estar disponible para reservas.`,
        []
      );
    }
    
    return res.status(200).json({
      message: 'Espacio de trabajo actualizado exitosamente',
      workspace: updatedWorkspace
    });
  } catch (error) {
    console.error('Error al actualizar espacio de trabajo:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


  /**
   * Elimina un espacio de trabajo (baja lógica)
   * 
   * @param {import('express').Request} req - Petición HTTP
   * @param {import('express').Response} res - Respuesta HTTP
   * 
   * @example
   * DELETE /workspaces/:id
   * 
   * @throws {Error} Si hubo un error al eliminar el espacio de trabajo
   */
export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de compañía no encontrado en el usuario autenticado' });
    }
    
    const workspace = await Workspace.findOne({
      where: { 
        id,
        company_id: companyId,
        deleted_at: null
      }
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
    }
    
    // Realizar baja lógica
    await workspace.update({ deleted_at: new Date() });
    
    return res.status(200).json({
      message: 'Espacio de trabajo eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar espacio de trabajo:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


/**
 * Obtiene las reservas de un espacio específico
 * 
 * @param {import('express').Request} req - Petición HTTP
 * @param {import('express').Response} res - Respuesta HTTP
 * 
 * @example
 * GET /workspaces/:id/reservations?start=2024-01-01&end=2024-01-31
 */
export const getWorkspaceReservations = async (req, res) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;
    
    // Intentar obtener el ID de compañía de cualquier forma posible
    let companyId;
    if (req.user.dataValues && req.user.dataValues.company_id) {
      companyId = req.user.dataValues.company_id;
    } else {
      companyId = req.user.company_id || req.user.companyId;
    }
    
    if (!companyId) {
      return res.status(400).json({ message: 'ID de compañía no encontrado en el usuario autenticado' });
    }
    
    // Verificar que el espacio pertenece a la empresa del usuario
    const workspace = await Workspace.findOne({
      where: { 
        id,
        company_id: companyId,
        deleted_at: null
      }
    });
    
    if (!workspace) {
      return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
    }
    
    // Construir filtros de fecha si se proporcionan
    const whereClause = {
      workspace_id: id,
      deleted_at: null
    };
    
    if (start && end) {
      whereClause.start_time = {
        [Op.between]: [new Date(start), new Date(end)]
      };
    }
    
    // Obtener las reservas
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
    
    // Formatear las reservas para FullCalendar
    const formattedReservations = reservations.map(reservation => ({
      id: reservation.id,
      title: `Reservado por ${reservation.User.first_name} ${reservation.User.last_name}`,
      start: reservation.start_time,
      end: reservation.end_time,
      backgroundColor: getReservationColor(reservation.status),
      borderColor: getReservationColor(reservation.status),
      extendedProps: {
        status: reservation.status,
        userId: reservation.user_id,
        userName: `${reservation.User.first_name} ${reservation.User.last_name}`,
        userEmail: reservation.User.email,
        description: reservation.description
      }
    }));
    
    return res.status(200).json({ 
      reservations: formattedReservations,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        capacity: workspace.capacity
      }
    });
    
  } catch (error) {
    console.error('Error al obtener reservas del espacio:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Función auxiliar para obtener colores según el estado de la reserva
function getReservationColor(status) {
  switch (status) {
    case 'confirmed':
      return '#ef4444'; // Rojo - Reservado
    case 'pending':
      return '#eab308'; // Amarillo - Pendiente
    case 'cancelled':
      return '#6b7280'; // Gris - Cancelado
    default:
      return '#ef4444'; // Rojo por defecto
  }
}