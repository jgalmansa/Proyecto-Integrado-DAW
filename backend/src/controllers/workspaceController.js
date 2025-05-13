// backend/src/controllers/workspaceController.js
import { Workspace } from '../../models/index.js';

/**
 * Obtiene todos los espacios de trabajo de una empresa
 */
export const getWorkspaces = async (req, res) => {
  try {
    const { companyId } = req.user;
    
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
 */
export const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    
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
 */
export const createWorkspace = async (req, res) => {
  try {
    const { name, description, capacity, equipment, isAvailable } = req.body;
    const { companyId } = req.user;
    
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
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Actualiza un espacio de trabajo existente
 */
export const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, capacity, equipment, isAvailable } = req.body;
    const { companyId } = req.user;
    
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
 */
export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;
    
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
