/**
 * Sistema de gestión de notificaciones
 * Maneja la obtención, visualización y gestión de notificaciones del usuario
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.reminderNotifications = [];// Notificaciones temporales de recordatorio
        this.unreadCount = 0;
        this.apiBase = '/api/notifications';
        this.init();
    }

    /**
     * Inicializa el sistema de notificaciones
     */
    async init() {
        try {
            await this.loadNotifications();
            await this.updateUnreadCount();
            await this.checkUpcomingReservations(); // Verificar recordatorios
            this.renderDashboardNotifications();
            this.updateNotificationBadge();
            this.setupDropdownEvents();
        } catch (error) {
            console.error('Error al inicializar notificaciones:', error);
        }
    }

    /**
     * Carga las notificaciones del usuario desde la API
     */
    async loadNotifications(limit = 10) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }

            const response = await fetch(`${this.apiBase}?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            this.notifications = data.notifications || [];
            return data;
        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
            this.notifications = [];
            throw error;
        }
    }

    /**
     * Obtiene el conteo de notificaciones no leídas
     */
    async updateUnreadCount() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/unread-count`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.unreadCount = data.unreadCount || 0;
            }
        } catch (error) {
            console.error('Error al obtener conteo de no leídas:', error);
        }
    }


    /**
     * Verifica si hay reservas próximas y crea recordatorios temporales
     */
    async checkUpcomingReservations() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            // Obtener las reservas del usuario para hoy
            const response = await fetch('/api/reservations/my-reservations', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const reservations = data.reservations || [];
            
            const now = new Date();
            const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
            const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);
            
            this.reminderNotifications = [];
            
            reservations.forEach(reservation => {
                const startTime = new Date(reservation.start_time);
                const timeDiff = startTime.getTime() - now.getTime();
                
                // Recordatorio de 1 hora (entre 45 y 75 minutos antes)
                if (timeDiff > 45 * 60 * 1000 && timeDiff <= 75 * 60 * 1000) {
                    this.reminderNotifications.push({
                        id: `reminder_60_${reservation.id}`,
                        type: 'reminder',
                        message: `Recordatorio: Tu reserva en ${reservation.workspace_name} comienza en 1 hora`,
                        isRead: false,
                        createdAt: now.toISOString(),
                        reservation: reservation,
                        reminderType: '60min'
                    });
                }
                
                // Recordatorio de 30 minutos (entre 15 y 45 minutos antes)
                if (timeDiff > 15 * 60 * 1000 && timeDiff <= 45 * 60 * 1000) {
                    this.reminderNotifications.push({
                        id: `reminder_30_${reservation.id}`,
                        type: 'reminder',
                        message: `Recordatorio: Tu reserva en ${reservation.workspace_name} comienza en 30 minutos`,
                        isRead: false,
                        createdAt: now.toISOString(),
                        reservation: reservation,
                        reminderType: '30min'
                    });
                }
            });
            
        } catch (error) {
            console.error('Error al verificar reservas próximas:', error);
        }
    }
    /**
     * Marca una notificación como leída
     */
    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return false;

            const response = await fetch(`${this.apiBase}/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Actualizar localmente
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                    this.updateNotificationBadge();
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error al marcar como leída:', error);
            return false;
        }
    }

    /**
     * Renderiza las notificaciones en el panel del dashboard
     */
    renderDashboardNotifications() {
        const container = document.querySelector('.bg-white.p-6.rounded-xl.shadow-sm.border.border-gray-200 .space-y-4');
        
        if (!container) {
            console.warn('Contenedor de notificaciones no encontrado');
            return;
        }

        // Limpiar contenido actual
        container.innerHTML = '';


        // Combinar notificaciones persistentes y recordatorios
        const allNotifications = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Obtener las últimas 3 notificaciones
        const recentNotifications = allNotifications.slice(0, 3);

        if (recentNotifications.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5-5v5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                    </svg>
                    <p class="text-gray-500 text-sm">No tienes notificaciones</p>
                </div>
            `;
            return;
        }

        // Renderizar cada notificación
        recentNotifications.forEach(notification => {
            const notificationElement = this.createNotificationElement(notification);
            container.appendChild(notificationElement);
        });
    }



    /**
     * Crea un elemento DOM para una notificación
     */
    createNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
            !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : 'bg-gray-50'
        }`;

        // Determinar el icono y color según el tipo de notificación
        const { icon, bgColor, textColor } = this.getNotificationStyle(notification);

        div.innerHTML = `
            <div class="${bgColor} p-1 rounded-full">
                ${icon}
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''}">${notification.message}</p>
                ${notification.reservation ? `
                    <p class="text-xs text-gray-600 mt-1">${this.formatReservationInfo(notification.reservation)}</p>
                ` : ''}
                <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(notification.createdAt)}</p>
            </div>
            ${!notification.isRead ? `
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            ` : ''}
        `;

        // Agregar evento click para marcar como leída
        div.addEventListener('click', () => {
            if (!notification.isRead) {
                this.markAsRead(notification.id);
                div.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
                div.classList.add('bg-gray-50');
                const unreadDot = div.querySelector('.w-2.h-2.bg-blue-500');
                if (unreadDot) {
                    unreadDot.remove();
                }
                const messageElement = div.querySelector('.font-semibold');
                if (messageElement) {
                    messageElement.classList.remove('font-semibold');
                }
            }
        });

        return div;
    }


    /**
     * Obtiene el estilo apropiado para una notificación según su contenido
     */
    getNotificationStyle(notification) {
        // Recordatorios (notificaciones temporales)
        if (notification.type === 'reminder') {
            return {
                icon: `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600'
            };
        }
        
        // Notificaciones globales (rojas con peligro)
        if (notification.type === 'global') {
            return {
                icon: `<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>`,
                bgColor: 'bg-red-100',
                textColor: 'text-red-600'
            };
        }
        
        // Notificaciones personales (verdes con tick) - reservas confirmadas, etc.
        if (notification.type === 'personal') {
            return {
                icon: `<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-green-100',
                textColor: 'text-green-600'
            };
        }
        
        // Fallback por defecto
        return {
            icon: `<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600'
        };
    }

    /**
     * Formatea la información de la reserva asociada
     */
    formatReservationInfo(reservation) {
        if (!reservation) return '';
        
        const startTime = new Date(reservation.startTime);
        const workspaceName = reservation.workspace?.name || 'Espacio';
        
        return `${workspaceName} - ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    /**
     * Formatea el tiempo transcurrido desde la notificación
     */
    formatTimeAgo(dateString) {
        const now = new Date();
        const notificationDate = new Date(dateString);
        const diffInMilliseconds = now - notificationDate;
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) {
            return 'Ahora mismo';
        } else if (diffInMinutes < 60) {
            return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
        } else if (diffInHours < 24) {
            return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
        } else {
            return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
        }
    }

    /**
     * Actualiza el badge de notificaciones no leídas en el header
     */
    updateNotificationBadge() {
        const badge = document.querySelector('.absolute.-top-1.-right-1.bg-red-500');
        
        if (!badge) {
            console.warn('Badge de notificaciones no encontrado');
            return;
        }

        // Asegurar que reminderNotifications esté inicializado
        if (!this.reminderNotifications) {
            this.reminderNotifications = [];
        }

        // Contar notificaciones no leídas (persistentes + recordatorios)
        const unreadReminders = this.reminderNotifications.filter(n => !n.isRead).length;
        const totalUnread = this.unreadCount + unreadReminders;

        if (totalUnread > 0) {
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }





    /**
     * Configurar eventos del dropdown de notificaciones
     */
    setupDropdownEvents() {
        const button = document.getElementById('notifications-button');
        const dropdown = document.getElementById('notifications-dropdown');
        const markAllButton = document.getElementById('mark-all-read');
        const viewAllButton = document.getElementById('view-all-notifications');

        if (!button || !dropdown) {
            console.warn('Elementos del dropdown de notificaciones no encontrados');
            return;
        }

        // Toggle dropdown al hacer click en el botón
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            
            if (isHidden) {
                this.openDropdown();
            } else {
                this.closeDropdown();
            }
        });

        // Marcar todas como leídas
        markAllButton?.addEventListener('click', async () => {
            await this.markAllAsRead();
        });

        // Ver todas las notificaciones
        viewAllButton?.addEventListener('click', () => {
            // TODO: Navegar a página de notificaciones completa
            console.log('Navegar a todas las notificaciones');
            this.closeDropdown();
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Prevenir cierre al hacer click dentro del dropdown
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Abre el dropdown de notificaciones
     */
    async openDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        const container = document.getElementById('dropdown-notifications-container');
        const loading = document.getElementById('notifications-loading');
        const empty = document.getElementById('notifications-empty');

        dropdown.classList.remove('hidden');
        
        // Mostrar loading
        loading.classList.remove('hidden');
        empty.classList.add('hidden');
        container.innerHTML = '';

        try {
            // Cargar notificaciones más recientes
            await this.loadNotifications(7); // Cargar solo las últimas 7
            this.renderDropdownNotifications();
        } catch (error) {
            console.error('Error al cargar notificaciones del dropdown:', error);
        } finally {
            loading.classList.add('hidden');
        }
    }

    /**
     * Cierra el dropdown de notificaciones
     */
    closeDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        dropdown.classList.add('hidden');
    }

    /**
     * Renderiza las notificaciones en el dropdown
     */
    renderDropdownNotifications() {
        const container = document.getElementById('dropdown-notifications-container');
        const empty = document.getElementById('notifications-empty');

        if (!container) return;

        // Asegurar que reminderNotifications esté inicializado
        if (!this.reminderNotifications) {
            this.reminderNotifications = [];
        }

        // Combinar solo las notificaciones NO LEÍDAS (persistentes + recordatorios)
        const unreadNotifications = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications.filter(n => !n.isRead)
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Mostrar solo las primeras 7
        const recentNotifications = unreadNotifications.slice(0, 7);

        if (recentNotifications.length === 0) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        container.innerHTML = '';

        // Renderizar cada notificación para el dropdown
        recentNotifications.forEach(notification => {
            const notificationElement = this.createDropdownNotificationElement(notification);
            container.appendChild(notificationElement);
        });
    }

    /**
     * Crea un elemento de notificación para el dropdown
     */
    createDropdownNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
            !notification.isRead ? 'bg-blue-50' : ''
        }`;

        const { icon, bgColor, textColor } = this.getNotificationStyle(notification);

        div.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="${bgColor} p-1.5 rounded-full flex-shrink-0">
                    ${icon}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''} line-clamp-2">
                        ${notification.message}
                    </p>
                    ${notification.reservation ? `
                        <p class="text-xs text-gray-600 mt-1 truncate">${this.formatReservationInfo(notification.reservation)}</p>
                    ` : ''}
                    <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(notification.createdAt)}</p>
                </div>
                ${!notification.isRead ? `
                    <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                ` : ''}
            </div>
        `;

        // Evento click para marcar como leída
        div.addEventListener('click', async () => {
            if (!notification.isRead) {
                const success = await this.markAsRead(notification.id);
                if (success) {
                    div.classList.remove('bg-blue-50');
                    const unreadDot = div.querySelector('.w-2.h-2.bg-blue-500');
                    if (unreadDot) unreadDot.remove();
                    const messageElement = div.querySelector('.font-semibold');
                    if (messageElement) messageElement.classList.remove('font-semibold');
                }
            }
        });

        return div;
    }

    /**
     * Marca todas las notificaciones como leídas
     */
    async markAllAsRead() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${this.apiBase}/read-all`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Actualizar localmente
                this.notifications.forEach(n => n.isRead = true);
                this.reminderNotifications.forEach(n => n.isRead = true);
                this.unreadCount = 0;
                
                // Actualizar UI
                this.updateNotificationBadge();
                this.renderDropdownNotifications();
                this.renderDashboardNotifications();
                
                console.log('Todas las notificaciones marcadas como leídas');
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    }


    /**
     * Actualiza las notificaciones (llamar periódicamente o después de acciones)
     */
    async refresh() {
        try {
            await this.loadNotifications();
            await this.updateUnreadCount();
            await this.checkUpcomingReservations();
            this.renderDashboardNotifications();
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Error al actualizar notificaciones:', error);
        }
    }
}

// Inicializar el gestor de notificaciones cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.notificationManager = new NotificationManager();
});

// Actualizar notificaciones cada 30 segundos
setInterval(() => {
    if (window.notificationManager) {
        window.notificationManager.refresh();
    }
}, 30000);