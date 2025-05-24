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


/**
 * Obtiene la información del usuario autenticado.
 * 
 * @param {Object} req - Objeto de solicitud de Express, con el usuario ya autenticado y disponible en req.user.
 * @param {Object} res - Objeto de respuesta de Express para enviar la respuesta al cliente.
 * @returns {Promise<void>} - Envía un objeto JSON con la información del usuario autenticado:
 *   - id: ID del usuario
 *   - email: Correo electrónico del usuario
 *   - first_name: Nombre del usuario
 *   - last_name: Apellido del usuario
 *   - company_id: ID de la compañía del usuario
 *   - role: Rol del usuario
 *   - is_active: Estado de actividad del usuario
 * 
 * @throws {Error} Si ocurre un error al obtener la información del usuario, responde con un estado 500 y un mensaje de error.
 */

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


/**
 * Obtiene una lista de usuarios con paginación.
 * 
 * @param {Object} req - Objeto de solicitud de Express con los parámetros de la consulta:
 *   - page: Número de página a obtener (opcional, por defecto 1)
 *   - limit: Límite de usuarios por página (opcional, por defecto 50)
 *   - search: Texto a buscar en el nombre o email de los usuarios (opcional)
 *   - role: Rol del usuario a filtrar (opcional)
 *   - is_active: Estado de actividad del usuario a filtrar (opcional)
 *   - company_id: ID de la empresa a la que pertenecen los usuarios (opcional)
 * 
 * @param {Object} res - Objeto de respuesta de Express para enviar la respuesta al cliente.
 * 
 * @returns {Promise<Object>} - Resultado de la consulta:
 *   - success: Verdadero si la consulta fue exitosa.
 *   - data: Arreglo de usuarios con los campos id, email, first_name, last_name, company_id, role, is_active y created_at.
 *   - pagination: Objeto con la paginación:
 *     - page: Número de página actual
 *     - limit: Límite de usuarios por página
 *     - total: Total de usuarios encontrados
 *     - pages: Número total de páginas
 *   - stats: Estadísticas adicionales:
 *     - total: Total de usuarios encontrados
 *     - active: Número de usuarios activos
 *     - inactive: Número de usuarios inactivos
 *     - admins: Número de usuarios administradores
 *     - regularUsers: Número de usuarios regulares
 * 
 * @throws {Error} Si ocurre un error al obtener la lista de usuarios, responde con un estado 500 y un mensaje de error.
 */
export const getUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      role, 
      is_active,
      company_id 
    } = req.query;

    // Construir filtros
    const where = {};
    
    // Filtro de búsqueda por nombre o email
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filtro por rol
    if (role) {
      where.role = role;
    }

    // Filtro por estado activo
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // Filtro por empresa (si no es admin, solo puede ver usuarios de su empresa)
    if (req.user.role !== 'admin') {
      where.company_id = req.user.company_id;
    } else if (company_id) {
      where.company_id = company_id;
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Obtener usuarios con paginación
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: {
        exclude: ['password'] // No devolver contraseñas
      },
      include: [
        {
          association: 'Company', // Asume que tienes la asociación definida
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    // Estadísticas adicionales
    const stats = {
      total: count,
      active: users.filter(u => u.is_active).length,
      inactive: users.filter(u => !u.is_active).length,
      admins: users.filter(u => u.role === 'admin').length,
      regularUsers: users.filter(u => u.role === 'user').length
    };

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};


/**
 * Obtiene estadísticas de usuarios.
 * 
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * 
 * @returns {Promise<Object>} - Resultado de la consulta:
 *   - success: Verdadero si la consulta fue exitosa.
 *   - data: Objetos con las estadísticas:
 *     - total: Número total de usuarios.
 *     - active: Número de usuarios activos.
 *     - inactive: Número de usuarios inactivos.
 *     - admins: Número de usuarios administradores.
 *     - regular: Número de usuarios regulares.
 *     - recentRegistrations: Número de usuarios registrados en los últimos 30 días.
 *     - recentlyActive: Número de usuarios con login reciente (últimos 7 días).
 * 
 * @throws {Error} Si ocurre un error al obtener las estadísticas, responde con un estado 500 y un mensaje de error.
 */
export const getUserStats = async (req, res) => {
  try {
    // Filtrar siempre por la empresa del usuario autenticado
    const where = { company_id: req.user.company_id };

    const [ totalUsers, activeUsers, inactiveUsers, adminUsers ] = await Promise.all([
      User.count({ where }),
      User.count({ where: { ...where, is_active: true } }),
      User.count({ where: { ...where, is_active: false } }),
      User.count({ where: { ...where, role: 'admin' } })
    ]);

    // Usuarios registrados en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsersPromise = User.count({
      where: {
        ...where,
        created_at: { [Op.gte]: thirtyDaysAgo }
      }
    });

    // Usuarios con login reciente (últimos 7 días)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentlyActivePromise = User.count({
      where: {
        ...where,
        last_login: { [Op.gte]: sevenDaysAgo }
      }
    });

    // Ejecutamos las dos consultas adicionales en paralelo
    const [ recentRegistrations, recentlyActive ] = await Promise.all([
      recentUsersPromise,
      recentlyActivePromise
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
        regular: totalUsers - adminUsers,
        recentRegistrations,
        recentlyActive
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : error.message
    });
  }
};

/**
 * Obtiene un usuario específico por su ID
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Detalles del usuario
 *   - success: Verdadero si la operación fue exitosa
 *   - message: Mensaje de error en caso de falla
 *   - data: Información del usuario
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const where = { id };
    
    // Si no es admin, solo puede ver usuarios de su empresa
    if (req.user.role !== 'admin') {
      where.company_id = req.user.company_id;
    }

    const user = await User.findOne({
      where,
      attributes: {
        exclude: ['password']
      },
      include: [
        {
          association: 'Company',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};