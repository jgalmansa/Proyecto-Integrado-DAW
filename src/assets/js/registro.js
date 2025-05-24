document.addEventListener("DOMContentLoaded", () => {
    const registerType = document.getElementById("registerType");
    const companyForm = document.getElementById("companyForm");
    const userForm = document.getElementById("userForm");
    const alertContainer = document.getElementById("alert-container");

    // Elementos para mostrar/ocultar contraseña
    const toggleCompanyPassword = document.getElementById("toggle-company-password");
    const toggleCompanyPasswordConfirm = document.getElementById("toggle-company-password-confirm");
    const toggleUserPassword = document.getElementById("toggle-user-password");
    const toggleUserPasswordConfirm = document.getElementById("toggle-user-password-confirm");

    // Función para mostrar alertas (igual que en login.js)
    function showAlert(message, type = "error") {
        alertContainer.innerHTML = "";
        alertContainer.classList.remove("hidden");

        const alertClass = 
            type === "error" ? "bg-red-100 border-red-400 text-red-700" : 
            type === "success" ? "bg-green-100 border-green-400 text-green-700" :
            "bg-blue-100 border-blue-400 text-blue-700";

        const alertIcon = 
            type === "error" ? "fa-circle-exclamation" : 
            type === "success" ? "fa-circle-check" :
            "fa-circle-info";

        const alert = document.createElement("div");
        alert.className = `${alertClass} px-4 py-3 rounded relative border`;
        alert.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${alertIcon} mr-2"></i>
                <span>${message}</span>
            </div>
            <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <i class="fas fa-times cursor-pointer" id="close-alert"></i>
            </span>
        `;

        alertContainer.appendChild(alert);

        document.getElementById("close-alert").addEventListener("click", () => {
            alertContainer.classList.add("hidden");
        });

        // Auto-ocultar después de 5 segundos
        setTimeout(() => {
            alertContainer.classList.add("hidden");
        }, 5000);
    }

    // Mostrar/ocultar contraseña (para todos los campos)
    function setupPasswordToggle(button, inputId) {
        button.addEventListener("click", () => {
            const input = document.querySelector(`input[name="${inputId}"]`);
            const type = input.getAttribute("type") === "password" ? "text" : "password";
            input.setAttribute("type", type);

            // Cambiar el icono
            const icon = button.querySelector("i");
            if (type === "password") {
                icon.classList.remove("fa-eye-slash");
                icon.classList.add("fa-eye");
            } else {
                icon.classList.remove("fa-eye");
                icon.classList.add("fa-eye-slash");
            }
        });
    }

    // Configurar toggles de contraseña
    if (toggleCompanyPassword) setupPasswordToggle(toggleCompanyPassword, "adminPassword");
    if (toggleCompanyPasswordConfirm) setupPasswordToggle(toggleCompanyPasswordConfirm, "adminPasswordConfirm");
    if (toggleUserPassword) setupPasswordToggle(toggleUserPassword, "password");
    if (toggleUserPasswordConfirm) setupPasswordToggle(toggleUserPasswordConfirm, "passwordConfirm");

    // Cambiar entre formularios
    registerType.addEventListener("change", () => {
        const type = registerType.value;
        companyForm.classList.add("hidden");
        userForm.classList.add("hidden");
        alertContainer.classList.add("hidden");

        if (type === "company") companyForm.classList.remove("hidden");
        else if (type === "user") userForm.classList.remove("hidden");
    });

    // Validación del formulario de empresa
    companyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        alertContainer.classList.add("hidden");

        // Resetear errores
        document.querySelectorAll("[id$='-error']").forEach(el => {
            el.classList.add("hidden");
        });

        let isValid = true;

        // Validaciones básicas
        if (!companyForm.companyName.value.trim()) {
            document.getElementById("companyName-error").textContent = "El nombre de la empresa es obligatorio";
            document.getElementById("companyName-error").classList.remove("hidden");
            isValid = false;
        }

        if (!companyForm.companyEmail.value.trim()) {
            document.getElementById("companyEmail-error").textContent = "El correo de la empresa es obligatorio";
            document.getElementById("companyEmail-error").classList.remove("hidden");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.companyEmail.value.trim())) {
            document.getElementById("companyEmail-error").textContent = "Introduce un correo electrónico válido";
            document.getElementById("companyEmail-error").classList.remove("hidden");
            isValid = false;
        }

        if (!companyForm.adminFirstName.value.trim()) {
            document.getElementById("adminFirstName-error").textContent = "El nombre del administrador es obligatorio";
            document.getElementById("adminFirstName-error").classList.remove("hidden");
            isValid = false;
        }

        if (!companyForm.adminEmail.value.trim()) {
            document.getElementById("adminEmail-error").textContent = "El correo del administrador es obligatorio";
            document.getElementById("adminEmail-error").classList.remove("hidden");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.adminEmail.value.trim())) {
            document.getElementById("adminEmail-error").textContent = "Introduce un correo electrónico válido";
            document.getElementById("adminEmail-error").classList.remove("hidden");
            isValid = false;
        }

        if (!companyForm.adminPassword.value) {
            document.getElementById("adminPassword-error").textContent = "La contraseña es obligatoria";
            document.getElementById("adminPassword-error").classList.remove("hidden");
            isValid = false;
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(companyForm.adminPassword.value)) {
            document.getElementById("adminPassword-error").textContent = "La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales";
            document.getElementById("adminPassword-error").classList.remove("hidden");
            isValid = false;
        }

        if (companyForm.adminPassword.value !== companyForm.adminPasswordConfirm.value) {
            document.getElementById("adminPasswordConfirm-error").textContent = "Las contraseñas no coinciden";
            document.getElementById("adminPasswordConfirm-error").classList.remove("hidden");
            isValid = false;
        }

        if (isValid) {
            try {
                // Preparar datos para enviar
                const domainsInput = companyForm.domains.value || "";
                const domains = domainsInput.split(",")
                    .map(domain => domain.trim())
                    .filter(domain => domain !== "");

                const data = {
                    companyName: companyForm.companyName.value.trim(),
                    companyEmail: companyForm.companyEmail.value.trim(),
                    companyPhone: companyForm.companyPhone.value.trim(),
                    companyAddress: companyForm.companyAddress.value.trim(),
                    adminFirstName: companyForm.adminFirstName.value.trim(),
                    adminLastName: companyForm.adminLastName.value.trim(),
                    adminEmail: companyForm.adminEmail.value.trim(),
                    adminPassword: companyForm.adminPassword.value,
                    domains: domains.length > 0 ? domains : undefined
                };

                const response = await fetch("/api/companies/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert(`Empresa registrada con éxito. Código de invitación: ${result.company.invitation_code}`, "success");
                    companyForm.reset();
                } else {
                    // Manejar errores de validación del servidor
                    if (result.errors && Array.isArray(result.errors)) {
                        showAlert(result.errors.join(", "));
                    } else {
                        showAlert(result.message || "Error al registrar la empresa");
                    }
                }
            } catch (error) {
                console.error("Error:", error);
                showAlert("Error de conexión. Inténtalo de nuevo más tarde.");
            }
        }
    });

    // Validación del formulario de usuario
    userForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        alertContainer.classList.add("hidden");

        // Resetear errores
        document.querySelectorAll("[id$='-error']").forEach(el => {
            el.classList.add("hidden");
        });

        let isValid = true;

        // Validaciones básicas
        if (!userForm.email.value.trim()) {
            document.getElementById("userEmail-error").textContent = "El correo electrónico es obligatorio";
            document.getElementById("userEmail-error").classList.remove("hidden");
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email.value.trim())) {
            document.getElementById("userEmail-error").textContent = "Introduce un correo electrónico válido";
            document.getElementById("userEmail-error").classList.remove("hidden");
            isValid = false;
        }

        if (!userForm.invitationCode.value.trim()) {
            document.getElementById("invitationCode-error").textContent = "El código de invitación es obligatorio";
            document.getElementById("invitationCode-error").classList.remove("hidden");
            isValid = false;
        }

        if (!userForm.firstName.value.trim()) {
            document.getElementById("firstName-error").textContent = "El nombre es obligatorio";
            document.getElementById("firstName-error").classList.remove("hidden");
            isValid = false;
        }

        if (!userForm.password.value) {
            document.getElementById("password-error").textContent = "La contraseña es obligatoria";
            document.getElementById("password-error").classList.remove("hidden");
            isValid = false;
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(userForm.password.value)) {
            document.getElementById("password-error").textContent = "La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y caracteres especiales";
            document.getElementById("password-error").classList.remove("hidden");
            isValid = false;
        }

        if (userForm.password.value !== userForm.passwordConfirm.value) {
            document.getElementById("passwordConfirm-error").textContent = "Las contraseñas no coinciden";
            document.getElementById("passwordConfirm-error").classList.remove("hidden");
            isValid = false;
        }

        if (isValid) {
            try {
                const data = {
                    email: userForm.email.value.trim(),
                    invitationCode: userForm.invitationCode.value.trim(),
                    firstName: userForm.firstName.value.trim(),
                    lastName: userForm.lastName.value.trim(),
                    password: userForm.password.value,
                    confirmPassword: userForm.passwordConfirm.value
                };

                const response = await fetch("/api/users/register", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    showAlert("Usuario registrado con éxito. Redirigiendo...", "success");
                    userForm.reset();
                    
                    // Redirigir al login después de 1.5 segundos
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 1500);
                } else {
                    // Manejar errores de validación del servidor
                    if (result.errors && Array.isArray(result.errors)) {
                        showAlert(result.errors.join(", "));
                    } else {
                        showAlert(result.message || "Error al registrar el usuario");
                    }
                }
            } catch (error) {
                console.error("Error:", error);
                showAlert("Error de conexión. Inténtalo de nuevo más tarde.");
            }
        }
    });
});