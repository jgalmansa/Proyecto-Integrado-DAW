// reservations.js
class ReservationsManager {
    constructor() {
        this.tableBody = document.getElementById('reservations-table-body');
        this.mobileList = document.getElementById('reservations-mobile-list');
        this.init();
    }

    init() {
        this.loadReservations();
        // Recargar cada 30 segundos para mantener los datos actualizados
        setInterval(() => this.loadReservations(), 30000);
    }

    async loadReservations() {
        try {
            console.log('Loading reservations...');
            console.log('Auth token:', this.getAuthToken());

            const response = await fetch('/api/reservations/my', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Raw API response:', data);

            // Filtrar solo las reservas futuras y del día actual
            const reservationsArray = data.reservations || data.data || data;
            console.log('Reservations array:', reservationsArray);

            const upcomingReservations = this.filterUpcomingReservations(reservationsArray);
            console.log('Upcoming reservations:', upcomingReservations);

            this.renderReservations(upcomingReservations);
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.showError('Error al cargar las reservas');
        }
    }

    filterUpcomingReservations(reservations) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return reservations.filter(reservation => {
            const reservationDate = new Date(reservation.startTime);
            const reservationDay = new Date(reservationDate.getFullYear(), reservationDate.getMonth(), reservationDate.getDate());

            // Incluir reservas de hoy que no han terminado y reservas futuras
            if (reservationDay.getTime() === today.getTime()) {
                // Para reservas de hoy, verificar que no hayan terminado
                return new Date(reservation.endTime) > now;
            } else {
                // Para otras fechas, incluir solo las futuras
                return reservationDay > today;
            }
        }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    }

    renderReservations(reservations) {
        if (!reservations || reservations.length === 0) {
            this.showEmptyState();
            return;
        }

        // Limpiar contenido actual
        this.tableBody.innerHTML = '';
        this.mobileList.innerHTML = '';

        // Mostrar solo las 3 reservas más próximas
        const limitedReservations = reservations.slice(0, 3);

        limitedReservations.forEach(reservation => {
            // Renderizar fila de tabla (desktop)
            const tableRow = this.createTableRow(reservation);
            this.tableBody.appendChild(tableRow);

            // Renderizar card (mobile)
            const mobileCard = this.createMobileCard(reservation);
            this.mobileList.appendChild(mobileCard);
        });
    }

    createTableRow(reservation) {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';

        const statusInfo = this.getStatusInfo(reservation.status);
        const userInitials = this.getInitials(reservation.userName || 'Usuario');
        const userName = reservation.userName || 'Usuario';
        const workspaceName = reservation.workspaceName || 'Espacio';
        const workspaceCapacity = reservation.workspaceCapacity || 'N/A';

        row.innerHTML = `
            <td class="py-4 px-4">
                <div>
                    <p class="font-medium text-gray-900">${workspaceName}</p>
                    <p class="text-sm text-gray-600">Capacidad: ${workspaceCapacity} personas</p>
                </div>
            </td>
            <td class="py-4 px-4 text-gray-900">${this.formatDate(reservation.startTime)}</td>
            <td class="py-4 px-4 text-gray-900">${this.formatTimeRange(reservation.startTime, reservation.endTime)}</td>
            <td class="py-4 px-4 text-gray-900">${reservation.numberOfPeople}</td>
            <td class="py-4 px-4">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-medium">${userInitials}</span>
                    </div>
                    <span class="text-gray-900">${userName}</span>
                </div>
            </td>
            <td class="py-4 px-4">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">
                    ${statusInfo.text}
                </span>
            </td>
            <td class="py-4 px-4">
                <div class="flex items-center space-x-2">
                    ${this.canEdit(reservation) ? `<button onclick="reservationsManager.editReservation(${reservation.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>` : ''}
                    ${this.canCancel(reservation) ? `<button onclick="reservationsManager.cancelReservation(${reservation.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">Cancelar</button>` : ''}
                </div>
            </td>
        `;

        return row;
    }

    createMobileCard(reservation) {
        const card = document.createElement('div');
        card.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';

        const statusInfo = this.getStatusInfo(reservation.status); 
        const userInitials = this.getInitials(reservation.userName || 'Usuario');
        const userName = reservation.userName || 'Usuario';
        const workspaceName = reservation.workspaceName || 'Espacio';
        const workspaceCapacity = reservation.workspaceCapacity || 'N/A';

        card.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${workspaceName}</h4>
                    <p class="text-sm text-gray-600">Capacidad: ${workspaceCapacity} personas</p>
                </div>
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}">
                    ${statusInfo.text}
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div>
                    <p class="text-gray-600">Fecha</p>
                    <p class="font-medium text-gray-900">${this.formatDate(reservation.startTime)}</p>
                </div>
                <div>
                    <p class="text-gray-600">Hora</p>
                    <p class="font-medium text-gray-900">${this.formatTimeRange(reservation.startTime, reservation.endTime)}</p>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-medium">${userInitials}</span>
                    </div>
                    <span class="text-sm text-gray-900">${userName}</span>
                    <span class="text-xs text-gray-500">(${reservation.numberOfPeople} personas)</span>
                </div>
                
                <div class="flex items-center space-x-2">
                    ${this.canEdit(reservation) ? `<button onclick="reservationsManager.editReservation(${reservation.id})" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>` : ''}
                    ${this.canCancel(reservation) ? `<button onclick="reservationsManager.cancelReservation(${reservation.id})" class="text-red-600 hover:text-red-800 text-sm font-medium">Cancelar</button>` : ''}
                </div>
            </div>
        `;

        return card;
    }

    showEmptyState() {
        this.tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 px-4 text-center text-gray-500">
                    <div class="flex flex-col items-center space-y-2">
                        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <p class="text-sm">No hay reservas próximas</p>
                    </div>
                </td>
            </tr>
        `;

        this.mobileList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p class="text-sm text-center">No hay reservas próximas</p>
            </div>
        `;
    }

    showError(message) {
        const errorHtml = `
            <tr>
                <td colspan="7" class="py-8 px-4 text-center text-red-500">
                    <div class="flex flex-col items-center space-y-2">
                        <svg class="w-12 h-12 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <p class="text-sm">${message}</p>
                        <button onclick="reservationsManager.loadReservations()" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Reintentar</button>
                    </div>
                </td>
            </tr>
        `;

        this.tableBody.innerHTML = errorHtml;
        this.mobileList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-red-500">
                <svg class="w-16 h-16 text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-sm text-center">${message}</p>
                <button onclick="reservationsManager.loadReservations()" class="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2">Reintentar</button>
            </div>
        `;
    }

    async editReservation(reservationId) {
        // Esta función se puede personalizar según tu modal de edición
        console.log('Edit reservation:', reservationId);
        // Aquí podrías abrir un modal de edición
        // editReservationModal.open(reservationId);
    }

    async cancelReservation(reservationId) {
        if (!confirm('¿Estás seguro de que quieres cancelar esta reserva?')) {
            return;
        }

        try {
            const response = await fetch(`/api/reservations/${reservationId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Recargar las reservas después de cancelar
            this.loadReservations();

            // Mostrar mensaje de éxito (opcional)
            this.showSuccessMessage('Reserva cancelada exitosamente');
        } catch (error) {
            console.error('Error canceling reservation:', error);
            alert('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
        }
    }

    showSuccessMessage(message) {
        // Crear un toast o notificación simple
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Funciones auxiliares
    getStatusInfo(status) {
        const statusMap = {
            'pending': {
                class: 'bg-yellow-100 text-yellow-800',
                text: 'Pendiente'
            },
            'confirmed': {
                class: 'bg-green-100 text-green-800',
                text: 'Confirmada'
            },
            'cancelled': {
                class: 'bg-red-100 text-red-800',
                text: 'Cancelada'
            }
        };

        return statusMap[status] || statusMap.pending;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }

    formatTimeRange(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        return `${start.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })} - ${end.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    canEdit(reservation) {
        // Solo permitir editar reservas pendientes o confirmadas
        // y que no hayan empezado todavía
        const now = new Date();
        const startTime = new Date(reservation.startTime);

        return (reservation.status === 'pending' || reservation.status === 'confirmed')
            && startTime > now;
    }

    canCancel(reservation) {
        // Solo permitir cancelar reservas que no estén ya canceladas
        // y que no hayan empezado todavía
        const now = new Date();
        const startTime = new Date(reservation.startTime);

        return reservation.status !== 'cancelled' && startTime > now;
    }

    getCurrentUser() {
        // Obtener información del usuario actual
        // Puedes almacenar esto en localStorage cuando el usuario se logea
        const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        // Si no hay usuario almacenado, devolver un usuario por defecto
        return { name: 'Usuario' };
    }

    getAuthToken() {
        // Obtener el token de autenticación
        // Esto depende de cómo manejes la autenticación en tu app
        const token = localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('token') ||
            document.cookie.split('; ')
                .find(row => row.startsWith('authToken='))?.split('=')[1] ||
            document.cookie.split('; ')
                .find(row => row.startsWith('token='))?.split('=')[1];

        console.log('Found token:', token ? 'Token exists' : 'No token found');
        return token;
    }
}

// Inicializar el manager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    window.reservationsManager = new ReservationsManager();
});