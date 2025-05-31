// ==============================================
// SIDEBAR RESPONSIVE CORREGIDO
// ==============================================

class ResponsiveSidebar {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebar-overlay');
        this.toggleButton = document.getElementById('sidebar-toggle');
        this.notificationsMobile = document.getElementById('notifications-mobile');
        
        this.isMobileOpen = false;
        this.init();
    }

    init() {
        // Verificar que los elementos existen
        if (!this.sidebar) {
            //console.error('❌ Elemento #sidebar no encontrado');
            return;
        }
        if (!this.overlay) {
            //console.error('❌ Elemento #sidebar-overlay no encontrado');
            return;
        }
        if (!this.toggleButton) {
            //console.error('❌ Elemento #sidebar-toggle no encontrado');
            return;
        }

        this.setupEventListeners();
        this.syncNotifications();
        this.handleResize();
        
        // Manejar cambios de tamaño
        window.addEventListener('resize', () => this.handleResize());
        
        //console.log('✅ Sidebar responsive inicializado correctamente');
    }

    setupEventListeners() {
        // Botón hamburguesa
        this.toggleButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMobileSidebar();
        });

        // Overlay para cerrar
        this.overlay.addEventListener('click', () => {
            this.closeMobileSidebar();
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isMobileOpen) {
                this.closeMobileSidebar();
            }
        });

        // Enlaces del sidebar cierran el menú en móvil
        const sidebarLinks = this.sidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (this.isMobile()) {
                    // Pequeño delay para permitir que la navegación empiece
                    setTimeout(() => this.closeMobileSidebar(), 100);
                }
            });
        });

        // Notificaciones móvil redirige a página de notificaciones
        if (this.notificationsMobile) {
            this.notificationsMobile.addEventListener('click', () => {
                window.location.href = '/notifications';
            });
        }
    }

    isMobile() {
        return window.innerWidth < 1024;
    }

    toggleMobileSidebar() {
        if (this.isMobileOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        if (!this.isMobile()) return;

        this.isMobileOpen = true;
        this.sidebar.classList.add('mobile-open');
        this.overlay.classList.add('active');
        document.body.classList.add('sidebar-mobile-open');
        
        //console.log('✅ Sidebar móvil abierto');
    }

    closeMobileSidebar() {
        this.isMobileOpen = false;
        this.sidebar.classList.remove('mobile-open');
        this.overlay.classList.remove('active');
        document.body.classList.remove('sidebar-mobile-open');
        
        //console.log('❌ Sidebar móvil cerrado');
    }

    handleResize() {
        // Si cambiamos a desktop y el sidebar móvil estaba abierto, cerrarlo
        if (!this.isMobile() && this.isMobileOpen) {
            this.closeMobileSidebar();
        }
    }

    syncNotifications() {
        // Sincronizar contadores entre desktop y móvil
        const desktopCount = document.getElementById('notification-count');
        const mobileCount = document.getElementById('notification-count-mobile');
        const desktopButton = document.getElementById('notifications-dropdown-button');

        if (desktopCount && mobileCount) {
            // Observar cambios en el contador desktop
            const observer = new MutationObserver(() => {
                const count = desktopCount.textContent;
                mobileCount.textContent = count;
                
                // Mostrar/ocultar badge móvil
                if (count && count !== '0') {
                    mobileCount.style.display = 'flex';
                } else {
                    mobileCount.style.display = 'none';
                }
            });

            observer.observe(desktopCount, {
                childList: true,
                characterData: true,
                subtree: true
            });

            // Observar visibilidad del botón desktop
            if (desktopButton) {
                const buttonObserver = new MutationObserver(() => {
                    const isVisible = desktopButton.style.display !== 'none';
                    const count = desktopCount.textContent;
                    
                    if (isVisible && count && count !== '0') {
                        mobileCount.style.display = 'flex';
                        mobileCount.textContent = count;
                    } else {
                        mobileCount.style.display = 'none';
                    }
                });

                buttonObserver.observe(desktopButton, {
                    attributes: true,
                    attributeFilter: ['style']
                });
            }

            // Sincronización inicial
            const initialCount = desktopCount.textContent;
            if (initialCount && initialCount !== '0') {
                mobileCount.textContent = initialCount;
                mobileCount.style.display = 'flex';
            }
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.responsiveSidebar = new ResponsiveSidebar();
});