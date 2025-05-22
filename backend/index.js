// backend/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from './config/db.js';

// Importación de rutas
import companyRoutes from './src/routes/companyRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import workspaceRoutes from './src/routes/workspaceRoutes.js';
import reservationRoutes from './src/routes/reservationRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import { scheduleReservationReminders } from './src/utils/scheduler.js';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Necesario para __dirname con módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rutas de API
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);

// Rutas específicas para páginas HTML
app.get('/', (req, res) => {
  console.log('Ruta / accedida');
  res.sendFile(path.join(__dirname, '../frontend/public', 'index.html'));
});

app.get('/register', (req, res) => {
  console.log('Ruta /register accedida');
  res.sendFile(path.join(__dirname, 'frontend/public', 'register.html'));
});

app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Manejo de rutas no encontradas (debe ir al final)
app.use((req, res) => {
  console.log(`Ruta no encontrada: ${req.url}`);
  res.status(404).json({
    message: 'Ruta no encontrada'
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

/**
 * Inicia el servidor Express, autenticando la conexión a la base de datos
 * y estableciendo el puerto de escucha.
 *
 * @async
 * @returns {void}
 * @throws {Error} Si no se puede conectar con la base de datos
 */
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('📦 Conexión a la base de datos establecida correctamente');

    app.listen(PORT, () => {
      console.clear();
      console.log('=== 🚀 Servidor iniciado ===');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔑 Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
      console.log('===========================\n');
      
      // Debug: Mostrar rutas registradas
      console.log('📋 Rutas registradas:');
      console.log('  GET /');
      console.log('  GET /register');
      console.log('  POST /api/companies/*');
      console.log('  POST /api/users/*');
      console.log('  Archivos estáticos: /frontend/public');
      console.log('===========================\n');
    });
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    process.exit(1);
  }
};

startServer();

scheduleReservationReminders();
console.log('Tareas programadas iniciadas');

// Manejo de errores no manejados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error.message);
  process.exit(1);
});