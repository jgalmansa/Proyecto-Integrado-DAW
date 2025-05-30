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
  res.sendFile(path.join(process.cwd(), 'src', 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'register.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'dashboard.html'));
});

app.get('/notifications', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'notifications.html'));
});

app.get('/gestion-espacios', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'gestion-espacios.html'));
});


app.get('/gestion-usuarios', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'gestion-usuarios.html'));
});

app.get('/mis-reservas', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'mis-reservas.html'));
});

app.get('/espacios', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'espacios.html'));
});

app.get('/gestion-usuarios', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'src', 'pages', 'gestion-usuarios.html'));
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
    await sequelize.authenticate();
    console.log('📦 Conexión a la base de datos establecida correctamente');

    app.listen(PORT, () => {
      console.clear();
      console.log('=== 🚀 Servidor iniciado ===');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌐 URL: http://localhost:${PORT}`);
      console.log(`🔑 Modo: ${process.env.NODE_ENV || 'desarrollo'}`);
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
