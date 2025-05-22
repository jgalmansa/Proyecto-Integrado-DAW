import express from 'express';
import companyController from '../controllers/companyController.js';
import { validateCompanyRegistration } from '../middlewares/companyValidationMiddleware.js';

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

export default router;