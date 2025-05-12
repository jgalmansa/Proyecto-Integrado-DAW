// backend/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize from './config/db.js';
import companyRoutes from './src/routes/companyRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Importación de rutas
// Más rutas se añadirán a medida que se desarrollen

app.use(cors());
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rutas
app.use('/api/companies', companyRoutes);

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

process.on('unhandledRejection', (error) => {
  console.error('❌ Error no manejado:', error.message);
  process.exit(1);
});