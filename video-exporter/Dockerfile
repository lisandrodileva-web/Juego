# ==============================================================================
# Dockerfile Óptimo para Microservicio de Renderizado de Video en Cloud Run
# Base: Node.js 20 sobre Debian Bookworm Slim con FFmpeg pre-instalado
# ==============================================================================

FROM node:20-slim

# Instalar FFmpeg y librerías del sistema necesarias para procesamiento de video y fuentes
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-freefont-ttf \
    ca-certificates \
    curl && \
    rm -rf /var/lib/apt/lists/*

# Establecer directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar manifiestos de dependencias primero para optimizar el caché de capas de Docker
COPY package*.json ./

# Instalar únicamente dependencias de producción
RUN npm ci --only=production

# Copiar el resto del código fuente del microservicio
COPY . .

# Puerto expuesto (inyectado dinámicamente por Google Cloud Run en la variable PORT)
ENV PORT=8080
EXPOSE 8080

# Iniciar el microservicio con Node.js
CMD ["npm", "start"]
