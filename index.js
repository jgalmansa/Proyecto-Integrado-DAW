// index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import sequelize from './database/config/db.js';

// Importación de rutas
import companyRoutes from './api/routes/companyRoutes.js';
import userRoutes from './api/routes/userRoutes.js';
import workspaceRoutes from './api/routes/workspaceRoutes.js';
import reservationRoutes from './api/routes/reservationRoutes.js';
import notificationRoutes from './api/routes/notificationRoutes.js';
import { scheduleReservationReminders } from './api/utils/scheduler.js';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "https://www.google.com"],
      formAction: ["'self'", "https://formsubmit.co"]
    }
  }
}));

// Servir archivos estáticos desde la carpeta src
app.use('/assets', express.static(path.join(process.cwd(), 'src', 'assets')));

// Rutas de API
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);

// Rutas específicas para páginas HTML
app.get('/', (req, res) => {
  console.log('Ruta / accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'index.html'));
});

app.get('/register', (req, res) => {
  console.log('Ruta /register accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'register.html'));
});

app.get('/login', (req, res) => {
  console.log('Ruta /login accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  console.log('Ruta /dashboard accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'dashboard.html'));
});

app.get('/notifications', (req, res) => {
  console.log('Ruta /notifications accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'notifications.html'));
});

app.get('/gestion-espacios', (req, res) => {
  console.log('Ruta /gestion-espacios accedida');
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'gestion-espacios.html'));
});

app.use((req, res, next) => {
  console.log(`[LOG] ${req.method} ${req.url}`);
  next();
});

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
    console.log('Variables de entorno:');
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'undefined');
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
    
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

// Manejo de errores no manejados
process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error.message);
  process.exit(1);
});
