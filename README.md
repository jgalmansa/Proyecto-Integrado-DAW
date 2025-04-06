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

Ya puedes trabajar :D