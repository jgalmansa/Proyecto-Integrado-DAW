// backend/src/middlewares/workspaceValidationMiddleware.js
/**
 * Valida datos para la creación de un espacio de trabajo
 */
export const validateWorkspaceCreation = (req, res, next) => {
  const { name, capacity } = req.body;
  const errors = [];
  
  // Validar nombre
  if (!name || name.trim() === '') {
    errors.push('El nombre del espacio es obligatorio');
  }
  
  // Validar capacidad
  if (!capacity || isNaN(capacity) || capacity <= 0) {
    errors.push('La capacidad debe ser un número positivo');
  }
  
  // Si hay errores, devolverlos
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};

/**
 * Valida datos para la actualización de un espacio de trabajo
 */
export const validateWorkspaceUpdate = (req, res, next) => {
  const { name, capacity } = req.body;
  const errors = [];
  
  // Validar nombre si está presente
  if (name !== undefined && name.trim() === '') {
    errors.push('El nombre del espacio no puede estar vacío');
  }
  
  // Validar capacidad si está presente
  if (capacity !== undefined && (isNaN(capacity) || capacity <= 0)) {
    errors.push('La capacidad debe ser un número positivo');
  }
  
  // Si hay errores, devolverlos
  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }
  
  next();
};