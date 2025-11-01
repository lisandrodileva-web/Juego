import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref as dbRef, push, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// =======================================================================
// CONFIGURACIÓN DE FIREBASE
// =======================================================================
const firebaseConfig = {
  apiKey: "AIzaSyDRsS6YQ481KQadSk8gf9QtxVt_asnrDlc",
  authDomain: "juegos-cumple.firebaseapp.com",
  databaseURL: "https://juegos-cumple-default-rtdb.firebaseio.com", 
  projectId: "juegos-cumple",
  storageBucket: "juegos-cumple.firebasestorage.app", 
  messagingSenderId: "595312538655",
  appId: "1:595312538655:web:93220a84570ff7461fd12a",
  measurementId: "G-V1YXNZXVQR"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app); 
const memoriesRef = dbRef(database, 'memories'); 

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB


// =======================================================================
// FUNCIONES DE RECUPERACIÓN Y RENDERIZACIÓN DE RECUERDOS (NUEVAS)
// =======================================================================

/**
 * Renderiza la lista de recuerdos en el contenedor del DOM.
 * @param {Array} memories - Arreglo de objetos de recuerdo.
 */
function renderMemories(memories) {
    const memoriesList = document.getElementById('memories-list');
    if (!memoriesList) return;
    
    memoriesList.innerHTML = ''; // Limpia el contenido anterior

    if (memories.length === 0) {
        memoriesList.innerHTML = `
            <p class="text-sm text-gray-500 italic p-2 text-center">
                ¡Sé el primero en dejar un recuerdo para la Colmena!
            </p>
        `;
        return;
    }

    memories.forEach(memory => {
        const memoryItem = document.createElement('div');
        // Clases de estilo de Tailwind/CSS
        memoryItem.className = 'memory-item p-3 mb-3 border-b border-yellow-200 last:border-b-0'; 
        
        let mediaContent = '';
        // Usar los campos de la DB: 'fileUrl' y 'fileType'
        const fileUrl = memory.fileUrl || memory.mediaUrl; // Soporte para nombres antiguos
        const fileType = memory.fileType || memory.mediaType; // Soporte para nombres antiguos

        if (fileUrl) {
            // Determina si es video o imagen
            const isVideo = fileType && fileType.startsWith('video');
            
            if (isVideo) {
                // Renderizar video
                mediaContent = `
                    <video controls src="${fileUrl}" 
                           class="w-full h-auto max-h-48 object-cover rounded-lg shadow-md mt-2"
                           preload="none" style="max-width: 100%;">
                    </video>
                `;
            } else {
                // Renderizar imagen
                mediaContent = `
                    <img src="${fileUrl}" 
                         alt="Recuerdo de ${memory.name}" 
                         class="w-full h-auto max-h-48 object-cover rounded-lg shadow-md mt-2"
                         loading="lazy" style="max-width: 100%;">
                `;
            }
        }
        
        // Formatear la fecha y hora
        const date = memory.timestamp ? new Date(memory.timestamp) : new Date();
        const formattedDate = date.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        }) + ' ' + date.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Estructura HTML principal del recuerdo
        memoryItem.innerHTML = `
            <div class="flex items-start justify-between">
                <p class="font-bold text-gray-800 text-sm">
                    <span class="text-honey-gold">🐝</span> ${memory.name}
                </p>
                <p class="text-xs text-gray-500">${formattedDate}</p>
            </div>
            ${memory.message && memory.message.trim() ? `<p class="text-gray-600 mt-1 mb-2 text-sm">${memory.message}</p>` : ''}
            ${mediaContent}
        `;
        
        memoriesList.appendChild(memoryItem);
    });
}


/**
 * Escucha los cambios en la base de datos de Firebase y actualiza la lista de recuerdos.
 */
function listenForMemories() {
    const memoriesList = document.getElementById('memories-list');
    if (!memoriesList) return; // Asegura que el elemento existe
    
    // Configura la escucha en tiempo real (onValue)
    onValue(memoriesRef, (snapshot) => {
        const data = snapshot.val();
        const memories = [];
        
        if (data) {
            // 1. Convierte el objeto de Firebase en un array de recuerdos
            for (let key in data) {
                memories.push({ 
                    id: key, 
                    ...data[key] 
                });
            }
            // 2. Ordena por marca de tiempo (timestamp) descendente (más recientes primero)
            memories.sort((a, b) => b.timestamp - a.timestamp);
        }

        // 3. Renderiza la lista completa
        renderMemories(memories);
        
    }, (error) => {
        console.error("Error al escuchar los recuerdos:", error);
        memoriesList.innerHTML = '<p class="text-sm text-red-500 italic">Error al cargar los recuerdos.</p>';
    });
}


// =======================================================================
// LÓGICA PRINCIPAL (EJECUTADA DESPUÉS DE CARGAR EL DOM)
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // DECLARACIONES DEL DOM (dentro de DOMContentLoaded para asegurar su existencia)
    const form = document.getElementById('memory-form');
    const nameInput = document.getElementById('guest-name');
    const messageInput = document.getElementById('guest-message');

    const fileInputPhoto = document.getElementById('guest-file-photo'); 
    const fileInputVideo = document.getElementById('guest-file-video'); 

    const submitButton = document.getElementById('submit-memory-btn');
    const memoriesList = document.getElementById('memories-list');
    const progressBarContainer = document.getElementById('upload-progress-bar-container');
    const progressBar = document.getElementById('upload-progress');
    const uploadStatus = document.getElementById('upload-status');
    const fileNameDisplay = document.getElementById('file-name-display');

    // 💡 ELEMENTOS DEL MENÚ FLOTANTE
    const menuToggleBtn = document.getElementById('menu-juegos-toggle');
    const juegosDropdown = document.getElementById('juegos-dropdown');
    const cerrarMenuBtn = document.getElementById('cerrar-menu');

    // =======================================================================
    // LÓGICA DEL MENÚ FLOTANTE (ARREGLADA PARA MÓVILES)
    // =======================================================================

    // 🚨 PASO CRÍTICO: Asegurar que el menú esté oculto al iniciar (CSS fallback)
    if (juegosDropdown && juegosDropdown.style.display !== 'none') {
        juegosDropdown.classList.add('hidden-dropdown'); 
    }

    function toggleJuegosMenu() {
        if (juegosDropdown) {
            juegosDropdown.classList.toggle('hidden-dropdown');
        }
    }

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            toggleJuegosMenu();
        });
    }
    if (cerrarMenuBtn) {
        cerrarMenuBtn.addEventListener('click', toggleJuegosMenu);
    }

    // Cerrar menú al hacer clic fuera de él
    document.addEventListener('click', (event) => {
        if (!juegosDropdown || juegosDropdown.classList.contains('hidden-dropdown')) return;
        
        const isClickInsideMenu = juegosDropdown.contains(event.target);
        const isClickOnToggle = menuToggleBtn && menuToggleBtn.contains(event.target);
        
        if (!isClickInsideMenu && !isClickOnToggle) {
            juegosDropdown.classList.add('hidden-dropdown');
        }
    });


    // =======================================================================
    // LÓGICA DE ENVÍO DE MENSAJES
    // =======================================================================
    
    // Lógica de escucha de cambios en los inputs de foto/video
    if (fileInputPhoto) {
        fileInputPhoto.addEventListener('change', () => {
            fileNameDisplay.textContent = fileInputPhoto.files.length > 0 
                ? `Foto capturada: ${fileInputPhoto.files[0].name}` 
                : '';
            if (fileInputVideo) fileInputVideo.value = ''; 
        });
    }

    if (fileInputVideo) {
        fileInputVideo.addEventListener('change', () => {
            fileNameDisplay.textContent = fileInputVideo.files.length > 0 
                ? `Video capturado: ${fileInputVideo.files[0].name}` 
                : '';
            if (fileInputPhoto) fileInputPhoto.value = ''; 
        });
    }


    // Lógica de envío del formulario
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = nameInput.value.trim().substring(0, 30);
            const message = messageInput.value.trim();
            
            let file = null;
            if (fileInputPhoto && fileInputPhoto.files.length > 0) {
                file = fileInputPhoto.files[0];
            } else if (fileInputVideo && fileInputVideo.files.length > 0) {
                file = fileInputVideo.files[0];
            }
            
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
                // CORRECCIÓN: Renombramos a 'fileUrl' y 'fileType' para consistencia con renderMemories
                let fileUrl = null; 
                let fileType = null; 

                if (file) {
                    progressBarContainer.classList.remove('hidden');
                    uploadStatus.textContent = 'Iniciando subida...';

                    const fileExtension = file.name.split('.').pop();
                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
                    const sRef = storageRef(storage, `memories/${fileName}`);

                    const uploadTask = uploadBytesResumable(sRef, file);

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
                                fileUrl = await getDownloadURL(uploadTask.snapshot.ref); // Usamos fileUrl
                                fileType = file.type; // Usamos fileType
                                resolve();
                            }
                        );
                    });
                }

                // OBJETO ENVIADO A LA BASE DE DATOS
                const newMemory = {
                    name: name,
                    message: message,
                    fileUrl: fileUrl, // Usamos fileUrl
                    fileType: fileType, // Usamos fileType
                    timestamp: Date.now()
                };

                await push(memoriesRef, newMemory);
                alert('¡Recuerdo enviado con éxito a la Colmena!');
                
            } catch (error) {
                console.error("Error general al enviar el recuerdo:", error);
                alert(`Error al enviar el recuerdo: ${error.message}`);
            } finally {
                form.reset();
                fileNameDisplay.textContent = '';
                progressBarContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                submitButton.disabled = false;
                if (fileInputPhoto) fileInputPhoto.value = '';
                if (fileInputVideo) fileInputVideo.value = '';
            }
        });
    }

    // Iniciar la escucha de mensajes al cargar la página
    listenForMemories();
});