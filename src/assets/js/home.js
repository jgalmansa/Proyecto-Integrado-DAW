document.addEventListener('DOMContentLoaded', function () {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');
    const closeIcon = document.getElementById('close-icon');

    mobileMenuButton.addEventListener('click', function () {
        const expanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';

        // Cambiar el estado del botón
        mobileMenuButton.setAttribute('aria-expanded', !expanded);

        // Mostrar/ocultar el menú
        if (expanded) {
            mobileMenu.classList.add('hidden');
            menuIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        } else {
            mobileMenu.classList.remove('hidden');
            menuIcon.classList.add('hidden');
            closeIcon.classList.remove('hidden');
        }
    });

    // Cerrar el menú cuando se hace clic en un enlace
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', function () {
            mobileMenu.classList.add('hidden');
            mobileMenuButton.setAttribute('aria-expanded', 'false');
            menuIcon.classList.remove('hidden');
            closeIcon.classList.add('hidden');
        });
    });
});

// Script básico para la navegación
document.addEventListener('DOMContentLoaded', function () {
    // Smooth scroll para anclas
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();

            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 64, // Ajuste para la barra de navegación
                    behavior: 'smooth'
                });
            }
        });
    });
});