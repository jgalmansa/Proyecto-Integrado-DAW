// Módulo de utilidades para UI
const UIUtils = {
  showAlert(message, type = "error", containerId = "alert-container") {
    const alertContainer = document.getElementById(containerId)
    if (!alertContainer) return

    alertContainer.innerHTML = ""
    alertContainer.classList.remove("hidden")

    const alertClass = type === "error" 
      ? "bg-red-100 border-red-400 text-red-700" 
      : "bg-green-100 border-green-400 text-green-700"

    const alertIcon = type === "error" ? "fa-circle-exclamation" : "fa-circle-check"

    const alert = document.createElement("div")
    alert.className = `${alertClass} px-4 py-3 rounded relative border`
    alert.innerHTML = `
      <div class="flex items-center">
        <i class="fas ${alertIcon} mr-2"></i>
        <span>${message}</span>
      </div>
      <span class="absolute top-0 bottom-0 right-0 px-4 py-3">
        <i class="fas fa-times cursor-pointer hover:text-opacity-80" id="close-alert"></i>
      </span>
    `

    alertContainer.appendChild(alert)

    // Event listener para cerrar
    const closeButton = document.getElementById("close-alert")
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        alertContainer.classList.add("hidden")
      })
    }

    // Auto-ocultar después de 5 segundos
    setTimeout(() => {
      alertContainer.classList.add("hidden")
    }, 5000)
  },

  togglePasswordVisibility(passwordInput, toggleButton) {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"
    passwordInput.setAttribute("type", type)

    const icon = toggleButton.querySelector("i")
    if (icon) {
      if (type === "password") {
        icon.classList.remove("fa-eye-slash")
        icon.classList.add("fa-eye")
      } else {
        icon.classList.remove("fa-eye")
        icon.classList.add("fa-eye-slash")
      }
    }
  },

  setInputError(inputId, errorId, message) {
    const errorElement = document.getElementById(errorId)
    const inputElement = document.getElementById(inputId)
    
    if (errorElement) {
      errorElement.textContent = message
      errorElement.classList.remove("hidden")
    }
    
    if (inputElement) {
      inputElement.classList.add("border-red-500")
      inputElement.classList.remove("border-gray-300")
    }
  },

  clearInputError(inputId, errorId) {
    const errorElement = document.getElementById(errorId)
    const inputElement = document.getElementById(inputId)
    
    if (errorElement) {
      errorElement.classList.add("hidden")
    }
    
    if (inputElement) {
      inputElement.classList.remove("border-red-500")
      inputElement.classList.add("border-gray-300")
    }
  },

  setLoadingState(button, isLoading = true) {
    if (!button) return
    
    if (isLoading) {
      button.disabled = true
      button.innerHTML = `
        <div class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Iniciando sesión...
        </div>
      `
    } else {
      button.disabled = false
      button.innerHTML = `
        <span>Iniciar Sesión</span>
        <svg xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300"
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      `
    }
  }
}

// Módulo de validaciones
const ValidationUtils = {
  email(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !email.trim()) {
      return { isValid: false, message: "El correo electrónico es obligatorio" }
    }
    if (!emailRegex.test(email.trim())) {
      return { isValid: false, message: "Introduce un correo electrónico válido" }
    }
    return { isValid: true }
  },

  password(password) {
    if (!password) {
      return { isValid: false, message: "La contraseña es obligatoria" }
    }
    if (password.length < 6) {
      return { isValid: false, message: "La contraseña debe tener al menos 6 caracteres" }
    }
    return { isValid: true }
  }
}

// Módulo de API
const ApiUtils = {
  async login(credentials) {
    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data = await response.json()
      
      return {
        ok: response.ok,
        status: response.status,
        data
      }
    } catch (error) {
      console.error("API Error:", error)
      throw new Error("Error de conexión. Inténtalo de nuevo más tarde.")
    }
  }
}

// Módulo de autenticación
const AuthUtils = {
  saveSession(token, userData, remember = false) {
    const storage = remember ? localStorage : sessionStorage
    
    storage.setItem("authToken", token)
    if (userData) {
      storage.setItem("userData", JSON.stringify(userData))
    }
  },

  redirectToDashboard(delay = 1500) {
    setTimeout(() => {
      window.location.href = "/dashboard"
    }, delay)
  }
}

// Clase principal del formulario de login
class LoginForm {
  constructor() {
    this.form = document.getElementById("login-form")
    this.emailInput = document.getElementById("email")
    this.passwordInput = document.getElementById("password")
    this.submitButton = this.form?.querySelector('button[type="submit"]')
    this.togglePasswordButton = document.getElementById("toggle-password")
    this.rememberCheckbox = document.getElementById("remember-me")
    
    this.init()
  }

  init() {
    if (!this.form) return

    this.setupEventListeners()
    this.setupInputValidation()
  }

  setupEventListeners() {
    // Submit del formulario
    this.form.addEventListener("submit", this.handleSubmit.bind(this))
    
    // Toggle password visibility
    if (this.togglePasswordButton) {
      this.togglePasswordButton.addEventListener("click", () => {
        UIUtils.togglePasswordVisibility(this.passwordInput, this.togglePasswordButton)
      })
    }
  }

  setupInputValidation() {
    // Validación en tiempo real para email
    if (this.emailInput) {
      this.emailInput.addEventListener("blur", () => {
        this.validateField("email")
      })
      
      this.emailInput.addEventListener("input", () => {
        UIUtils.clearInputError("email", "email-error")
      })
    }

    // Validación en tiempo real para password
    if (this.passwordInput) {
      this.passwordInput.addEventListener("blur", () => {
        this.validateField("password")
      })
      
      this.passwordInput.addEventListener("input", () => {
        UIUtils.clearInputError("password", "password-error")
      })
    }
  }

  validateField(fieldName) {
    let validation
    let inputId
    let errorId

    switch (fieldName) {
      case "email":
        validation = ValidationUtils.email(this.emailInput.value)
        inputId = "email"
        errorId = "email-error"
        break
      case "password":
        validation = ValidationUtils.password(this.passwordInput.value)
        inputId = "password"
        errorId = "password-error"
        break
      default:
        return true
    }

    if (!validation.isValid) {
      UIUtils.setInputError(inputId, errorId, validation.message)
      return false
    } else {
      UIUtils.clearInputError(inputId, errorId)
      return true
    }
  }

  validateForm() {
    const emailValid = this.validateField("email")
    const passwordValid = this.validateField("password")
    
    return emailValid && passwordValid
  }

  async handleSubmit(e) {
    e.preventDefault()

    // Limpiar errores previos
    UIUtils.clearInputError("email", "email-error")
    UIUtils.clearInputError("password", "password-error")

    // Validar formulario
    if (!this.validateForm()) {
      return
    }

    // Mostrar estado de carga
    UIUtils.setLoadingState(this.submitButton, true)

    try {
      const credentials = {
        email: this.emailInput.value.trim(),
        password: this.passwordInput.value,
        remember: this.rememberCheckbox?.checked || false
      }

      const response = await ApiUtils.login(credentials)

      if (response.ok) {
        // Login exitoso
        UIUtils.showAlert("Inicio de sesión exitoso. Redirigiendo...", "success")
        
        // Guardar sesión
        AuthUtils.saveSession(
          response.data.token, 
          response.data.user, 
          credentials.remember
        )

        // Redirigir
        AuthUtils.redirectToDashboard()
        
      } else {
        // Manejar diferentes tipos de errores
        this.handleLoginError(response)
      }

    } catch (error) {
      UIUtils.showAlert(error.message)
    } finally {
      // Restaurar estado del botón
      UIUtils.setLoadingState(this.submitButton, false)
    }
  }

  handleLoginError(response) {
    const { status, data } = response
    
    switch (status) {
      case 401:
        UIUtils.showAlert("Credenciales incorrectas. Verifica tu email y contraseña.")
        break
      case 404:
        UIUtils.showAlert("Usuario no encontrado. Verifica tu email.")
        break
      case 429:
        UIUtils.showAlert("Demasiados intentos. Espera un momento antes de intentar de nuevo.")
        break
      default:
        UIUtils.showAlert(data.message || "Error al iniciar sesión. Inténtalo de nuevo.")
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new LoginForm()
})