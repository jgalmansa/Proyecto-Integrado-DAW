// src/routes/reservationRoutes.js
import express from 'express';
import { 
  createReservation,
  getUserReservations,
  getReservationById,
  getMyTodayReservations,
  getAllReservations,
  updateReservation,
  cancelReservation,
  checkAvailability,
  getWorkspaceReservations,
  getTodaysReservations,
  getActiveReservationsNow,
  getAvailableSpaces
} from '../controllers/reservationController.js';
import { 
  validateCreateReservation,
  validateUpdateReservation,
  validateCancelReservation,
  validateGetReservation,
  validateCheckAvailability,
  validateGetWorkspaceReservations,
  validateGetAvailableSpaces
} from '../middlewares/reservationValidationMiddleware.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rutas protegidas (requieren autenticación)
router.use(authenticateToken);

router.get('/available-spaces', validateGetAvailableSpaces, getAvailableSpaces);

// Verificar disponibilidad de un espacio
router.get('/check-availability', validateCheckAvailability, checkAvailability);

// Obtener reservas del usuario actual
router.get('/user', getUserReservations);

// Obtener las reservas del usuario
router.get('/my', getUserReservations);

// Obtener las reservas del dia para los recordatorios
router.get('/my-reservations', getMyTodayReservations);

// Crear una nueva reserva
router.post('/', validateCreateReservation, createReservation);

// Obtener todas las reservas
router.get('/', getAllReservations);

// Obtener todas las reservas de la empresa para hoy (solo admins)
router.get('/today', getTodaysReservations);

// Obtener todas las reservas activas ahora (opcionalmente restringir a admins si lo deseas)
router.get('/active-now', getActiveReservationsNow);

// Obtener una reserva específica por ID
router.get('/:id', validateGetReservation, getReservationById);

// Actualizar una reserva existente
router.put('/:id', validateUpdateReservation, updateReservation);

// Cancelar una reserva
router.delete('/:id', validateCancelReservation, cancelReservation);

// Obtener todas las reservas de un espacio 
router.get('/workspace/:workspaceId', validateGetWorkspaceReservations, getWorkspaceReservations);

export default router;