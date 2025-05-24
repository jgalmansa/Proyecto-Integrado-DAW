// Configuración de la API
const API_BASE_URL = '/api';

// Función para obtener el token del localStorage o sessionStorage
function getAuthToken() {
    // Primero intentar localStorage, luego sessionStorage
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

// Función para hacer peticiones autenticadas
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
    const now = new Date();
    const upcoming = reservations
        .filter(r => new Date(r.startTime) > now)
        .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    
    if (upcoming.length === 0) return 'ninguna próxima';
    
    const nextReservation = upcoming[0];
    const timeDiff = new Date(nextReservation.startTime) - now;
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

// Función para verificar si es administrador
async function isAdmin() {
    console.log('🔐 Verificando si es administrador...');
    try {
        const userInfo = await apiRequest('/users/me'); //
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
        const workspaces = await apiRequest('/workspaces');
        const totalWorkspaces = workspaces.length;
        
        // Obtener reservas de hoy para calcular disponibilidad
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const reservationsData = await apiRequest(`/reservations?date=${todayStr}`);
        const reservations = reservationsData.reservations || [];

        
        // Calcular espacios disponibles ahora
        const now = new Date();
        const activeReservations = reservations.filter(r => {
            const startTime = new Date(r.startTime);
            const endTime = new Date(r.endTime);
            return now >= startTime && now <= endTime;
        });
        
        const occupiedWorkspaces = new Set(activeReservations.map(r => r.workspaceId));
        const availableWorkspaces = totalWorkspaces - occupiedWorkspaces.size;
        
        // Actualizar DOM
        document.getElementById('total-workspaces').textContent = formatNumber(totalWorkspaces);
        document.getElementById('available-workspaces').textContent = `${formatNumber(availableWorkspaces)} disponibles`;
        
    } catch (error) {
        console.error('Error loading workspace stats:', error);
        document.getElementById('total-workspaces').textContent = '--';
        document.getElementById('available-workspaces').textContent = 'Error al cargar';
    }
}

// Función para cargar estadísticas de reservas
async function loadReservationStats() {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Reservas de hoy (todas) y mis reservas
        const todayReservationsData = await apiRequest(`/reservations?date=${todayStr}`);
        const todayReservations = todayReservationsData.reservations || [];

        const myReservationsData = await apiRequest('/reservations/my');
        const myReservations = myReservationsData.reservations || [];
        
        // Filtrar reservas activas del usuario
        const now = new Date();
        const activeReservations = myReservations.filter(r => {
            const startTime = new Date(r.startTime);
            const endTime = new Date(r.endTime);
            return now >= startTime && now <= endTime;
        });
        
        // Próximas reservas
        const upcomingCount = todayReservations.filter(r => new Date(r.startTime) > now).length;
        const timeUntilNext = getTimeUntilNext(todayReservations);
        
        // Actualizar DOM
        document.getElementById('today-reservations').textContent = formatNumber(todayReservations.length);
        document.getElementById('upcoming-reservations').textContent = `${formatNumber(upcomingCount)} próximas`;
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
    }
}

// Función para cargar estadísticas de usuarios (solo admin)
async function loadUserStats() {
    try {
        const isUserAdmin = await isAdmin();
        
        if (!isUserAdmin) {
            // Ocultar la tarjeta de usuarios si no es admin
            document.getElementById('admin-stats-card').style.display = 'none';
            return;
        }
        
        const users = await apiRequest('/users');
        const activeUsers = users.filter(u => u.is_active !== false).length;
        
        // Calcular crecimiento (simulado por ahora)
        const growth = Math.floor(Math.random() * 20) - 5; // Entre -5% y +15%
        const growthText = growth >= 0 ? `+${growth}%` : `${growth}%`;
        const growthClass = growth >= 0 ? 'text-green-600' : 'text-red-600';
        
        // Actualizar DOM
        document.getElementById('active-users').textContent = formatNumber(activeUsers);
        document.getElementById('users-growth').textContent = growthText;
        document.getElementById('users-growth').className = `${growthClass} font-medium`;
        
    } catch (error) {
        console.error('Error loading user stats:', error);
        document.getElementById('active-users').textContent = '--';
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