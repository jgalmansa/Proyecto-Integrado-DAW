import schedule from 'node-schedule';

import { Reservation, User, Workspace } from '../../database/models/index.js';
import { createPersonalNotification } from '../services/notificationService.js';
import { Op } from 'sequelize';

/**
 * Programa tarea para enviar recordatorios de reservas
 */
export const scheduleReservationReminders = () => {
  // Ejecutar cada hora a los 0 minutos
  schedule.scheduleJob('0 * * * *', async () => {
    try {
      console.log('Ejecutando tarea programada: Recordatorios de reservas');
      
      const now = new Date();
      // Buscar reservas confirmadas que comienzan en 24 horas
      const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      // Encontrar reservas que comienzan en aproximadamente 24 horas (+/- 30 minutos)
      const reservations = await Reservation.findAll({
        where: {
          status: 'confirmed',
          start_time: {
            [Op.between]: [
              new Date(oneDayLater.getTime() - 30 * 60 * 1000), // 24h - 30min
              new Date(oneDayLater.getTime() + 30 * 60 * 1000)  // 24h + 30min
            ]
          }
        },
        include: [
          {
            model: User,
            attributes: ['id', 'first_name', 'last_name']
          },
          {
            model: Workspace,
            attributes: ['id', 'name']
          }
        ]
      });
      
      // Enviar notificaciones para cada reserva
      for (const reservation of reservations) {
        const startTime = new Date(reservation.start_time);
        const formattedDate = startTime.toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        const formattedTime = startTime.toLocaleTimeString('es-ES', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const message = `RECORDATORIO: Tu reserva para ${reservation.Workspace.name} está programada para mañana ${formattedDate} a las ${formattedTime}.`;
        
        await createPersonalNotification(
          reservation.user_id,
          message,
          reservation.id
        );
        
        console.log(`Notificación enviada para la reserva ID: ${reservation.id}`);
      }
      
      console.log(`Total de recordatorios enviados: ${reservations.length}`);
    } catch (error) {
      console.error('Error al enviar recordatorios de reservas:', error);
    }
  });
  
  // También programar recordatorios de 1 hora antes
  schedule.scheduleJob('0 * * * *', async () => {
    try {
      console.log('Ejecutando tarea programada: Recordatorios inmediatos');
      
      const now = new Date();
      // Buscar reservas confirmadas que comienzan en 1 hora
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Encontrar reservas que comienzan en aproximadamente 1 hora (+/- 5 minutos)
      const reservations = await Reservation.findAll({
        where: {
          status: 'confirmed',
          start_time: {
            [Op.between]: [
              new Date(oneHourLater.getTime() - 5 * 60 * 1000), // 1h - 5min
              new Date(oneHourLater.getTime() + 5 * 60 * 1000)  // 1h + 5min
            ]
          }
        },
        include: [
          {
            model: Workspace,
            attributes: ['id', 'name']
          }
        ]
      });
      
      // Enviar notificaciones para cada reserva
      for (const reservation of reservations) {
        const message = `¡EN 1 HORA! Tu reserva para ${reservation.Workspace.name} comienza en aproximadamente una hora.`;
        
        await createPersonalNotification(
          reservation.user_id,
          message,
          reservation.id
        );
      }
    } catch (error) {
      console.error('Error al enviar recordatorios inmediatos:', error);
    }
  });
};