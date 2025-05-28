document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let users = [];
    let currentCompanyId = null;
    let currentUserId = null;
    let currentUserRole = null;
    let companyInvitationCode = null;

    // Base URL de tu API (ajusta según tu configuración)
    const API_BASE_URL = '/api'; // o 'http://localhost:3000/api' si usas puerto diferente

    // Elementos del DOM
    const usersList = document.getElementById('users-list');
    const userModal = document.getElementById('user-modal');
    const closeUserModalBtn = document.getElementById('close-user-modal');
    const cancelUserBtn = document.getElementById('cancel-user');
    const saveUserBtn = document.getElementById('save-user');
    const userForm = document.getElementById('user-form');
    const userModalTitle = document.getElementById('user-modal-title');
    const passwordFields = document.getElementById('password-fields');
    // Código de invitación - Añadir estas líneas
    const copyInvitationCodeBtn = document.getElementById('copy-invitation-code');

    if (copyInvitationCodeBtn) {
        copyInvitationCodeBtn.addEventListener('click', copyInvitationCode);
    }

    // Botón para crear nuevo usuario
    const newUserBtn = document.getElementById('new-user-btn');
    if (newUserBtn) {
        newUserBtn.addEventListener('click', openNewUserModal);
    }
    
    // Inicializar la página
    init();

    function init() {
        console.log('Usuario actual:', getUserSessionData());
        // Verificar sesión y rol de administrador
        checkAdminSession();
       
        // Cargar usuarios
        loadUsers();
        loadInvitationCode();
       
        // Configurar eventos
        setupEventListeners();
    }

    function checkAdminSession() {
        const userData = getUserSessionData();
        console.log('Datos del usuario:', userData); // Debug
        
        if (!userData || userData.role !== 'admin') {
            window.location.href = '/dashboard';
            return;
        }
        
        // Asegurarnos de que company_id es un número
        currentCompanyId = Number(userData.company_id);
        currentUserId = Number(userData.id);
        currentUserRole = userData.role;
        
        console.log(`ID de compañía: ${currentCompanyId}, ID de usuario: ${currentUserId}, Rol: ${currentUserRole}`); // Debug
        
        if (!currentCompanyId || isNaN(currentCompanyId)) {
            console.error('ID de compañía inválido:', currentCompanyId);
            showErrorToast('Error de configuración de cuenta. Por favor contacta al administrador.');
            // Puedes redirigir a una página de error o forzar logout
            // window.location.href = '/logout';
        }
    }

    // Función para cargar el código de invitación
async function loadInvitationCode() {
    console.log('currentCompanyId:', currentCompanyId); // Debug
    try {
        const token = getAuthToken();
        console.log('URL being called:', `${API_BASE_URL}/companies/${currentCompanyId}/invitation-code`); // Debug
        
        const response = await fetch(`${API_BASE_URL}/companies/${currentCompanyId}/invitation-code`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar el código de invitación');
        }

        const data = await response.json();
        companyInvitationCode = data.invitation_code;
        const invitationCodeDisplay = document.getElementById('invitation-code');
        if (invitationCodeDisplay) {
            invitationCodeDisplay.textContent = companyInvitationCode;
        }
    } catch (error) {
        console.error('Error cargando código de invitación:', error);
        const invitationCodeDisplay = document.getElementById('invitation-code');
        if (invitationCodeDisplay) {
            invitationCodeDisplay.textContent = 'Error al cargar';
        }
    }
}

// Función para copiar el código de invitación
async function copyInvitationCode() {
    try {
        await navigator.clipboard.writeText(companyInvitationCode);
        
        const copyInvitationCodeBtn = document.getElementById('copy-invitation-code');
        // Cambiar el texto del botón temporalmente para dar feedback
        const originalText = copyInvitationCodeBtn.innerHTML;
        copyInvitationCodeBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>¡Copiado!</span>
        `;
        copyInvitationCodeBtn.classList.add('bg-green-600');
        copyInvitationCodeBtn.classList.remove('bg-blue-600');
        
        setTimeout(() => {
            copyInvitationCodeBtn.innerHTML = originalText;
            copyInvitationCodeBtn.classList.remove('bg-green-600');
            copyInvitationCodeBtn.classList.add('bg-blue-600');
        }, 2000);
        
    } catch (error) {
        console.error('Error copiando código:', error);
        showErrorToast('No se pudo copiar el código al portapapeles');
    }
}

    async function loadUsers() {
        showLoadingState();
       
        try {
            const data = await fetchUsers();
            users = data;
            renderUsers();
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            showErrorState(error.message);
        }
    }

    async function fetchUsers() {
        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('No hay token de autenticación disponible');
            }

            if (!currentCompanyId || isNaN(currentCompanyId)) {
                throw new Error('ID de compañía inválido');
            }

            console.log(`Fetching users for company ${currentCompanyId}`);
            const response = await fetch(`${API_BASE_URL}/users?company_id=${currentCompanyId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Estructura de la respuesta:', {
                status: response.status,
                data: data,
                isArray: Array.isArray(data),
                hasUsers: !!data.users,
                usersIsArray: Array.isArray(data.users)
            });

            // Asegurarnos de que siempre trabajamos con un array
            if (Array.isArray(data)) {
                return data;
            } else if (data.users && Array.isArray(data.users)) {
                return data.users;
            } else if (data.data && Array.isArray(data.data)) {
                return data.data;
            } else {
                console.error('Formato de respuesta inesperado:', data);
                return [];
            }
        } catch (error) {
            console.error('Error en fetchUsers:', error);
            throw new Error(error.message || 'Error al cargar los usuarios');
        }
    }

    function renderUsers() {
        // Asegurarnos de que users es un array
        if (!Array.isArray(users)) {
            console.error('Users no es un array:', users);
            users = [];
        }

        if (users.length === 0) {
            usersList.innerHTML = `
                <tr>
                    <td colspan="5" class="py-8 text-center">
                        <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"></path>
                        </svg>
                        <p class="text-sm text-gray-500">No hay usuarios registrados</p>
                    </td>
                </tr>
            `;
           
            return;
        }

        usersList.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50">
                <td class="py-4 px-4 font-medium text-gray-900">${user.first_name} ${user.last_name}</td>
                <td class="py-4 px-4 text-gray-600">${user.email}</td>
                <td class="py-4 px-4">
                    <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium capitalize">
                        ${user.role}
                    </span>
                </td>
                <td class="py-4 px-4">
                    <span class="${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} px-2 py-1 rounded-full text-xs font-medium">
                        ${user.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td class="py-4 px-4">
                    <div class="flex items-center space-x-2">
                        <button class="edit-user text-blue-600 hover:text-blue-800 text-sm font-medium" data-id="${user.id}">
                            Editar
                        </button>
                        <button class="delete-user text-red-600 hover:text-red-800 text-sm font-medium" data-id="${user.id}">
                            Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Agregar eventos a los botones de editar y eliminar
        document.querySelectorAll('.edit-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.target.getAttribute('data-id'));
                openEditUserModal(userId);
            });
        });

        document.querySelectorAll('.delete-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = parseInt(e.target.getAttribute('data-id'));
                deleteUser(userId);
            });
        });
    }

    function showLoadingState() {
        usersList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="text-sm text-gray-500 mt-2">Cargando usuarios...</p>
                </td>
            </tr>
        `;
    }

    function showErrorState(errorMessage) {
        usersList.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center">
                    <svg class="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                    <p class="text-sm text-gray-700 mb-2">Error al cargar los usuarios</p>
                    <p class="text-xs text-gray-500 mb-4">${errorMessage}</p>
                    <button id="retry-loading" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Reintentar
                    </button>
                </td>
            </tr>
        `;
       
        document.getElementById('retry-loading')?.addEventListener('click', loadUsers);
    }

    function setupEventListeners() {
        // Cerrar modal
        closeUserModalBtn.addEventListener('click', closeUserModal);
        cancelUserBtn.addEventListener('click', closeUserModal);
       
        // Guardar usuario
        console.log('saveUserBtn:', saveUserBtn);
        saveUserBtn.addEventListener('click', saveUser);

        // Cerrar modal al hacer clic fuera
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) {
                closeUserModal();
            }
        });

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !userModal.classList.contains('hidden')) {
                closeUserModal();
            }
        });

        // Botón para crear nuevo usuario (AGREGAR ESTO)
        const newUserBtn = document.getElementById('new-user-btn'); // Ajusta el ID según tu HTML
        if (newUserBtn) {
            newUserBtn.addEventListener('click', openNewUserModal);
        }
    }

    function openEditUserModal(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;
    
        userModalTitle.textContent = 'Editar Usuario';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-first-name').value = user.first_name;
        document.getElementById('user-last-name').value = user.last_name;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-status').value = user.is_active.toString();
        
        // Ocultar campos de contraseña para edición y limpiar completamente
        passwordFields.style.display = 'none';
        const passwordInput = document.getElementById('user-password');
        const confirmPasswordInput = document.getElementById('user-confirm-password');
        
        if (passwordInput) {
            passwordInput.removeAttribute('required');
            passwordInput.value = ''; // Limpiar el campo
            passwordInput.disabled = true; // Deshabilitar para que no se envíe
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.removeAttribute('required');
            confirmPasswordInput.value = ''; // Limpiar el campo
            confirmPasswordInput.disabled = true; // Deshabilitar para que no se envíe
        }
        
        userModal.classList.remove('hidden');
        
        // Focus en el primer campo
        setTimeout(() => {
            document.getElementById('user-first-name').focus();
        }, 100);
    }



    function closeUserModal() {
        userModal.classList.add('hidden');
        userForm.reset();
        
        // Rehabilitar campos por si quedaron deshabilitados
        const passwordInput = document.getElementById('user-password');
        const confirmPasswordInput = document.getElementById('user-confirm-password');
        
        if (passwordInput) {
            passwordInput.disabled = false;
        }
        if (confirmPasswordInput) {
            confirmPasswordInput.disabled = false;
        }
    }

    // Función corregida para guardar usuario
    async function saveUser() {
        const userId = document.getElementById('user-id').value;
        const firstName = document.getElementById('user-first-name').value.trim();
        const lastName = document.getElementById('user-last-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const role = document.getElementById('user-role').value;
        const isActive = document.getElementById('user-status').value === 'true';
        
        // Solo obtener contraseña si los campos están habilitados y visibles
        const passwordInput = document.getElementById('user-password');
        const confirmPasswordInput = document.getElementById('user-confirm-password');
        const password = (passwordInput && !passwordInput.disabled) ? passwordInput.value : '';
        const confirmPassword = (confirmPasswordInput && !confirmPasswordInput.disabled) ? confirmPasswordInput.value : '';
    
        // Validaciones básicas
        if (!firstName || !email) {
            showErrorToast('Por favor complete todos los campos requeridos.');
            return;
        }
    
        // Validar email
        if (!isValidEmail(email)) {
            showErrorToast('Por favor ingresa un email válido.');
            return;
        }
    
        // Validar contraseña solo si se proporciona
        if (password && password.trim() !== '') {
            if (password.length < 8) {
                showErrorToast('La contraseña debe tener al menos 8 caracteres.');
                return;
            }
    
            if (password !== confirmPassword) {
                showErrorToast('Las contraseñas no coinciden.');
                return;
            }
        }
    
        // Preparar datos usando los nombres correctos de campos
        const userData = {
            first_name: firstName,
            last_name: lastName,
            email: email.toLowerCase(),
            role,
            is_active: isActive
        };
    
        // IMPORTANTE: Solo agregar contraseña si realmente se proporcionó una nueva y está habilitada
        if (password && password.trim() !== '' && passwordInput && !passwordInput.disabled) {
            userData.password = password;
        }
    
        console.log('Datos a enviar (filtrados):', userData); // Debug
    
        try {
            // Deshabilitar botón mientras se procesa
            saveUserBtn.disabled = true;
            saveUserBtn.textContent = 'Guardando...';
    
            if (userId) {
                // Editar usuario existente
                await updateUser(parseInt(userId), userData);
            } else {
                // Para crear usuario, la contraseña es obligatoria
                if (!password || password.trim() === '') {
                    showErrorToast('La contraseña es obligatoria para crear un nuevo usuario.');
                    return;
                }
                userData.company_id = currentCompanyId;
                await createUser(userData);
            }
        } catch (error) {
            console.error('Error guardando usuario:', error);
            showErrorToast(error.message || 'Error al guardar el usuario. Por favor intenta de nuevo.');
        } finally {
            // Rehabilitar botón
            saveUserBtn.disabled = false;
            saveUserBtn.textContent = 'Guardar';
        }
    }


    // Función real para crear usuario
    async function createUser(userData) {
        try {
            const token = getAuthToken();
    
            console.log('Creando usuario con datos:', userData); // Debug
    
            // Para crear usuarios usar el endpoint correcto
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }
    
            const result = await response.json();
            const newUser = result.data || result.user || result;
    
            // Actualizar la lista local
            users.push(newUser);
            renderUsers();
            closeUserModal();
    
            showSuccessToast('Usuario creado correctamente');
        } catch (error) {
            console.error('Error en createUser:', error);
            throw error;
        }
    }


    // Función real para actualizar usuario
    async function updateUser(id, userData) {
        try {
            const token = getAuthToken();
            
            console.log(`Actualizando usuario ${id} con datos:`, userData); // Debug
            
            const response = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
    
            console.log('Response status:', response.status); // Debug
    
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData); // Debug
                throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
            }
    
            const result = await response.json();
            console.log('Update result:', result); // Debug
            
            // Manejar la respuesta correctamente
            const updatedUser = result.data || result;
            
            // Actualizar usuario en la lista local
            const userIndex = users.findIndex(u => u.id === id);
            if (userIndex !== -1) {
                users[userIndex] = updatedUser;
            }
            
            renderUsers();
            closeUserModal();
            
            showSuccessToast('Usuario actualizado correctamente');
        } catch (error) {
            console.error('Error en updateUser:', error);
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
    function showDeleteConfirmation(userId, userName) {
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
                    Eliminar Usuario
                </h3>
                <p class="text-sm text-gray-500 text-center mb-6">
                    ¿Estás seguro de que deseas eliminar al usuario <span class="font-medium text-gray-700">"${userName}"</span>? 
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
                await performDeleteUser(userId);
                closeModal();
            } catch (error) {
                // Restaurar botón en caso de error
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Eliminar';
                // El error ya se maneja en performDeleteUser
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

    // Función para eliminar usuario
    async function deleteUser(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        // Prevenir que el admin se elimine a sí mismo
        if (userId === currentUserId) {
            showErrorToast('No puedes eliminar tu propio usuario.');
            return;
        }

        showDeleteConfirmation(userId, `${user.first_name} ${user.last_name}`);
    }

    // Función separada para realizar la eliminación
    async function performDeleteUser(userId) {
        try {
            const token = getAuthToken();
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
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

            // Remover usuario de la lista local
            users = users.filter(u => u.id !== userId);
            renderUsers();
           
            showSuccessToast('Usuario eliminado correctamente');
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            showErrorToast('Error al eliminar el usuario. Por favor intenta de nuevo.');
            throw error; // Re-throw para que el modal maneje el estado del botón
        }
    }

    // Función para validar email
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
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
    // Función mejorada para obtener datos de sesión del usuario
    function getUserSessionData() {
        // 1. Intentar obtener desde sessionStorage
        const sessionUserStr = sessionStorage.getItem('userData');
        if (sessionUserStr) {
            try {
                const userData = JSON.parse(sessionUserStr);
                console.log('User data from sessionStorage:', userData);
                return {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name || userData.name?.split(' ')[0] || '',
                    last_name: userData.last_name || userData.name?.split(' ').slice(1).join(' ') || '',
                    company_id: userData.company_id || userData.companyId || userData.company?.id || 1,
                    role: userData.role || 'user',
                    is_active: userData.is_active !== undefined ? userData.is_active : true
                };
                
            } catch (e) {
                console.error('Error parsing sessionStorage userData:', e);
            }
        }

        // 2. Intentar desde localStorage
        const localUserStr = localStorage.getItem('userData');
        if (localUserStr) {
            try {
                const userData = JSON.parse(localUserStr);
                console.log('User data from localStorage:', userData);
                return {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name || userData.name?.split(' ')[0] || '',
                    last_name: userData.last_name || userData.name?.split(' ').slice(1).join(' ') || '',
                    company_id: userData.company_id || userData.company?.id || 1,
                    role: userData.role || 'user',
                    is_active: userData.is_active !== undefined ? userData.is_active : true
                };
            } catch (e) {
                console.error('Error parsing localStorage userData:', e);
            }
        }

        // 3. Intentar desde formato UserSession
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const userData = JSON.parse(currentUserStr);
                console.log('User data from currentUser:', userData);
                return {
                    id: userData.id,
                    email: userData.email,
                    first_name: userData.first_name || userData.name?.split(' ')[0] || '',
                    last_name: userData.last_name || userData.name?.split(' ').slice(1).join(' ') || '',
                    company_id: userData.company_id || userData.company?.id || 1,
                    role: userData.role || 'user',
                    is_active: userData.is_active !== undefined ? userData.is_active : true
                };
            } catch (e) {
                console.error('Error parsing currentUser data:', e);
            }
        }

        console.error('No se pudo obtener la información del usuario de ninguna fuente');
        
        // Fallback para desarrollo/testing (solo en entorno de desarrollo)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.warn('Usando datos de usuario de prueba para desarrollo');
            return {
                id: 1,
                email: "admin@example.com",
                first_name: "Admin",
                last_name: "User",
                company_id: 1,  // Asegúrate de que este ID existe en tu base de datos
                role: "admin",
                is_active: true
            };
        }

        // Redirigir al login si no hay datos de usuario
        window.location.href = '/login';
        return null;
    }

});


function openNewUserModal() {
    userModalTitle.textContent = 'Crear Nuevo Usuario';
    
    // Limpiar todos los campos
    document.getElementById('user-id').value = '';
    document.getElementById('user-first-name').value = '';
    document.getElementById('user-last-name').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-role').value = 'user';
    document.getElementById('user-status').value = 'true';
    
    // Mostrar y habilitar campos de contraseña para nuevo usuario
    passwordFields.style.display = 'block';
    const passwordInput = document.getElementById('user-password');
    const confirmPasswordInput = document.getElementById('user-confirm-password');
    
    if (passwordInput) {
        passwordInput.setAttribute('required', 'required');
        passwordInput.value = '';
        passwordInput.disabled = false; // Habilitar para nuevo usuario
    }
    if (confirmPasswordInput) {
        confirmPasswordInput.setAttribute('required', 'required');
        confirmPasswordInput.value = '';
        confirmPasswordInput.disabled = false; // Habilitar para nuevo usuario
    }
    
    userModal.classList.remove('hidden');
    
    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('user-first-name').focus();
    }, 100);
}