// backend/src/middlewares/reservationValidationMiddleware.js
import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware para validar los datos al crear una reserva
 */
export const validateCreateReservation = [
  body('workspaceId')
    .notEmpty().withMessage('El ID del espacio de trabajo es requerido')
    .isInt().withMessage('El ID del espacio de trabajo debe ser un número entero'),
    
  body('numberOfPeople')
    .notEmpty().withMessage('El número de personas es requerido')
    .isInt({ min: 1 }).withMessage('El número de personas debe ser un número entero positivo'),
    
  body('startTime')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .isISO8601().withMessage('La hora de inicio debe tener un formato de fecha válido'),
    
  body('endTime')
    .notEmpty().withMessage('La hora de fin es requerida')
    .isISO8601().withMessage('La hora de fin debe tener un formato de fecha válido'),
    
  body('guests')
    .optional()
    .isString().withMessage('Los invitados deben ser un texto'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Middleware para validar los datos al actualizar una reserva
 */
export const validateUpdateReservation = [
  param('id')
    .notEmpty().withMessage('El ID de la reserva es requerido')
    .isInt().withMessage('El ID de la reserva debe ser un número entero'),
    
  body('numberOfPeople')
    .optional()
    .isInt({ min: 1 }).withMessage('El número de personas debe ser un número entero positivo'),
    
  body('startTime')
    .optional()
    .isISO8601().withMessage('La hora de inicio debe tener un formato de fecha válido'),
    
  body('endTime')
    .optional()
    .isISO8601().withMessage('La hora de fin debe tener un formato de fecha válido'),
    
  body('guests')
    .optional()
    .isString().withMessage('Los invitados deben ser un texto'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Middleware para validar los parámetros al cancelar una reserva
 */
export const validateCancelReservation = [
  param('id')
    .notEmpty().withMessage('El ID de la reserva es requerido')
    .isInt().withMessage('El ID de la reserva debe ser un número entero'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Middleware para validar los parámetros al obtener una reserva por ID
 */
export const validateGetReservation = [
  param('id')
    .notEmpty().withMessage('El ID de la reserva es requerido')
    .isInt().withMessage('El ID de la reserva debe ser un número entero'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Middleware para validar los parámetros al verificar disponibilidad
 */
export const validateCheckAvailability = [
  query('workspaceId')
    .notEmpty().withMessage('El ID del espacio de trabajo es requerido')
    .isInt().withMessage('El ID del espacio de trabajo debe ser un número entero'),
    
  query('startTime')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .isISO8601().withMessage('La hora de inicio debe tener un formato de fecha válido'),
    
  query('endTime')
    .notEmpty().withMessage('La hora de fin es requerida')
    .isISO8601().withMessage('La hora de fin debe tener un formato de fecha válido'),
    
  query('excludeReservationId')
    .optional()
    .isInt().withMessage('El ID de reserva a excluir debe ser un número entero'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

/**
 * Middleware para validar los parámetros al obtener reservas de un espacio
 */
export const validateGetWorkspaceReservations = [
  param('workspaceId')
    .notEmpty().withMessage('El ID del espacio de trabajo es requerido')
    .isInt().withMessage('El ID del espacio de trabajo debe ser un número entero'),
    
  query('startDate')
    .optional()
    .isISO8601().withMessage('La fecha de inicio debe tener un formato de fecha válido'),
    
  query('endDate')
    .optional()
    .isISO8601().withMessage('La fecha de fin debe tener un formato de fecha válido'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];