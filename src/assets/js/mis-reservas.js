class MisReservas {
    constructor() {
        this.reservations = [];
        this.filteredReservations = [];
        this.currentFilter = 'all';
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.selectedReservation = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReservations();
    }

    // Helper para obtener token de autenticación
    getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    bindEvents() {
        // Filtros
        document.querySelectorAll('.reservation-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.id.replace('filter-', ''));
            });
        });

        // Modales
        this.bindModalEvents();

        // Paginación
        document.getElementById('prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderReservations();
            }
        });

        document.getElementById('next-page')?.addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredReservations.length / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderReservations();
            }
        });
    }

    bindModalEvents() {
        // Modal de editar
        document.getElementById('close-edit-modal')?.addEventListener('click', () => {
            this.closeEditModal();
        });
        document.getElementById('cancel-edit-reservation')?.addEventListener('click', () => {
            this.closeEditModal();
        });
        document.getElementById('save-edit-reservation')?.addEventListener('click', () => {
            this.saveReservationEdit();
        });

        // Modal de cancelar
        document.getElementById('close-cancel-modal')?.addEventListener('click', () => {
            this.closeCancelModal();
        });
        document.getElementById('keep-reservation')?.addEventListener('click', () => {
            this.closeCancelModal();
        });
        document.getElementById('confirm-cancel-reservation')?.addEventListener('click', () => {
            this.confirmCancelReservation();
        });

        // Cerrar modales al hacer clic fuera
        document.getElementById('edit-reservation-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'edit-reservation-modal') {
                this.closeEditModal();
            }
        });
        document.getElementById('cancel-confirmation-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'cancel-confirmation-modal') {
                this.closeCancelModal();
            }
        });
    }

    async loadReservations() {
        try {
            this.showLoading(true);

            const token = this.getAuthToken();
            if (!token) {
                this.redirectToLogin();
                return;
            }

            // SOLUCIÓN: Hacer múltiples llamadas para obtener todas las reservas
            console.log('Cargando reservas...');
            
            try {
                // Llamada 1: Reservas sin filtro (confirmed por defecto)
                const confirmedResponse = await fetch('/api/reservations/my', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                if (!confirmedResponse.ok) {
                    if (confirmedResponse.status === 401) {
                        this.redirectToLogin();
                        return;
                    }
                    throw new Error(`Error en confirmed: ${confirmedResponse.status}`);
                }

                const confirmedData = await confirmedResponse.json();
                console.log('Reservas confirmed:', confirmedData.reservations?.length || 0);

                // Llamada 2: Reservas canceladas
                const cancelledResponse = await fetch('/api/reservations/my?status=cancelled', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });

                let cancelledData = { reservations: [] };
                if (cancelledResponse.ok) {
                    cancelledData = await cancelledResponse.json();
                    console.log('Reservas cancelled:', cancelledData.reservations?.length || 0);
                }

                // Llamada 3: Reservas pendientes
                /*const pendingResponse = await fetch('/api/reservations/my?status=pending', {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
                });*/

                /*let pendingData = { reservations: [] };
                if (pendingResponse.ok) {
                    pendingData = await pendingResponse.json();
                    console.log('Reservas pending:', pendingData.reservations?.length || 0);
                }*/

                // Combinar todas las reservas
                const allReservations = [
                    ...(confirmedData.reservations || []),
                    ...(cancelledData.reservations || [])
                    //...(pendingData.reservations || [])
                ];

                // Eliminar duplicados por ID
                const uniqueReservations = [];
                const seenIds = new Set();
                
                allReservations.forEach(reservation => {
                    if (!seenIds.has(reservation.id)) {
                        seenIds.add(reservation.id);
                        uniqueReservations.push(reservation);
                    }
                });

                this.reservations = uniqueReservations;
                console.log('Total reservas únicas:', this.reservations.length);
                
                // Ordenar reservas por fecha (futuras primero, luego pasadas)
                this.sortReservations();
                
                this.filteredReservations = [...this.reservations];

                this.updateStats();
                this.renderReservations();

            } catch (fetchError) {
                console.error('Error en las llamadas a la API:', fetchError);
                throw fetchError;
            }
            
        } catch (error) {
            console.error('Error loading reservations:', error);
            this.showError('Error al cargar las reservas: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    // NUEVO: Función para ordenar reservas
    sortReservations() {
        const now = new Date();
        
        this.reservations.sort((a, b) => {
            const dateA = new Date(a.startTime);
            const dateB = new Date(b.startTime);
            
            // Separar futuras y pasadas
            const aIsFuture = dateA >= now;
            const bIsFuture = dateB >= now;
            
            // Si una es futura y la otra pasada, la futura va primero
            if (aIsFuture && !bIsFuture) return -1;
            if (!aIsFuture && bIsFuture) return 1;
            
            // Si ambas son futuras, ordenar ascendente (más próxima primero)
            if (aIsFuture && bIsFuture) {
                return dateA - dateB;
            }
            
            // Si ambas son pasadas, ordenar descendente (más reciente primero)
            return dateB - dateA;
        });
    }

    updateStats() {
        const stats = this.calculateStats();
        
        // Actualizar contadores en el header
        document.getElementById('total-reservations').textContent = stats.total;
        document.getElementById('upcoming-reservations-count').textContent = stats.upcoming;

        // Actualizar tarjetas de estadísticas
        document.getElementById('active-reservations-count').textContent = stats.active;
        //document.getElementById('pending-reservations-count').textContent = stats.pending;
        document.getElementById('completed-reservations-count').textContent = stats.completed;
        document.getElementById('cancelled-reservations-count').textContent = stats.cancelled;
    }

    calculateStats() {
        const now = new Date();
        const stats = {
            total: this.reservations.length,
            active: 0,
            //pending: 0,
            completed: 0,
            cancelled: 0,
            upcoming: 0
        };

        this.reservations.forEach(reservation => {
            const startDate = new Date(reservation.startTime);
            const endDate = new Date(reservation.endTime);
            const status = reservation.status.toLowerCase();

            // Contar por status
            switch (status) {
                case 'confirmed':
                    if (endDate > now) {
                        stats.active++;
                        if (startDate > now) {
                            stats.upcoming++;
                        }
                    } else {
                        stats.completed++;
                    }
                    break;
                /*case 'pending':
                    stats.pending++;
                    if (startDate > now) {
                        stats.upcoming++;
                    }
                    break;*/
                case 'cancelled':
                    stats.cancelled++;
                    break;
                default:
                    // Para estados desconocidos, considerar como completadas si ya pasaron
                    if (endDate < now) {
                        stats.completed++;
                    } else {
                        stats.active++;
                    }
                    break;
            }
        });

        return stats;
    }

    handleFilterChange(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;

        // Actualizar botones de filtro
        document.querySelectorAll('.reservation-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`filter-${filter}`).classList.add('active');

        // Aplicar filtro
        this.applyFilter();
        this.renderReservations();
    }

    applyFilter() {
        const now = new Date();
        
        switch (this.currentFilter) {
            case 'all':
                this.filteredReservations = [...this.reservations];
                break;
            case 'upcoming':
                this.filteredReservations = this.reservations.filter(reservation => {
                    const startDate = new Date(reservation.startTime);
                    return startDate > now && ['confirmed', 'pending'].includes(reservation.status.toLowerCase());
                });
                break;
            case 'active':
                this.filteredReservations = this.reservations.filter(reservation => {
                    const endDate = new Date(reservation.endTime);
                    return endDate > now && ['confirmed', 'active'].includes(reservation.status.toLowerCase());
                });
                break;
            /*case 'pending':
                this.filteredReservations = this.reservations.filter(reservation => 
                    reservation.status.toLowerCase() === 'pending'
                );
                break;*/
            case 'completed':
                this.filteredReservations = this.reservations.filter(reservation => {
                    const endDate = new Date(reservation.endTime);
                    return endDate <= now || reservation.status.toLowerCase() === 'completed';
                });
                break;
            case 'cancelled':
                this.filteredReservations = this.reservations.filter(reservation => 
                    reservation.status.toLowerCase() === 'cancelled'
                );
                break;
        }
    }

    renderReservations() {
        const container = document.getElementById('reservations-list');
        const emptyState = document.getElementById('reservations-empty');
        const pagination = document.getElementById('reservations-pagination');

        if (this.filteredReservations.length === 0) {
            container.classList.add('hidden');
            emptyState.classList.remove('hidden');
            pagination.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        emptyState.classList.add('hidden');

        // Calcular paginación
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageReservations = this.filteredReservations.slice(startIndex, endIndex);

        // Renderizar reservas
        container.innerHTML = pageReservations.map(reservation => 
            this.renderReservationCard(reservation)
        ).join('');

        // Bind eventos de las tarjetas
        this.bindReservationEvents();

        // Actualizar paginación
        this.updatePagination();
    }

    renderReservationCard(reservation) {
        const startDate = new Date(reservation.startTime);
        const endDate = new Date(reservation.endTime);
        const now = new Date();
        
        const dateStr = this.formatDate(startDate);
        const timeStr = `${this.formatTime(startDate)} - ${this.formatTime(endDate)}`;
        const statusInfo = this.getStatusInfo(reservation.status, startDate, endDate, now);
        const canEdit = this.canEditReservation(reservation, now);
        const canCancel = this.canCancelReservation(reservation, now);

        // CORREGIDO: Usar los campos que devuelve tu backend
        const workspaceName = reservation.workspaceName || 'Espacio no disponible';
        const workspaceDescription = reservation.workspaceDescription || '';

        return `
            <div class="p-6 hover:bg-gray-50 transition-colors">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-4 flex-1">
                        <!-- Icono del espacio -->
                        <div class="bg-${statusInfo.iconColor}-100 p-3 rounded-lg">
                            <svg class="w-6 h-6 text-${statusInfo.iconColor}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                            </svg>
                        </div>

                        <!-- Información de la reserva -->
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <h3 class="text-lg font-semibold text-gray-900">${workspaceName}</h3>
                                <span class="bg-${statusInfo.color}-100 text-${statusInfo.color}-800 px-3 py-1 rounded-full text-sm font-medium">
                                    ${statusInfo.text}
                                </span>
                            </div>
                            
                            ${workspaceDescription ? `
                            <p class="text-sm text-gray-600 mb-2">${workspaceDescription}</p>
                            ` : ''}
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                                <div class="flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m0 0V7a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2z"></path>
                                    </svg>
                                    <span>${dateStr}</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>${timeStr}</span>
                                </div>
                                <div class="flex items-center space-x-1">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                    </svg>
                                    <span>Personas: ${reservation.numberOfPeople || 1}</span>
                                </div>
                            </div>

                            ${reservation.guests && reservation.guests.length > 0 ? `
                            <div class="mt-2 flex items-center space-x-1 text-sm text-gray-600">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                                <span>${reservation.guests.length} invitado(s)</span>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Acciones -->
                    <div class="flex items-center space-x-2 ml-4">
                        ${canEdit ? `
                        <button class="edit-reservation text-blue-600 hover:text-blue-800 px-3 py-2 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors" 
                                data-reservation-id="${reservation.id}">
                            Editar
                        </button>
                        ` : ''}
                        
                        ${canCancel ? `
                        <button class="cancel-reservation text-red-600 hover:text-red-800 px-3 py-2 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors" 
                                data-reservation-id="${reservation.id}">
                            Cancelar
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    bindReservationEvents() {
        // Eventos de editar
        document.querySelectorAll('.edit-reservation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = parseInt(e.target.dataset.reservationId);
                this.openEditModal(reservationId);
            });
        });

        // Eventos de cancelar
        document.querySelectorAll('.cancel-reservation').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reservationId = parseInt(e.target.dataset.reservationId);
                this.openCancelModal(reservationId);
            });
        });
    }

    getStatusInfo(status, startDate, endDate, now) {
        const statusLower = status.toLowerCase();
        
        if (statusLower === 'cancelled') {
            return { text: 'Cancelada', color: 'red', iconColor: 'red' };
        }
        
        /*if (statusLower === 'pending') {
            return { text: 'Pendiente', color: 'yellow', iconColor: 'yellow' };
        }*/
        
        if (endDate < now) {
            return { text: 'Completada', color: 'blue', iconColor: 'blue' };
        }
        
        if (startDate <= now && endDate > now) {
            return { text: 'En curso', color: 'green', iconColor: 'green' };
        }
        
        return { text: 'Confirmada', color: 'green', iconColor: 'blue' };
    }

    canEditReservation(reservation, now) {
        const startDate = new Date(reservation.startTime);
        const status = reservation.status.toLowerCase();
        
        // Solo se puede editar si está pendiente o confirmada y no ha empezado
        return ['confirmed'].includes(status) && startDate > now;
    }

    canCancelReservation(reservation, now) {
        const endDate = new Date(reservation.endTime);
        const status = reservation.status.toLowerCase();
        
        // Solo se puede cancelar si no está ya cancelada y no ha terminado
        return status !== 'cancelled' && endDate > now;
    }

    openEditModal(reservationId) {
        const reservation = this.reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        this.selectedReservation = reservation;
        
        // Llenar el formulario
        document.getElementById('edit-reservation-id').value = reservation.id;
        
        const startDate = new Date(reservation.startTime);
        const endDate = new Date(reservation.endTime);
        
        document.getElementById('edit-reservation-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('edit-start-time').value = startDate.toTimeString().substr(0, 5);
        document.getElementById('edit-end-time').value = endDate.toTimeString().substr(0, 5);
        
        // CORREGIDO: Información del espacio usando los campos correctos del backend
        document.getElementById('edit-workspace-info').innerHTML = `
            <div class="font-medium">${reservation.workspaceName || 'Espacio no disponible'}</div>
            <div class="text-xs text-gray-500">
                ${reservation.workspaceDescription ? reservation.workspaceDescription : ''}
                ${reservation.numberOfPeople ? `• ${reservation.numberOfPeople} personas` : ''}
            </div>
        `;
        
        // Mostrar modal
        document.getElementById('edit-reservation-modal').classList.remove('hidden');
    }

    closeEditModal() {
        document.getElementById('edit-reservation-modal').classList.add('hidden');
        this.selectedReservation = null;
        this.clearEditForm();
    }

    clearEditForm() {
        document.getElementById('edit-reservation-form').reset();
        document.getElementById('edit-status-message').classList.add('hidden');
    }

    async saveReservationEdit() {
        try {
            const saveBtn = document.getElementById('save-edit-reservation');
            saveBtn.disabled = true;
            saveBtn.innerHTML = 'Guardando...';

            const formData = {
                date: document.getElementById('edit-reservation-date').value,
                startTime: document.getElementById('edit-start-time').value,
                endTime: document.getElementById('edit-end-time').value
            };

            // Validaciones
            if (!formData.date || !formData.startTime || !formData.endTime) {
                this.showEditMessage('Por favor completa todos los campos', 'error');
                return;
            }

            if (formData.startTime >= formData.endTime) {
                this.showEditMessage('La hora de inicio debe ser anterior a la hora de fin', 'error');
                return;
            }

            // Construir fecha y hora completas
            const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

            const updateData = {
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString()
            };

            const token = this.getAuthToken();
            const response = await fetch(`/api/reservations/${this.selectedReservation.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar la reserva');
            }

            this.showEditMessage('Reserva actualizada exitosamente', 'success');
            
            // Recargar reservas y cerrar modal
            setTimeout(() => {
                this.closeEditModal();
                this.loadReservations();
            }, 1500);

        } catch (error) {
            console.error('Error updating reservation:', error);
            this.showEditMessage(error.message || 'Error al actualizar la reserva', 'error');
        } finally {
            const saveBtn = document.getElementById('save-edit-reservation');
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Guardar Cambios';
        }
    }

    showEditMessage(message, type) {
        const colors = {
            success: 'border-green-500 bg-green-50 text-green-800',
            error: 'border-red-500 bg-red-50 text-red-800',
            warning: 'border-yellow-500 bg-yellow-50 text-yellow-800',
            info: 'border-blue-500 bg-blue-50 text-blue-800'
        };

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        const messageElement = document.getElementById('edit-status-message');
        messageElement.className = `rounded-xl p-4 border-l-4 ${colors[type]}`;
        messageElement.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2 font-semibold">${icons[type]}</span>
                <span>${message}</span>
            </div>
        `;
        messageElement.classList.remove('hidden');
    }

    openCancelModal(reservationId) {
        const reservation = this.reservations.find(r => r.id === reservationId);
        if (!reservation) return;

        this.selectedReservation = reservation;
        
        // Llenar información de la reserva
        const startDate = new Date(reservation.startTime);
        const endDate = new Date(reservation.endTime);
        
        document.getElementById('cancel-reservation-info').innerHTML = `
            <div class="font-medium text-gray-900 mb-2">${reservation.workspaceName || 'Espacio no disponible'}</div>
            <div class="text-sm text-gray-600">
                <div>${this.formatDate(startDate)}</div>
                <div>${this.formatTime(startDate)} - ${this.formatTime(endDate)}</div>
                ${reservation.numberOfPeople ? `<div>${reservation.numberOfPeople} personas</div>` : ''}
            </div>
        `;
        
        // Limpiar textarea
        // document.getElementById('cancellation-reason').value = '';
        
        // Mostrar modal
        document.getElementById('cancel-confirmation-modal').classList.remove('hidden');
    }

    closeCancelModal() {
        document.getElementById('cancel-confirmation-modal').classList.add('hidden');
        this.selectedReservation = null;
    }

    async confirmCancelReservation() {
        try {
            const confirmBtn = document.getElementById('confirm-cancel-reservation');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = 'Cancelando...';

            const cancelData = {
                status: 'cancelled',
            };

            const token = this.getAuthToken();
            const response = await fetch(`/api/reservations/${this.selectedReservation.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cancelData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al cancelar la reserva');
            }

            console.log('Reserva cancelada exitosamente');

            // Cerrar modal
            this.closeCancelModal();
            
            // Mostrar mensaje de éxito
            this.showSuccessMessage('Reserva cancelada exitosamente');
            
            // CAMBIO: Recargar todas las reservas para mostrar el cambio
            await this.loadReservations();

        } catch (error) {
            console.error('Error cancelling reservation:', error);
            this.showErrorMessage(error.message || 'Error al cancelar la reserva');
        } finally {
            const confirmBtn = document.getElementById('confirm-cancel-reservation');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = 'Sí, Cancelar';
        }
    }

    updatePagination() {
        const totalItems = this.filteredReservations.length;
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        const pagination = document.getElementById('reservations-pagination');

        if (totalPages <= 1) {
            pagination.classList.add('hidden');
            return;
        }

        pagination.classList.remove('hidden');

        // Actualizar información de páginas
        const startIndex = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.itemsPerPage, totalItems);
        
        document.getElementById('showing-from').textContent = startIndex;
        document.getElementById('showing-to').textContent = endIndex;
        document.getElementById('showing-total').textContent = totalItems;

        // Actualizar botones de navegación
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        // Generar números de página
        this.generatePageNumbers(totalPages);
    }

    generatePageNumbers(totalPages) {
        const container = document.getElementById('page-numbers');
        container.innerHTML = '';

        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            const button = document.createElement('button');
            button.className = `px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                i === this.currentPage 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
            }`;
            button.textContent = i;
            button.addEventListener('click', () => {
                this.currentPage = i;
                this.renderReservations();
            });
            container.appendChild(button);
        }
    }

    // Métodos utilitarios
    formatDate(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Hoy';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Mañana';
        } else {
            return date.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showLoading(show) {
        const loading = document.getElementById('reservations-loading');
        const list = document.getElementById('reservations-list');
        const empty = document.getElementById('reservations-empty');

        if (show) {
            loading.classList.remove('hidden');
            list.classList.add('hidden');
            empty.classList.add('hidden');
        } else {
            loading.classList.add('hidden');
        }
    }

    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type) {
        const colors = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-600',
            info: 'bg-blue-600'
        };

        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remover después de 5 segundos
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 5000);
    }

    redirectToNewReservation() {
        // Redirigir a la página principal que tiene el modal de nueva reserva
        window.location.href = '/dashboard';
    }

    redirectToLogin() {
        window.location.href = '/login.html';
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new MisReservas();
});