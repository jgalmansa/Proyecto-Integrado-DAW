
class UserSession {
    constructor() {
        this.loadUserInfo();
    }

    // Cargar información del usuario al inicializar
    loadUserInfo() {
        console.log('🔍 Cargando información de usuario...');
        
        let userData = this.getCurrentUser();
        console.log('👤 Usuario obtenido:', userData);
        
        if (userData) {
            console.log('🎯 Actualizando header con usuario encontrado');
            this.updateHeaderUserInfo(userData);
        } else {
            console.log('⚠️ No hay usuario logueado');
            this.showDefaultUser();
        }
    }

    // Obtener datos del usuario actual - Compatible con el sistema de login existente
    getCurrentUser() {
        console.log('🔍 Buscando usuario actual...');
        
        // 1. Verificar si hay token de autenticación (indica que hay sesión activa)
        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!authToken) {
            console.log('❌ No hay token de autenticación');
            return null;
        }
        
        console.log('✅ Token encontrado, buscando datos de usuario...');

        // 2. Intentar obtener desde sessionStorage (prioridad porque es más reciente)
        const sessionUserStr = sessionStorage.getItem('userData');
        if (sessionUserStr) {
            try {
                const userData = JSON.parse(sessionUserStr);
                console.log('📍 Usuario encontrado en sessionStorage:', userData);
                return this.normalizeUserData(userData);
            } catch (e) {
                console.error('Error parsing sessionStorage userData:', e);
                sessionStorage.removeItem('userData');
            }
        }

        // 3. Intentar obtener desde localStorage
        const localUserStr = localStorage.getItem('userData');
        if (localUserStr) {
            try {
                const userData = JSON.parse(localUserStr);
                console.log('📍 Usuario encontrado en localStorage:', userData);
                return this.normalizeUserData(userData);
            } catch (e) {
                console.error('Error parsing localStorage userData:', e);
                localStorage.removeItem('userData');
            }
        }

        // 4. Intentar desde formato UserSession (por si se guardó antes)
        const currentUserStr = localStorage.getItem('currentUser');
        if (currentUserStr) {
            try {
                const userData = JSON.parse(currentUserStr);
                console.log('📍 Usuario encontrado en formato UserSession:', userData);
                return userData;
            } catch (e) {
                console.error('Error parsing currentUser data:', e);
                localStorage.removeItem('currentUser');
            }
        }

        // 5. Intentar obtener desde cookies
        const userCookie = this.getCookie('user_session');
        if (userCookie) {
            try {
                const userData = JSON.parse(decodeURIComponent(userCookie));
                console.log('📍 Usuario encontrado en cookies:', userData);
                return this.normalizeUserData(userData);
            } catch (e) {
                console.error('Error parsing cookie user data:', e);
            }
        }

        console.log('❌ Usuario no encontrado en ningún storage');
        return null;
    }

    // Normalizar datos de usuario para que sean consistentes
    normalizeUserData(userData) {
        if (!userData) return null;
        
        // Detectar diferentes formatos de nombre
        let fullName = userData.name || userData.fullName;
        
        // Si no hay nombre completo, construirlo desde firstName/lastName
        if (!fullName && (userData.firstName || userData.lastName)) {
            fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
        
        // Si aún no hay nombre, usar email como fallback
        if (!fullName) {
            fullName = userData.email ? userData.email.split('@')[0] : 'Usuario';
        }
        
        // Detectar rol en diferentes formatos
        const role = userData.role || userData.userRole || userData.type || 'user';
        
        const normalizedUser = {
            id: userData.id,
            name: fullName,
            email: userData.email,
            role: role.toLowerCase()
        };
        
        console.log('🔄 Usuario normalizado:', normalizedUser);
        return normalizedUser;
    }

    // Obtener cookie por nombre
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Actualizar la información del usuario en el header
    updateHeaderUserInfo(userData) {
        console.log('🔄 Actualizando elementos del header...');
        
        // Actualizar nombre y rol
        const nameElement = document.querySelector('.user-name');
        const roleElement = document.querySelector('.user-role');
        const avatarElement = document.querySelector('.user-avatar');

        console.log('📍 Elementos encontrados:', {
            nombre: !!nameElement,
            rol: !!roleElement, 
            avatar: !!avatarElement
        });

        if (nameElement) {
            const userName = userData.name || userData.fullName || 'Usuario';
            nameElement.textContent = userName;
            console.log('✅ Nombre actualizado:', userName);
        } else {
            console.error('❌ No se encontró elemento .user-name');
        }

        if (roleElement) {
            const userRole = this.translateRole(userData.role || 'user');
            roleElement.textContent = userRole;
            console.log('✅ Rol actualizado:', userRole);
        } else {
            console.error('❌ No se encontró elemento .user-role');
        }

        if (avatarElement) {
            const initials = this.generateInitials(userData.name || userData.fullName || 'Usuario');
            avatarElement.textContent = initials;
            console.log('✅ Avatar actualizado:', initials);
        } else {
            console.error('❌ No se encontró elemento .user-avatar');
        }

        console.log('🎉 Usuario cargado exitosamente:', userData.name, '-', this.translateRole(userData.role));
    }

    // Mostrar usuario por defecto cuando no hay sesión
    showDefaultUser() {
        const nameElement = document.querySelector('.user-name');
        const roleElement = document.querySelector('.user-role');
        const avatarElement = document.querySelector('.user-avatar');

        if (nameElement) {
            nameElement.textContent = 'Usuario Invitado';
        }

        if (roleElement) {
            roleElement.textContent = 'Sin sesión';
        }

        if (avatarElement) {
            avatarElement.textContent = 'UI';
        }

        console.log('No hay usuario logueado - mostrando usuario por defecto');
    }

    // Generar iniciales del nombre
    generateInitials(fullName) {
        return fullName
            .split(' ')
            .map(name => name.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    // Traducir roles al español
    translateRole(role) {
        const roleTranslations = {
            'admin': 'Administrador',
            'administrator': 'Administrador',
            'user': 'Usuario',
            'manager': 'Gestor',
            'employee': 'Empleado',
            'guest': 'Invitado'
        };
        return roleTranslations[role.toLowerCase()] || 'Usuario';
    }

    // Guardar datos del usuario (método estático para usar en login)
    static saveUserSession(userData) {
        try {
            // Guardar en localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            // También guardar en cookie (opcional)
            const expires = new Date();
            expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 horas
            document.cookie = `user_session=${encodeURIComponent(JSON.stringify(userData))}; expires=${expires.toUTCString()}; path=/`;
            
            console.log('Sesión de usuario guardada:', userData.name);
            return true;
        } catch (e) {
            console.error('Error guardando sesión de usuario:', e);
            return false;
        }
    }

    // Cerrar sesión (método estático)
    static logout() {
        try {
            // Limpiar localStorage
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
            
            // Limpiar cookies
            document.cookie = 'user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            
            console.log('Sesión cerrada');
            
            // Redirigir al login o recargar página
            // window.location.href = '/login.html';
            window.location.reload(); // Por ahora solo recarga
        } catch (e) {
            console.error('Error cerrando sesión:', e);
        }
    }

    // Verificar si hay usuario logueado
    static isLoggedIn() {
        const userStr = localStorage.getItem('currentUser');
        return userStr !== null;
    }

    // Obtener usuario actual (método estático)
    static getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('Error parsing user data:', e);
                return null;
            }
        }
        return null;
    }
}

// Inicializar cuando carga la página
document.addEventListener('DOMContentLoaded', () => {
    new UserSession();
});

// Función de prueba para simular diferentes usuarios
function testUsers() {
    const users = [
        {
            id: 1,
            name: "María González",
            email: "maria@coworkly.com",
            role: "admin"
        },
        {
            id: 2,
            name: "Carlos Martín",
            email: "carlos@coworkly.com",
            role: "user"
        },
        {
            id: 3,
            name: "Ana García",
            email: "ana@coworkly.com",
            role: "manager"
        }
    ];

    return users;
}

// Función para probar diferentes usuarios (solo para desarrollo)
function switchUser(userIndex = 0) {
    const users = testUsers();
    const user = users[userIndex] || users[0];
    
    UserSession.saveUserSession(user);
    window.location.reload();
}

// Hacer disponibles las funciones para usar en consola (solo desarrollo)
window.UserSession = UserSession;
window.switchUser = switchUser;
window.testUsers = testUsers;