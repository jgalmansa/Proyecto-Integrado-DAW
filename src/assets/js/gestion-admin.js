/**
 * GESTIÓN DE ADMINISTRACIÓN - VERSIÓN AUTOSUFICIENTE
 * No depende de funciones externas para evitar conflictos
 */

// ============================================================================
// FUNCIONES LOCALES PARA EVITAR CONFLICTOS
// ============================================================================

/**
 * Función local para obtener el token (no interfiere con otras)
 */
function getAuthTokenLocal() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Función local para verificar autenticación
 */
function checkAuthLocal() {
    const token = getAuthTokenLocal();
    if (!token) {
        console.log('❌ No hay token, redirigiendo al login...');
        window.location.href = '/login';
        return false;
    }
    return true;
}

/**
 * Función local para hacer peticiones API (solo para este módulo)
 */
async function apiRequestLocal(endpoint, options = {}) {
    const API_BASE_URL = '/api';
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const token = getAuthTokenLocal();
    
    if (!token) {
        console.error('❌ No hay token de autenticación');
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            }
        });
        
        if (response.status === 401 || response.status === 403) {
            console.error('❌ Token inválido o expirado');
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            window.location.href = '/login';
            return;
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${fullUrl}`);
        }
        
        return await response.json();
        
    } catch (error) {
        console.error(`💥 Petición falló para ${fullUrl}:`, error);
        throw error;
    }
}

// ============================================================================
// FUNCIONES PRINCIPALES DE GESTIÓN DE ADMIN
// ============================================================================

/**
 * Solo los usuarios administradores podrán ver las opciones de administración.
 * Usa funciones locales para evitar dependencias externas.
 * 
 * @returns {Promise<void>}
 */
async function toggleAdminSection() {
    console.log('🔍 [ADMIN] Iniciando toggleAdminSection...');
    
    try {
        const adminSection = document.getElementById('admin-section');
        console.log('🔍 [ADMIN] Admin section encontrado:', !!adminSection);
        
        if (!adminSection) {
            console.warn('⚠️ No se encontró el elemento admin-section en el DOM');
            return;
        }

        console.log('🔍 [ADMIN] Haciendo petición a /users/me...');
        
        // Usar función local para evitar dependencias
        const userData = await apiRequestLocal('/users/me');
        console.log('🔍 [ADMIN] Respuesta usuario:', userData);

        // Verificar rol - adaptarse a diferentes estructuras de respuesta
        const isAdmin = userData && (userData.role === 'admin' || userData.isAdmin === true);
        
        if (!isAdmin) {
            console.log('👤 [ADMIN] Usuario sin permisos de admin, ocultando sección');
            adminSection.classList.add('hidden');
            adminSection.classList.remove('block');
            return;
        }

        // Mostrar sección si es admin
        console.log('👑 [ADMIN] Usuario admin detectado, mostrando sección');
        adminSection.classList.remove('hidden');
        adminSection.classList.add('block');

    } catch (error) {
        console.error('❌ Error al verificar permisos de administrador:', error);
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.classList.add('hidden');
            adminSection.classList.remove('block');
        }
    }
}

/**
 * Inicializa la gestión de administración
 */
async function initializeAdminManagement() {
    console.log('🚀 [ADMIN] Inicializando gestión de administración...');
    
    // Verificar autenticación con función local
    if (!checkAuthLocal()) {
        return;
    }
    
    // Gestionar sección de admin
    await toggleAdminSection();
}

// ============================================================================
// FUNCIONES PÚBLICAS PARA USO EXTERNO (OPCIONALES)
// ============================================================================

/**
 * Función pública para verificar si el usuario actual es admin
 * Puede ser llamada desde otros scripts sin conflictos
 * @returns {Promise<boolean>}
 */
async function isCurrentUserAdmin() {
    try {
        const userData = await apiRequestLocal('/users/me');
        return userData && (userData.role === 'admin' || userData.isAdmin === true);
    } catch (error) {
        console.error('❌ [ADMIN] Error verificando si es admin:', error);
        return false;
    }
}

/**
 * Muestra u oculta elementos basado en permisos de admin
 * @param {string} elementId - ID del elemento a mostrar/ocultar
 */
async function toggleAdminElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`⚠️ [ADMIN] Elemento ${elementId} no encontrado`);
        return;
    }
    
    try {
        const isAdmin = await isCurrentUserAdmin();
        
        if (isAdmin) {
            element.classList.remove('hidden');
            element.classList.add('block');
        } else {
            element.classList.add('hidden');
            element.classList.remove('block');
        }
    } catch (error) {
        console.error(`❌ [ADMIN] Error toggleando elemento ${elementId}:`, error);
        // En caso de error, ocultar por seguridad
        element.classList.add('hidden');
        element.classList.remove('block');
    }
}

// ============================================================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================================================

/**
 * Inicialización automática que no depende de funciones externas
 */
(function initAdminManagement() {
    console.log('🚀 [ADMIN] Auto-inicializando gestión de administración...');
    console.log('🔍 [ADMIN] Estado del DOM:', document.readyState);
    console.log('🔍 [ADMIN] URL actual:', window.location.pathname);
    
    function executeInitialization() {
        console.log('⚡ [ADMIN] Ejecutando inicialización...');
        initializeAdminManagement().catch(error => {
            console.error('❌ [ADMIN] Error en inicialización:', error);
        });
    }
    
    if (document.readyState === 'loading') {
        console.log('⏳ [ADMIN] DOM cargando, esperando DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', executeInitialization);
    } else {
        console.log('✅ [ADMIN] DOM ya cargado, ejecutando inmediatamente...');
        // Pequeño delay para asegurar que el DOM esté completamente listo
        setTimeout(executeInitialization, 100);
    }
})();

console.log('✅ [ADMIN] Script de gestión de administración cargado');