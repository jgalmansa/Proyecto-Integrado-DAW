FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./

# Instalamos dependencias sin omitir los opcionales
RUN npm install --no-optional=false
# Instalamos serve para servir archivos estáticos
RUN npm install -g serve

COPY . .

# Construimos los assets CSS con Tailwind
RUN npx @tailwindcss/cli -i ./src/input.css -o ./src/output.css

# Hacemos que output.css sea accesible desde la carpeta public
RUN mkdir -p ./public/css
RUN cp ./src/output.css ./public/css/output.css

EXPOSE 3000

# Servimos el directorio public
CMD ["serve", "-s", "public", "-l", "3000"]