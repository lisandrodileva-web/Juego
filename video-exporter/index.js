/**
 * ==============================================================================
 * Microservicio de Exportación de Video para Tu Fiesta Digital
 * Plataforma: Google Cloud Run / Node.js + Express + FFmpeg + Firebase Admin + Canvas
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
const { createCanvas, loadImage } = require('@napi-rs/canvas');

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
const bucket = admin.storage().bucket(cleanStorageBucket || "juegos-cumple.firebasestorage.app");

/**
 * Helper para dibujar rectángulos redondeados en Canvas
 */
function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Renderiza el diseño gráfico completo estilo Polaroid para una diapositiva en Node Canvas
 */
async function renderSlideFrame({
  canvas,
  ctx,
  config,
  memory,
  index,
  totalMemories,
  customTitle,
  orientation,
  bgImg,
  loadedStickers,
  loadedMediaImg,
  isForVideoOverlay = false
}) {
  const width = canvas.width;
  const height = canvas.height;
  const isHorizontal = orientation === 'horizontal';
  const theme = config.theme || {};
  const texts = config.texts || {};

  // 1. Fondo (Imagen de fondo o Gradiente del tema)
  ctx.clearRect(0, 0, width, height);

  if (bgImg) {
    ctx.drawImage(bgImg, 0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, 0, width, height);
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, theme.color_primary || '#FFF8E1');
    grad.addColorStop(1, theme.color_secondary || '#FDE68A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // 2. Partículas flotantes decorativas (abejas / iconos de fiesta)
  if (theme.show_particles !== false) {
    const particleIcon = (theme.icons && theme.icons.icon_particles) ? theme.icons.icon_particles : '🐝';
    const numParticles = 12;
    for (let p = 0; p < numParticles; p++) {
      const px = ((p * 97 + index * 31) % width);
      const py = ((p * 131 + index * 47) % height);
      const pSize = 24 + (p % 4) * 6;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.font = `${pSize}px sans-serif`;
      ctx.fillText(particleIcon, px, py);
      ctx.restore();
    }
  }

  // 3. Stickers decorativos
  if (loadedStickers && loadedStickers.length > 0) {
    loadedStickers.forEach(st => {
      ctx.save();
      if (st.config && st.config.opacity !== undefined) ctx.globalAlpha = st.config.opacity;
      const sw = parseInt(st.config.width) || 120;
      const sh = (st.img.height / st.img.width) * sw;
      let sx = st.config.left ? parseInt(st.config.left) : (st.config.right ? width - parseInt(st.config.right) - sw : 20);
      let sy = st.config.top ? parseInt(st.config.top) : (st.config.bottom ? height - parseInt(st.config.bottom) - sh : 20);
      ctx.drawImage(st.img, sx, sy, sw, sh);
      ctx.restore();
    });
  }

  // 4. Contenedor de Encabezado (Título del evento y contador)
  const headerMarginX = 40;
  const headerMarginY = isHorizontal ? 20 : 40;
  const headerW = width - (headerMarginX * 2);
  const headerH = isHorizontal ? 80 : 110;
  const headerTitleY = isHorizontal ? 56 : 90;
  const headerSubY = isHorizontal ? 82 : 125;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  drawRoundedRect(ctx, headerMarginX, headerMarginY, headerW, headerH, 20);
  ctx.fill();

  ctx.fillStyle = theme.portal_title_color || '#1F2937';
  ctx.font = isHorizontal ? `bold 28px sans-serif` : `bold 32px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(customTitle || texts.portal_title || 'Portal de Recuerdos 🐝', width / 2, headerTitleY);

  ctx.fillStyle = '#6B7280';
  ctx.font = isHorizontal ? `18px sans-serif` : `20px sans-serif`;
  ctx.fillText(`Recuerdo ${index + 1} de ${totalMemories}`, width / 2, headerSubY);
  ctx.restore();

  // 5. Tarjeta Polaroid con inclinación y sombra
  const tiltAngle = ((index % 2 === 0 ? 1 : -1) * (2 + (index % 3))) * (Math.PI / 180);
  const cardW = isHorizontal ? 560 : 600;
  const cardH = isHorizontal ? 560 : 920;
  const cardY = isHorizontal ? 115 : 180;
  const mediaW = cardW - 60;
  const mediaH = isHorizontal ? 340 : 520;

  ctx.save();
  ctx.translate(width / 2, cardY + cardH / 2);
  ctx.rotate(tiltAngle);

  ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 12;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 20);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  let contentOffsetY = -cardH / 2 + (isHorizontal ? 20 : 30);
  const mediaXOnCard = -cardW / 2 + 30;
  const mediaYOnCard = contentOffsetY;

  if (isForVideoOverlay) {
    // Para overlay de video: recortar el recuadro de la media para que el video se ubique dentro
    ctx.save();
    drawRoundedRect(ctx, mediaXOnCard, mediaYOnCard, mediaW, mediaH, 12);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();
    contentOffsetY += mediaH + (isHorizontal ? 15 : 30);
  } else if (loadedMediaImg) {
    // Para imágenes estáticas: dibujar imagen con contain (foto completa sin recortes)
    ctx.save();
    drawRoundedRect(ctx, mediaXOnCard, mediaYOnCard, mediaW, mediaH, 12);
    ctx.clip();

    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(mediaXOnCard, mediaYOnCard, mediaW, mediaH);

    const imgRatio = loadedMediaImg.width / loadedMediaImg.height;
    const boxRatio = mediaW / mediaH;
    let renderW, renderH, renderX, renderY;

    if (imgRatio > boxRatio) {
      renderW = mediaW;
      renderH = mediaW / imgRatio;
      renderX = mediaXOnCard;
      renderY = mediaYOnCard + (mediaH - renderH) / 2;
    } else {
      renderH = mediaH;
      renderW = mediaH * imgRatio;
      renderX = mediaXOnCard + (mediaW - renderW) / 2;
      renderY = mediaYOnCard;
    }

    ctx.drawImage(loadedMediaImg, renderX, renderY, renderW, renderH);
    ctx.restore();
    contentOffsetY += mediaH + (isHorizontal ? 15 : 30);
  } else {
    contentOffsetY += isHorizontal ? 50 : 80;
  }

  // Nombre del Invitado
  ctx.fillStyle = '#1F2937';
  ctx.font = isHorizontal ? `bold 26px sans-serif` : `bold 32px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(memory.name || 'Invitado', 0, contentOffsetY + (isHorizontal ? 22 : 30));

  // Mensaje del Invitado con Word Wrap
  if (memory.message) {
    ctx.fillStyle = '#4B5563';
    ctx.font = isHorizontal ? `20px sans-serif` : `24px sans-serif`;
    const words = memory.message.split(' ');
    let line = '';
    let lineY = contentOffsetY + (isHorizontal ? 50 : 80);
    const maxW = cardW - 60;

    for (let w = 0; w < words.length; w++) {
      const testLine = line + words[w] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxW && w > 0) {
        ctx.fillText(line, 0, lineY);
        line = words[w] + ' ';
        lineY += isHorizontal ? 26 : 34;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 0, lineY);
  }

  // Fecha del recuerdo
  ctx.fillStyle = '#9CA3AF';
  ctx.font = isHorizontal ? '18px sans-serif' : '20px sans-serif';
  const formattedDate = memory.timestamp ? new Date(memory.timestamp).toLocaleDateString('es-ES') : '';
  ctx.fillText(formattedDate, 0, cardH / 2 - (isHorizontal ? 20 : 40));

  ctx.restore();

  // Calcular las coordenadas absolutas donde debe renderizarse el video si es video
  const cosT = Math.cos(tiltAngle);
  const sinT = Math.sin(tiltAngle);
  const centerCanvasX = width / 2;
  const centerCanvasY = cardY + cardH / 2;

  const absoluteMediaX = Math.round(centerCanvasX + (mediaXOnCard * cosT - mediaYOnCard * sinT));
  const absoluteMediaY = Math.round(centerCanvasY + (mediaXOnCard * sinT + mediaYOnCard * cosT));

  return {
    mediaW: Math.round(mediaW),
    mediaH: Math.round(mediaH),
    absoluteMediaX,
    absoluteMediaY
  };
}

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

    // 1. Consultar Realtime Database en events/{eventId}/config y memories
    const configSnapshot = await db.ref(`events/${eventId}/config`).once('value');
    const memoriesSnapshot = await db.ref(`events/${eventId}/data/memories`).once('value');

    if (!memoriesSnapshot.exists()) {
      return res.status(404).json({ success: false, error: 'No se encontraron recuerdos registrados para este evento.' });
    }

    const config = configSnapshot.val() || {};
    const memoriesData = memoriesSnapshot.val();
    const memoriesList = Object.values(memoriesData).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (memoriesList.length === 0) {
      return res.status(400).json({ success: false, error: 'La lista de recuerdos está vacía.' });
    }

    console.log(`[${uniqueId}] Se encontraron ${memoriesList.length} recuerdos. Precargando elementos gráficos...`);

    const isHorizontal = orientation === 'horizontal';
    const targetWidth = isHorizontal ? 1280 : 720;
    const targetHeight = isHorizontal ? 720 : 1280;

    // Cargar imagen de fondo si existe
    let bgImg = null;
    const theme = config.theme || {};
    const bgUrl = theme.portal_bg_image || theme.background_image_url;
    if (bgUrl) {
      try {
        const bgRes = await axios.get(bgUrl, { responseType: 'arraybuffer' });
        bgImg = await loadImage(Buffer.from(bgRes.data));
      } catch (e) {
        console.warn(`[${uniqueId}] No se pudo cargar la imagen de fondo del tema:`, e.message);
      }
    }

    // Cargar stickers si existen
    const loadedStickers = [];
    if (theme.portal_stickers && Array.isArray(theme.portal_stickers)) {
      for (const s of theme.portal_stickers.slice(0, 2)) {
        if (s && s.url) {
          try {
            const stRes = await axios.get(s.url, { responseType: 'arraybuffer' });
            const img = await loadImage(Buffer.from(stRes.data));
            loadedStickers.push({ img, config: s });
          } catch (e) {
            console.warn(`[${uniqueId}] No se pudo cargar sticker:`, e.message);
          }
        }
      }
    }

    // 2. Descargar y normalizar archivos multimedia en lotes de 5 en paralelo con renderizado Canvas estilo Polaroid
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
        const slidePngPath = path.join(inputsDir, `slide_${index}.png`);

        try {
          // Descargar stream del archivo multimedia
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

          console.log(`[${uniqueId}] Renderizando diapositiva gráfica ${index + 1}/${memoriesList.length} (${isVideo ? 'Video' : 'Imagen'})...`);

          const canvas = createCanvas(targetWidth, targetHeight);
          const ctx = canvas.getContext('2d');

          if (!isVideo) {
            // --- Caso A: Imagen estática -> Dibujar Polaroid completa a PNG y convertir a MP4
            let loadedMediaImg = null;
            try {
              loadedMediaImg = await loadImage(rawFilePath);
            } catch (e) {
              console.warn(`[${uniqueId}] No se pudo decodificar imagen local para recuerdo ${index + 1}:`, e.message);
            }

            await renderSlideFrame({
              canvas,
              ctx,
              config,
              memory,
              index,
              totalMemories: memoriesList.length,
              customTitle,
              orientation,
              bgImg,
              loadedStickers,
              loadedMediaImg,
              isForVideoOverlay: false
            });

            const pngBuffer = canvas.toBuffer('image/png');
            fs.writeFileSync(slidePngPath, pngBuffer);

            await new Promise((resolve, reject) => {
              ffmpeg()
                .input(slidePngPath)
                .loop(3.0)
                .input('anullsrc=channel_layout=stereo:sample_rate=44100')
                .inputFormat('lavfi')
                .fps(30)
                .videoCodec('libx264')
                .audioCodec('aac')
                .audioFrequency(44100)
                .audioChannels(2)
                .outputOptions([
                  '-pix_fmt yuv420p',
                  '-preset ultrafast'
                ])
                .duration(3.0)
                .save(normVideoPath)
                .on('end', () => {
                  processedFilesMap[index] = normVideoPath;
                  resolve();
                })
                .on('error', (err) => {
                  console.error(`[${uniqueId}] Error al generar segmento de foto ${index}:`, err);
                  reject(err);
                });
            });

          } else {
            // --- Caso B: Video -> Dibujar plantilla de diapositiva con marco Polaroid y superponer video con FFmpeg
            const layoutInfo = await renderSlideFrame({
              canvas,
              ctx,
              config,
              memory,
              index,
              totalMemories: memoriesList.length,
              customTitle,
              orientation,
              bgImg,
              loadedStickers,
              loadedMediaImg: null,
              isForVideoOverlay: true
            });

            const pngBuffer = canvas.toBuffer('image/png');
            fs.writeFileSync(slidePngPath, pngBuffer);

            await new Promise((resolve, reject) => {
              ffmpeg()
                .input(rawFilePath)
                .input(slidePngPath)
                .complexFilter([
                  `[0:v]scale=${layoutInfo.mediaW}:${layoutInfo.mediaH}:force_original_aspect_ratio=decrease,pad=${layoutInfo.mediaW}:${layoutInfo.mediaH}:(ow-iw)/2:(oh-ih)/2:black[scaled_vid]`,
                  `[1:v]scale=${targetWidth}:${targetHeight}[frame]`,
                  `[frame][scaled_vid]overlay=${layoutInfo.absoluteMediaX}:${layoutInfo.absoluteMediaY}:short_est=1[outv]`
                ])
                .outputOptions([
                  '-map [outv]',
                  '-map 0:a?',
                  '-c:v libx264',
                  '-fps_mode cfr',
                  '-r 30',
                  '-pix_fmt yuv420p',
                  '-preset ultrafast',
                  '-c:a aac',
                  '-ar 44100',
                  '-ac 2'
                ])
                .save(normVideoPath)
                .on('end', () => {
                  processedFilesMap[index] = normVideoPath;
                  resolve();
                })
                .on('error', (err) => {
                  console.error(`[${uniqueId}] Error al superponer video ${index}:`, err);
                  reject(err);
                });
            });
          }

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
          generatedBy: 'CloudRun-FFmpeg-Canvas-Service'
        }
      }
    });

    // Generar URL pública directa o URL firmada para la descarga
    let videoUrl;
    try {
      await uploadedFile.makePublic();
      videoUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(destinationPath)}`;
    } catch (pubErr) {
      console.warn(`[${uniqueId}] Advertencia al hacer público el archivo, usando getSignedUrl fallback:`, pubErr.message);
      const [signedUrl] = await uploadedFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000
      });
      videoUrl = signedUrl;
    }

    console.log(`[${uniqueId}] Exportación completada con éxito. URL: ${videoUrl}`);

    // Responder al cliente con la URL del video generado
    return res.status(200).json({
      success: true,
      message: 'Video generado y almacenado exitosamente.',
      videoUrl: videoUrl,
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
