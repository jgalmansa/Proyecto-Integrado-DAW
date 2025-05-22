import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../../database/models/index.js';
import { UserSession } from '../../database/models/index.js';

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
    
    // Usar el método comparePassword del modelo
    const passwordMatch = await user.comparePassword(password);
    
    if (!passwordMatch) {
      return { success: false, message: 'Contraseña incorrecta' };
    }
    
    // Generar token (usar la función generateToken existente)
    const token = generateToken(user);

    // Crear sesión en la base de datos
    await createUserSession(user.id, token);
    
    // Actualizar último login
    await user.update({ last_login: new Date() });

    console.log("Login completado exitosamente");
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

/**
 * Crea una nueva sesión de usuario en la base de datos
 * @param {number} userId - ID del usuario
 * @param {string} token - Token JWT generado
 * @returns {Promise<UserSession>} - Sesión creada
 */
export const createUserSession = async (userId, token) => {
  try {
    // Invalidar sesiones anteriores del usuario (opcional - para logout de otros dispositivos)
    // await UserSession.invalidateUserSessions(userId);
    
    // Crear nueva sesión
    const session = await UserSession.create({
      user_id: userId,
      token: token,
      status: 'active'
    });
    
    return session;
  } catch (error) {
    console.error('Error al crear sesión:', error);
    throw error;
  }
};

/**
 * Invalida una sesión específica (logout)
 * @param {string} token - Token de la sesión a invalidar
 * @returns {Promise<boolean>} - True si se invalidó correctamente
 */
export const invalidateSession = async (token) => {
  try {
    const session = await UserSession.findOne({ where: { token, status: 'active' } });
    
    if (!session) {
      return false; // Sesión no encontrada o ya inactiva
    }
    
    await session.deactivate();
    return true;
  } catch (error) {
    console.error('Error al invalidar sesión:', error);
    throw error;
  }
};

/**
 * Verifica si una sesión está activa
 * @param {string} token - Token a verificar
 * @returns {Promise<UserSession|null>} - Sesión si está activa, null si no
 */
export const verifyActiveSession = async (token) => {
  try {
    return await UserSession.findActiveByToken(token);
  } catch (error) {
    console.error('Error al verificar sesión:', error);
    return null;
  }
};
