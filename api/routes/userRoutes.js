import express from 'express';
import {
  registerUser,
  checkInvitationCode,
  login,
  logout,
  getCurrentUser,
  getUsers,
  getUserStats,
  getUserById,
  findUserByEmail,
  updateUser,
  deleteUser,
  createUser
} from '../controllers/userController.js';
import { validateUserRegistration, validateLogin, validateUserUpdate, validateUserCreation } from '../middlewares/userValidationMiddleware.js';
import  { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET /api/users - Obtener todos los usuarios (requiere permisos de usuario o admin)
router.get('/', authenticateToken, getUsers);

router.get('/search', authenticateToken, findUserByEmail);

// GET /api/users/stats - Obtener estadísticas de usuarios
router.get('/stats', authenticateToken, getUserStats);

// Verificar si un código de invitación es válido
router.get('/invitation-code/:invitationCode', checkInvitationCode);

// Registrar un nuevo usuario (público)
router.post('/register', validateUserRegistration, registerUser);

// Crear un nuevo usuario (solo para admins) - NUEVA RUTA
router.post('/', authenticateToken, validateUserCreation, createUser);

// Iniciar sesión
router.post('/login', validateLogin, login);

// Ruta para logout
router.post('/logout', authenticateToken, logout);

// Agregar esta línea después de las rutas existentes
router.get('/me', authenticateToken, getCurrentUser);

// GET /api/users/:id - Obtener usuario específico
router.get('/:id', authenticateToken, getUserById);

// PUT /api/users/:id - Actualizar un usuario específico
router.put('/:id', authenticateToken, validateUserUpdate, updateUser);

// DELETE /api/users/:id - Eliminar un usuario específico
router.delete('/:id', authenticateToken, deleteUser);

export default router;