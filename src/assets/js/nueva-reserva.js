document.addEventListener('DOMContentLoaded', () => {
    const openButtons = [document.getElementById('new-reservation-button-quick'), document.getElementById('new-reservation-proximas'), document.getElementById('new-reservation-menu')];
    const modal = document.getElementById('float-quick-new-reservation');
    const closeX = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-reservation');
    const checkAvailabilityBtn = document.getElementById('check-availability');
    const confirmBtn = document.getElementById('confirm-reservation');
    const actionBtn = document.getElementById('action-buttons');

    // Elementos del formulario
    const dateInput = document.getElementById('reservation-date');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    const availableSpacesContainer = document.getElementById('available-spaces-container');
    const availableSpacesDiv = document.getElementById('available-spaces');
    const statusMessage = document.getElementById('status-message');

    // Elementos de invitados
    const guestSearch = document.getElementById('guest-search');
    const guestSearchResults = document.getElementById('guest-search-results');
    const selectedGuestsDiv = document.getElementById('selected-guests');
    const addExternalGuestBtn = document.getElementById('add-external-guest');
    const externalGuestsCount = document.getElementById('external-guests-count');

    let selectedGuests = [];
    let searchTimeout = null;

    let selectedWorkspace = null;
    let availableSpaces = [];

    // Helper para obtener token de autenticación
    function getAuthToken() {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    }

    // Configurar fecha mínima (hoy)
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    // Funcionalidad de invitados
    guestSearch?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            guestSearchResults.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(() => searchUsers(query), 300);
    });

    // Añadir invitados externos
    addExternalGuestBtn?.addEventListener('click', () => {
        const count = parseInt(externalGuestsCount.value) || 1;

        for (let i = 0; i < count; i++) {
            const guestId = `external_${Date.now()}_${i}`;
            const guest = {
                id: guestId,
                name: 'Invitado Externo',
                email: null,
                isExternal: true
            };

            if (!selectedGuests.some(g => g.id === guestId)) {
                selectedGuests.push(guest);
            }
        }

        updateSelectedGuests();
        externalGuestsCount.value = 1; // Resetear a 1
    });

    // Buscar usuarios
    async function searchUsers(query) {
        try {
            const token = getAuthToken();
            if (!token) return;

            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                displaySearchResults(data.users || []);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }

    // Mostrar resultados de búsqueda
    function displaySearchResults(users) {
        if (users.length === 0) {
            guestSearchResults.innerHTML = '<div class="p-3 text-gray-500 text-sm">No se encontraron usuarios</div>';
            guestSearchResults.classList.remove('hidden');
            return;
        }

        const html = users.map(user => `
    <div class="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 user-result" 
         data-user-id="${user.id}" data-user-name="${user.name}" data-user-email="${user.email}">
      <div class="font-medium text-gray-900">${user.name}</div>
      <div class="text-sm text-gray-500">${user.email}</div>
    </div>
  `).join('');

        guestSearchResults.innerHTML = html;
        guestSearchResults.classList.remove('hidden');

        // Añadir event listeners
        document.querySelectorAll('.user-result').forEach(result => {
            result.addEventListener('click', () => {
                const userId = result.dataset.userId;
                const userName = result.dataset.userName;
                const userEmail = result.dataset.userEmail;

                if (!selectedGuests.some(g => g.id === userId)) {
                    selectedGuests.push({
                        id: userId,
                        name: userName,
                        email: userEmail,
                        isExternal: false
                    });
                    updateSelectedGuests();
                }

                guestSearch.value = '';
                guestSearchResults.classList.add('hidden');
            });
        });
    }

    // Actualizar lista de invitados seleccionados
    function updateSelectedGuests() {
        if (selectedGuests.length === 0) {
            selectedGuestsDiv.innerHTML = '';
            return;
        }

        const html = selectedGuests.map(guest => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-full ${guest.isExternal ? 'bg-orange-100' : 'bg-blue-100'} flex items-center justify-center">
          <span class="text-sm font-medium ${guest.isExternal ? 'text-orange-600' : 'text-blue-600'}">
            ${guest.isExternal ? 'E' : guest.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div class="font-medium text-gray-900">${guest.name}</div>
          ${guest.email ? `<div class="text-sm text-gray-500">${guest.email}</div>` : ''}
        </div>
      </div>
      <button class="text-red-500 hover:text-red-700 p-1 remove-guest" data-guest-id="${guest.id}">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `).join('');

        selectedGuestsDiv.innerHTML = html;

        // Event listeners para remover invitados
        document.querySelectorAll('.remove-guest').forEach(btn => {
            btn.addEventListener('click', () => {
                const guestId = btn.dataset.guestId;
                selectedGuests = selectedGuests.filter(g => g.id !== guestId);
                updateSelectedGuests();
            });
        });
    }

    // Ocultar resultados cuando se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!guestSearch?.contains(e.target) && !guestSearchResults?.contains(e.target)) {
            guestSearchResults?.classList.add('hidden');
        }
    });

    // Abre el modal con quickBtn o quickBtn2
    openButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                modal.classList.remove('hidden');
                resetForm();
            });
        }
    });

    // Cierra el modal
    const closeModal = () => {
        modal.classList.add('hidden');
        resetForm();
    };

    closeX?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Cierra el modal si se hace clic fuera del contenido
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Verificar disponibilidad
    checkAvailabilityBtn?.addEventListener('click', async () => {
        const date = dateInput.value;
        const startTime = startTimeInput.value;
        const endTime = endTimeInput.value;

        if (!date || !startTime || !endTime) {
            showStatusMessage('Por favor completa todos los campos de fecha y horario', 'error');
            return;
        }

        if (startTime >= endTime) {
            showStatusMessage('La hora de inicio debe ser anterior a la hora de fin', 'error');
            return;
        }

        await checkAvailability(date, startTime, endTime);
    });

    // Confirmar reserva
    confirmBtn?.addEventListener('click', async () => {
        if (!selectedWorkspace) {
            showStatusMessage('Por favor selecciona un espacio de trabajo', 'error');
            return;
        }

        await createReservation();
    });

    // Función para verificar disponibilidad
    async function checkAvailability(date, startTime, endTime) {
        try {
            checkAvailabilityBtn.disabled = true;
            checkAvailabilityBtn.innerHTML = `
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
        <span>Verificando...</span>
      `;

            // Intentar obtener token de localStorage primero, luego sessionStorage
            const token = getAuthToken();
            console.log('Token encontrado:', token ? 'Sí' : 'No');
            console.log('Token length:', token ? token.length : 0);

            if (!token) {
                showStatusMessage('No se encontró token de autenticación. Por favor inicia sesión nuevamente.', 'error');
                return;
            }

            const response = await fetch(`/api/reservations/available-spaces?date=${date}&startTime=${startTime}&endTime=${endTime}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    showStatusMessage('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
                    // Opcional: redirigir al login
                    setTimeout(() => {
                        window.location.href = '/src/pages/login.html';
                    }, 2000);
                    return;
                }
                throw new Error(data.message || 'Error al verificar disponibilidad');
            }

            if (data.success) {
                availableSpaces = data.availableSpaces;
                displayAvailableSpaces(data);
            } else {
                showStatusMessage(data.message || 'Error al verificar disponibilidad', 'error');
            }

        } catch (error) {
            console.error('Error:', error);
            showStatusMessage(error.message || 'Error al verificar disponibilidad', 'error');
        } finally {
            checkAvailabilityBtn.disabled = false;
            checkAvailabilityBtn.innerHTML = '<span>Verificar Disponibilidad</span>';
        }
    }

    // Mostrar espacios disponibles
    function displayAvailableSpaces(data) {
        if (data.availableSpaces.length === 0) {
            showStatusMessage(`No hay espacios disponibles para el horario seleccionado. ${data.unavailableCount} espacios están ocupados.`, 'warning');
            availableSpacesContainer.classList.add('hidden');
            confirmBtn.classList.add('hidden');
            checkAvailabilityBtn.classList.remove('hidden');
            return;
        }

        let spacesHtml = '';
        data.availableSpaces.forEach(space => {
            spacesHtml += `
        <div class="workspace-option p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200" 
             data-workspace-id="${space.id}">
          <div class="flex justify-between items-start mb-2">
            <h4 class="font-semibold text-gray-800">${space.name}</h4>
            <span class="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full">
              Capacidad: ${space.capacity}
            </span>
          </div>
          ${space.description ? `<p class="text-sm text-gray-600 mb-2">${space.description}</p>` : ''}
          ${space.equipment && space.equipment.length > 0 ? `
            <div class="flex flex-wrap gap-1">
              ${space.equipment.map(eq => `
                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  ${eq}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
        });

        availableSpacesDiv.innerHTML = spacesHtml;
        availableSpacesContainer.classList.remove('hidden');

        // Agregar event listeners a las opciones
        document.querySelectorAll('.workspace-option').forEach(option => {
            option.addEventListener('click', () => {
                // Remover selección previa
                document.querySelectorAll('.workspace-option').forEach(opt => {
                    opt.classList.remove('border-blue-500', 'bg-blue-100');
                    opt.classList.add('border-gray-200');
                });

                // Seleccionar actual
                option.classList.remove('border-gray-200');
                option.classList.add('border-blue-500', 'bg-blue-100');

                selectedWorkspace = {
                    id: parseInt(option.dataset.workspaceId),
                    name: option.querySelector('h4').textContent
                };

                checkAvailabilityBtn.classList.add('hidden');
                confirmBtn.classList.remove('hidden');
                actionBtn.classList.remove('justify-end');
                actionBtn.classList.add('justify-between');
                showStatusMessage(`Espacio "${selectedWorkspace.name}" seleccionado. Puedes confirmar la reserva.`, 'success');
            });
        });

        showStatusMessage(`${data.availableSpaces.length} espacios disponibles. Selecciona uno para continuar.`, 'info');
    }

    // Crear reserva
    async function createReservation() {
        try {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      <span>Creando...</span>
    `;

            const date = dateInput.value;
            const startTime = startTimeInput.value;
            const endTime = endTimeInput.value;

            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);

            const reservationData = {
                workspaceId: selectedWorkspace.id,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                guests: selectedGuests.filter(guest => !guest.isExternal).map(guest => parseInt(guest.id)),
                externalGuests: selectedGuests.filter(guest => guest.isExternal).map(guest => ({
                    name: guest.name
                }))
            };

            // Intentar obtener token de localStorage primero, luego sessionStorage
            const token = getAuthToken();

            if (!token) {
                showStatusMessage('No se encontró token de autenticación. Por favor inicia sesión nuevamente.', 'error');
                return;
            }

            const response = await fetch('/api/reservations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(reservationData)
            });

            const data = await response.json();

            console.log('Create reservation response:', response.status, data);

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    showStatusMessage('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
                    setTimeout(() => {
                        window.location.href = '/src/pages/login.html';
                    }, 2000);
                    return;
                }
                throw new Error(data.message || 'Error al crear la reserva');
            }

            showStatusMessage('¡Reserva creada exitosamente!', 'success');

            // Cerrar modal después de 2 segundos
            setTimeout(() => {
                closeModal();
                // Opcional: recargar la página o actualizar el dashboard
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            showStatusMessage(error.message || 'Error al crear la reserva', 'error');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>Confirmar Reserva</span>
    `;
        }
    }

    // Mostrar mensajes de estado
    function showStatusMessage(message, type) {
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

        statusMessage.className = `rounded-xl p-4 border-l-4 ${colors[type]}`;
        statusMessage.innerHTML = `
      <div class="flex items-center">
        <span class="mr-2 font-semibold">${icons[type]}</span>
        <span>${message}</span>
      </div>
    `;
        statusMessage.classList.remove('hidden');
    }

    // Resetear formulario
    function resetForm() {
        selectedWorkspace = null;
        availableSpaces = [];
        availableSpacesContainer.classList.add('hidden');
        confirmBtn.classList.add('hidden');
        checkAvailabilityBtn.classList.remove('hidden');
        actionBtn.classList.add('justify-end');
        actionBtn.classList.remove('justify-between');
        statusMessage.classList.add('hidden');

        // Limpiar selecciones
        document.querySelectorAll('.workspace-option').forEach(opt => {
            opt.classList.remove('border-blue-500', 'bg-blue-100');
            opt.classList.add('border-gray-200');
        });

        selectedGuests = [];
        updateSelectedGuests();
        guestSearch.value = '';
        guestSearchResults.classList.add('hidden');
    }
});