// backend/src/middlewares/reservationValidationMiddleware.js
import { body, param, query, validationResult } from 'express-validator';
import { User } from '../../database/models/index.js';
import { Op } from 'sequelize';

/**
 * Middleware para validar los datos al crear una reserva
 */
export const validateCreateReservation = [
  body('workspaceId')
    .notEmpty().withMessage('El ID del espacio de trabajo es requerido')
    .isInt().withMessage('El ID del espacio de trabajo debe ser un número entero'),

  body('startTime')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .isISO8601().withMessage('La hora de inicio debe tener un formato de fecha válido'),

  body('endTime')
    .notEmpty().withMessage('La hora de fin es requerida')
    .isISO8601().withMessage('La hora de fin debe tener un formato de fecha válido'),

  // Validamos guests como un array que puede contener IDs de usuarios o "Invitado Externo"
  body('guests')
    .optional()
    .isArray().withMessage('Los invitados deben enviarse como un array')
    .bail()
    .custom((guests, { req }) => {
      // Validar que cada elemento sea un entero (ID de usuario) o el string "Invitado Externo"
      const validGuests = guests.every(guest => {
        return Number.isInteger(guest) || guest === 'Invitado Externo';
      });
      
      if (!validGuests) {
        throw new Error('Cada invitado debe ser un ID de usuario válido o "Invitado Externo"');
      }
      return true;
    })
    .bail()
    .custom(async (guests, { req }) => {
      if (guests.length === 0) return true;
      
      const companyId = req.user.company_id;
      // Filtrar solo los IDs de usuarios (no los "Invitado Externo")
      const userIds = guests.filter(guest => Number.isInteger(guest));
      
      if (userIds.length > 0) {
        // Verificar que todos los IDs de usuarios existan en la empresa
        const count = await User.count({
          where: {
            id: { [Op.in]: userIds },
            company_id: companyId,
            is_active: true
          }
        });
        
        if (count !== userIds.length) {
          throw new Error('Algunos usuarios invitados no existen o no pertenecen a tu empresa');
        }
      }
      
      return true;
    }),

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

  body('startTime')
    .optional()
    .isISO8601().withMessage('La hora de inicio debe tener un formato de fecha válido'),

  body('endTime')
    .optional()
    .isISO8601().withMessage('La hora de fin debe tener un formato de fecha válido'),

  // Mismas validaciones para guests en actualización
  body('guests')
    .optional()
    .isArray().withMessage('Los invitados deben enviarse como un array')
    .bail()
    .custom((guests, { req }) => {
      const validGuests = guests.every(guest => {
        return Number.isInteger(guest) || guest === 'Invitado Externo';
      });
      
      if (!validGuests) {
        throw new Error('Cada invitado debe ser un ID de usuario válido o "Invitado Externo"');
      }
      return true;
    })
    .bail()
    .custom(async (guests, { req }) => {
      if (guests.length === 0) return true;
      
      const companyId = req.user.company_id;
      const userIds = guests.filter(guest => Number.isInteger(guest));
      
      if (userIds.length > 0) {
        const count = await User.count({
          where: {
            id: { [Op.in]: userIds },
            company_id: companyId,
            is_active: true
          }
        });
        
        if (count !== userIds.length) {
          throw new Error('Algunos usuarios invitados no existen o no pertenecen a tu empresa');
        }
      }
      
      return true;
    }),

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

/**
 * Middleware para validar los parámetros al obtener las reservas de hoy
 */
export const validateGetAvailableSpaces = [
  query('date')
    .notEmpty().withMessage('La fecha es requerida')
    .isDate().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)'),
    
  query('startTime')
    .notEmpty().withMessage('La hora de inicio es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('La hora de inicio debe tener formato HH:MM'),
    
  query('endTime')
    .notEmpty().withMessage('La hora de fin es requerida')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('La hora de fin debe tener formato HH:MM'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }
    next();
  }
];