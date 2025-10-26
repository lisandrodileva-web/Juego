import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref as dbRef, push, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
// 💡 IMPORTACIÓN DE FIREBASE STORAGE
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// =======================================================================
// CONFIGURACIÓN DE FIREBASE (MISMA QUE EN script.js)
// =======================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDRsS6YQ481KQadSk8gf9QtxVt_asnrDlc",
  authDomain: "juegos-cumple.firebaseapp.com",
  databaseURL: "https://juegos-cumple-default-rtdb.firebaseio.com", 
  projectId: "juegos-cumple",
  storageBucket: "juegos-cumple.firebasestorage.app", // ⚠️ Necesario para Storage
  messagingSenderId: "595312538655",
  appId: "1:595312538655:web:93220a84570ff7461fd12a",
  measurementId: "G-V1YXNZXVQR"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app); // 💡 Inicializar Storage
const memoriesRef = dbRef(database, 'memories'); 

const form = document.getElementById('memory-form');
const nameInput = document.getElementById('guest-name');
const messageInput = document.getElementById('guest-message');
const fileInput = document.getElementById('guest-file'); 
const submitButton = document.getElementById('submit-memory-btn');
const memoriesList = document.getElementById('memories-list');
const progressBarContainer = document.getElementById('upload-progress-bar-container');
const progressBar = document.getElementById('upload-progress');
const uploadStatus = document.getElementById('upload-status');
const captureButton = document.getElementById('capture-btn'); 
const fileNameDisplay = document.getElementById('file-name-display');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// =======================================================================
// 1. ESCUCHAR Y RENDERIZAR MENSAJES
// =======================================================================

function listenForMemories() {
    onValue(memoriesRef, (snapshot) => {
        const data = snapshot.val();
        let memoryItems = [];
        if (data) {
            Object.keys(data).forEach(key => {
                memoryItems.push({ id: key, ...data[key] });
            });
            memoryItems.sort((a, b) => b.timestamp - a.timestamp);
        }
        renderMemories(memoryItems);
    });
}

/**
 * Renderiza la lista de mensajes, mostrando imágenes o videos si existen.
 */
function renderMemories(memories) {
    memoriesList.innerHTML = '';

    if (memories.length === 0) {
        memoriesList.innerHTML = '<p class="text-sm text-gray-500 italic p-2">¡Sé el primero en dejar un mensaje!</p>';
        return;
    }

    memories.forEach(m => {
        const div = document.createElement('div');
        div.className = 'memory-card';

        let mediaContent = '';
        let messageText = m.message || '';
        
        // 💡 Lógica para mostrar MEDIA (Foto o Video)
        if (m.mediaUrl && m.mediaType) {
            const isImage = m.mediaType.startsWith('image/');
            const isVideo = m.mediaType.startsWith('video/');

            if (isImage) {
                // Estilos responsive para la imagen
                mediaContent = `<img src="${m.mediaUrl}" alt="Recuerdo de ${m.name}" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;">`;
            } else if (isVideo) {
                // Estilos responsive para el video
                mediaContent = `<video src="${m.mediaUrl}" controls style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;"></video>`;
            }
        }

        const date = new Date(m.timestamp).toLocaleDateString('es-ES');

        div.innerHTML = `
            <p class="text-sm font-bold text-yellow-600 mb-1">${m.name} dice:</p>
            ${mediaContent}
            ${messageText ? `<p class="text-gray-800 mt-2">${messageText}</p>` : ''}
            <p class="text-xs text-gray-400 mt-2">Enviado el: ${date}</p>
        `;
        memoriesList.appendChild(div);
    });
}

// =======================================================================
// 2. AJUSTES DE INTERACCIÓN PARA CÁMARA
// =======================================================================

// 1. Conectar el botón visible con el input de archivo oculto
captureButton.addEventListener('click', () => {
    fileInput.click();
});

// 2. Mostrar el nombre del archivo capturado
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = `Archivo capturado: ${fileInput.files[0].name}`;
    } else {
        fileNameDisplay.textContent = '';
    }
});


// =======================================================================
// 3. ENVIAR MENSAJES (Manejo de Storage)
// =======================================================================

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = nameInput.value.trim().substring(0, 30);
    const message = messageInput.value.trim();
    const file = fileInput.files[0];

    if (!name || (!message && !file)) {
        alert('Por favor, ingresa tu nombre y un mensaje de texto o captura una foto/video.');
        return;
    }

    if (file && file.size > MAX_FILE_SIZE) {
        alert('El archivo es demasiado grande. El límite es de 10MB.');
        return;
    }

    submitButton.disabled = true;

    try {
        let mediaUrl = null;
        let mediaType = null;

        if (file) {
            // 1. Mostrar barra de progreso
            progressBarContainer.classList.remove('hidden');
            uploadStatus.textContent = 'Iniciando subida...';

            // 2. Definir referencia de Storage
            const fileExtension = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
            const sRef = storageRef(storage, `memories/${fileName}`);

            // 3. Subir archivo
            const uploadTask = uploadBytesResumable(sRef, file);

            // 4. Monitorear el progreso
            await new Promise((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + '%';
                        uploadStatus.textContent = `Subiendo: ${Math.round(progress)}%`;
                    }, 
                    (error) => {
                        console.error("Error de subida:", error);
                        alert("Error al subir el archivo: " + error.message);
                        reject(error);
                    }, 
                    async () => {
                        // 5. Subida completa: Obtener URL de descarga
                        mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        mediaType = file.type;
                        resolve();
                    }
                );
            });
        }

        // 6. Guardar metadatos en Realtime Database
        const newMemory = {
            name: name,
            message: message,
            mediaUrl: mediaUrl,
            mediaType: mediaType,
            timestamp: Date.now()
        };

        await push(memoriesRef, newMemory);
        alert('¡Recuerdo enviado con éxito a la Colmena!');
        
    } catch (error) {
        console.error("Error general al enviar el recuerdo:", error);
        alert(`Error al enviar el recuerdo: ${error.message}`);
    } finally {
        // 7. Resetear UI y botón
        form.reset();
        fileNameDisplay.textContent = '';
        progressBarContainer.classList.add('hidden');
        progressBar.style.width = '0%';
        submitButton.disabled = false;
    }
});

// Iniciar la escucha de mensajes al cargar la página
listenForMemories();