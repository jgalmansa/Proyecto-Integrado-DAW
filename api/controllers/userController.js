// src/controllers/userController.js
import { User, Company } from '../../database/models/index.js';
import { hashPassword, verifyCredentials, verifyToken, invalidateSession } from '../services/authService.js';
import { Op } from 'sequelize';

/**
 * Inicia sesión con un usuario y contraseña
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Resultado de la verificación:
 *   - success: Verdadero si la verificación fue exitosa
 *   - message: Mensaje de error en caso de falla
 *   - token: Token de acceso para el usuario
 *   - user: Información del usuario logueado
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verificar credenciales
    const result = await verifyCredentials(email, password);
    
    if (!result.success) {
      return res.status(401).json({ message: result.message });
    }
    
    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token: result.token,
      user: result.user
    });
    
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Registra un nuevo usuario en el sistema.
 * @param {Object} req - Objeto de solicitud de Express que contiene el cuerpo de la solicitud con los datos del usuario.
 * @param {Object} res - Objeto de respuesta de Express para enviar la respuesta al cliente.
 * @returns {Promise<void>} - Envía una respuesta HTTP con el estado del registro:
 *   - 201 y detalles del usuario si el registro es exitoso.
 *   - 400 y un mensaje de error si el correo ya está registrado, el código de invitación es inválido,
 *     o el dominio del correo no está permitido.
 *   - 500 y un mensaje de error si ocurre un error interno del servidor.
 */

export const registerUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, invitationCode } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    // Buscar la empresa con el código de invitación proporcionado
    const company = await Company.findOne({ where: { invitation_code: invitationCode } });
    if (!company) {
      return res.status(400).json({ message: 'Código de invitación inválido' });
    }

    // Verificar si el dominio del correo está permitido para esta empresa
    const emailDomain = email.split('@')[1];
    
    // Buscar el dominio permitido (puede estar guardado con o sin @)
    const allowedDomain = await company.getDomains({
      where: { 
        [Op.or]: [
          { domain: emailDomain },      // Sin @ (ej: "miempresa.com")
          { domain: `@${emailDomain}` } // Con @ (ej: "@miempresa.com")
        ],
        is_active: true 
      }
    });

    if (allowedDomain.length === 0) {
      return res.status(400).json({ message: 'El dominio de correo no está permitido para esta empresa' });
    }

    // Crear nuevo usuario
    const newUser = await User.create({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      company_id: company.id,
      role: 'user', // Por defecto es un usuario sin privilegios
      is_active: true
    });

    // No devolver la contraseña en la respuesta
    const userResponse = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      role: newUser.role,
      companyId: newUser.company_id
    };

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: userResponse
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Verifica si un código de invitación es válido.
 * @param {Object} req - Objeto de solicitud de Express que contiene el parámetro "invitationCode".
 * @param {Object} res - Objeto de respuesta de Express para enviar la respuesta al cliente.
 * @returns {Promise<Object>} - Resultado de la verificación:
 *   - valid: Verdadero si el código de invitación es válido.
 *   - message: Mensaje de error en caso de falla.
 *   - companyName: Nombre de la empresa que emitió el código (si es válido).
 */
export const checkInvitationCode = async (req, res) => {
  try {
    const { invitationCode } = req.params;
    
    // Verificar si el código existe
    const company = await Company.findOne({ where: { invitation_code: invitationCode } });
    
    if (!company) {
      return res.status(404).json({ valid: false, message: 'Código de invitación inválido' });
    }
    
    return res.status(200).json({
      valid: true,
      companyName: company.name
    });
    
  } catch (error) {
    console.error('Error al verificar código de invitación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Cierra la sesión de un usuario invalidando su token JWT
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Mensaje de confirmación de cierre de sesión
 */

export const logout = async (req, res) => {
  try {
    const token = req.token;
    const user = req.user;

    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'No se ha proporcionado un token válido'
      });
    }

    // Invalidar la sesión en la base de datos
    const sessionInvalidated = await invalidateSession(token);
    
    if (!sessionInvalidated) {
      return res.status(400).json({ 
        success: false,
        message: 'No se pudo invalidar la sesión' 
      });
    }

    console.log('✅ Logout exitoso para token:', token.substring(0, 20) + '...');

    // Opcional: Registrar la hora del logout si el modelo User lo soporta
    if (user) {
      try {
        await User.update(
          { last_login: new Date() }, // o last_logout si tienes ese campo
          { where: { id: user.id } }
        );
      } catch (updateError) {
        console.warn('No se pudo actualizar el campo de logout:', updateError.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Sesión cerrada correctamente'
    });

  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error interno del servidor'
    });
  }
};


export const getCurrentUser = async (req, res) => {
  try {
    // req.user ya está disponible gracias al middleware authenticateToken
    res.json({
      id: req.user.id,
      email: req.user.email,
      first_namename: req.user.first_name,
      last_name: req.user.last_name,
      company_id: req.user.company_id,
      role: req.user.role,
      is_active: req.user.is_active,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};