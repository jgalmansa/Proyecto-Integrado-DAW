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
  console.log('Datos recibidos en el backend:', req.body);
  try {
    // Extraer también role del req.body (is_active se puede definir aquí)
    const { email, password, firstName, lastName, invitationCode, role = 'user' } = req.body;
    const is_active = true; // Por defecto los usuarios nuevos están activos

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
      role,
      is_active
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

    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    // Devuelve array con mensajes de error al frontend
    return res.status(400).json({ errors: error.errors.map(e => e.message) });
  }

    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/**
 * Crea un nuevo usuario (solo para administradores)
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Resultado de la creación del usuario
 */
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user', is_active = true, company_id } = req.body;
    
    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'El correo electrónico ya está registrado'
      });
    }

    // Determinar la empresa del nuevo usuario
    let targetCompanyId = company_id;
    
    // Si no se especifica company_id, usar la empresa del admin
    if (!targetCompanyId) {
      targetCompanyId = req.user.company_id;
    }
    
    // Verificar que la empresa existe
    const company = await Company.findByPk(targetCompanyId);
    if (!company) {
      return res.status(400).json({
        success: false,
        message: 'La empresa especificada no existe'
      });
    }

    // Solo super-admins pueden crear usuarios en otras empresas
    if (req.user.company_id !== targetCompanyId && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para crear usuarios en otras empresas'
      });
    }

    // Crear el nuevo usuario
    const newUser = await User.create({
      email: email.toLowerCase(),
      password: await hashPassword(password),
      first_name: firstName,
      last_name: lastName,
      company_id: targetCompanyId,
      role,
      is_active
    });

    // Obtener el usuario creado con la información de la empresa
    const createdUser = await User.findOne({
      where: { id: newUser.id },
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

    res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente',
      data: createdUser
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
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
      first_name: req.user.first_name,
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
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      where.company_id = req.user.company_id;
    } else if (company_id) {
      where.company_id = company_id;
    } else if (req.user.role === 'admin') {
      // Los admins regulares solo ven usuarios de su empresa
      where.company_id = req.user.company_id;
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
    // Filtrar siempre por la empresa del usuario autenticado (excepto super_admin)
    const where = req.user.role === 'super_admin' ? {} : { company_id: req.user.company_id };

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
    
    // Si no es admin o super_admin, solo puede ver usuarios de su empresa
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      where.company_id = req.user.company_id;
    } else if (req.user.role === 'admin') {
      // Los admins regulares solo ven usuarios de su empresa
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

/**
 * Busca usuarios por email, nombre o apellido, y devuelve una lista de
 * hasta 10 resultados.
 * 
 * @param {Object} req - Objeto de solicitud de Express con el parámetro
 *   `q` que contiene el texto de búsqueda.
 * @param {Object} res - Objeto de respuesta de Express para enviar la
 *   respuesta al cliente.
 * 
 * @returns {Promise<Object>} - Resultado de la consulta:
 *   - success: Verdadero si la consulta fue exitosa.
 *   - users: Arreglo de objetos con los campos id, email y name.
 * 
 * @throws {Error} Si ocurre un error al buscar usuarios, responde con un
 *   estado 500 y un mensaje de error.
 */
export const findUserByEmail = async (req, res) => {
  try {
    const { q } = req.query;
    const companyId = req.user.company_id;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query debe tener al menos 2 caracteres'
      });
    }

    const users = await User.findAll({
      where: {
        company_id: companyId,
        is_active: true,
        id: { [Op.ne]: req.user.id }, // Excluir al usuario actual
        [Op.or]: [
          { email: { [Op.iLike]: `%${q}%` } },
          { first_name: { [Op.iLike]: `%${q}%` } },
          { last_name: { [Op.iLike]: `%${q}%` } }
        ]
      },
      attributes: ['id', 'email', 'first_name', 'last_name'],
      limit: 10
    });

    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`
    }));

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

/**
 * Actualiza un usuario específico por su ID
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Resultado de la actualización
 *   - success: Verdadero si la operación fue exitosa
 *   - message: Mensaje de confirmación o error
 *   - data: Información del usuario actualizado
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    // Cambiar el mapeo de campos para que coincida con el frontend
    const { first_name, last_name, email, role, is_active, password } = req.body;
    
    
    // Verificar permisos de acceso
    const where = { id };
    
    if (req.user.role === 'admin') {
      // Los admins solo pueden editar usuarios de su empresa
      where.company_id = req.user.company_id;
    } else if (req.user.role !== 'super_admin') {
      // Los usuarios regulares solo pueden editar su propio perfil
      if (req.user.id !== parseInt(id)) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar este usuario'
        });
      }
      where.company_id = req.user.company_id;
    }

    // Buscar el usuario a actualizar
    const user = await User.findOne({ where });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar si el email ya existe (excluyendo el usuario actual)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ 
        where: { 
          email: email.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'El correo electrónico ya está en uso'
        });
      }
    }

    // Preparar los datos a actualizar
    const updateData = {};
    
    // Usar los nombres correctos de los campos
    if (first_name !== undefined) updateData.first_name = first_name.trim();
    if (last_name !== undefined) updateData.last_name = last_name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    
    // Solo admins y super_admins pueden cambiar rol y estado activo
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      if (role !== undefined) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;
    }
    
    // Si se proporciona una nueva contraseña, hashearla
    if (password && password.trim() !== '') {
      updateData.password = password; // El hook beforeUpdate se encargará del hash
    }


    // Actualizar el usuario
    await user.update(updateData);

    // Obtener el usuario actualizado sin la contraseña
    const updatedUser = await User.findOne({
      where: { id },
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

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      data: updatedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Elimina un usuario específico por su ID
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} res - Objeto de respuesta de Express
 * @returns {Promise<Object>} - Resultado de la eliminación
 *   - success: Verdadero si la operación fue exitosa
 *   - message: Mensaje de confirmación o error
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Solo los administradores pueden eliminar usuarios
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar usuarios'
      });
    }

    // Un usuario no puede eliminarse a sí mismo
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminarte a ti mismo'
      });
    }

    // Buscar el usuario a eliminar
    const where = { id };
    
    // Los admins regulares solo pueden eliminar usuarios de su empresa
    if (req.user.role === 'admin') {
      where.company_id = req.user.company_id;
    }

    const user = await User.findOne({ 
      where,
      attributes: ['id', 'email', 'first_name', 'last_name', 'role']
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar el usuario
    await user.destroy();

    res.json({
      success: true,
      message: `Usuario ${user.first_name} ${user.last_name} eliminado correctamente`
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};