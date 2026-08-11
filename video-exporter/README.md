# 🎬 Microservicio de Exportación de Video en Google Cloud Run

Este proyecto contiene el backend desacoplado en Node.js + Express + FFmpeg diseñado para procesar y renderizar videos de recuerdos pesados en **Google Cloud Run**, liberando completamente la memoria RAM y procesador del navegador del cliente (*Frontend*).

---

## 🏗️ Estructura del Proyecto

```
video-exporter/
├── Dockerfile           # Imagen optimizada con Debian + Node 20 + FFmpeg nativo
├── package.json         # Dependencias (Express, Firebase-Admin, fluent-ffmpeg, axios)
├── index.js             # Servidor Express, procesamiento FFmpeg, subida a Storage y limpieza
└── README.md            # Guía paso a paso de despliegue en Google Cloud Run
```

---

## 🚀 Guía de Despliegue en Google Cloud Run

### 1. Requisitos Previos
- Tener instalado [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install).
- Tener un proyecto activo en Google Cloud con facturación habilitada.

### 2. Autenticarse e Identificar el Proyecto
```bash
gcloud auth login
gcloud config set project TU_PROJECT_ID_GCP
```

### 3. Habilitar las APIs necesarias en GCP
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 4. Compilar la Imagen Docker en Google Cloud Build y Desplegar en Cloud Run

Ejecuta el siguiente comando desde la carpeta `video-exporter`:

```bash
gcloud run deploy video-exporter \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600s \
  --set-env-vars FIREBASE_DATABASE_URL="https://juegos-cumple-default-rtdb.firebaseio.com",FIREBASE_STORAGE_BUCKET="juegos-cumple.appspot.com"
```

---

## 📡 Uso del API Endpoint

### `POST /generate-video`

**Headers:**
```http
Content-Type: application/json
```

**Body:**
```json
{
  "eventId": "xvjazmin",
  "customTitle": "Recuerdos de XV Jazmín",
  "orientation": "vertical"
}
```

**Respuesta Exitosa (`200 OK`):**
```json
{
  "success": true,
  "message": "Video generado y almacenado exitosamente.",
  "videoUrl": "https://storage.googleapis.com/juegos-cumple.appspot.com/events/xvjazmin/exports/recuerdos-xv-jazmin-1723400000000.mp4?...",
  "eventId": "xvjazmin",
  "fileName": "recuerdos-xv-jazmin-1723400000000.mp4"
}
```

---

## 🧹 Limpieza Automática de Disco
El microservicio implementa una cláusula `finally` estricta en JavaScript que elimina de forma segura la carpeta `/tmp/export-*` una vez finalizada la subida a Firebase Storage (o si ocurre un error), evitando la saturación del disco temporal del contenedor en Cloud Run.
