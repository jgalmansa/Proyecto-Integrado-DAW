import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../../models/index.js';

dotenv.config();

// Número de rondas para el hash de contraseñas
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'workspace_reservation_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Hashea una contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} - Contraseña hasheada
 */
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
};

/**
 * Compara una contraseña en texto plano con una hasheada
 * @param {string} password - Contraseña en texto plano
 * @param {string} hashedPassword - Contraseña hasheada
 * @returns {Promise<boolean>} - Verdadero si coinciden
 */
export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Genera un token JWT para un usuario
 * @param {Object} userData - Datos del usuario para incluir en el token
 * @returns {string} - Token JWT
 */
export const generateToken = (userData) => {
  const payload = {
    userId: userData.id,
    companyId: userData.company_id,
    email: userData.email,
    role: userData.role
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT
 * @returns {Object|null} - Datos del usuario o null si es inválido
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Verifica las credenciales de un usuario para el inicio de sesión
 * @param {string} email - Correo electrónico del usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export const verifyCredentials = async (email, password) => {
  try {
    // Buscar usuario por email
    const user = await User.findOne({ where: { email, is_active: true } });
    
    if (!user) {
      return { success: false, message: 'Usuario no encontrado o inactivo' };
    }
    
    // Verificar contraseña (usar comparePassword en lugar de bcrypt.compare directamente)
    const passwordMatch = await comparePassword(password, user.password);
    
    if (!passwordMatch) {
      return { success: false, message: 'Contraseña incorrecta' };
    }
    
    // Actualizar último login
    await user.update({ last_login: new Date() });
    
    // Generar token (usar la función generateToken existente)
    const token = generateToken(user);
    
    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        companyId: user.company_id
      }
    };
    
  } catch (error) {
    console.error('Error en verificación de credenciales:', error);
    return { success: false, message: 'Error interno del servidor' };
  }
};