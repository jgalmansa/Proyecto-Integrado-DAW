// Configuración de la API
const API_BASE_URL = '/api';

// Función para hacer peticiones autenticadas
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            credentials: 'include' // Para incluir cookies de sesión
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
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
    try {
        const userInfo = await apiRequest('/users/me');
        return userInfo.isAdmin;
    } catch (error) {
        console.error('Error checking admin status:', error);
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
        const reservations = await apiRequest(`/reservations?date=${todayStr}`);
        
        // Calcular espacios disponibles ahora
        const now = new Date();
        const currentHour = now.getHours();
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
        
        // Reservas de hoy (todas)
        const todayReservations = await apiRequest(`/reservations?date=${todayStr}`);
        
        // Mis reservas
        const myReservations = await apiRequest('/reservations/my');
        
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
        const activeUsers = users.filter(u => u.isActive !== false).length;
        
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


/**
 * Loads and updates statistics for the dashboard.
 * 
 * This function concurrently fetches data and updates the statistics
 * for workspaces, reservations, and users on the dashboard. It handles
 * any errors that occur during the fetching process by logging them to
 * the console.
 */

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

// Cargar estadísticas al cargar la página
document.addEventListener('DOMContentLoaded', loadDashboardStats);

// Actualizar estadísticas cada 5 minutos
setInterval(loadDashboardStats, 5 * 60 * 1000);