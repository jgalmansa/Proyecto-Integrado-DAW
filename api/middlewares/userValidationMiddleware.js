import { body, validationResult } from 'express-validator';

// Middleware para validar los datos de registro
export const validateUserRegistration = [
  // Validar email
  body('email')
    .isEmail()
    .withMessage('Por favor, proporciona un correo electrónico válido')
    .normalizeEmail(),
  
  // Validar contraseña
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('La contraseña debe contener al menos una letra mayúscula')
    .matches(/[a-z]/)
    .withMessage('La contraseña debe contener al menos una letra minúscula')
    .matches(/[0-9]/)
    .withMessage('La contraseña debe contener al menos un número')
    .matches(/[!@#$%^&*]/)
    .withMessage('La contraseña debe contener al menos un carácter especial (!@#$%^&*)'),
  
  // Validar coincidencia de contraseña
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
  
  // Validar nombre
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede exceder los 100 caracteres'),
  
  // Validar apellido
  body('lastName')
    .trim()
    .isLength({ max: 100 })
    .withMessage('El apellido no puede exceder los 100 caracteres'),
  
  // Validar código de invitación
  body('invitationCode')
    .notEmpty()
    .withMessage('El código de invitación es obligatorio'),

  // Middleware para manejar los errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware para validar los datos de inicio de sesión
export const validateLogin = [
  // Validar email
  body('email')
    .isEmail()
    .withMessage('Por favor, proporciona un correo electrónico válido')
    .normalizeEmail(),
  
  // Validar contraseña
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria'),
  
  // Middleware para manejar los errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Middleware para validar actualización de usuarios - MEJORADO
export const validateUserUpdate = [
  // Validar email (opcional)
  body('email')
    .optional()
    .isEmail()
    .withMessage('Por favor, proporciona un correo electrónico válido')
    .normalizeEmail(),
  
  // Validar contraseña (opcional, pero si se proporciona debe cumplir criterios)
  body('password')
    .optional({ nullable: true, checkFalsy: true }) // Permite valores vacíos
    .custom((value) => {
      // Solo validar si realmente se proporciona una contraseña
      if (value && value.trim() !== '') {
        if (value.length < 8) {
          throw new Error('La contraseña debe tener al menos 8 caracteres');
        }
      }
      return true;
    }),
  
  // ... resto de validaciones igual
];



// Middleware para validar creación de usuarios por admin
export const validateUserCreation = [
  // Validar email
  body('email')
    .isEmail()
    .withMessage('Por favor, proporciona un correo electrónico válido')
    .normalizeEmail(),
  
  // Validar contraseña
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  
  // Validar nombre
  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio')
    .isLength({ max: 100 })
    .withMessage('El nombre no puede exceder los 100 caracteres'),
  
  // Validar apellido
  body('last_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El apellido no puede exceder los 100 caracteres'),
    
  // Validar rol
  body('role')
    .optional()
    .isIn(['admin', 'user'])
    .withMessage('El rol debe ser "admin" o "user"'),
    
  // Validar estado activo
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('El estado activo debe ser verdadero o falso'),

  // Middleware para manejar los errores de validación
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Errores de validación',
        errors: errors.array() 
      });
    }
    next();
  }
];