class CancelReservationModal {
    constructor() {
        this.modal = document.getElementById('cancel-reservation-modal');
        this.modalContent = document.getElementById('modal-content');
        this.closeBtn = document.getElementById('close-cancel-modal');
        this.cancelBtn = document.getElementById('cancel-modal-action');
        this.confirmBtn = document.getElementById('confirm-cancel-reservation');
        this.confirmButtonText = document.getElementById('confirm-button-text');

        // Elementos de información de la reserva
        this.workspaceName = document.getElementById('cancel-workspace-name');
        this.reservationDate = document.getElementById('cancel-reservation-date');
        this.reservationTime = document.getElementById('cancel-reservation-time');
        this.reservationPeople = document.getElementById('cancel-reservation-people');

        this.currentReservation = null;
        this.init();
    }

    init() {
        // Event listeners
        this.closeBtn.addEventListener('click', () => this.close());
        this.cancelBtn.addEventListener('click', () => this.close());
        this.confirmBtn.addEventListener('click', () => this.confirmCancel());

        // Cerrar modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
                this.close();
            }
        });

        // Cerrar modal clickeando fuera
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(reservation) {
        this.currentReservation = reservation;
        this.populateReservationInfo(reservation);

        // Mostrar modal
        this.modal.classList.remove('hidden');

        // Animación de entrada
        setTimeout(() => {
            this.modalContent.classList.remove('scale-95', 'opacity-0');
            this.modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
    }

    close() {
        // Animación de salida
        this.modalContent.classList.remove('scale-100', 'opacity-100');
        this.modalContent.classList.add('scale-95', 'opacity-0');

        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.currentReservation = null;
            this.resetButtonState();
            // Restaurar scroll del body
            document.body.style.overflow = '';
        }, 300);
    }

    populateReservationInfo(reservation) {
        this.workspaceName.textContent = reservation.workspaceName || 'Espacio';
        this.reservationDate.textContent = this.formatDate(reservation.startTime);
        this.reservationTime.textContent = this.formatTimeRange(reservation.startTime, reservation.endTime);
        this.reservationPeople.textContent = `${reservation.numberOfPeople} personas`;
    }

    async confirmCancel() {
        if (!this.currentReservation) return;

        // Cambiar estado del botón
        this.setButtonLoading(true);

        try {
            const response = await fetch(`/api/reservations/${this.currentReservation.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Mostrar mensaje de éxito
            this.showSuccessMessage('Reserva cancelada exitosamente');

            // Cerrar modal
            this.close();

            // Recargar las reservas
            if (window.reservationsManager) {
                window.reservationsManager.loadReservations();
            }

        } catch (error) {
            console.error('Error canceling reservation:', error);
            this.showErrorMessage('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
            this.setButtonLoading(false);
        }
    }

    setButtonLoading(loading) {
        if (loading) {
            this.confirmBtn.disabled = true;
            this.confirmButtonText.textContent = 'Cancelando...';
            this.confirmBtn.classList.add('opacity-75');
        } else {
            this.confirmBtn.disabled = false;
            this.confirmButtonText.textContent = 'Cancelar Reserva';
            this.confirmBtn.classList.remove('opacity-75');
        }
    }

    resetButtonState() {
        this.setButtonLoading(false);
    }

    // Métodos auxiliares
    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) return 'Hoy';
        if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';

        return date.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
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

    getAuthToken() {
        return localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            sessionStorage.getItem('authToken') ||
            sessionStorage.getItem('token') ||
            document.cookie.split('; ')
                .find(row => row.startsWith('authToken='))?.split('=')[1] ||
            document.cookie.split('; ')
                .find(row => row.startsWith('token='))?.split('=')[1];
    }

    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        toast.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 4000);
    }

    showErrorMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        toast.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
}

// Inicializar el modal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    window.cancelReservationModal = new CancelReservationModal();
});