class EditReservationModal {
    constructor() {
        console.log('🚀 Inicializando EditReservationModal...');

        this.modal = document.getElementById('edit-reservation-modal');
        console.log('🔍 Modal element found:', !!this.modal);

        if (!this.modal) {
            console.error('❌ No se encontró el elemento del modal con ID: edit-reservation-modal');
            console.log('🔍 Elementos disponibles con ID que contienen "modal":',
                Array.from(document.querySelectorAll('[id*="modal"]')).map(el => el.id));
            return;
        }

        this.currentReservation = null;
        this.selectedGuests = new Map();
        this.externalGuestsCount = 0;
        this.searchTimeout = null;
        this.availableSpaces = [];

        this.init();
        console.log('✅ EditReservationModal inicializado correctamente');
    }

    init() {
        try {
            this.setupEventListeners();
            console.log('✅ Event listeners configurados');
        } catch (error) {
            console.error('❌ Error configurando event listeners:', error);
        }
    }

    setupEventListeners() {
        // Verificar que todos los elementos existan antes de agregar listeners
        const elements = {
            'close-edit-modal': document.getElementById('close-edit-modal'),
            'edit-cancel-changes': document.getElementById('edit-cancel-changes'),
            'edit-check-availability': document.getElementById('edit-check-availability'),
            'edit-confirm-changes': document.getElementById('edit-confirm-changes'),
            'edit-guest-search': document.getElementById('edit-guest-search'),
            'edit-add-external-guest': document.getElementById('edit-add-external-guest'),
            'edit-reservation-date': document.getElementById('edit-reservation-date'),
            'edit-start-time': document.getElementById('edit-start-time'),
            'edit-end-time': document.getElementById('edit-end-time')
        };

        console.log('🔍 Verificando elementos del DOM:');
        Object.keys(elements).forEach(key => {
            console.log(`- ${key}:`, !!elements[key]);
            if (!elements[key]) {
                console.error(`❌ Elemento no encontrado: ${key}`);
            }
        });

        // Solo agregar listeners para elementos que existen
        if (elements['close-edit-modal']) {
            elements['close-edit-modal'].addEventListener('click', () => this.close());
        }

        if (elements['edit-cancel-changes']) {
            elements['edit-cancel-changes'].addEventListener('click', () => this.close());
        }

        // Cerrar al hacer clic fuera del modal
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }

        if (elements['edit-check-availability']) {
            elements['edit-check-availability'].addEventListener('click', () => this.checkAvailability());
        }

        if (elements['edit-confirm-changes']) {
            elements['edit-confirm-changes'].addEventListener('click', () => this.confirmChanges());
        }

        if (elements['edit-guest-search']) {
            elements['edit-guest-search'].addEventListener('input', (e) => this.handleGuestSearch(e));
            elements['edit-guest-search'].addEventListener('focus', () => this.showSearchResults());
        }

        if (elements['edit-add-external-guest']) {
            elements['edit-add-external-guest'].addEventListener('click', () => this.addExternalGuest());
        }

        // Validación de fechas y horarios
        if (elements['edit-reservation-date']) {
            elements['edit-reservation-date'].addEventListener('change', () => this.validateDateTime());
        }

        if (elements['edit-start-time']) {
            elements['edit-start-time'].addEventListener('change', () => this.validateDateTime());
        }

        if (elements['edit-end-time']) {
            elements['edit-end-time'].addEventListener('change', () => this.validateDateTime());
        }

        // Remover el botón de prueba en producción
        const testBtn = document.getElementById('test-edit-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.open({
                    id: 1,
                    workspaceName: "Sala de Reuniones A",
                    workspaceCapacity: 8,
                    startTime: "2024-12-20T10:00:00Z",
                    endTime: "2024-12-20T12:00:00Z",
                    numberOfPeople: 4,
                    guests: [
                        { id: 1, name: "Juan Pérez", email: "juan@example.com" },
                        { id: 2, name: "María García", email: "maria@example.com" }
                    ],
                    externalGuests: 1
                });
            });
        }
    }

    open(reservation) {
        console.log('🔓 Abriendo modal con reserva:', reservation);

        if (!this.modal) {
            console.error('❌ No se puede abrir el modal: elemento no encontrado');
            return;
        }

        this.currentReservation = reservation;
        this.selectedGuests.clear();
        this.externalGuestsCount = 0;

        try {
            this.populateForm(reservation);
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            // Reset estado del modal
            this.hideConfirmButton();
            this.hideStatusMessage();

            console.log('✅ Modal abierto exitosamente');
        } catch (error) {
            console.error('❌ Error al abrir el modal:', error);
        }
    }

    close() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = '';
        this.currentReservation = null;
        this.selectedGuests.clear();
        this.externalGuestsCount = 0;
        this.hideSearchResults();
        this.hideStatusMessage();
        this.hideConfirmButton();
    }

    /**
     * Puebla el formulario con la información de la reserva proporcionada
     * 
     * @param {Object} reservation - La reserva que se va a editar
     * 
     * @property {string} reservation.workspaceName - El nombre del espacio de trabajo
     * @property {number} reservation.workspaceCapacity - La capacidad del espacio de trabajo
     * @property {string} reservation.startTime - La fecha y hora de inicio de la reserva en formato ISO
     * @property {string} reservation.endTime - La fecha y hora de fin de la reserva en formato ISO
     * @property {Array<Object>} [reservation.guests] - Los invitados de la reserva
     * @property {number} [reservation.externalGuests] - El número de invitados externos
     */
    populateForm(reservation) {
        console.log('📋 Datos de reserva recibidos:', reservation);
        console.log('👥 Invitados:', reservation.guests);
        console.log('🏢 Invitados externos:', reservation.externalGuests);
        // Información del espacio
        document.getElementById('edit-workspace-name').textContent = reservation.workspaceName;
        document.getElementById('edit-workspace-capacity').textContent = `Capacidad: ${reservation.workspaceCapacity} personas`;

        // Fecha y horarios
        const startDate = new Date(reservation.startTime);
        const endDate = new Date(reservation.endTime);

        document.getElementById('edit-reservation-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('edit-start-time').value = startDate.toTimeString().slice(0, 5);
        document.getElementById('edit-end-time').value = endDate.toTimeString().slice(0, 5);

        // Invitados
        // Invitados
        if (reservation.guests && reservation.guests.length > 0) {
            // Si solo tenemos IDs, necesitamos obtener la info completa
            this.loadGuestDetails(reservation.guests);
        } else {
            this.selectedGuests.clear();
        }

        // Invitados externos
        if (reservation.externalGuests) {
            this.externalGuestsCount = reservation.externalGuests;
            document.getElementById('edit-external-guests-count').value = reservation.externalGuests;
        }

        this.renderSelectedGuests();
    }

    async loadGuestDetails(guestIds) {
        try {
            // Si ya son objetos completos, usarlos directamente
            if (guestIds.length > 0 && typeof guestIds[0] === 'object') {
                guestIds.forEach(guest => {
                    this.selectedGuests.set(guest.id, guest);
                });
            } else {
                // Si solo son IDs, obtener detalles (aquí deberías hacer una llamada a tu API)
                // Por ahora simulamos con datos de ejemplo
                const guestDetails = await this.fetchGuestDetails(guestIds);
                guestDetails.forEach(guest => {
                    this.selectedGuests.set(guest.id, guest);
                });
            }
            this.renderSelectedGuests();
        } catch (error) {
            console.error('Error cargando detalles de invitados:', error);
        }
    }

    async fetchGuestDetails(guestIds) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                throw new Error('No se encontró token de autenticación');
            }

            // Hacer una petición para cada ID de usuario
            const guestPromises = guestIds.map(async (guestId) => {
                const response = await fetch(`/api/users/${guestId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Error obteniendo usuario ${guestId}`);
                }

                const userData = await response.json();
                return {
                    id: userData.id || userData.user?.id,
                    name: userData.name || userData.user?.name,
                    email: userData.email || userData.user?.email
                };
            });

            return await Promise.all(guestPromises);
        } catch (error) {
            console.error('Error obteniendo detalles de invitados:', error);
            // Fallback: devolver objetos con IDs únicamente
            return guestIds.map(id => ({
                id: id,
                name: `Usuario ${id}`,
                email: `usuario${id}@ejemplo.com`
            }));
        }
    }

    async handleGuestSearch(e) {
        const query = e.target.value.trim();

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        if (query.length < 2) {
            this.hideSearchResults();
            return;
        }

        this.searchTimeout = setTimeout(async () => {
            try {
                const users = await this.searchUsers(query);
                this.renderSearchResults(users);
            } catch (error) {
                console.error('Error searching users:', error);
            }
        }, 300);
    }

    async searchUsers(query) {
        // Simulación de búsqueda de usuarios
        const mockUsers = [
            { id: 3, name: "Ana López", email: "ana@example.com" },
            { id: 4, name: "Carlos Ruiz", email: "carlos@example.com" },
            { id: 5, name: "Laura Martín", email: "laura@example.com" }
        ];

        return mockUsers.filter(user =>
            user.email.toLowerCase().includes(query.toLowerCase()) ||
            user.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSearchResults(users) {
        const resultsContainer = document.getElementById('edit-guest-search-results');

        if (users.length === 0) {
            resultsContainer.innerHTML = '<div class="p-3 text-gray-500 text-sm">No se encontraron usuarios</div>';
        } else {
            resultsContainer.innerHTML = users
                .filter(user => !this.selectedGuests.has(user.id))
                .map(user => `
                    <div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0" 
                         onclick="window.editReservationModal.selectGuest(${user.id}, '${user.name}', '${user.email}')">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                <span class="text-white text-xs font-medium">${this.getInitials(user.name)}</span>
                            </div>
                            <div>
                                <p class="font-medium text-gray-900">${user.name}</p>
                                <p class="text-sm text-gray-600">${user.email}</p>
                            </div>
                        </div>
                    </div>
                `).join('');
        }

        resultsContainer.classList.remove('hidden');
    }

    selectGuest(id, name, email) {
        this.selectedGuests.set(id, { id, name, email });
        this.renderSelectedGuests();
        this.hideSearchResults();
        document.getElementById('edit-guest-search').value = '';
    }

    removeGuest(guestId) {
        this.selectedGuests.delete(guestId);
        this.renderSelectedGuests();
    }

    renderSelectedGuests() {
        const container = document.getElementById('edit-selected-guests');

        if (this.selectedGuests.size === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = Array.from(this.selectedGuests.values()).map(guest => `
            <div class="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span class="text-white text-xs font-medium">${this.getInitials(guest.name)}</span>
                    </div>
                    <div>
                        <p class="font-medium text-blue-900">${guest.name}</p>
                        <p class="text-sm text-blue-700">${guest.email}</p>
                    </div>
                </div>
                <button onclick="window.editReservationModal.removeGuest(${guest.id})" 
                        class="text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1 rounded">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    addExternalGuest() {
        const count = parseInt(document.getElementById('edit-external-guests-count').value) || 0;
        if (count > 0) {
            this.externalGuestsCount += count;
            document.getElementById('edit-external-guests-count').value = '0';
            this.showStatusMessage(`Se añadieron ${count} invitado(s) externo(s). Total: ${this.externalGuestsCount}`, 'success');
        }
    }

    showSearchResults() {
        const results = document.getElementById('edit-guest-search-results');
        if (results.innerHTML.trim() !== '') {
            results.classList.remove('hidden');
        }
    }

    hideSearchResults() {
        document.getElementById('edit-guest-search-results').classList.add('hidden');
    }

    validateDateTime() {
        const date = document.getElementById('edit-reservation-date').value;
        const startTime = document.getElementById('edit-start-time').value;
        const endTime = document.getElementById('edit-end-time').value;

        if (!date || !startTime || !endTime) return false;

        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        const now = new Date();

        if (start <= now) {
            this.showStatusMessage('La fecha y hora de inicio debe ser futura', 'error');
            return false;
        }

        if (end <= start) {
            this.showStatusMessage('La hora de fin debe ser posterior a la hora de inicio', 'error');
            return false;
        }

        this.hideStatusMessage();
        return true;
    }

    async checkAvailability() {
        if (!this.validateDateTime()) return;

        const checkButton = document.getElementById('edit-check-availability');
        checkButton.disabled = true;
        checkButton.innerHTML = '<span>Verificando...</span>';

        try {
            // Simular llamada a API
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showStatusMessage('El espacio está disponible para las fechas seleccionadas', 'success');
            this.showConfirmButton();
        } catch (error) {
            this.showStatusMessage('Error al verificar disponibilidad', 'error');
        } finally {
            checkButton.disabled = false;
            checkButton.innerHTML = '<span>Verificar Disponibilidad</span>';
        }
    }

    async confirmChanges() {
        if (!this.validateDateTime()) return;

        const confirmButton = document.getElementById('edit-confirm-changes');
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<span>Guardando...</span>';

        try {
            const reservationData = this.getReservationData();
            await this.updateReservation(reservationData);

            this.showStatusMessage('Reserva actualizada exitosamente', 'success');

            setTimeout(() => {
                this.close();
                if (window.reservationsManager) {
                    window.reservationsManager.loadReservations();
                }
            }, 1500);

        } catch (error) {
            this.showStatusMessage('Error al actualizar la reserva', 'error');
        } finally {
            confirmButton.disabled = false;
            confirmButton.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg><span>Guardar Cambios</span>';
        }
    }

    getReservationData() {
        const date = document.getElementById('edit-reservation-date').value;
        const startTime = document.getElementById('edit-start-time').value;
        const endTime = document.getElementById('edit-end-time').value;

        return {
            id: this.currentReservation.id,
            date: date,
            startTime: `${date}T${startTime}:00`,
            endTime: `${date}T${endTime}:00`,
            guests: Array.from(this.selectedGuests.values()),
            externalGuests: this.externalGuestsCount,
            numberOfPeople: this.selectedGuests.size + this.externalGuestsCount + 1 // +1 para el organizador
        };
    }

    async updateReservation(data) {
        // Aquí harías la llamada real a tu API
        console.log('Updating reservation:', data);

        const response = await fetch(`/api/reservations/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getAuthToken()}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Error updating reservation');
        }

        return await response.json();
    }

    showStatusMessage(message, type = 'info') {
        const statusDiv = document.getElementById('edit-status-message');
        const typeClasses = {
            success: 'border-green-500 bg-green-50 text-green-800',
            error: 'border-red-500 bg-red-50 text-red-800',
            warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
            info: 'border-blue-500 bg-blue-50 text-blue-800'
        };

        statusDiv.className = `rounded-xl p-4 border-l-4 ${typeClasses[type] || typeClasses.info}`;
        statusDiv.textContent = message;
        statusDiv.classList.remove('hidden');
    }

    hideStatusMessage() {
        document.getElementById('edit-status-message').classList.add('hidden');
    }

    showConfirmButton() {
        document.getElementById('edit-confirm-changes').classList.remove('hidden');
    }

    hideConfirmButton() {
        document.getElementById('edit-confirm-changes').classList.add('hidden');
    }

    getInitials(name) {
        if (!name || typeof name !== 'string') {
            return '??'; // o algún valor por defecto
        }
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
    }

    getAuthToken() {
        return localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('token');
    }
}

// Inicializar el modal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM cargado, inicializando modales...');

    // Esperar un poco más para asegurar que todos los elementos estén disponibles
    setTimeout(() => {
        try {
            if (!window.editReservationModal) {
                window.editReservationModal = new EditReservationModal();
                console.log('✅ EditReservationModal inicializado globalmente');
            }

            if (!window.reservationsManager) {
                window.reservationsManager = new ReservationsManager();
                console.log('✅ ReservationsManager inicializado globalmente');
            }
        } catch (error) {
            console.error('❌ Error en la inicialización:', error);
        }
    }, 100);
});