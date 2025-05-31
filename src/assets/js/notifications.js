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
        this.dropdownOpen = false;
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
            }
            
            // Renderizar en dashboard Y sidebar
            this.renderDashboardNotifications();
            this.renderSidebarDropdown(); // Llamar al dropdown
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
     * Carga solo las notificaciones no leídas desde la API
     */
    async loadUnreadNotifications(limit = 5) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }

            // Primero intentamos el endpoint /unread, si no existe usamos el original con filtro
            let response;
            try {
                response = await fetch(`${this.apiBase}/unread?limit=${limit}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (error) {
                // Si el endpoint /unread no existe, usar el original y filtrar
                response = await fetch(`${this.apiBase}?limit=${limit * 2}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            let apiNotifications = data.notifications || [];
            
            // Filtrar solo las no leídas si usamos el endpoint original
            if (response.url.includes('/unread')) {
                // Ya están filtradas
            } else {
                apiNotifications = apiNotifications.filter(n => !n.isRead && !n.is_read);
            }
            
            // Combinar con recordatorios no leídos
            const unreadReminders = this.reminderNotifications.filter(n => !n.isRead);
            const allUnreadNotifications = [
                ...unreadReminders,
                ...apiNotifications
            ].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));

            return allUnreadNotifications.slice(0, limit);
            
        } catch (error) {
            console.error('Error al cargar notificaciones no leídas:', error);
            throw error;
        }
    }

    /**
     * Marca una notificación como leída
     */
    async markAsRead(notificationId) {
        try {
            const notificationIdStr = String(notificationId);
            
            if (notificationIdStr.startsWith('reminder_')) {
                const reminder = this.reminderNotifications.find(n => n.id === notificationIdStr);
                if (reminder) {
                    reminder.isRead = true;
                    this.updateNotificationBadge();
                    this.renderSidebarDropdown(); // Renderizar dropdown
                    this.renderDashboardNotifications();
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
                    this.renderSidebarDropdown(); // Renderizar dropdown
                    this.renderDashboardNotifications();
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
     * Renderiza notificaciones no leídas en el dropdown del sidebar
     */
    renderSidebarDropdown() {
        const dropdownContainer = document.getElementById('notifications-dropdown-content');
        
        if (!dropdownContainer) {
            console.warn('Contenedor del dropdown de notificaciones no encontrado');
            return;
        }

        // Obtener solo notificaciones NO LEÍDAS
        this.loadUnreadNotifications().then(unreadNotifications => {
            if (unreadNotifications.length === 0) {
                dropdownContainer.innerHTML = `
                    <div class="px-4 py-3 text-center text-gray-500">
                        <svg class="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5-5v5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                        </svg>
                        <p class="text-xs">No hay notificaciones nuevas</p>
                    </div>
                `;
                return;
            }

            dropdownContainer.innerHTML = unreadNotifications.map(notification => {
                const { icon, bgColor } = this.getNotificationStyle(notification);
                return `
                    <div class="notification-item px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                         data-notification-id="${notification.id}">
                        <div class="flex items-start space-x-3">
                            <div class="${bgColor} p-1 rounded-full flex-shrink-0">
                                ${icon}
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-sm font-medium text-gray-900 truncate">${notification.message}</p>
                                ${notification.reservation ? `
                                    <p class="text-xs text-gray-600 mt-1 truncate">${this.formatReservationInfo(notification.reservation)}</p>
                                ` : ''}
                                <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(notification.createdAt || notification.created_at)}</p>
                            </div>
                            <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        </div>
                    </div>
                `;
            }).join('');

            // Agregar footer con enlace a ver todas
            dropdownContainer.innerHTML += `
                <div class="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <a href="/notifications" class="block text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                        Ver todas las notificaciones
                    </a>
                </div>
            `;

            // Agregar event listeners
            const notificationItems = dropdownContainer.querySelectorAll('.notification-item');
            notificationItems.forEach(item => {
                item.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const notificationId = item.getAttribute('data-notification-id');
                    
                    if (notificationId) {
                        const success = await this.markAsRead(notificationId);
                        
                        if (success) {
                            // Eliminar el item del dropdown visualmente
                            item.style.opacity = '0.5';
                            setTimeout(() => {
                                item.remove();
                                // Si no quedan notificaciones, mostrar mensaje vacío
                                const remainingItems = dropdownContainer.querySelectorAll('.notification-item');
                                if (remainingItems.length === 0) {
                                    this.renderSidebarDropdown();
                                }
                            }, 300);
                            
                            //console.log(`✅ Notificación ${notificationId} marcada como leída desde dropdown`);
                        }
                    }
                });
            });
        }).catch(error => {
            console.error('Error al cargar notificaciones no leídas:', error);
            this.showErrorState();
        });
    }

    /**
     * Configura los eventos del dropdown
     */
    setupDropdownEvents() {
        const notificationButton = document.getElementById('notifications-dropdown-button');
        const dropdownMenu = document.getElementById('notifications-dropdown-menu');
        
        if (!notificationButton || !dropdownMenu) {
            console.warn('Elementos del dropdown no encontrados');
            return;
        }

        // Toggle dropdown al hacer click en el botón
        notificationButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Cerrar dropdown al hacer click fuera
        document.addEventListener('click', (e) => {
            if (!notificationButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Prevenir cierre al hacer click dentro del dropdown
        dropdownMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Toggle del dropdown
     */
    toggleDropdown() {
        const dropdownMenu = document.getElementById('notifications-dropdown-menu');
        
        if (!dropdownMenu) return;

        if (this.dropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    /**
     * Abrir dropdown
     */
    openDropdown() {
        const dropdownMenu = document.getElementById('notifications-dropdown-menu');
        const dropdownButton = document.getElementById('notifications-dropdown-button');
        
        if (!dropdownMenu) return;

        dropdownMenu.classList.remove('hidden');
        dropdownMenu.classList.add('block');
        
        // Agregar clase activa al botón
        if (dropdownButton) {
            dropdownButton.classList.add('active');
        }
        
        this.dropdownOpen = true;
        
        // Actualizar contenido al abrir
        this.renderSidebarDropdown();
    }

    /**
     * Cerrar dropdown
     */
    closeDropdown() {
        const dropdownMenu = document.getElementById('notifications-dropdown-menu');
        const dropdownButton = document.getElementById('notifications-dropdown-button');
        
        if (!dropdownMenu) return;

        dropdownMenu.classList.remove('block');
        dropdownMenu.classList.add('hidden');
        
        // Remover clase activa del botón
        if (dropdownButton) {
            dropdownButton.classList.remove('active');
        }
        
        this.dropdownOpen = false;
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
     *  Actualiza el badge de notificaciones - CORREGIDO para sidebar
     */
    updateNotificationBadge() {
        const button = document.getElementById('notifications-dropdown-button');
        const countElement = document.getElementById('notification-count');
        
        if (!button || !countElement) {
            console.warn('Botón o contador de notificaciones no encontrado');
            return;
        }
    
        if (!this.reminderNotifications) {
            this.reminderNotifications = [];
        }
    
        const unreadReminders = this.reminderNotifications.filter(n => !n.isRead).length;
        const totalUnread = this.unreadCount + unreadReminders;
    
        //console.log('📊 Debug badge:', { unreadCount: this.unreadCount, unreadReminders, totalUnread });
    
        // Actualizar el texto del contador
        countElement.textContent = totalUnread > 99 ? '99+' : totalUnread.toString();
        
        // Actualizar el atributo data-count para los estilos CSS
        button.setAttribute('data-count', totalUnread.toString());
    
        // Mostrar u ocultar el botón según el conteo
        if (totalUnread > 0) {
            button.style.display = 'block';
            //console.log('✅ Mostrando botón con', totalUnread, 'notificaciones');
        } else {
            button.style.display = 'none';
            //console.log('❌ Ocultando botón - sin notificaciones');
        }
    }

    /**
     * Renderiza notificaciones en el sidebar - NUEVA FUNCIÓN
     */
    /*renderSidebarNotifications() {
        const sidebarContainer = document.getElementById('sidebar-notifications-list');
        
        if (!sidebarContainer) {
            console.warn('Contenedor de notificaciones del sidebar no encontrado');
            return;
        }

        // Combinar todas las notificaciones
        const allNotifications = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const recentNotifications = allNotifications.slice(0, 3);

        if (recentNotifications.length === 0) {
            sidebarContainer.innerHTML = `
                <div class="text-center py-2">
                    <p class="text-xs text-gray-500">No hay notificaciones</p>
                </div>
            `;
            return;
        }

        sidebarContainer.innerHTML = recentNotifications.map(notification => `
            <div class="sidebar-notification text-xs p-2 border-b border-gray-100 last:border-b-0 ${notification.isRead ? 'opacity-60' : 'bg-blue-50'} rounded cursor-pointer hover:bg-gray-100 transition-colors"
                 data-notification-id="${notification.id}"
                 data-is-read="${notification.isRead}">
                <p class="font-medium text-gray-900 truncate ${!notification.isRead ? 'font-semibold' : ''}">${notification.message || notification.title}</p>
                ${notification.reservation ? `
                    <p class="text-gray-600 truncate mt-1">${this.formatReservationInfo(notification.reservation)}</p>
                ` : ''}
                <p class="text-gray-400 mt-1">${this.formatTimeAgo(notification.createdAt || notification.created_at)}</p>
                ${!notification.isRead ? '<div class="w-1 h-1 bg-blue-500 rounded-full mt-1"></div>' : ''}
            </div>
        `).join('');

        // Agregar event listeners a cada notificación del sidebar
        const notificationElements = sidebarContainer.querySelectorAll('.sidebar-notification');
        notificationElements.forEach(element => {
            element.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const notificationId = element.getAttribute('data-notification-id');
                const isRead = element.getAttribute('data-is-read') === 'true';
                
                if (!isRead && notificationId) {
                    // Marcar como leída
                    const success = await this.markAsRead(notificationId);
                    
                    if (success) {
                        // Actualizar el elemento visualmente
                        element.classList.remove('bg-blue-50');
                        element.classList.add('opacity-60');
                        element.setAttribute('data-is-read', 'true');
                        
                        // Remover el punto de no leída
                        const unreadDot = element.querySelector('.w-1.h-1.bg-blue-500');
                        if (unreadDot) {
                            unreadDot.remove();
                        }
                        
                        // Remover font-semibold del texto
                        const messageElement = element.querySelector('.font-semibold');
                        if (messageElement) {
                            messageElement.classList.remove('font-semibold');
                        }
                        
                        console.log(`✅ Notificación ${notificationId} marcada como leída desde sidebar`);
                    }
                }
            });
        });
    }*/

    /**
     * Actualiza las notificaciones - CORREGIDA
     */
    async refresh() {
        try {
            await this.loadNotifications();
            await this.updateUnreadCount();
            await this.checkUpcomingReservations();
            this.renderDashboardNotifications();
            this.renderSidebarDropdown(); // Usar dropdown
            this.updateNotificationBadge();
        } catch (error) {
            console.error('Error al actualizar notificaciones:', error);
        }
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