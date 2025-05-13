import { User } from '../../models/index.js';
import { verifyToken } from '../services/authService.js';

export const authenticateToken = async (req, res, next) => {
  try {
    // Obtener token del encabezado
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: 'Acceso denegado. Se requiere token de autenticación' });
    }
    
    // Verificar token usando la función existente en authService
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(403).json({ message: 'Token inválido o expirado' });
    }
    
    // Verificar que el usuario existe y está activo
    const user = await User.findOne({
      where: { id: decoded.userId, is_active: true },
      attributes: { exclude: ['password'] } // No incluir la contraseña
    });
    
    if (!user) {
      return res.status(403).json({ message: 'Usuario no encontrado o inactivo' });
    }
    
    // Agregar usuario a la solicitud
    req.user = user;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

// Middleware para verificar roles (admin o user)
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