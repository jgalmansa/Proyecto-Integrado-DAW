// Configuración de la API
const API_BASE_URL = '/api';

// Función para obtener el token del localStorage o sessionStorage
function getAuthToken() {
    // Primero intentar localStorage, luego sessionStorage
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Función para hacer peticiones autenticadas - VERSION CORREGIDA
async function apiRequest(endpoint, options = {}) {
    const fullUrl = `${API_BASE_URL}${endpoint}`;
    const token = getAuthToken();
    
    console.log('🌐 Intentando petición a:', fullUrl);
    console.log('🔑 Token disponible:', token ? 'Sí' : 'No');
    
    // Si no hay token, redirigir al login
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
                'Authorization': `Bearer ${token}`, // 🔑 CAMBIO CLAVE: Bearer token en lugar de cookies
                ...options.headers,
            }
        });
        
        console.log(`📡 Respuesta de ${fullUrl}:`, response.status, response.statusText);
        
        // Si el token es inválido, redirigir al login
        if (response.status === 401 || response.status === 403) {
            console.error('❌ Token inválido o expirado');
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            window.location.href = '/login';
            return;
        }
        
        if (!response.ok) {
            console.error(`❌ Error ${response.status} para ${fullUrl}`);
            throw new Error(`HTTP error! status: ${response.status} for ${fullUrl}`);
        }
        
        const data = await response.json();
        console.log(`✅ Datos recibidos de ${fullUrl}:`, data);
        return data;
        
    } catch (error) {
        console.error(`💥 Petición falló para ${fullUrl}:`, error);
        throw error;
    }
}

// Función para formatear números
function formatNumber(num) {
    return new Intl.NumberFormat('es-ES').format(num);
}

// Función para obtener el tiempo hasta la próxima reserva
function getTimeUntilNext(reservations) {
    if (!reservations || reservations.length === 0) return 'ninguna próxima';
    
    const now = new Date();
    const upcoming = reservations
        .filter(r => new Date(r.startTime || r.start_time) > now)
        .sort((a, b) => new Date(a.startTime || a.start_time) - new Date(b.startTime || b.start_time));
    
    if (upcoming.length === 0) return 'ninguna próxima';
    
    const nextReservation = upcoming[0];
    const timeDiff = new Date(nextReservation.startTime || nextReservation.start_time) - now;
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
        return `en ${minutes} min`;
    } else if (hours < 24) {
        return `en ${hours}h ${minutes}min`;
    } else {
        const days = Math.floor(hours / 24);
        return `en ${days} día${days > 1 ? 's' : ''}`;
    }
}

// Función para verificar si es administrador - CORREGIDA
async function isAdmin() {
    console.log('🔐 Verificando si es administrador...');
    try {
        const userInfo = await apiRequest('/users/me'); // 🔧 Ahora usando la ruta correcta
        console.log('👤 Info del usuario:', userInfo);
        return userInfo.isAdmin;
    } catch (error) {
        console.error('❌ Error checking admin status:', error);
        return false;
    }
}

// Función para cargar estadísticas de espacios de trabajo
async function loadWorkspaceStats() {
    try {
        const workspacesResponse = await apiRequest('/workspaces');
        // Extraemos el array real de espacios
        const workspaceList = Array.isArray(workspacesResponse)
            ? workspacesResponse
            : Array.isArray(workspacesResponse.data)
                ? workspacesResponse.data
                : Array.isArray(workspacesResponse.workspaces)
                    ? workspacesResponse.workspaces
                    : [];

        const totalWorkspaces = workspaceList.length;

        // Filtramos los que están marcados como disponibles en la DB
        const physicallyAvailable = workspaceList.filter(ws => ws.is_available);
        let availableCount = physicallyAvailable.length;

        // Consultamos las reservas activas en este momento
        try {
            // Por esta (temporalmente para debug):
            console.log('URL completa que se va a llamar:', '/reservations/active-now');
            const activeReservations = await apiRequest('/reservations/active-now');
            // const activeReservations = await apiRequest('/reservations/active-now');
            console.log('Reservas activas recibidas:', activeReservations);

            // Creamos un set con los workspace_id ocupados ahora mismo
            const occupiedWorkspaceIds = new Set(
                activeReservations.map(r => r.workspace_id)
            );
            console.log('IDs de espacios ocupados:', Array.from(occupiedWorkspaceIds));

            // Filtramos los disponibles físicamente que NO están ocupados ahora
            const currentlyAvailable = physicallyAvailable.filter(ws => !occupiedWorkspaceIds.has(ws.id));
            availableCount = currentlyAvailable.length;
            console.log('Espacios físicamente disponibles:', physicallyAvailable.map(ws => ws.id));
            console.log('Espacios disponibles después de filtrar ocupados:', currentlyAvailable.map(ws => ws.id));

            availableCount = currentlyAvailable.length;

        } catch (reservationError) {
            console.log('No se pudieron cargar reservas activas para calcular disponibilidad:', reservationError);
        }
        // Actualizar DOM
        document.getElementById('total-workspaces').textContent     = formatNumber(totalWorkspaces);
        document.getElementById('available-workspaces').textContent = `${formatNumber(availableCount)}`;

    } catch (error) {
        console.error('Error loading workspace stats:', error);
        document.getElementById('total-workspaces').textContent     = '--';
        document.getElementById('available-workspaces').textContent = 'Error al cargar';
    }
}




// Función para cargar estadísticas de reservas
async function loadReservationStats() {
    try {
        const { reservations: myReservations } = await apiRequest('/reservations/user');
        
        const now = new Date();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Filtrar reservas de hoy
        const todayReservations = myReservations.filter(r => {
            const startTime = new Date(r.startTime || r.start_time);
            return startTime >= today && startTime < tomorrow;
        });
        
        // Filtrar reservas activas del usuario
        const activeReservations = myReservations.filter(r => {
            const startTime = new Date(r.startTime || r.start_time);
            const endTime = new Date(r.endTime || r.end_time);
            return now >= startTime && now <= endTime;
        });
        
        // Próximas reservas del usuario
        const upcomingReservations = myReservations.filter(r => {
            const startTime = new Date(r.startTime || r.start_time);
            return startTime > now;
        });
        
        const timeUntilNext = getTimeUntilNext(upcomingReservations);
        
        // Actualizar DOM - Por ahora mostramos las reservas del usuario
        // En un futuro podrías crear una ruta para obtener todas las reservas del día
        document.getElementById('today-reservations').textContent = formatNumber(todayReservations.length);
        document.getElementById('upcoming-reservations').textContent = `${formatNumber(upcomingReservations.length)} próximas`;
        document.getElementById('next-reservation-time').textContent = timeUntilNext;
        
        document.getElementById('my-reservations').textContent = formatNumber(myReservations.length);
        
        if (activeReservations.length > 0) {
            document.getElementById('active-reservations-status').className = 'text-green-600 font-medium';
            document.getElementById('active-reservations-status').textContent = `${activeReservations.length} activa${activeReservations.length > 1 ? 's' : ''}`;
            document.getElementById('active-reservations-text').textContent = 'ahora';
        } else {
            document.getElementById('active-reservations-status').className = 'text-gray-600 font-medium';
            document.getElementById('active-reservations-status').textContent = 'Ninguna activa';
            document.getElementById('active-reservations-text').textContent = 'ahora';
        }
        
    } catch (error) {
        console.error('Error loading reservation stats:', error);
        document.getElementById('today-reservations').textContent = '--';
        document.getElementById('my-reservations').textContent = '--';
        document.getElementById('upcoming-reservations').textContent = '--';
        document.getElementById('next-reservation-time').textContent = 'Error';
    }
}

async function loadUserStats() {
    try {
        // Obtener estadísticas del nuevo endpoint
        const response = await apiRequest('/users/stats');
        
        // La respuesta ahora tiene la estructura: { success: true, data: { active: 142, total: 150, ... } }
        const stats = response.data;
        const activeUsers = stats.active;
        
        // Calcular crecimiento real basado en registros recientes vs total
        // O mantener simulado si prefieres
        let growth;
        if (stats.recentRegistrations && stats.total > 0) {
            // Crecimiento real basado en registros de últimos 30 días
            growth = Math.round((stats.recentRegistrations / stats.total) * 100);
        } else {
            // Crecimiento simulado como backup
            growth = Math.floor(Math.random() * 20) - 5; // Entre -5% y +15%
        }
        
        const growthText = growth >= 0 ? `+${growth}%` : `${growth}%`;
        const growthClass = growth >= 0 ? 'text-green-600' : 'text-red-600';
        
        // Actualizar DOM
        document.getElementById('active-users').textContent = formatNumber(activeUsers);
        document.getElementById('users-growth').textContent = growthText;
        document.getElementById('users-growth').className = `${growthClass} font-medium`;
        
    } catch (error) {
        console.error('Error loading user stats:', error);
        
        // Manejo de errores mejorado
        const activeUsersElement = document.getElementById('active-users');
        const usersGrowthElement = document.getElementById('users-growth');
        
        if (activeUsersElement) {
            activeUsersElement.textContent = '--';
        }
        
        if (usersGrowthElement) {
            usersGrowthElement.textContent = '--';
            usersGrowthElement.className = 'text-gray-500 font-medium';
        }
    }
}

// Función principal para cargar todas las estadísticas
async function loadDashboardStats() {
    try {
        await Promise.all([
            loadWorkspaceStats(),
            loadReservationStats(),
            loadUserStats()
        ]);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Función para verificar autenticación al cargar la página
function checkAuth() {
    const token = getAuthToken();
    if (!token) {
        console.log('❌ No hay token, redirigiendo al login...');
        window.location.href = '/login';
        return false;
    }
    return true;
}

// Cargar estadísticas al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    if (checkAuth()) {
        loadDashboardStats();
    }
});

// Actualizar estadísticas cada 5 minutos
setInterval(() => {
    if (checkAuth()) {
        loadDashboardStats();
    }
}, 5 * 60 * 1000);