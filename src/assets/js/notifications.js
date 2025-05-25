// ==============================================
// ARCHIVO: notifications.js - VERSIÓN CORREGIDA
// ==============================================

/**
 * Sistema de gestión de notificaciones - VERSIÓN CORREGIDA
 * Maneja la obtención, visualización y gestión de notificaciones del usuario
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.reminderNotifications = [];
        this.unreadCount = 0;
        this.apiBase = '/api/notifications';
        this.init();
    }

    /**
     * Función unificada para obtener token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Inicializa el sistema de notificaciones
     */
    async init() {
        try {
            // Limpiar datos anteriores al inicializar
            this.notifications = [];
            this.reminderNotifications = [];
            this.unreadCount = 0;
            
            await this.loadNotifications();
            await this.updateUnreadCount();
            
            // Manejo de errores específico para recordatorios
            try {
                await this.checkUpcomingReservations();
            } catch (reminderError) {
                console.warn('Error al cargar recordatorios (no crítico):', reminderError);
                // Continúa sin recordatorios pero sin fallar toda la inicialización
            }
            
            this.renderDashboardNotifications();
            this.updateNotificationBadge();
            this.setupDropdownEvents();
        } catch (error) {
            console.error('Error al inicializar notificaciones:', error);
            this.showErrorState();
        }
    }

    /**
     * Carga las notificaciones del usuario desde la API
     */
    async loadNotifications(limit = 10) {
        try {
            const token = this.getAuthToken(); //  Usar función unificada
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
            const token = this.getAuthToken(); //  Usar función unificada
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
     *  Verifica reservas próximas con manejo robusto de diferentes formatos
     */
    async checkUpcomingReservations() {
        try {
            const token = this.getAuthToken();
            if (!token) return;

            //  Usar endpoint correcto que devuelve formato snake_case
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
            this.reminderNotifications = [];
            
            reservations.forEach(reservation => {
                try {
                    //  Manejar tanto snake_case como camelCase
                    const startTimeValue = reservation.start_time || reservation.startTime;
                    const workspaceNameValue = reservation.workspace_name || reservation.workspaceName;
                    
                    if (!startTimeValue) {
                        console.warn('Reserva sin start_time:', reservation);
                        return;
                    }
                    
                    const startTime = new Date(startTimeValue);
                    if (isNaN(startTime.getTime())) {
                        console.warn('Fecha inválida en reserva:', startTimeValue);
                        return;
                    }
                    
                    const timeDiff = startTime.getTime() - now.getTime();
                    
                    // Recordatorio de 1 hora (entre 45 y 75 minutos antes)
                    if (timeDiff > 45 * 60 * 1000 && timeDiff <= 75 * 60 * 1000) {
                        this.reminderNotifications.push({
                            id: `reminder_60_${reservation.id}`,
                            type: 'reminder',
                            message: `Recordatorio: Tu reserva en ${workspaceNameValue || 'un espacio'} comienza en 1 hora`,
                            isRead: false,
                            createdAt: now.toISOString(),
                            reservation: {
                                ...reservation,
                                startTime: startTimeValue,
                                workspace_name: workspaceNameValue
                            },
                            reminderType: '60min'
                        });
                    }
                    
                    // Recordatorio de 30 minutos (entre 15 y 45 minutos antes)
                    if (timeDiff > 15 * 60 * 1000 && timeDiff <= 45 * 60 * 1000) {
                        this.reminderNotifications.push({
                            id: `reminder_30_${reservation.id}`,
                            type: 'reminder',
                            message: `Recordatorio: Tu reserva en ${workspaceNameValue || 'un espacio'} comienza en 30 minutos`,
                            isRead: false,
                            createdAt: now.toISOString(),
                            reservation: {
                                ...reservation,
                                startTime: startTimeValue,
                                workspace_name: workspaceNameValue
                            },
                            reminderType: '30min'
                        });
                    }
                } catch (reservationError) {
                    console.warn('Error procesando reserva individual:', reservationError, reservation);
                }
            });
            
        } catch (error) {
            console.error('Error al verificar reservas próximas:', error);
            throw error; // Re-lanzar para manejo en init()
        }
    }

    /**
     * Marca una notificación como leída
     */
    async markAsRead(notificationId) {
        try {
            const notificationIdStr = String(notificationId);
            //  Manejar recordatorios (que no están en BD)
            if (notificationIdStr.startsWith('reminder_')) {
                const reminder = this.reminderNotifications.find(n => n.id === notificationIdStr);
                if (reminder) {
                    reminder.isRead = true;
                    this.updateNotificationBadge();
                }
                return true;
            }

            const token = this.getAuthToken();
            if (!token) return false;

            const response = await fetch(`${this.apiBase}/${notificationIdStr}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const notification = this.notifications.find(n => n.id === notificationIdStr);
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
     *  Renderiza notificaciones con selector correcto
     */
    renderDashboardNotifications() {
        //  Usar ID específico en lugar de selector complejo
        const container = document.getElementById('notification-dashboard-container');
        
        if (!container) {
            console.warn('Contenedor de notificaciones del dashboard no encontrado');
            return;
        }

        container.innerHTML = '';

        const allNotifications = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

        div.addEventListener('click', async () => {
            if (!notification.isRead) {
                await this.markAsRead(notification.id);
                div.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
                div.classList.add('bg-gray-50');
                const unreadDot = div.querySelector('.w-2.h-2.bg-blue-500');
                if (unreadDot) unreadDot.remove();
                const messageElement = div.querySelector('.font-semibold');
                if (messageElement) messageElement.classList.remove('font-semibold');
            }
        });

        return div;
    }

    /**
     *  Formatea información de reserva con manejo robusto
     */
    formatReservationInfo(reservation) {
        if (!reservation) return '';
        
        try {
            // Manejar diferentes formatos de datos
            const startTimeValue = reservation.startTime || reservation.start_time;
            const workspaceName = reservation.workspace?.name || reservation.workspace_name || 'Espacio';
            
            if (!startTimeValue) return workspaceName;
            
            const startTime = new Date(startTimeValue);
            if (isNaN(startTime.getTime())) {
                console.warn('Fecha inválida en formatReservationInfo:', startTimeValue);
                return workspaceName;
            }
            
            return `${workspaceName} - ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (error) {
            console.warn('Error al formatear fecha de reserva:', error, reservation);
            return reservation.workspace?.name || reservation.workspace_name || 'Espacio';
        }
    }

    /**
     * Obtiene el estilo apropiado para una notificación según su contenido
     */
    getNotificationStyle(notification) {
        if (notification.type === 'reminder') {
            return {
                icon: `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-blue-100',
                textColor: 'text-blue-600'
            };
        }
        
        if (notification.type === 'global') {
            return {
                icon: `<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>`,
                bgColor: 'bg-red-100',
                textColor: 'text-red-600'
            };
        }
        
        if (notification.type === 'personal') {
            return {
                icon: `<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-green-100',
                textColor: 'text-green-600'
            };
        }
        
        return {
            icon: `<svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>`,
            bgColor: 'bg-gray-100',
            textColor: 'text-gray-600'
        };
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
     *  Actualiza badge con selector correcto
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notification-badge'); //  Usar ID
        
        if (!badge) {
            console.warn('Badge de notificaciones no encontrado');
            return;
        }

        if (!this.reminderNotifications) {
            this.reminderNotifications = [];
        }

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
     *  Mostrar estado de error al usuario
     */
    showErrorState() {
        const container = document.getElementById('notification-dashboard-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <svg class="w-12 h-12 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p class="text-red-500 text-sm">Error al cargar notificaciones</p>
                    <button onclick="window.notificationManager.refresh()" class="mt-2 text-blue-600 hover:text-blue-800 text-sm">Reintentar</button>
                </div>
            `;
        }
    }

    /**
     * Configurar eventos del dropdown de notificaciones
     */
    setupDropdownEvents() {
        const button = document.getElementById('notifications-button');
        const dropdown = document.getElementById('notifications-dropdown');
        const markAllButton = document.getElementById('mark-all-read');

        if (!button || !dropdown) {
            console.warn('Elementos del dropdown de notificaciones no encontrados');
            return;
        }

        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            
            if (isHidden) {
                this.openDropdown();
            } else {
                this.closeDropdown();
            }
        });

        markAllButton?.addEventListener('click', async () => {
            await this.markAllAsRead();
        });

        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                this.closeDropdown();
            }
        });

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
        
        loading.classList.remove('hidden');
        empty.classList.add('hidden');
        if (container) container.innerHTML = '';

        try {
            await this.loadNotifications(7);
            
            //  Verificar si dropdown sigue abierto
            if (!dropdown.classList.contains('hidden')) {
                this.renderDropdownNotifications();
            }
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

        if (!this.reminderNotifications) {
            this.reminderNotifications = [];
        }

        const unreadNotifications = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications.filter(n => !n.isRead)
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const recentNotifications = unreadNotifications.slice(0, 7);

        if (recentNotifications.length === 0) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        container.innerHTML = '';

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
            const token = this.getAuthToken();
            if (!token) return;

            const response = await fetch(`${this.apiBase}/read-all`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.notifications.forEach(n => n.isRead = true);
                this.reminderNotifications.forEach(n => n.isRead = true);
                this.unreadCount = 0;
                
                this.updateNotificationBadge();
                this.renderDropdownNotifications();
                this.renderDashboardNotifications();
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    }

    /**
     * Actualiza las notificaciones
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
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (window.notificationManager && token) {
        window.notificationManager.refresh();
    }
}, 30000);