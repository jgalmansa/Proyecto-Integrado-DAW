import express from 'express';
import companyController from '../controllers/companyController.js';
import { validateCompanyRegistration } from '../middlewares/companyValidationMiddleware.js';
import { authenticateToken } from '../middlewares/authMiddleware.js'; 

const router = express.Router();

/**
 * @route POST /api/companies/register
 * @description Registrar una nueva empresa con su administrador y dominios
 * @access Public
 */
router.post('/register', validateCompanyRegistration, companyController.registerCompany);

/**
 * @route POST /api/companies/check-domain
 * @description Verificar si un dominio está permitido para registro
 * @access Public
 */
router.post('/check-domain', companyController.checkDomainEligibility);

/**
 * @route POST /api/companies/validate-invitation-code
 * @description Validar un código de invitación
 * @access Public
 */
router.post('/validate-invitation-code', companyController.validateInvitationCode);

/**
 * @route GET /api/companies/:companyId/invitation-code
 * @description Obtener el código de invitación de una empresa (solo admins)
 * @access Private (Admin only)
 */
router.get('/:companyId/invitation-code', authenticateToken, companyController.getInvitationCode);

/**
 * @route POST /api/companies/:companyId/regenerate-invitation-code
 * @description Regenerar el código de invitación de una empresa (solo admins)
 * @access Private (Admin only)
 */
router.post('/:companyId/regenerate-invitation-code', authenticateToken, companyController.regenerateInvitationCode);

export default router;