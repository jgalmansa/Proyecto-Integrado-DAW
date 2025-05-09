import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import sequelize from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.get('/', (req, res) =>
  res.send('✅ Backend funcionando correctamente 8/5/25')
);

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
