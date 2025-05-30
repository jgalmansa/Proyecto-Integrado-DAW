/**
 * Sistema de gestión de la página completa de notificaciones - VERSIÓN CORREGIDA
 * Maneja filtros, paginación, y visualización completa de notificaciones
 */

class NotificationsPage {
    constructor() {
        this.notifications = [];
        this.reminderNotifications = [];
        this.currentFilter = 'all'; // 'all', 'unread', 'read'
        this.currentPage = 1;
        this.notificationsPerPage = 15;
        this.totalNotifications = 0;
        this.apiBase = '/api/notifications';
        this.expandedNotifications = new Set(); // Para trackear cuáles están expandidas
        
        this.init();
    }

    /**
     * 🔧 FIX: Función unificada para obtener token (igual que notifications.js)
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Inicializa la página de notificaciones
     */
    async init() {
        try {
            // Limpiar datos anteriores
            this.notifications = [];
            this.reminderNotifications = [];
            this.currentPage = 1;
            this.expandedNotifications.clear();
            
            // 🔧 FIX: Verificar autenticación usando función unificada
            if (!this.checkAuth()) return;

            // Configurar eventos
            this.setupEvents();
            
            // Cargar notificaciones iniciales
            await this.loadNotifications();
            
            // 🔧 FIX: Manejo de errores específico para recordatorios
            try {
                await this.checkUpcomingReservations();
            } catch (reminderError) {
                console.warn('Error al cargar recordatorios (no crítico):', reminderError);
            }
            
            // Renderizar página
            this.renderPage();
            
        } catch (error) {
            console.error('Error al inicializar página de notificaciones:', error);
            this.showError('Error al cargar las notificaciones');
        }
    }

    /**
     * 🔧 FIX: Verificar autenticación usando función unificada
     */
    checkAuth() {
        const token = this.getAuthToken();
        if (!token) {
            window.location.href = '/login';
            return false;
        }
        return true;
    }

    /**
     * Configura todos los event listeners
     */
    setupEvents() {
        // Filtros
        document.getElementById('filter-all')?.addEventListener('click', () => this.setFilter('all'));
        document.getElementById('filter-unread')?.addEventListener('click', () => this.setFilter('unread'));
        document.getElementById('filter-read')?.addEventListener('click', () => this.setFilter('read'));

        // Marcar todas como leídas
        document.getElementById('mark-all-notifications-read')?.addEventListener('click', () => this.markAllAsRead());

        // Paginación
        document.getElementById('prev-page')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('next-page')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));

        // También configurar dropdown si existe
        this.setupDropdownEvents();
    }

    /**
     * Configura eventos del dropdown (reutilizado del sistema original)
     */
    setupDropdownEvents() {
        const button = document.getElementById('notifications-button');
        const dropdown = document.getElementById('notifications-dropdown');
        const markAllButton = document.getElementById('mark-all-read');

        if (!button || !dropdown) return;

        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('hidden');
            
            if (isHidden) {
                this.openDropdown();
            } else {
                this.closeDropdown();
            }
        });

        // Marcar todas como leídas desde dropdown
        markAllButton?.addEventListener('click', async () => {
            await this.markAllAsRead();
        });

        // Cerrar dropdown al hacer click fuera
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
     * 🔧 FIX: Carga las notificaciones desde la API usando función de token unificada
     */
    async loadNotifications() {
        try {
            const token = this.getAuthToken(); // 🔧 FIX: Usar función unificada
            if (!token) {
                throw new Error('Token de autenticación no encontrado');
            }

            // Cargar todas las notificaciones (sin límite para paginación local)
            const response = await fetch(`${this.apiBase}?limit=1000`, {
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

        } catch (error) {
            console.error('Error al cargar notificaciones:', error);
            this.notifications = [];
            throw error;
        }
    }

    /**
     * 🔧 FIX: Verifica reservas próximas usando endpoint correcto y manejo robusto
     */
    async checkUpcomingReservations() {
        try {
            const token = this.getAuthToken();
            if (!token) return;

            // 🔧 FIX: Usar endpoint correcto que devuelve formato snake_case
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
                    // 🔧 FIX: Manejar tanto snake_case como camelCase
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
            throw error;
        }
    }

    /**
     * Establece el filtro activo
     */
    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1; // Reset a primera página

        // Actualizar botones de filtro
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active', 'bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        });

        const activeBtn = document.getElementById(`filter-${filter}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
            activeBtn.classList.add('active', 'bg-blue-600', 'text-white');
        }

        this.renderPage();
    }

    /**
     * Obtiene las notificaciones filtradas
     */
    getFilteredNotifications() {
        // Combinar notificaciones persistentes y recordatorios
        const allNotifications = [
            ...this.reminderNotifications,
            ...this.notifications
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Aplicar filtro
        switch (this.currentFilter) {
            case 'unread':
                return allNotifications.filter(n => !n.isRead);
            case 'read':
                return allNotifications.filter(n => n.isRead);
            default:
                return allNotifications;
        }
    }

    /**
     * Obtiene las notificaciones para la página actual
     */
    getPaginatedNotifications() {
        const filtered = this.getFilteredNotifications();
        const startIndex = (this.currentPage - 1) * this.notificationsPerPage;
        const endIndex = startIndex + this.notificationsPerPage;
        
        return {
            notifications: filtered.slice(startIndex, endIndex),
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / this.notificationsPerPage)
        };
    }

    /**
     * Renderiza toda la página
     */
    renderPage() {
        this.updateStats();
        this.renderNotifications();
        this.renderPagination();
        this.updateDropdownBadge();
    }

    /**
     * Actualiza las estadísticas del header
     */
    updateStats() {
        const allNotifications = [
            ...this.reminderNotifications,
            ...this.notifications
        ];

        const totalElement = document.getElementById('total-notifications');
        const unreadElement = document.getElementById('unread-notifications');

        if (totalElement) {
            totalElement.textContent = allNotifications.length;
        }

        if (unreadElement) {
            const unreadCount = allNotifications.filter(n => !n.isRead).length;
            unreadElement.textContent = unreadCount;
        }
    }

    /**
     * Renderiza la lista de notificaciones
     */
    renderNotifications() {
        const loadingElement = document.getElementById('notifications-page-loading');
        const emptyElement = document.getElementById('notifications-page-empty');
        const listElement = document.getElementById('notifications-page-list');

        // Ocultar loading
        if (loadingElement) loadingElement.classList.add('hidden');

        const { notifications, total } = this.getPaginatedNotifications();

        if (notifications.length === 0) {
            if (emptyElement) emptyElement.classList.remove('hidden');
            if (listElement) listElement.classList.add('hidden');
            return;
        }

        if (emptyElement) emptyElement.classList.add('hidden');
        if (listElement) {
            listElement.classList.remove('hidden');
            listElement.innerHTML = '';

            notifications.forEach(notification => {
                const notificationElement = this.createNotificationElement(notification);
                listElement.appendChild(notificationElement);
            });
        }
    }

    /**
     * 🔧 FIX: Crea un elemento de notificación con manejo robusto de datos
     */
    createNotificationElement(notification) {
        const div = document.createElement('div');
        const isExpanded = this.expandedNotifications.has(notification.id);
        
        div.className = `border-b border-gray-100 last:border-b-0 transition-all duration-200 ${
            !notification.isRead ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`;

        const { icon, bgColor } = this.getNotificationStyle(notification);

        div.innerHTML = `
            <div class="p-4 cursor-pointer" data-notification-id="${notification.id}">
                <div class="flex items-start space-x-4">
                    <div class="${bgColor} p-2 rounded-full flex-shrink-0">
                        ${icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''} mb-1">
                                    ${notification.message}
                                </p>
                                <p class="text-xs text-gray-500">
                                    ${this.formatTimeAgo(notification.createdAt)}
                                </p>
                                ${notification.reservation && !isExpanded ? `
                                    <p class="text-xs text-gray-600 mt-1">${this.formatReservationInfo(notification.reservation)}</p>
                                ` : ''}
                            </div>
                            <div class="flex items-center space-x-2 ml-4">
                                ${!notification.isRead ? `
                                    <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
                                ` : ''}
                                ${notification.reservation ? `
                                    <button class="text-gray-400 hover:text-gray-600 expand-btn" data-notification-id="${notification.id}">
                                        <svg class="w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Detalles expandibles -->
                        ${notification.reservation && isExpanded ? this.renderReservationDetails(notification.reservation) : ''}
                    </div>
                </div>
            </div>
        `;

        // Event listeners
        const clickableArea = div.querySelector(`[data-notification-id="${notification.id}"]`);
        const expandBtn = div.querySelector(`.expand-btn[data-notification-id="${notification.id}"]`);

        // Click en la notificación para marcar como leída
        clickableArea?.addEventListener('click', (e) => {
            // No hacer nada si se hizo click en el botón de expandir
            if (e.target.closest('.expand-btn')) return;
            
            if (!notification.isRead) {
                this.markAsRead(notification.id);
            }
        });

        // Click en botón expandir
        expandBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleExpanded(notification.id);
        });

        return div;
    }

    /**
     * 🔧 FIX: Renderiza detalles de reserva con manejo robusto de datos
     */
    renderReservationDetails(reservation) {
        try {
            // 🔧 FIX: Manejar diferentes formatos de datos
            const startTimeValue = reservation.startTime || reservation.start_time;
            const endTimeValue = reservation.endTime || reservation.end_time;
            const workspaceName = reservation.workspace?.name || reservation.workspace_name || 'No especificado';
            const workspaceDescription = reservation.workspace?.description || 'Sin descripción';
            const workspaceCapacity = reservation.workspace?.capacity || reservation.Reservation?.Workspace?.capacity || 'No especificado';
            const numberOfPeople = reservation.numberOfPeople || reservation.number_of_people || reservation.Reservation?.number_of_people || 'No especificado';
            const equipment = reservation.workspace?.equipment || reservation.Reservation?.Workspace?.equipment;

            if (!startTimeValue || !endTimeValue) {
                return '<div class="mt-3 p-4 bg-gray-50 rounded-lg"><p class="text-sm text-gray-500">Información de reserva no disponible</p></div>';
            }

            const startTime = new Date(startTimeValue);
            const endTime = new Date(endTimeValue);

            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                return '<div class="mt-3 p-4 bg-gray-50 rounded-lg"><p class="text-sm text-gray-500">Fechas de reserva inválidas</p></div>';
            }

            return `
                <div class="mt-3 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-200">
                    <h4 class="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                        <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Detalles de la reserva
                    </h4>
                    
                    <!-- Información básica -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="space-y-2">
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Espacio:</span>
                                <span class="text-xs font-medium text-gray-900">${workspaceName}</span>
                            </div>
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Fecha:</span>
                                <span class="text-xs text-gray-900">${startTime.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Horario:</span>
                                <span class="text-xs text-gray-900">
                                    ${startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - 
                                    ${endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    <span class="text-gray-500 ml-1">(${this.calculateDuration(reservation)})</span>
                                </span>
                            </div>
                        </div>
                        
                        <div class="space-y-2">
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Personas:</span>
                                <span class="text-xs text-gray-900">
                                    ${numberOfPeople}${workspaceCapacity !== 'No especificado' ? ` / ${workspaceCapacity} máx.` : ''}
                                </span>
                            </div>
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Capacidad:</span>
                                <span class="text-xs text-gray-900">${workspaceCapacity} personas</span>
                            </div>
                        </div>
                    </div>

                    <!-- Descripción del espacio -->
                    <div class="grid grid-cols-1 gap-4 mb-4">
                        <div class="space-y-4">
                            <div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Descripción:</span>
                                <span class="text-xs text-gray-900">${workspaceDescription}</span>
                            </div>
                            <!--<div class="flex items-start">
                                <span class="text-xs text-gray-500 w-20 flex-shrink-0 mt-0.5">Equipamiento:</span>
                                <div class="text-xs text-gray-900">${this.formatEquipment(equipment)}</div>
                            </div>-->
                        </div>
                    </div>

                    <!-- Footer con estado -->
                    <div class="pt-3 border-t border-gray-200 flex items-center justify-between">
                        <div class="flex items-center text-xs">
                            <div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                            <span class="text-gray-600">Reserva confirmada</span>
                        </div>
                        <span class="text-xs text-gray-500">ID: ${reservation.id}</span>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error renderizando detalles de reserva:', error);
            return '<div class="mt-3 p-4 bg-gray-50 rounded-lg"><p class="text-sm text-red-500">Error al mostrar detalles de la reserva</p></div>';
        }
    }

    /**
     * 🔧 FIX: Formatea el equipamiento con manejo de errores robusto
     */
    formatEquipment(equipment) {
        if (!equipment) return '<span class="text-xs text-gray-400">No especificado</span>';
        
        try {
            // Si es un string JSON, parsearlo
            const equipmentArray = typeof equipment === 'string' ? JSON.parse(equipment) : equipment;
            
            if (Array.isArray(equipmentArray) && equipmentArray.length > 0) {
                return equipmentArray.map(item => 
                    `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        ${item}
                    </span>`
                ).join('');
            } else {
                return '<span class="text-xs text-gray-400">Sin equipamiento especificado</span>';
            }
        } catch (error) {
            // Si no es JSON válido, mostrar como texto simple
            return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">${equipment}</span>`;
        }
    }

    /**
     * 🔧 FIX: Calcula la duración con manejo robusto de fechas
     */
    calculateDuration(reservation) {
        try {
            const startTimeValue = reservation.startTime || reservation.start_time;
            const endTimeValue = reservation.endTime || reservation.end_time;
            
            if (!startTimeValue || !endTimeValue) return 'N/A';
            
            const start = new Date(startTimeValue);
            const end = new Date(endTimeValue);
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';
            
            const diffHours = Math.abs(end - start) / (1000 * 60 * 60);
            
            if (diffHours < 1) {
                const diffMinutes = Math.abs(end - start) / (1000 * 60);
                return `${Math.round(diffMinutes)} min`;
            }
            
            return `${diffHours.toFixed(1)} h`;
        } catch (error) {
            console.error('Error calculando duración:', error);
            return 'N/A';
        }
    }

    /**
     * Toggle estado expandido de una notificación
     */
    toggleExpanded(notificationId) {
        if (this.expandedNotifications.has(notificationId)) {
            this.expandedNotifications.delete(notificationId);
        } else {
            this.expandedNotifications.add(notificationId);
        }
        this.renderNotifications();
    }

    /**
     * Obtiene el estilo apropiado para una notificación
     */
    getNotificationStyle(notification) {
        if (notification.type === 'reminder') {
            return {
                icon: `<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-blue-100'
            };
        } else if (notification.type === 'global') {
            return {
                icon: `<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                      </svg>`,
                bgColor: 'bg-red-100'
            };
        } else {
            return {
                icon: `<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>`,
                bgColor: 'bg-green-100'
            };
        }
    }

    /**
     * 🔧 FIX: Formatea información de reserva con manejo robusto
     */
    formatReservationInfo(reservation) {
        if (!reservation) return '';
        
        try {
            const startTimeValue = reservation.startTime || reservation.start_time;
            const workspaceName = reservation.workspace?.name || reservation.workspace_name || 'Espacio';
            
            if (!startTimeValue) return workspaceName;
            
            const startTime = new Date(startTimeValue);
            if (isNaN(startTime.getTime())) {
                return workspaceName;
            }
            
            return `${workspaceName} - ${startTime.toLocaleDateString('es-ES')} ${startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
        } catch (error) {
            console.error('Error formateando info de reserva:', error);
            return reservation.workspace?.name || reservation.workspace_name || 'Espacio';
        }
    }

    /**
     * Formatea el tiempo transcurrido
     */
    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffInMilliseconds = now - date;
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
     * 🔧 FIX: Marca una notificación como leída con manejo de recordatorios
     */
    async markAsRead(notificationId) {
        
        // Convertir a string para poder usar startsWith
        const notificationIdStr = String(notificationId);
        
        // Si es recordatorio temporal
        if (notificationIdStr.startsWith('reminder_')) {
            const reminder = this.reminderNotifications.find(n => n.id === notificationIdStr);
            if (reminder) {
                reminder.isRead = true;
                this.renderPage();
            }
            return;
        }

        try {
            const token = this.getAuthToken(); // 🔧 FIX: Usar función unificada
            if (!token) return;

            const response = await fetch(`${this.apiBase}/${notificationId}/read`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const notification = this.notifications.find(n => n.id == notificationId);
                if (notification) {
                    notification.isRead = true;
                    this.renderPage();
                }
            } else {
                console.error('❌ Error en API:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error al marcar como leída:', error);
        }
    }

    /**
     * 🔧 FIX: Marca todas las notificaciones como leídas
     */
    async markAllAsRead() {
        try {
            const token = this.getAuthToken(); // 🔧 FIX: Usar función unificada
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
                
                this.renderPage();
            }
        } catch (error) {
            console.error('Error al marcar todas como leídas:', error);
        }
    }

    /**
     * Renderiza la paginación
     */
    renderPagination() {
        const { total, totalPages } = this.getPaginatedNotifications();
        const paginationElement = document.getElementById('notifications-pagination');
        
        if (!paginationElement || totalPages <= 1) {
            if (paginationElement) paginationElement.classList.add('hidden');
            return;
        }

        paginationElement.classList.remove('hidden');

        // Actualizar información de mostrando
        const startItem = ((this.currentPage - 1) * this.notificationsPerPage) + 1;
        const endItem = Math.min(this.currentPage * this.notificationsPerPage, total);

        const showingFrom = document.getElementById('showing-from');
        const showingTo = document.getElementById('showing-to');
        const showingTotal = document.getElementById('showing-total');

        if (showingFrom) showingFrom.textContent = startItem;
        if (showingTo) showingTo.textContent = endItem;
        if (showingTotal) showingTotal.textContent = total;

        // Botones anterior/siguiente
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
            prevBtn.classList.toggle('opacity-50', this.currentPage <= 1);
            prevBtn.classList.toggle('cursor-not-allowed', this.currentPage <= 1);
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
            nextBtn.classList.toggle('opacity-50', this.currentPage >= totalPages);
            nextBtn.classList.toggle('cursor-not-allowed', this.currentPage >= totalPages);
        }

        // Números de página
        this.renderPageNumbers(totalPages);
    }

    /**
     * Renderiza los números de página
     */
    renderPageNumbers(totalPages) {
        const container = document.getElementById('page-numbers');
        if (!container) return;

        container.innerHTML = '';

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                i === this.currentPage 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
            }`;
            button.textContent = i;
            button.addEventListener('click', () => this.goToPage(i));
            container.appendChild(button);
        }
    }

    /**
     * Navega a una página específica
     */
    goToPage(page) {
        const { totalPages } = this.getPaginatedNotifications();
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderPage();
        
        // Scroll hacia arriba
        const mainElement = document.querySelector('main');
        if (mainElement) {
            mainElement.scrollTop = 0;
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * Funciones del dropdown (compatibilidad)
     */
    async openDropdown() {
        // Implementación simplificada para el dropdown
        const dropdown = document.getElementById('notifications-dropdown');
        const container = document.getElementById('dropdown-notifications-container');
        const loading = document.getElementById('notifications-loading');
        const empty = document.getElementById('notifications-empty');

        if (!dropdown) return;

        dropdown.classList.remove('hidden');
        
        if (loading) loading.classList.remove('hidden');
        if (empty) empty.classList.add('hidden');
        if (container) container.innerHTML = '';

        try {
            const unreadNotifications = [
                ...this.reminderNotifications.filter(n => !n.isRead),
                ...this.notifications.filter(n => !n.isRead)
            ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

            if (loading) loading.classList.add('hidden');

            if (unreadNotifications.length === 0) {
                if (empty) empty.classList.remove('hidden');
                return;
            }

            if (container) {
                unreadNotifications.forEach(notification => {
                    const element = this.createDropdownNotificationElement(notification);
                    container.appendChild(element);
                });
            }
        } catch (error) {
            console.error('Error en dropdown:', error);
            if (loading) loading.classList.add('hidden');
        }
    }

    /**
     * Crea elemento de notificación para dropdown
     */
    createDropdownNotificationElement(notification) {
        const div = document.createElement('div');
        div.className = `p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
            !notification.isRead ? 'bg-blue-50' : ''
        }`;

        const { icon, bgColor } = this.getNotificationStyle(notification);

        div.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="${bgColor} p-1.5 rounded-full flex-shrink-0">
                    ${icon}
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 ${!notification.isRead ? 'font-semibold' : ''} line-clamp-2">
                        ${notification.message}
                    </p>
                    <p class="text-xs text-gray-500 mt-1">${this.formatTimeAgo(notification.createdAt)}</p>
                </div>
                ${!notification.isRead ? `
                    <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                ` : ''}
            </div>
        `;

        div.addEventListener('click', async () => {
            if (!notification.isRead) {
                await this.markAsRead(notification.id);
            }
        });

        return div;
    }

    /**
     * Cierra el dropdown
     */
    closeDropdown() {
        const dropdown = document.getElementById('notifications-dropdown');
        if (dropdown) dropdown.classList.add('hidden');
    }

    /**
     * Actualiza el badge del dropdown
     */
    updateDropdownBadge() {
        const badge = document.getElementById('notification-badge');
        if (!badge) return;

        const unreadCount = [
            ...this.reminderNotifications.filter(n => !n.isRead),
            ...this.notifications.filter(n => !n.isRead)
        ].length;

        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount.toString();
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    /**
     * 🔧 FIX: Muestra un mensaje de error mejorado
     */
    showError(message) {
        const loadingElement = document.getElementById('notifications-page-loading');
        const emptyElement = document.getElementById('notifications-page-empty');
        
        if (loadingElement) loadingElement.classList.add('hidden');
        if (emptyElement) {
            emptyElement.classList.remove('hidden');
            emptyElement.innerHTML = `
                <div class="text-center py-12">
                    <svg class="w-16 h-16 text-red-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">Error</h3>
                    <p class="text-gray-500 mb-4">${message}</p>
                    <div class="space-x-3">
                        <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            Intentar nuevamente
                        </button>
                        <button onclick="window.history.back()" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                            Volver
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 🔧 NEW: Método para refrescar las notificaciones
     */
    async refresh() {
        try {
            await this.loadNotifications();
            try {
                await this.checkUpcomingReservations();
            } catch (reminderError) {
                console.warn('Error al cargar recordatorios (no crítico):', reminderError);
            }
            this.renderPage();
        } catch (error) {
            console.error('Error al actualizar notificaciones:', error);
            this.showError('Error al actualizar notificaciones');
        }
    }
}

// Inicializar la página cuando se carga el DOM
document.addEventListener('DOMContentLoaded', () => {
    window.notificationsPage = new NotificationsPage();
});

// 🔧 NEW: Actualizar notificaciones cada 30 segundos
setInterval(() => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (window.notificationsPage && token) {
        window.notificationsPage.refresh();
    }
}, 30000);