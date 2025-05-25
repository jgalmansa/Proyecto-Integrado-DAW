
/**
 * Sistema de gestión de notificaciones globales para administradores
 */

class AdminNotifications {
    constructor() {
        this.apiBase = '/api/notifications';
        this.isAdmin = false;
        this.stats = {};
        this.init();
    }

    /**
     * Función unificada para obtener token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Inicializa el sistema de administración
     */
    async init() {
        try {
            // Verificar si el usuario es admin
            await this.checkAdminStatus();
            
            if (this.isAdmin) {
                this.renderAdminPanel();
                this.setupEventListeners();
                await this.loadStats();
            }
        } catch (error) {
            console.error('Error al inicializar panel de admin:', error);
        }
    }

    /**
     * Verifica si el usuario es administrador
     */
    async checkAdminStatus() {
        try {
            const token = this.getAuthToken();
            if (!token) return false;

            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.isAdmin = userData.role === 'admin';
                return this.isAdmin;
            }
            
            return false;
        } catch (error) {
            console.error('Error verificando estado de admin:', error);
            return false;
        }
    }

    /**
     * Renderiza el panel de administración
     */
    renderAdminPanel() {
        const container = document.querySelector('main');
        if (!container) return;

        // Buscar si ya existe el panel
        let adminPanel = document.getElementById('admin-notifications-panel');
        
        if (!adminPanel) {
            // Crear el panel después del header existente
            const existingHeader = container.querySelector('div.mb-8');
            
            adminPanel = document.createElement('div');
            adminPanel.id = 'admin-notifications-panel';
            adminPanel.className = 'mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200';
            
            if (existingHeader) {
                existingHeader.insertAdjacentElement('afterend', adminPanel);
            } else {
                container.insertBefore(adminPanel, container.firstChild);
            }
        }

        adminPanel.innerHTML = `
            <!-- Header del Panel Admin -->
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center space-x-3">
                    <div class="bg-blue-600 p-2 rounded-lg">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-gray-900">Panel de Administrador</h2>
                        <p class="text-sm text-gray-600">Gestionar notificaciones globales</p>
                    </div>
                </div>
                <button id="toggle-admin-panel" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                </button>
            </div>

            <!-- Contenido del Panel -->
            <div id="admin-panel-content">
                <!-- Estadísticas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-blue-100 p-2 rounded-lg">
                                <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-gray-600">Usuarios Totales</p>
                                <p class="text-2xl font-bold text-gray-900" id="stat-total-users">-</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-green-100 p-2 rounded-lg">
                                <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5-5v5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-gray-600">Total Notificaciones</p>
                                <p class="text-2xl font-bold text-gray-900" id="stat-total-notifications">-</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-red-100 p-2 rounded-lg">
                                <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-gray-600">No Leídas</p>
                                <p class="text-2xl font-bold text-gray-900" id="stat-unread-notifications">-</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-4 rounded-lg border border-gray-200">
                        <div class="flex items-center">
                            <div class="bg-purple-100 p-2 rounded-lg">
                                <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm font-medium text-gray-600">Tasa de Lectura</p>
                                <p class="text-2xl font-bold text-gray-900" id="stat-read-rate">-%</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Formulario para crear notificación -->
                <div class="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Crear Notificación Global
                    </h3>

                    <form id="global-notification-form" class="space-y-4">
                        <div>
                            <label for="notification-type" class="block text-sm font-medium text-gray-700 mb-2">
                                Tipo de Notificación
                            </label>
                            <select id="notification-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="global">🚨 Global (Importante)</option>
                                <option value="personal">ℹ️ Informativa</option>
                            </select>
                        </div>

                        <div>
                            <label for="notification-message" class="block text-sm font-medium text-gray-700 mb-2">
                                Mensaje de la Notificación
                            </label>
                            <textarea 
                                id="notification-message" 
                                rows="4" 
                                maxlength="500"
                                placeholder="Escribe el mensaje de la notificación aquí..."
                                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            ></textarea>
                            <div class="flex justify-between mt-1">
                                <p class="text-xs text-gray-500">Máximo 500 caracteres</p>
                                <p class="text-xs text-gray-500">
                                    <span id="char-count">0</span>/500
                                </p>
                            </div>
                        </div>

                        <div class="flex items-center justify-between pt-4">
                            <div class="text-sm text-gray-600">
                                <span id="recipient-count">Se enviará a todos los usuarios activos</span>
                            </div>
                            <button 
                                type="submit" 
                                id="send-notification-btn"
                                class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors font-medium"
                            >
                                <span class="flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                    </svg>
                                    Enviar Notificación
                                </span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Toggle panel
        const toggleBtn = document.getElementById('toggle-admin-panel');
        const panelContent = document.getElementById('admin-panel-content');
        
        toggleBtn?.addEventListener('click', () => {
            const isHidden = panelContent.classList.contains('hidden');
            panelContent.classList.toggle('hidden');
            
            const svg = toggleBtn.querySelector('svg');
            if (svg) {
                svg.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });

        // Contador de caracteres
        const messageTextarea = document.getElementById('notification-message');
        const charCount = document.getElementById('char-count');
        
        messageTextarea?.addEventListener('input', (e) => {
            const count = e.target.value.length;
            charCount.textContent = count;
            
            // Cambiar color si se acerca al límite
            if (count > 450) {
                charCount.classList.add('text-red-500');
            } else if (count > 350) {
                charCount.classList.add('text-yellow-500');
            } else {
                charCount.classList.remove('text-red-500', 'text-yellow-500');
            }
        });

        // Formulario de notificación
        const form = document.getElementById('global-notification-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateNotification();
        });
    }

    /**
     * Carga las estadísticas
     */
    async loadStats() {
        try {
            const token = this.getAuthToken();
            if (!token) return;

            const response = await fetch(`${this.apiBase}/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.stats = data.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }

    /**
     * Actualiza la visualización de estadísticas
     */
    updateStatsDisplay() {
        document.getElementById('stat-total-users').textContent = this.stats.totalUsers || 0;
        document.getElementById('stat-total-notifications').textContent = this.stats.totalNotifications || 0;
        document.getElementById('stat-unread-notifications').textContent = this.stats.unreadNotifications || 0;
        document.getElementById('stat-read-rate').textContent = `${this.stats.readRate || 0}%`;

        // Actualizar contador de destinatarios
        const recipientCount = document.getElementById('recipient-count');
        if (recipientCount) {
            recipientCount.textContent = `Se enviará a ${this.stats.totalUsers || 0} usuarios activos`;
        }
    }

    /**
     * Maneja la creación de notificación global
     */
    async handleCreateNotification() {
        const messageInput = document.getElementById('notification-message');
        const typeInput = document.getElementById('notification-type');
        const submitBtn = document.getElementById('send-notification-btn');

        const message = messageInput.value.trim();
        const type = typeInput.value;

        // Validaciones
        if (!message) {
            this.showAlert('El mensaje es obligatorio', 'error');
            messageInput.focus();
            return;
        }

        if (message.length > 500) {
            this.showAlert('El mensaje no puede exceder los 500 caracteres', 'error');
            return;
        }

        try {
            // Mostrar loading
            this.setButtonLoading(submitBtn, true);

            const token = this.getAuthToken();
            const response = await fetch(`${this.apiBase}/global`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, type })
            });

            const data = await response.json();

            if (response.ok) {
                this.showAlert(
                    `Notificación enviada exitosamente a ${data.notification.recipients} usuarios`, 
                    'success'
                );
                
                // Limpiar formulario
                messageInput.value = '';
                typeInput.value = 'global';
                document.getElementById('char-count').textContent = '0';
                
                // Recargar estadísticas
                await this.loadStats();
                
                // Refresh notificaciones si existe el manager
                if (window.notificationsPage) {
                    await window.notificationsPage.refresh();
                }

            } else {
                this.showAlert(data.message || 'Error al enviar la notificación', 'error');
            }

        } catch (error) {
            console.error('Error creando notificación:', error);
            this.showAlert('Error de conexión. Inténtalo de nuevo.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    /**
     * Establece el estado de loading en un botón
     */
    setButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.innerHTML = `
                <span class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                </span>
            `;
        } else {
            button.disabled = false;
            button.innerHTML = `
                <span class="flex items-center">
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                    </svg>
                    Enviar Notificación
                </span>
            `;
        }
    }

    /**
     * Muestra una alerta
     */
    showAlert(message, type = 'info') {
        // Crear elemento de alerta
        const alertDiv = document.createElement('div');
        alertDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
            type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
            'bg-blue-100 border border-blue-400 text-blue-700'
        }`;

        const icon = type === 'success' ? 
            '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>' :
            type === 'error' ? 
            '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>' :
            '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>';

        alertDiv.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">${icon}</div>
                <div class="ml-3">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <div class="ml-4 flex-shrink-0">
                    <button class="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none" onclick="this.parentElement.parentElement.parentElement.remove()">
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(alertDiv);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    alertDiv.remove();
                }, 300);
            }
        }, 5000);
    }
}

// Inicializar cuando se carga la página de notificaciones
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en la página de notificaciones
    if (window.location.pathname.includes('/notifications') || 
        document.getElementById('notifications-page-list')) {
        window.adminNotifications = new AdminNotifications();
    }
});