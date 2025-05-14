import express from 'express';
import {
  getWorkspaces,
  getWorkspaceById,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace
} from '../controllers/workspaceController.js';
import { authenticateToken, authorizeRole } from '../middlewares/authMiddleware.js';
import { 
  validateWorkspaceCreation,
  validateWorkspaceUpdate 
} from '../middlewares/workspaceValidationMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas públicas para usuarios autenticados
router.get('/', getWorkspaces);
router.get('/:id', getWorkspaceById);

// Rutas solo para administradores
router.post('/', [authorizeRole(['admin']), validateWorkspaceCreation], createWorkspace);
router.put('/:id', [authorizeRole(['admin']), validateWorkspaceUpdate], updateWorkspace);
router.delete('/:id', authorizeRole(['admin']), deleteWorkspace);

export default router;