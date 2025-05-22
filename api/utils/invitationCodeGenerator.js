import crypto from 'crypto';
import Company from '../../database/models/company.js';

/**
 * Genera un código de invitación único para empresas
 * @param {number} length - Longitud del código (por defecto 8)
 * @returns {string} Código de invitación único
 */
export const generateInvitationCode = async (length = 8) => {
  let isUnique = false;
  let code;

  // Intentar hasta encontrar un código único
  while (!isUnique) {
    // Generar un código aleatorio alfanumérico
    code = crypto.randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
      .toUpperCase();
    
    // Verificar que no exista ya en la base de datos
    const existingCompany = await Company.findOne({
      where: { invitation_code: code }
    });

    if (!existingCompany) {
      isUnique = true;
    }
  }

  return code;
};

/**
 * Genera un código de invitación para usuarios con opciones configurables
 * @param {Object} options - Opciones para la generación del código
 * @param {number} options.length - Longitud del código (por defecto 10)
 * @param {number} options.maxUses - Número máximo de usos (null para ilimitado)
 * @param {Date} options.expiresAt - Fecha de expiración (null para no expirar)
 * @returns {string} Código de invitación único
 */
export const generateUserInvitationCode = async (options = {}) => {
  const {
    length = 10,
    maxUses = 1,
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días por defecto
  } = options;

  // Lógica para generar código - sería útil si se implementa una tabla de códigos de invitación
  const code = crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
    .toUpperCase();

  return { 
    code,
    maxUses,
    expiresAt
  };
};