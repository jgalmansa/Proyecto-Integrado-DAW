const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./src/routes'); // Asegúrate de tener un index.js en la carpeta routes

// Cargar variables de entorno
dotenv.config();

// Crear app de Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors());
app.use(express.json()); // Para parsear JSON en las solicitudes

// Rutas
app.use('/api', routes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Servidor funcionando');
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
