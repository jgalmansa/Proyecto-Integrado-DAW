
/**
 * Middleware para validar los datos de creación de un espacio de trabajo.
 * 
 * @param {Object} req - Objeto de solicitud de Express que contiene el cuerpo de la solicitud.
 * @param {Object} res - Objeto de respuesta de Express para enviar respuestas HTTP.
 * @param {Function} next - Función para pasar el control al siguiente middleware.
 * 
 * @throws {Error} Si hay errores de validación, responde con un estado 400 y un objeto JSON con los mensajes de error.
 * 
 * @example
 * // Ejemplo de datos de solicitud
 * req.body = {
 *   name: 'Sala de Conferencias',
 *   capacity: 20
 * };
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
 * Middleware para validar los datos de actualización de un espacio de trabajo.
 * 
 * @param {Object} req - Objeto de solicitud de Express que contiene el cuerpo de la solicitud.
 * @param {Object} res - Objeto de respuesta de Express para enviar respuestas HTTP.
 * @param {Function} next - Función para pasar el control al siguiente middleware.
 * 
 * @throws {Error} Si hay errores de validación, responde con un estado 400 y un objeto JSON con los mensajes de error.
 * 
 * @example
 * // Ejemplo de datos de solicitud
 * req.body = {
 *   name: 'Sala de Conferencias',
 *   capacity: 20
 * };
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