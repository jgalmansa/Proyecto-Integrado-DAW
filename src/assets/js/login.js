document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form")
  const emailInput = document.getElementById("email")
  const passwordInput = document.getElementById("password")
  const emailError = document.getElementById("email-error")
  const passwordError = document.getElementById("password-error")
  const togglePasswordButton = document.getElementById("toggle-password")
  const alertContainer = document.getElementById("alert-container")

  // Función para mostrar alertas
  function showAlert(message, type = "error") {
    alertContainer.innerHTML = ""
    alertContainer.classList.remove("hidden")

    const alertClass =
      type === "error" ? "bg-red-100 border-red-400 text-red-700" : "bg-green-100 border-green-400 text-green-700"

    const alertIcon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check"

    const alert = document.createElement("div")
    alert.className = `${alertClass} px-4 py-3 rounded relative border`
    alert.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${alertIcon} mr-2"></i>
                <span>${message}</span>
            </div>
            <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
                <i class="fas fa-times cursor-pointer" id="close-alert"></i>
            </span>
        `

    alertContainer.appendChild(alert)

    document.getElementById("close-alert").addEventListener("click", () => {
      alertContainer.classList.add("hidden")
    })

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      alertContainer.classList.add("hidden")
    }, 5000)
  }

  // Mostrar/ocultar contraseña
  togglePasswordButton.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
    passwordInput.setAttribute("type", type)

    // Cambiar el icono
    const icon = togglePasswordButton.querySelector("i")
    if (type === "password") {
      icon.classList.remove("fa-eye-slash")
      icon.classList.add("fa-eye")
    } else {
      icon.classList.remove("fa-eye")
      icon.classList.add("fa-eye-slash")
    }
  })

  // Validación del formulario
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Resetear errores
    emailError.classList.add("hidden")
    passwordError.classList.add("hidden")

    let isValid = true

    // Validar email
    if (!emailInput.value.trim()) {
      emailError.textContent = "El correo electrónico es obligatorio"
      emailError.classList.remove("hidden")
      isValid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
      emailError.textContent = "Introduce un correo electrónico válido"
      emailError.classList.remove("hidden")
      isValid = false
    }

    // Validar contraseña
    if (!passwordInput.value) {
      passwordError.textContent = "La contraseña es obligatoria"
      passwordError.classList.remove("hidden")
      isValid = false
    }

    if (isValid) {
      try {
        const response = await fetch("/api/users/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: emailInput.value.trim(),
            password: passwordInput.value,
            remember: document.getElementById("remember-me").checked,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          // Login exitoso
          showAlert("Inicio de sesión exitoso. Redirigiendo...", "success")

          // Guardar token en localStorage o sessionStorage según "remember me"
          if (document.getElementById("remember-me").checked) {
            localStorage.setItem("authToken", data.token)
          } else {
            sessionStorage.setItem("authToken", data.token)
          }

          // Guardar información del usuario si viene en la respuesta
          if (data.user) {
            localStorage.setItem("userData", JSON.stringify(data.user))
          }

          // Redirigir al dashboard personal según el rol del usuario
          setTimeout(() => {
            // Si la API devuelve el rol del usuario, redirigir según corresponda
              window.location.href = "/dashboard"
          }, 1500)
        } else {
          // Error en el login
          showAlert(data.message || "Error al iniciar sesión. Verifica tus credenciales.")
        }
      } catch (error) {
        console.error("Error:", error)
        showAlert("Error de conexión. Inténtalo de nuevo más tarde.")
      }
    }
  })
})
