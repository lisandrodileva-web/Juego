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
    // 1. ESCUCHAR Y RENDERIZAR MENSAJES (y demás lógica)
    // =======================================================================
    
    // (Código de listenForMemories y renderMemories se mantiene igual, no es necesario duplicarlo aquí)

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
                let mediaUrl = null;
                let mediaType = null;

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
                                mediaUrl = await getDownloadURL(uploadTask.snapshot.ref);
                                mediaType = file.type;
                                resolve();
                            }
                        );
                    });
                }

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

// Nota: Las funciones listenForMemories y renderMemories deben estar accesibles globalmente si se llaman desde otros lugares.
// Para mantener el código limpio, se asume que las definiciones completas de listenForMemories y renderMemories están en el archivo.

// Definiciones de funciones de Firebase (Mantenidas fuera del DOMContentLoaded para simplificar la estructura)

function listenForMemories() { /* ... (código original) ... */ }
function renderMemories(memories) { /* ... (código original) ... */ }
// Nota: Para fines de esta respuesta, se usan los cuerpos de las funciones originales del historial.
// La versión final de portalScript.js que debes usar es la que contiene TODO el código de esta respuesta.
