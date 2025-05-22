import express from 'express';
import { registerUser, checkInvitationCode, login, logout } from '../controllers/userController.js';
import { validateUserRegistration, validateLogin } from '../middlewares/userValidationMiddleware.js';
import  { authenticateToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Verificar si un código de invitación es válido
router.get('/invitation-code/:invitationCode', checkInvitationCode);

// Registrar un nuevo usuario
router.post('/register', validateUserRegistration, registerUser);

// Iniciar sesión
router.post('/login', validateLogin, login);

// Ruta para logout
router.post('/logout', authenticateToken, logout);


export default router;