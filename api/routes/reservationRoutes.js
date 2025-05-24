// src/routes/reservationRoutes.js
import express from 'express';
import { 
  createReservation,
  getUserReservations,
  getReservationById,
  updateReservation,
  cancelReservation,
  checkAvailability,
  getWorkspaceReservations,
  getTodaysReservations 
} from '../controllers/reservationController.js';
import { 
  validateCreateReservation,
  validateUpdateReservation,
  validateCancelReservation,
  validateGetReservation,
  validateCheckAvailability,
  validateGetWorkspaceReservations
} from '../middlewares/reservationValidationMiddleware.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

// Crear una nueva reserva
router.post('/', validateCreateReservation, createReservation);

// Obtener reservas del usuario actual
router.get('/user', getUserReservations);

// Obtener todas las reservas de la empresa para hoy (solo admins)
router.get('/today', getTodaysReservations);

// Verificar disponibilidad de un espacio
router.get('/check-availability', validateCheckAvailability, checkAvailability);

// Obtener una reserva específica por ID
router.get('/:id', validateGetReservation, getReservationById);

// Actualizar una reserva existente
router.put('/:id', validateUpdateReservation, updateReservation);

// Cancelar una reserva
router.delete('/:id', validateCancelReservation, cancelReservation);

// Obtener todas las reservas de un espacio 
router.get('/workspace/:workspaceId', validateGetWorkspaceReservations, getWorkspaceReservations);

export default router;