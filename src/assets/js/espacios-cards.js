document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let allSpaces = [];
    let filteredSpaces = [];
    let currentUser = null;

    // Base URL de la API
    const API_BASE_URL = '/api';

    // Elementos del DOM
    const spacesGrid = document.getElementById('spaces-grid');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const availabilityFilter = document.getElementById('availability-filter');
    const capacityFilter = document.getElementById('capacity-filter');
    
    // Modal elements
    const spaceDetailsModal = document.getElementById('space-details-modal');
    const closeDetailsModal = document.getElementById('close-details-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    //const reserveSpaceBtn = document.getElementById('reserve-space-btn');
    
    // Statistics elements
    const totalSpacesEl = document.getElementById('total-spaces');
    const availableSpacesEl = document.getElementById('available-spaces');
    const totalCapacityEl = document.getElementById('total-capacity');
    const equippedSpacesEl = document.getElementById('equipped-spaces');

    // Inicialización
    init();

    function init() {
        // Verificar sesión del usuario
        checkUserSession();
        
        // Cargar espacios
        loadSpaces();
        
        // Configurar event listeners
        setupEventListeners();
    }

    function checkUserSession() {
        currentUser = getUserSessionData();
        if (!currentUser) {
            window.location.href = '/login';
            return;
        }

        // Actualizar información del usuario en la UI
        updateUserInterface();
    }

    function updateUserInterface() {
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userAvatarEl = document.querySelector('.user-avatar');

        if (userNameEl && currentUser.first_name) {
            userNameEl.textContent = `${currentUser.first_name} ${currentUser.last_name || ''}`.trim();
        }
        
        if (userRoleEl) {
            userRoleEl.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
        }
        
        if (userAvatarEl && currentUser.first_name) {
            userAvatarEl.textContent = currentUser.first_name.charAt(0).toUpperCase();
        }

        // Mostrar sección de administración si es admin
        if (currentUser.role === 'admin') {
            const adminSection = document.querySelector('.admin-only');
            if (adminSection) {
                adminSection.classList.remove('hidden');
            }
        }
    }

    async function loadSpaces() {
        showLoadingState();
        
        try {
            const data = await fetchSpaces();
            allSpaces = data;
            filteredSpaces = [...allSpaces];
            
            updateStatistics();
            renderSpaces();
            
        } catch (error) {
            console.error('Error cargando espacios:', error);
            showErrorState();
        }
    }

    async function fetchSpaces() {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/workspaces`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.workspaces || data;
        } catch (error) {
            console.error('Error en fetchSpaces:', error);
            throw new Error('Error al cargar los espacios');
        }
    }

    function setupEventListeners() {
        // Filtros
        availabilityFilter.addEventListener('change', applyFilters);
        capacityFilter.addEventListener('change', applyFilters);
        
        // Modal
        closeDetailsModal.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('click', closeModal);
        //reserveSpaceBtn.addEventListener('click', handleReservation);
        
        // Cerrar modal al hacer clic fuera
        spaceDetailsModal.addEventListener('click', (e) => {
            if (e.target === spaceDetailsModal) {
                closeModal();
            }
        });

        // Logout
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
    }

    function applyFilters() {
        const availabilityValue = availabilityFilter.value;
        const capacityValue = capacityFilter.value;
        
        filteredSpaces = allSpaces.filter(space => {
            // Filtro de disponibilidad
            let passesAvailability = true;
            if (availabilityValue === 'available') {
                passesAvailability = space.is_available === true;
            } else if (availabilityValue === 'unavailable') {
                passesAvailability = space.is_available === false;
            }
            
            // Filtro de capacidad
            let passesCapacity = true;
            if (capacityValue === 'small') {
                passesCapacity = space.capacity <= 5;
            } else if (capacityValue === 'medium') {
                passesCapacity = space.capacity >= 6 && space.capacity <= 15;
            } else if (capacityValue === 'large') {
                passesCapacity = space.capacity >= 16;
            }
            
            return passesAvailability && passesCapacity;
        });
        
        renderSpaces();
    }

    function updateStatistics() {
        const total = allSpaces.length;
        const available = allSpaces.filter(s => s.is_available).length;
        const totalCapacity = allSpaces.reduce((sum, s) => sum + s.capacity, 0);
        const equipped = allSpaces.filter(s => s.equipment && Object.keys(s.equipment).length > 0).length;
        
        totalSpacesEl.textContent = total;
        availableSpacesEl.textContent = available;
        totalCapacityEl.textContent = totalCapacity;
        equippedSpacesEl.textContent = equipped;
    }

    function renderSpaces() {
        hideStates();
        
        if (filteredSpaces.length === 0) {
            showEmptyState();
            return;
        }
        
        spacesGrid.innerHTML = filteredSpaces.map(space => generateSpaceCard(space)).join('');
        
        // Agregar event listeners a las tarjetas
        document.querySelectorAll('.space-card').forEach(card => {
            card.addEventListener('click', () => {
                const spaceId = parseInt(card.dataset.spaceId);
                showSpaceDetails(spaceId);
            });
        });
        
        document.querySelectorAll('.reserve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const spaceId = parseInt(btn.dataset.spaceId);
                handleQuickReservation(spaceId);
            });
        });
    }

    function generateSpaceCard(space) {
        const availabilityClass = space.is_available 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800';
        
        const availabilityText = space.is_available ? 'Disponible' : 'No disponible';
        
        // Procesar equipamiento
        const equipment = space.equipment || {};
        const equipmentKeys = Object.keys(equipment);
        const equipmentPreview = equipmentKeys.slice(0, 3);
        const hasMoreEquipment = equipmentKeys.length > 3;
        
        // Generar descripción corta
        const shortDescription = space.description 
            ? (space.description.length > 100 
                ? space.description.substring(0, 100) + '...' 
                : space.description)
            : 'Sin descripción disponible';

        return `
            <div class="space-card bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 cursor-pointer group" 
                 data-space-id="${space.id}">
                <!-- Header de la tarjeta -->
                <div class="p-6 border-b border-gray-100">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                ${space.name}
                            </h3>
                            <p class="text-sm text-gray-600 mt-1 line-clamp-2">
                                ${shortDescription}
                            </p>
                        </div>
                        <div class="ml-4">
                            <span class="${availabilityClass} px-2 py-1 rounded-full text-xs font-medium">
                                ${availabilityText}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- Información principal -->
                <div class="p-6 space-y-4">
                    <!-- Capacidad -->
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <div class="bg-blue-100 p-2 rounded-lg">
                                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="text-sm font-medium text-gray-900">Capacidad</p>
                                <p class="text-xs text-gray-500">${space.capacity} personas</p>
                            </div>
                        </div>
                        ${getCapacityIcon(space.capacity)}
                    </div>
                    
                    <!-- Equipamiento -->
                    ${equipmentKeys.length > 0 ? `
                        <div>
                            <p class="text-sm font-medium text-gray-900 mb-2">Equipamiento</p>
                            <div class="flex flex-wrap gap-1">
                                ${equipmentPreview.map(item => `
                                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                        ${formatEquipmentName(item)}
                                    </span>
                                `).join('')}
                                ${hasMoreEquipment ? `
                                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                                        +${equipmentKeys.length - 3} más
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    ` : `
                        <div>
                            <p class="text-sm font-medium text-gray-900 mb-2">Equipamiento</p>
                            <p class="text-xs text-gray-500">Sin equipamiento especificado</p>
                        </div>
                    `}
                </div>
                
                <!-- Footer con acciones -->
                <div class="px-6 py-4 bg-gray-50 rounded-b-xl">
                    <div class="flex items-center justify-between">
                        <button class="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors">
                            Ver detalles
                        </button>
                        ${space.is_available ? `
                            
                        ` : `
                            <button class="px-4 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
                                    disabled>
                                No disponible
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    function getCapacityIcon(capacity) {
        if (capacity <= 5) {
            return `<div class="text-green-500 text-xs font-medium">Pequeño</div>`;
        } else if (capacity <= 15) {
            return `<div class="text-yellow-500 text-xs font-medium">Mediano</div>`;
        } else {
            return `<div class="text-red-500 text-xs font-medium">Grande</div>`;
        }
    }

    function formatEquipmentName(equipment) {
        return equipment
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    function showSpaceDetails(spaceId) {
        const space = allSpaces.find(s => s.id === spaceId);
        if (!space) return;
        
        // Actualizar contenido del modal
        document.getElementById('modal-space-name').textContent = space.name;
        document.getElementById('modal-space-title').textContent = space.name;
        document.getElementById('modal-space-description').textContent = space.description || 'Sin descripción disponible';
        document.getElementById('modal-space-capacity').textContent = `${space.capacity} personas`;
        
        // Indicador de disponibilidad
        const availabilityIndicator = document.getElementById('modal-availability-indicator');
        const availabilityText = document.getElementById('modal-availability-text');
        
        if (space.is_available) {
            availabilityIndicator.className = 'w-3 h-3 rounded-full bg-green-500';
            availabilityText.textContent = 'Disponible';
            availabilityText.className = 'text-sm font-medium text-green-600';
        } else {
            availabilityIndicator.className = 'w-3 h-3 rounded-full bg-red-500';
            availabilityText.textContent = 'No disponible';
            availabilityText.className = 'text-sm font-medium text-red-600';
        }
        
        // Equipamiento
        const equipmentList = document.getElementById('modal-equipment-list');
        const equipment = space.equipment || {};
        const equipmentKeys = Object.keys(equipment);
        
        if (equipmentKeys.length > 0) {
            equipmentList.innerHTML = equipmentKeys.map(item => `
                <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span class="text-sm text-gray-700">${formatEquipmentName(item)}</span>
                </div>
            `).join('');
        } else {
            equipmentList.innerHTML = `
                <div class="col-span-2 text-center py-4">
                    <p class="text-sm text-gray-500">Sin equipamiento especificado</p>
                </div>
            `;
        }
        
        // Configurar botón de reserva
        /*reserveSpaceBtn.dataset.spaceId = spaceId;
        if (space.is_available) {
            reserveSpaceBtn.disabled = false;
            reserveSpaceBtn.className = 'px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2';
        } else {
            reserveSpaceBtn.disabled = true;
            reserveSpaceBtn.className = 'px-6 py-2 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed flex items-center gap-2';
        }*/
        
        // Mostrar modal
        spaceDetailsModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        spaceDetailsModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    /*function handleReservation() {
        const spaceId = reserveSpaceBtn.dataset.spaceId;
        if (!spaceId) return;
        
        // Redirigir a la página de nueva reserva con el espacio preseleccionado
        window.location.href = `/nueva-reserva?space=${spaceId}`;
    }*/

    function handleQuickReservation(spaceId) {
        // Redirigir a la página de nueva reserva con el espacio preseleccionado
        window.location.href = `/nueva-reserva?space=${spaceId}`;
    }

    function handleLogout() {
        if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            // Limpiar datos de sesión
            sessionStorage.clear();
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('currentUser');
            
            // Redirigir al login
            window.location.href = '/login';
        }
    }

    function showLoadingState() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        spacesGrid.innerHTML = '';
    }

    function showEmptyState() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        spacesGrid.innerHTML = '';
    }

    function hideStates() {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
    }

    function showErrorState() {
        hideStates();
        spacesGrid.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16">
                <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Error al cargar espacios</h3>
                <p class="text-gray-500 mb-4">Ha ocurrido un error al intentar cargar los espacios disponibles.</p>
                <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Reintentar
                </button>
            </div>
        `;
    }

    // Funciones de utilidad
    function getAuthToken() {
        return sessionStorage.getItem('authToken') || 
               localStorage.getItem('authToken') || 
               getCookie('authToken');
    }

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function getUserSessionData() {
        // Intentar obtener desde sessionStorage primero
        const sessionUserStr = sessionStorage.getItem('userData');
        if (sessionUserStr) {
            try {
                return JSON.parse(sessionUserStr);
            } catch (e) {
                console.error('Error parsing sessionStorage userData:', e);
            }
        }

        // Intentar desde localStorage
        const localUserStr = localStorage.getItem('userData');
        if (localUserStr) {
            try {
                return JSON.parse(localUserStr);
            } catch (e) {
                console.error('Error parsing localStorage userData:', e);
            }
        }

        // Intentar desde formato UserSession
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const userData = JSON.parse(currentUserStr);
                return {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.name ? userData.name.split(' ')[0] : '',
                    last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : '',
                    company_id: userData.company_id || 1,
                    role: userData.role || 'user',
                    is_active: true
                };
            } catch (e) {
                console.error('Error parsing currentUser data:', e);
            }
        }

        return null;
    }

    function createToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
        const icon = type === 'success' ? 
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>` :
            `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;

        toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 transform transition-all duration-300 translate-x-full`;
        toast.innerHTML = `
            ${icon}
            <span class="text-sm font-medium">${message}</span>
        `;

        toastContainer.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
            toast.classList.add('translate-x-0');
        }, 100);

        // Animar salida y eliminar
        setTimeout(() => {
            toast.classList.remove('translate-x-0');
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, type === 'success' ? 3000 : 4000);
    }

    // Agregar clase CSS para line-clamp si no existe
    if (!document.querySelector('style[data-line-clamp]')) {
        const style = document.createElement('style');
        style.setAttribute('data-line-clamp', 'true');
        style.textContent = `
            .line-clamp-2 {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        `;
        document.head.appendChild(style);
    }
});