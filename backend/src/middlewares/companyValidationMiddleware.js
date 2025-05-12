/**
 * Middleware para validar los datos de registro de una empresa
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función para continuar con el siguiente middleware
 */
export const validateCompanyRegistration = (req, res, next) => {
  const { 
    companyName, 
    companyEmail, 
    adminFirstName,
    adminEmail,
    adminPassword,
    domains 
  } = req.body;

  const errors = [];

  // Validación de datos de empresa
  if (!companyName || companyName.trim() === '') {
    errors.push('El nombre de la empresa es obligatorio');
  }

  if (!companyEmail || !isValidEmail(companyEmail)) {
    errors.push('El correo electrónico de la empresa es inválido');
  }

  // Validación de datos de administrador
  if (!adminFirstName || adminFirstName.trim() === '') {
    errors.push('El nombre del administrador es obligatorio');
  }

  if (!adminEmail || !isValidEmail(adminEmail)) {
    errors.push('El correo electrónico del administrador es inválido');
  }

  if (!adminPassword || adminPassword.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }

  // Validación de dominios
  if (domains && domains.length > 0) {
    for (const domain of domains) {
      if (!isValidDomain(domain)) {
        errors.push(`El dominio "${domain}" no es válido`);
      }
    }
  }

  // Si hay errores, devolver respuesta con errores
  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Error de validación',
      errors
    });
  }

  // Si todo está bien, continuar
  next();
};

/**
 * Verifica si un email tiene formato válido
 * @param {string} email - Correo electrónico a validar
 * @returns {boolean} - Verdadero si el email es válido
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Verifica si un dominio tiene formato válido
 * @param {string} domain - Dominio a validar
 * @returns {boolean} - Verdadero si el dominio es válido
 */
const isValidDomain = (domain) => {
  // Eliminar @ si existe al principio
  const cleanDomain = domain.startsWith('@') ? domain.substring(1) : domain;
  
  // Validar formato de dominio simple
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(cleanDomain);
};