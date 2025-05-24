import { User } from '../../database/models/index.js';
import { verifyToken, verifyActiveSession } from '../services/authService.js';

/**
 * Middleware de autenticación para usuarios que intentan acceder a rutas protegidas.
 * Verificamos si el usuario está autenticado y no ha cerrado sesión
 */

export const authenticateToken = async (req, res, next) => {
  console.log('🔍 AUTH - Ruta:', req.method, req.path);
  console.log('🔍 AUTH - Headers:', req.headers.authorization?.substring(0, 50) + '...');
  
  try {
    // Obtener token del encabezado
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: 'Acceso denegado. Se requiere token de autenticación' });
    }

    // Verificar token usando la función existente en authService
    console.log('🔍 Verificando token...');
    const decoded = verifyToken(token);
    console.log('🔍 Token decodificado:', decoded);

    if (!decoded) {
      console.log('❌ Token inválido');
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }

    // Verificar que la sesión está activa en la base de datos
    console.log('🔍 Verificando sesión activa...');
    const activeSession = await verifyActiveSession(token);
    console.log('🔍 Sesión activa:', activeSession);

    if (!activeSession) {
      console.log('❌ Sesión inválida');
      return res.status(403).json({ message: 'Sesión inválida o expirada' });
    }
    
    // Verificar que el usuario existe y está activo
    const user = await User.findOne({
      where: { id: decoded.userId, is_active: true },
      attributes: { exclude: ['password'] } // No incluir la contraseña
    });
    
    if (!user) {
      return res.status(403).json({ message: 'Usuario no encontrado o inactivo' });
    }
    
    // Agregar usuario + token a la solicitud para que estén disponibles en los controladores
    req.user = user;
    req.token = token;
    req.session = activeSession;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

/* Middleware para verificar roles (admin o user) para acceder a una ruta
 * @param   string    roles  --> Lista de roles permitidos para esta ruta
 */
export const authorizeRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Acceso denegado. Usuario no autenticado' });
    }
    
    // Convertir a array si es un string
    if (typeof roles === 'string') {
      roles = [roles];
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Acceso denegado. No tiene permisos suficientes para esta acción'
      });
    }
    
    next();
  };
};