console.log('Servidor iniciado en modo de mantenimiento');
// Mantener el proceso en ejecución
setInterval(() => {
  console.log('Servidor en ejecución...');
}, 3600000); // Log cada hora