document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let workspaces = [];
    let currentCompanyId = null;
    let currentUserId = null;
    let currentUserRole = null;

    // Base URL de tu API (ajusta según tu configuración)
    const API_BASE_URL = '/api'; // o 'http://localhost:3000/api' si usas puerto diferente

    // Elementos del DOM
    const workspacesList = document.getElementById('workspaces-list');
    const addWorkspaceBtn = document.getElementById('add-workspace-btn');
    const workspaceModal = document.getElementById('workspace-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelWorkspaceBtn = document.getElementById('cancel-workspace');
    const saveWorkspaceBtn = document.getElementById('save-workspace');
    const workspaceForm = document.getElementById('workspace-form');
    const modalTitle = document.getElementById('modal-title');

    // Inicializar la página
    init();

    function init() {
        // Verificar sesión y rol de administrador
        checkAdminSession();
        
        // Cargar espacios
        loadWorkspaces();
        
        // Configurar eventos
        setupEventListeners();
    }

    function checkAdminSession() {
        const userData = getUserSessionData();
        if (!userData || userData.role !== 'admin') {
            window.location.href = '/dashboard'; 
            return;
        }
        currentCompanyId = userData.company_id;
        currentUserId = userData.id;
        currentUserRole = userData.role;
    }

    async function loadWorkspaces() {
        showLoadingState();
        
        try {
            const data = await fetchWorkspaces();
            workspaces = data;
            renderWorkspaces();
        } catch (error) {
            console.error('Error cargando espacios:', error);
            showErrorState(error.message);
        }
    }

    // Función real para obtener espacios de trabajo
    async function fetchWorkspaces() {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/workspaces?company_id=${currentCompanyId}`, {
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
            return data.workspaces || data; // Ajustar según la estructura de tu respuesta
        } catch (error) {
            console.error('Error en fetchWorkspaces:', error);
            throw new Error('Error al cargar los espacios de trabajo');
        }
    }

    function renderWorkspaces() {
        if (workspaces.length === 0) {
            workspacesList.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center">
                        <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                        </svg>
                        <p class="text-sm text-gray-500">No hay espacios registrados</p>
                        <button id="add-first-workspace" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                            Añadir primer espacio
                        </button>
                    </td>
                </tr>
            `;
            
            document.getElementById('add-first-workspace')?.addEventListener('click', () => {
                openAddWorkspaceModal();
            });
            
            return;
        }

        workspacesList.innerHTML = workspaces.map(workspace => `
            <tr class="hover:bg-gray-50">
                <td class="py-4 px-4 font-medium text-gray-900">${workspace.name}</td>
                <td class="py-4 px-4 text-gray-600">${workspace.description || 'N/A'}</td>
                <td class="py-4 px-4">${workspace.capacity}</td>
                <td class="py-4 px-4">
                    <span class="${workspace.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded-full text-xs font-medium">
                        ${workspace.is_available ? 'Disponible' : 'No disponible'}
                    </span>
                </td>
                <td class="py-4 px-4">
                    <div class="flex items-center space-x-2">
                        <button class="edit-workspace text-blue-600 hover:text-blue-800 text-sm font-medium" data-id="${workspace.id}">
                            Editar
                        </button>
                        <button class="delete-workspace text-red-600 hover:text-red-800 text-sm font-medium" data-id="${workspace.id}">
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Agregar eventos a los botones de editar y eliminar
        document.querySelectorAll('.edit-workspace').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workspaceId = parseInt(e.target.getAttribute('data-id'));
                openEditWorkspaceModal(workspaceId);
            });
        });

        document.querySelectorAll('.delete-workspace').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workspaceId = parseInt(e.target.getAttribute('data-id'));
                deleteWorkspace(workspaceId);
            });
        });
    }

    function showLoadingState() {
        workspacesList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-sm text-gray-500 mt-2">Cargando espacios...</p>
                </td>
            </tr>
        `;
    }

    function showErrorState(errorMessage) {
        workspacesList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center">
                    <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p class="text-sm text-gray-700 mb-2">Error al cargar los espacios</p>
                    <p class="text-xs text-gray-500 mb-4">${errorMessage}</p>
                    <button id="retry-loading" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Reintentar
                    </button>
                </td>
            </tr>
        `;
        
        document.getElementById('retry-loading')?.addEventListener('click', loadWorkspaces);
    }

    function setupEventListeners() {
        // Abrir modal para añadir espacio
        addWorkspaceBtn.addEventListener('click', openAddWorkspaceModal);
        
        // Cerrar modal
        closeModalBtn.addEventListener('click', closeWorkspaceModal);
        cancelWorkspaceBtn.addEventListener('click', closeWorkspaceModal);
        
        // Guardar espacio
        saveWorkspaceBtn.addEventListener('click', saveWorkspace);
    }

    function openAddWorkspaceModal() {
        modalTitle.textContent = 'Añadir Nuevo Espacio';
        workspaceForm.reset();
        document.getElementById('workspace-id').value = '';
        workspaceModal.classList.remove('hidden');
    }

    function openEditWorkspaceModal(workspaceId) {
        const workspace = workspaces.find(w => w.id === workspaceId);
        if (!workspace) return;

        modalTitle.textContent = 'Editar Espacio';
        document.getElementById('workspace-id').value = workspace.id;
        document.getElementById('workspace-name').value = workspace.name;
        document.getElementById('workspace-description').value = workspace.description || '';
        document.getElementById('workspace-capacity').value = workspace.capacity;
        document.getElementById('workspace-available').value = workspace.is_available;
        
        // Manejar equipamiento (si es JSON o string)
        let equipmentString = '';
        if (workspace.equipment) {
            if (typeof workspace.equipment === 'object') {
                equipmentString = Object.keys(workspace.equipment).join(', ');
            } else {
                equipmentString = workspace.equipment;
            }
        }
        document.getElementById('workspace-equipment').value = equipmentString;
        
        workspaceModal.classList.remove('hidden');
    }

    function closeWorkspaceModal() {
        workspaceModal.classList.add('hidden');
    }

    async function saveWorkspace() {
        const workspaceId = document.getElementById('workspace-id').value;
        const name = document.getElementById('workspace-name').value.trim();
        const description = document.getElementById('workspace-description').value.trim();
        const capacity = parseInt(document.getElementById('workspace-capacity').value);
        const isAvailable = document.getElementById('workspace-available').value === 'true';
        
        const equipmentInput = document.getElementById('workspace-equipment').value;
        const equipment = {};
        equipmentInput.split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0)
            .forEach(e => equipment[e] = true);

        // Validaciones básicas
        if (!name || isNaN(capacity) || capacity < 1) {
            alert('Por favor complete todos los campos requeridos correctamente.');
            return;
        }

        const workspaceData = {
            name,
            description,
            capacity,
            is_available: isAvailable,
            equipment,
            company_id: currentCompanyId
        };

        try {
            // Deshabilitar botón mientras se procesa
            saveWorkspaceBtn.disabled = true;
            saveWorkspaceBtn.textContent = 'Guardando...';

            if (workspaceId) {
                // Editar espacio existente
                await updateWorkspace(parseInt(workspaceId), workspaceData);
            } else {
                // Crear nuevo espacio
                await createWorkspace(workspaceData);
            }
        } catch (error) {
            console.error('Error guardando espacio:', error);
            showErrorToast('Error al guardar el espacio. Por favor intenta de nuevo.');
        } finally {
            // Rehabilitar botón
            saveWorkspaceBtn.disabled = false;
            saveWorkspaceBtn.textContent = 'Guardar';
        }
    }

    // Función real para crear espacio de trabajo
    async function createWorkspace(workspaceData) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/workspaces`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workspaceData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const newWorkspace = await response.json();
            
            // Actualizar la lista local
            workspaces.push(newWorkspace.workspace || newWorkspace);
            renderWorkspaces();
            closeWorkspaceModal();
            
            showSuccessToast('Espacio creado correctamente');
        } catch (error) {
            console.error('Error en createWorkspace:', error);
            throw error;
        }
    }

    // Función real para actualizar espacio de trabajo
    async function updateWorkspace(id, workspaceData) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(workspaceData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const updatedWorkspace = await response.json();
            
            // Actualizar la lista local
            const index = workspaces.findIndex(w => w.id === id);
            if (index !== -1) {
                workspaces[index] = updatedWorkspace.workspace || updatedWorkspace;
            }
            
            renderWorkspaces();
            closeWorkspaceModal();
            
            showSuccessToast('Espacio actualizado correctamente');
        } catch (error) {
            console.error('Error en updateWorkspace:', error);
            throw error;
        }
    }

    function showSuccessToast(message = 'Acción completada correctamente') {
        const toast = document.getElementById('success-toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');

            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
            }, 3000);
        } else {
            // Crear toast dinámico si no existe
            createToast(message, 'success');
        }
    }

    function showErrorToast(message = 'Ha ocurrido un error') {
        const toast = document.getElementById('error-toast');
        if (toast) {
            toast.textContent = message;
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');

            setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
            }, 4000);
        } else {
            // Crear toast dinámico si no existe
            createToast(message, 'error');
        }
    }

    // Función para crear toasts dinámicos
    function createToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container') || createToastContainer();
        
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

    // Crear contenedor de toasts si no existe
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
        return container;
    }

    // Función para mostrar modal de confirmación
    function showDeleteConfirmation(workspaceId, workspaceName) {
        // Crear overlay del modal
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50';
        modalOverlay.id = 'delete-confirmation-modal';
        
        // HTML del modal
        modalOverlay.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 transform transition-all">
                <div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                    <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 text-center mb-2">
                    Eliminar Espacio
                </h3>
                <p class="text-sm text-gray-500 text-center mb-6">
                    ¿Estás seguro de que deseas eliminar el espacio <span class="font-medium text-gray-700">"${workspaceName}"</span>? 
                    Esta acción no se puede deshacer.
                </p>
                <div class="flex space-x-3">
                    <button id="cancel-delete" class="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirm-delete" class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors">
                        Eliminar
                    </button>
                </div>
            </div>
        `;

        // Agregar al DOM
        document.body.appendChild(modalOverlay);

        // Función para cerrar modal
        const closeModal = () => {
            modalOverlay.remove();
        };

        // Event listeners
        document.getElementById('cancel-delete').addEventListener('click', closeModal);
        
        document.getElementById('confirm-delete').addEventListener('click', async () => {
            const confirmBtn = document.getElementById('confirm-delete');
            
            // Mostrar estado de carga
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Eliminando...
            `;
            
            try {
                await performDeleteWorkspace(workspaceId);
                closeModal();
            } catch (error) {
                // Restaurar botón en caso de error
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Eliminar';
                // El error ya se maneja en performDeleteWorkspace
            }
        });

        // Cerrar al hacer clic fuera del modal
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });

        // Cerrar con Escape
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
    }

    // Función real para eliminar espacio de trabajo
    async function deleteWorkspace(id) {
        const workspace = workspaces.find(w => w.id === id);
        if (!workspace) return;
        
        showDeleteConfirmation(id, workspace.name);
    }

    // Función separada para realizar la eliminación
    async function performDeleteWorkspace(id) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/workspaces/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            // Actualizar la lista local
            workspaces = workspaces.filter(w => w.id !== id);
            renderWorkspaces();
            
            showSuccessToast('Espacio eliminado correctamente');
        } catch (error) {
            console.error('Error eliminando espacio:', error);
            showErrorToast('Error al eliminar el espacio. Por favor intenta de nuevo.');
            throw error; // Re-throw para que el modal maneje el estado del botón
        }
    }

    // Función para obtener token de autenticación
    function getAuthToken() {
        // Buscar token en sessionStorage primero, luego localStorage
        return sessionStorage.getItem('authToken') || 
               localStorage.getItem('authToken') || 
               getCookie('authToken');
    }

    // Función para obtener cookie
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Función para obtener datos de sesión del usuario (compatible con UserSession)
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
                // Normalizar datos para compatibilidad
                return {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.name ? userData.name.split(' ')[0] : '',
                    last_name: userData.name ? userData.name.split(' ').slice(1).join(' ') : '',
                    company_id: userData.company_id || 1, // Ajustar según tu estructura
                    role: userData.role || 'user',
                    is_active: true
                };
            } catch (e) {
                console.error('Error parsing currentUser data:', e);
            }
        }

        // Fallback para desarrollo/testing
        return {
            id: 1,
            email: "admin@example.com",
            first_name: "Admin",
            last_name: "User",
            company_id: 1,
            role: "admin",
            is_active: true
        };
    }
});