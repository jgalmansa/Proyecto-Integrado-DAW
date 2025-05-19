// src/services/redisService.js
import { createClient } from 'redis'; // Importa el cliente de Redis
import dotenv from 'dotenv'; // Carga las variables de entorno

dotenv.config(); // Configura las variables de entorno desde el archivo .env

// Configuración de conexión a Redis
const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'; // Usa una URL completa para Redis o una conexión local
let client;

// Inicializa el cliente de Redis con reconexión automática
const initRedisClient = async () => {
  try {
    client = createClient({ url: redisUrl }); // Crea el cliente con URL

    client.on('error', (err) => {
      console.error('Error de conexión a Redis:', err);
      setTimeout(initRedisClient, 5000); // Reintenta después de 5 segundos
    });

    client.on('connect', () => console.log('Conectado a Redis'));
    client.on('reconnecting', () => console.log('Reconectando a Redis...'));

    await client.connect(); // Conecta el cliente
  } catch (error) {
    console.error('Error al inicializar Redis:', error);
    setTimeout(initRedisClient, 5000); // Reintenta si ocurre un error durante la conexión inicial
  }
};

initRedisClient(); // Inicia la conexión

// Añade un token a la lista negra con tiempo de expiración
export const blacklistToken = async (token, expiryTime) => {
  try {
    if (!client || !client.isOpen) {
      console.warn('Cliente de Redis no conectado. Intentando reconectar...');
      await initRedisClient();
    }
    await client.set(`bl_${token}`, 'true'); // Marca el token como bloqueado
    await client.expire(`bl_${token}`, expiryTime); // Establece el tiempo de expiración
    return true;
  } catch (error) {
    console.error('Error al invalidar token:', error);
    return false;
  }
};

// Verifica si un token está en la lista negra
export const isTokenBlacklisted = async (token) => {
  try {
    if (!client || !client.isOpen) {
      console.warn('Cliente de Redis no conectado. Intentando reconectar...');
      await initRedisClient();
      return false;
    }
    const result = await client.get(`bl_${token}`);
    return result === 'true';
  } catch (error) {
    console.error('Error al verificar token en lista negra:', error);
    return false;
  }
};

export default {
  blacklistToken,
  isTokenBlacklisted
};