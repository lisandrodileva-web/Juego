/**
 * ==============================================================================
 * Microservicio de Exportación de Video para Tu Fiesta Digital
 * Plataforma: Google Cloud Run / Node.js + Express + FFmpeg + Firebase Admin
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Inicializar Express App
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Limpieza de URLs por si PowerShell concatena variables de entorno
const cleanDbUrl = (process.env.FIREBASE_DATABASE_URL || "https://juegos-cumple-default-rtdb.firebaseio.com").split(' ')[0].trim();
const cleanStorageBucket = (process.env.FIREBASE_STORAGE_BUCKET || "juegos-cumple.firebasestorage.app").split(' ')[0].trim();

// Inicializar Firebase Admin SDK (Cloud Run utiliza Application Default Credentials automáticamente)
if (!admin.apps.length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(path.resolve(serviceAccountPath));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: cleanDbUrl,
      storageBucket: cleanStorageBucket
    });
  } else {
    // Entorno de Google Cloud Run / GCP con ADC
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: cleanDbUrl,
      storageBucket: cleanStorageBucket
    });
  }
}

const db = admin.database();
const bucket = admin.storage().bucket();

/**
 * Health check endpoint para Google Cloud Run
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Endpoint principal: POST /generate-video
 * Recibe: { eventId, customTitle, orientation }
 */
app.post('/generate-video', async (req, res) => {
  const { eventId, customTitle, orientation = 'vertical' } = req.body;

  if (!eventId) {
    return res.status(400).json({ success: false, error: 'El parámetro eventId es obligatorio.' });
  }

  // Generar directorio temporal único en el sistema de archivos del contenedor (/tmp)
  const uniqueId = `${eventId}-${Date.now()}-${uuidv4().substring(0, 8)}`;
  const tempDir = path.join('/tmp', `export-${uniqueId}`);
  const inputsDir = path.join(tempDir, 'inputs');
  const concatListPath = path.join(tempDir, 'concat_list.txt');
  const outputVideoPath = path.join(tempDir, 'output.mp4');

  console.log(`[${uniqueId}] Iniciando procesamiento de video para el evento: ${eventId}`);

  try {
    // Crear carpetas temporales
    fs.mkdirSync(inputsDir, { recursive: true });

    // 1. Consultar Realtime Database en events/{eventId}/data/memories
    const memoriesRef = db.ref(`events/${eventId}/data/memories`);
    const snapshot = await memoriesRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, error: 'No se encontraron recuerdos registrados para este evento.' });
    }

    const memoriesData = snapshot.val();
    const memoriesList = Object.values(memoriesData).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (memoriesList.length === 0) {
      return res.status(400).json({ success: false, error: 'La lista de recuerdos está vacía.' });
    }

    console.log(`[${uniqueId}] Se encontraron ${memoriesList.length} recuerdos. Iniciando descargas...`);

    const isHorizontal = orientation === 'horizontal';
    const targetWidth = isHorizontal ? 1280 : 720;
    const targetHeight = isHorizontal ? 720 : 1280;

    // 2. Descargar y normalizar archivos multimedia en lotes de 5 en paralelo (aceleración 500%)
    const CONCURRENCY_LIMIT = 5;
    const processedFilesMap = {};

    for (let i = 0; i < memoriesList.length; i += CONCURRENCY_LIMIT) {
      const batchIndices = memoriesList.slice(i, i + CONCURRENCY_LIMIT).map((m, idx) => i + idx);

      await Promise.all(batchIndices.map(async (index) => {
        const memory = memoriesList[index];
        if (!memory || !memory.fileUrl) return;

        const isVideo = memory.fileType && memory.fileType.startsWith('video');
        const ext = isVideo ? 'mp4' : 'jpg';
        const rawFilePath = path.join(inputsDir, `raw_${index}.${ext}`);
        const normVideoPath = path.join(inputsDir, `norm_${index}.mp4`);

        try {
          // Descargar stream del archivo
          const response = await axios({
            url: memory.fileUrl,
            method: 'GET',
            responseType: 'stream'
          });

          const writer = fs.createWriteStream(rawFilePath);
          response.data.pipe(writer);

          await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
          });

          console.log(`[${uniqueId}] Normalizando elemento ${index + 1}/${memoriesList.length} (${isVideo ? 'Video' : 'Imagen'})...`);

          await new Promise((resolve, reject) => {
            let command = ffmpeg();

            if (isVideo) {
              command = command.input(rawFilePath);
            } else {
              command = command
                .input(rawFilePath)
                .loop(3.0)
                .input('anullsrc=channel_layout=stereo:sample_rate=44100')
                .inputFormat('lavfi')
                .duration(3.0);
            }

            command
              .fps(30)
              .videoCodec('libx264')
              .audioCodec('aac')
              .audioFrequency(44100)
              .audioChannels(2)
              .outputOptions([
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                `-vf scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`
              ])
              .save(normVideoPath)
              .on('end', () => {
                processedFilesMap[index] = normVideoPath;
                resolve();
              })
              .on('error', (err) => {
                console.error(`[${uniqueId}] Error al normalizar archivo ${index}:`, err);
                reject(err);
              });
          });
        } catch (err) {
          console.warn(`[${uniqueId}] Advertencia: no se pudo procesar el recuerdo ${index + 1}:`, err.message);
        }
      }));
    }

    const processedFiles = Object.keys(processedFilesMap)
      .sort((a, b) => Number(a) - Number(b))
      .map(k => processedFilesMap[k]);

    if (processedFiles.length === 0) {
      throw new Error('No se pudo procesar ningún archivo multimedia válido.');
    }

    // 3. Crear archivo de lista para la concatenación de FFmpeg (concat demuxer)
    const concatFileContent = processedFiles
      .map(file => `file '${file.replace(/'/g, "'\\''")}'`)
      .join('\n');
    fs.writeFileSync(concatListPath, concatFileContent);

    console.log(`[${uniqueId}] Concatenando ${processedFiles.length} segmentos en el video final...`);

    // 4. Unir todos los segmentos en el video .mp4 definitivo usando FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy',
          '-movflags +faststart'
        ])
        .save(outputVideoPath)
        .on('end', () => {
          console.log(`[${uniqueId}] Video final renderizado exitosamente en ${outputVideoPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${uniqueId}] Error al concatenar video:`, err);
          reject(err);
        });
    });

    // 5. Subir el video resultante a Firebase Storage
    const titleSlug = (customTitle || eventId)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || eventId;

    const destinationPath = `events/${eventId}/exports/recuerdos-${titleSlug}-${Date.now()}.mp4`;
    console.log(`[${uniqueId}] Subiendo video a Firebase Storage en: ${destinationPath}...`);

    const [uploadedFile] = await bucket.upload(outputVideoPath, {
      destination: destinationPath,
      metadata: {
        contentType: 'video/mp4',
        cacheControl: 'public, max-age=31536000',
        metadata: {
          eventId: eventId,
          generatedBy: 'CloudRun-FFmpeg-Service'
        }
      }
    });

    // Generar URL pública o URL firmada para la descarga
    const [signedUrl] = await uploadedFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // Válida por 7 días
    });

    console.log(`[${uniqueId}] Exportación completada con éxito. URL: ${signedUrl}`);

    // Responder al cliente con la URL del video generado
    return res.status(200).json({
      success: true,
      message: 'Video generado y almacenado exitosamente.',
      videoUrl: signedUrl,
      eventId: eventId,
      fileName: path.basename(destinationPath)
    });

  } catch (error) {
    console.error(`[${uniqueId}] Error crítico durante la exportación de video:`, error);
    return res.status(500).json({
      success: false,
      error: 'Ocurrió un error en el servidor al generar el video.',
      details: error.message
    });
  } finally {
    // ⭐️ OBLIGATORIO: Limpieza estricta de archivos temporales en disco local para evitar saturar el contenedor
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[${uniqueId}] 🧹 Limpieza completada: Se eliminó el directorio temporal ${tempDir}`);
      }
    } catch (cleanupError) {
      console.error(`[${uniqueId}] Advertencia: Error al eliminar archivos temporales en ${tempDir}:`, cleanupError);
    }
  }
});

// Arrancar el servidor Express en el puerto expuesto por Cloud Run
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Microservicio de Exportación de Video ejecutándose en el puerto ${PORT}`);
});
