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

## Instrucciones para comando tree en Windows 11

1. Presiona Win + X → Terminal
2. Muevete a la carpeta backend del proyecto ```cd ...\backend```
3. Pega en la consola el siguiente código:

```
function Show-Tree {
    param(
      [string] $Path = '.',
      [int]    $Level = 0
    )
    Get-ChildItem -LiteralPath $Path -Force |
      Where-Object {
        # No Hiddens ni System, y no node_modules/.git/package-lock.json
        -not ($_.Attributes -band [IO.FileAttributes]::Hidden) -and
        -not ($_.Attributes -band [IO.FileAttributes]::System) -and
        $_.FullName -notmatch '\\node_modules\\' -and
        $_.FullName -notmatch '\\\.git\\' -and
        $_.Name     -ne 'package-lock.json'
      } |
      ForEach-Object {
        # Imprime con sangría
        $indent = '  ' * $Level
        Write-Output (“$indent└─ $($_.Name)”)
        if ($_.PSIsContainer) {
          Show-Tree -Path $_.FullName -Level ($Level + 1)
        }
      }
}

# Ejecuta:
Show-Tree
```
4. Copia el resultado y pegalo en PROMPT.txt para tener la estructura actualizada.

# .env

En este punto, el archivo .env debe estar de la siguiente manera:

```
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=coworkly_gjj
DB_NAME=coworkly
DB_PORT=5432

PORT=5000

JWT_SECRET=tu_clave_secreta_super_segura
JWT_EXPIRES_IN=24h
```

# Creación de servidor index.js con Express

## Estructura

### Archivo index.js

Punto de entrada de la aplicación.

### Conexión a la base de datos

- **config.js**: Define las configuraciones de la base de datos.
- **db.js**: Establece la conexión usando Sequalize.

## Flujo de inicio y funcionamiento

1. Al ejecutar docker-compose up, se crea el contenedor de la base de datos y del backend.
2. El servidor carga las variables de entorno (archivo .env), configura Express con middlewares básicos, intenta conectarse a la base de datos y una vez conectado, inicia el servidor en el puerto.

## Configuración de puertos

Para acceder al servidor:

- El puerto debe estar mapeado en docker-compose.yml (ports: 5000:5000).
- La variable de entorno en .env debe apuntar al mismo puerto (5000).

# Registros

## Nueva empresa

### Comprobación con Postman o ThunderClient

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

## Nuevo usuario

### Comprobación con Postman o ThunderClient

**1. Ruta**: POST http://localhost:5000/api/users/register
**2. Body**: En formato JSON

```
{
  "email": "user@miempresa.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "firstName": "User",
  "lastName": "Prueba",
  "invitationCode": "5E70945A"
}
```

**3. Response**:

```
{
  "message": "Usuario registrado correctamente",
  "user": {
    "id": 2,
    "email": "user@miempresa.com",
    "firstName": "User",
    "lastName": "Prueba",
    "role": "user",
    "companyId": 1
  }
}
```

# Login

### Comprobación con Postman o ThunderClient

**1. Ruta**: POST http://localhost:5000/api/users/login
**2. Body**: En formato JSON

```
{
  "email": "user@miempresa.com",
  "password": "Password123!"
}
```

**3. Response**:

```
{
  "message": "Inicio de sesión exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQsImNvbXBhbnlJZCI6MSwiZW1haWwiOiJ1c2VyMkBtaWVtcHJlc2EuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NDcxNDQ1MzUsImV4cCI6MTc0NzIzMDkzNX0.iuH1kXT_QRoagg3fW0N_faKSG5EGvvk_D2UJ3N8MFKY",
  "user": {
    "id": 4,
    "email": "user@miempresa.com",
    "firstName": "User",
    "lastName": "Prueba",
    "role": "user",
    "companyId": 1
  }
}
```

# Espacios de trabajo

## Crear

**1. Ruta**: POST http://localhost:5000/api/workspaces
**2. Body**: En formato JSON

```
{
  "name": "Sala de Reuniones Principal",
  "description": "Sala de reuniones con capacidad para 10 personas, equipada con proyector y pizarra",
  "capacity": 10,
  "isAvailable": true,
  "equipment": {
    "proyector": true,
    "pizarra": true,
    "videoconferencia": true,
    "wifi": true,
    "enchufes": 8
  }
}
```

**3. Response**:

```
{
  "message": "Espacio de trabajo creado exitosamente",
  "workspace": {
    "created_at": "2025-05-14T15:17:52.565Z",
    "updated_at": "2025-05-14T15:17:52.565Z",
    "id": 1,
    "name": "Sala de Reuniones Principal",
    "description": "Sala de reuniones con capacidad para 10 personas, equipada con proyector y pizarra",
    "capacity": 10,
    "company_id": 1,
    "qr": null,
    "is_available": true,
    "equipment": {
      "wifi": true,
      "pizarra": true,
      "enchufes": 8,
      "proyector": true,
      "videoconferencia": true
    },
    "updatedAt": "2025-05-14T15:17:52.565Z",
    "createdAt": "2025-05-14T15:17:52.565Z",
    "deleted_at": null
  }
}
```