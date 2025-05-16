// backend/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize from './config/db.js';

// Importación de rutas
import companyRoutes from './src/routes/companyRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import workspaceRoutes from './src/routes/workspaceRoutes.js';
import reservationRoutes from './src/routes/reservationRoutes.js';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rutas
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/reservations', reservationRoutes);

// Ruta de prueba
app.get('/', (req, res) =>
  res.send('✅ Backend funcionando correctamente 8/5/25')
);

// Manejo de rutas no encontradas
app.use((req, res) => {
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