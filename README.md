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

Ya puedes trabajar :D