# INICIAR PROYECTO:

Con docker abierto, desde visual studio code (VSC), en la raiz del proyecto, usar los comandos:

```
docker up -d
docker exec -it proyecto-integrado-daw-backend-1 sh
```

Con el último comando has entrado en el docker del backend. Debes estar en la siguiente ruta: **/usr/src/app #**. Ponemos el siguiente comando:

```
npx sequelize-cli db:migrate
```

**Enhorabuena, ya tienes la base de datos creada y con sus tablas!**

Compruebalo, ya sea en pgAdmin 4 o en TablePlus. Las credenciales son las siguientes:

- **Host**: localhost
- **Puerto**: 5432
- **Usuario**: postgres
- **Constraseña**: coworkly_gjj
- **Base de datos**: coworkly

## Creación de servidor index.js con Express

### Estructura

#### Archivo index.js

Punto de entrada de la aplicación.

#### Conexión a la base de datos

- **config.js**: Define las configuraciones de la base de datos.
- **db.js**: Establece la conexión usando Sequalize.

### Flujo de inicio y funcionamiento

1. Al ejecutar docker-compose up, se crea el contenedor de la base de datos y del backend.
2. El servidor carga las variables de entorno (archivo .env), configura Express con middlewares básicos, intenta conectarse a la base de datos y una vez conectado, inicia el servidor en el puerto.

### Configuración de puertos

Para acceder al servidor:

- El puerto debe estar mapeado en docker-compose.yml (ports: 5000:5000).
- La variable de entorno en .env debe apuntar al mismo puerto (5000).

# Registro de nueva empresa

## Comprobación con Postman o ThunderClient

**1. Ruta**: POST http://localhost:5000/api/companies/register
**2. Body**: En formato JSON

```
{
  "companyName": "Mi Empresa S.L.",
  "companyEmail": "info@miempresa.com",
  "companyAddress": "Calle Principal 123",
  "companyPhone": "555-123456",
  "adminFirstName": "Juan",
  "adminLastName": "Pérez",
  "adminEmail": "admin@miempresa.com",
  "adminPassword": "Password123!",
  "domains": ["miempresa.com", "otroDominio.com"]
}
```

**3. Response**:

```
{
  "message": "Empresa registrada exitosamente",
  "company": {
    "id": 1,
    "name": "Mi Empresa S.L.",
    "email": "info@miempresa.com",
    "invitation_code": "5E70945A"
  },
  "admin": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "admin@miempresa.com"
  }
}
```