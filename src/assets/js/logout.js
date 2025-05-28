
/**
 * Sistema de gestión de logout
 * Maneja el cierre de sesión completo del usuario
 */

class LogoutManager {
    constructor() {
        this.apiBase = '/api/users';
        this.init();
    }

    /**
     * Inicializa el sistema de logout
     */
    init() {
        this.setupLogoutButton();
    }

    /**
     * Función unificada para obtener token (consistente con notifications.js)
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    /**
     * Configura el botón de logout
     */
    setupLogoutButton() {
        // Buscar el botón de logout por el texto "Cerrar Sesión"
        const logoutButtons = document.querySelectorAll('a[href="#"]');
        let logoutButton = null;

        logoutButtons.forEach(button => {
            if (button.textContent.includes('Cerrar Sesión')) {
                logoutButton = button;
            }
        });

        if (logoutButton) {
            //console.log('✅ Botón de logout encontrado');
            
            // Remover href="#" para evitar scroll
            logoutButton.removeAttribute('href');
            logoutButton.style.cursor = 'pointer';
            
            // Agregar event listener
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        } else {
            console.warn('⚠️ Botón de logout no encontrado');
        }
    }

    /**
     * Maneja el proceso completo de logout
     */
    async handleLogout() {
        try {
            console.log('🔄 Iniciando proceso de logout...');

            // Mostrar loading en el botón
            this.setLogoutButtonLoading(true);

            // Intentar hacer logout en el servidor
            const serverLogoutSuccess = await this.logoutFromServer();

            if (serverLogoutSuccess) {
                console.log('✅ Logout del servidor exitoso');
            } else {
                console.warn('⚠️ Logout del servidor falló, continuando con limpieza local');
            }

            // Limpiar datos locales (siempre, aunque falle el servidor)
            this.clearLocalData();

            // Mostrar mensaje de confirmación
            this.showLogoutMessage();

            // Redirigir al login después de un breve delay
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);

        } catch (error) {
            console.error('❌ Error durante logout:', error);
            
            // Incluso si hay error, limpiar datos locales y redirigir
            this.clearLocalData();
            
            // Mostrar mensaje de error pero continuar con logout
            this.showLogoutMessage('Sesión cerrada (con advertencias)');
            
            setTimeout(() => {
                window.location.href = '/login';
            }, 2000);
        }
    }

    /**
     * Realiza logout en el servidor
     */
    async logoutFromServer() {
        try {
            const token = this.getAuthToken();
            
            if (!token) {
                console.warn('⚠️ No hay token para enviar al servidor');
                return false;
            }

            const response = await fetch(`${this.apiBase}/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success;
            } else {
                console.error('❌ Error del servidor:', response.status, response.statusText);
                return false;
            }

        } catch (error) {
            console.error('❌ Error de red durante logout:', error);
            return false;
        }
    }

    /**
     * Limpia todos los datos locales del usuario
     */
    clearLocalData() {
        console.log('🧹 Limpiando datos locales...');

        // Limpiar tokens de autenticación
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');

        // Limpiar datos de usuario si existen
        localStorage.removeItem('userData');
        sessionStorage.removeItem('userData');

        // Limpiar cualquier otro dato relacionado con la sesión
        const keysToRemove = [];
        
        // Buscar claves que puedan contener datos de sesión
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('user') || key.includes('session') || key.includes('auth'))) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log('🗑️ Removido:', key);
        });

        // También limpiar sessionStorage
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
        });

        console.log('✅ Datos locales limpiados');
    }

    /**
     * Establece el estado de loading en el botón de logout
     */
    setLogoutButtonLoading(isLoading) {
        const logoutButtons = document.querySelectorAll('a');
        let logoutButton = null;

        logoutButtons.forEach(button => {
            if (button.textContent.includes('Cerrar Sesión')) {
                logoutButton = button;
            }
        });

        if (!logoutButton) return;

        if (isLoading) {
            logoutButton.style.opacity = '0.7';
            logoutButton.style.pointerEvents = 'none';
            
            const span = logoutButton.querySelector('span');
            if (span) {
                span.textContent = 'Cerrando sesión...';
            }
        } else {
            logoutButton.style.opacity = '1';
            logoutButton.style.pointerEvents = 'auto';
            
            const span = logoutButton.querySelector('span');
            if (span) {
                span.textContent = 'Cerrar Sesión';
            }
        }
    }

    /**
     * Muestra mensaje de confirmación de logout
     */
    showLogoutMessage(customMessage = null) {
        // Crear overlay de mensaje
        const overlay = document.createElement('div');
        // CAMBIO: Usar bg-white/30 backdrop-blur-sm en lugar de bg-black bg-opacity-50
        overlay.className = 'fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50';
        overlay.style.zIndex = '9999';
    
        const messageBox = document.createElement('div');
        messageBox.className = 'bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl';
    
        messageBox.innerHTML = `
            <div class="mb-4">
                <svg class="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
                ${customMessage || 'Sesión cerrada exitosamente'}
            </h3>
            <p class="text-gray-600">Redirigiendo al login...</p>
            <div class="mt-4">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
        `;
    
        overlay.appendChild(messageBox);
        document.body.appendChild(overlay);
    
        // Remover el mensaje después de un tiempo
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 3000);
    }
    
    /**
     * Método público para logout (puede ser llamado desde otros scripts)
     */
    async performLogout() {
        await this.handleLogout();
    }
}

// Inicializar el gestor de logout cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar en páginas que tengan el botón de logout
    const hasLogoutButton = Array.from(document.querySelectorAll('a')).some(
        button => button.textContent.includes('Cerrar Sesión')
    );

    if (hasLogoutButton) {
        window.logoutManager = new LogoutManager();
        console.log('✅ Sistema de logout inicializado');
    }
});

// ==============================================
// FUNCIONES GLOBALES AUXILIARES
// ==============================================

/**
 * Función global para logout rápido (puede ser llamada desde consola o otros scripts)
 */
window.performLogout = async function() {
    if (window.logoutManager) {
        await window.logoutManager.performLogout();
    } else {
        // Fallback si no está inicializado el manager
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
    }
};

/**
 * Función para verificar si el usuario está logueado
 */
window.isUserLoggedIn = function() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
};

/**
 * Listener global para detectar tokens expirados
 */
window.addEventListener('beforeunload', () => {
    // Solo limpiar datos si realmente se está cerrando la ventana/pestaña
    // No hacer nada aquí para evitar logout accidental
});

