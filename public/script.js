// ⭐️⭐️⭐️ IMPORTACIONES DE AUTH AÑADIDAS ⭐️⭐️⭐️
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, get, query, orderByChild, equalTo, update, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// ⭐️⭐️⭐️ FIN DE IMPORTACIONES ⭐️⭐️⭐️

// =======================================================================
// CONFIGURACIÓN DE FIREBASE (Sin cambios)
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

// =======================================================================
// INICIALIZACIÓN Y VARIABLES GLOBALES
// =======================================================================

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app); 
const auth = getAuth(app); // ⭐️⭐️⭐️ INICIALIZACIÓN DE AUTH AÑADIDA ⭐️⭐️⭐️

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectDatabaseEmulator(database, "localhost", 9000);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("Conectado a los emuladores locales de Auth, Database y Storage en script.js");
  } catch (e) {
    console.warn("Error conectando a los emuladores locales:", e);
  }
}

// --- NUEVO: Refs y ID de Evento Globales (se asignarán en DOMContentLoaded) ---
let EVENT_ID;
let questionsRef, rankingsRef, memoryImagesRef, memoryRankingsRef, hangmanWordsRef;

// Variables globales de estado de juegos (sin cambios)
let quizQuestions = []; 
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = 10;
let timeBonusTotal = 0; 
let totalTime = 0; 

let triviaPlayerName = '';
let memoryGameImages = []; 
let hasFlippedCard = false;
let lockBoard = false;
let firstCard, secondCard;
let matchCount = 0;
let memoryTimer = null;
let secondsElapsed = 0;
let memoryPlayerName = '';

let hangmanWord = '';
let maskedWord = [];
let guessedLetters = [];
let lives = 7;
let hangmanPlayerName = '';


// =======================================================================
// --- LÓGICA DE EVENTO Y CONFIGURACIÓN ---
// (Tu código original, sin cambios)
// =======================================================================

/**
 * Obtiene el ID del evento desde la URL (ej: ?event=boda-ana).
 * Bloquea la app si no se encuentra.
 */
function getEventId() {
    const params = new URLSearchParams(window.location.search);
    let eventId = params.get('event'); // Lo obtenemos
    if (!eventId) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #333;">
                <h1>Error: Evento no encontrado</h1>
                <p>Asegúrate de que el enlace (URL) que estás usando sea correcto.</p>
            </div>
        `;
        throw new Error('Event ID no especificado en la URL.');
    }
    // ⭐️ CORRECCIÓN: Convertir siempre a minúsculas para consistencia.
    return eventId.trim().toLowerCase();
}

/**
 * ⭐️ Motor de Temas Dinámico
 * (Tu código original, sin cambios)
 */
function applyDynamicTheme(themeConfig, textsConfig) { // ⭐️ CORRECCIÓN: Aceptar textsConfig como argumento
    if (!themeConfig) {
        console.warn("No se encontró tema, usando defaults.");
        return;
    }

    const styleTag = document.createElement('style');
    let cssVariables = ":root {\n";

    // 1. Iterar sobre las claves del TEMA
    for (const key in themeConfig) {
        if (typeof themeConfig[key] === 'object' && themeConfig[key] !== null) {
            continue;
        }
        const value = themeConfig[key];
        if (!value) {
            continue; 
        }
        const cssVarName = `--${key.replace(/_/g, '-')}`; 
        cssVariables += `    ${cssVarName}: ${value};\n`;
    }
    cssVariables += "}\n";
    
    // ⭐️ CORRECCIÓN: Iterar sobre las claves de TEXTOS (Esta era la parte que faltaba)
    if (textsConfig) {
        for (const key in textsConfig) {
            if (textsConfig[key]) cssVariables += `    --${key.replace(/_/g, '-')}: ${textsConfig[key]};\n`;
        }
    }

    // 2. Manejar la fuente
    if (themeConfig.font_family) { 
        // ⭐️ CORRECCIÓN: Se aplica la fuente al body para que se herede,
        // pero sin !important, para permitir que estilos más específicos (como en un h1) la anulen.
        cssVariables += `
            body { font-family: ${themeConfig.font_family}; }
        `;
    }

    // 3. Manejar la imagen de fondo
    if (themeConfig.background_image_url) {
         cssVariables += `
            body {
                background-image: url('${themeConfig.background_image_url}') !important;
                background-size: ${themeConfig.background_image_size || 'cover'};
                background-position: ${themeConfig.background_image_position || 'center'};
            }
        `;
    }

    // ⭐️ NUEVO: Manejar el sticker de los juegos
    // ⭐️ CORRECCIÓN FINAL (DE NUEVO): La ruta correcta es directamente themeConfig.juegos_stickers
    if (themeConfig.juegos_stickers && Array.isArray(themeConfig.juegos_stickers)) { // ⭐️ CORRECCIÓN: Se eliminó la línea 'if' duplicada.
        themeConfig.juegos_stickers.forEach(sticker => {
            if (!sticker || !sticker.url) return;

            const stickerImg = document.createElement('img');
            stickerImg.src = sticker.url;
            stickerImg.alt = "Sticker Decorativo de Juegos";
            stickerImg.style.position = 'fixed';
            stickerImg.style.zIndex = '1000';
            stickerImg.style.pointerEvents = 'none';

            if (sticker.width) stickerImg.style.width = sticker.width;
            if (sticker.transform) stickerImg.style.transform = sticker.transform;
            if (sticker.top) stickerImg.style.top = sticker.top;
            if (sticker.bottom) stickerImg.style.bottom = sticker.bottom;
            if (sticker.left) stickerImg.style.left = sticker.left;
            if (sticker.right) stickerImg.style.right = sticker.right;

            document.body.appendChild(stickerImg);
        });
    } // ⭐️ CORRECCIÓN: El corchete de cierre se movió aquí para envolver correctamente el bucle.

    // ⭐️ NUEVO: Manejar el contorno de texto
    if (themeConfig.text_stroke_width && themeConfig.text_stroke_color) {
        cssVariables += `
            h1, h2, h3, p, span, button, a, div {
                -webkit-text-stroke-width: ${themeConfig.text_stroke_width};
                -webkit-text-stroke-color: ${themeConfig.text_stroke_color};
            }
        `;
    }

    // 4. Inyectar en el <head>
    styleTag.innerHTML = cssVariables;
    document.head.appendChild(styleTag);
    
    // 5. Manejar los iconos
    if (themeConfig.icons) {
        const icons = themeConfig.icons;
        const updateIcons = (className, icon) => {
            document.querySelectorAll(className).forEach(el => {
                if (icon && icon.trim() !== '') {
                    el.textContent = icon;
                    el.style.display = ''; // Asegurarse de que sea visible
                } else {
                    el.style.display = 'none'; // Ocultar si no hay icono
                }
            });
        };
        updateIcons('.icon-main', icons.icon_main);
        updateIcons('.icon-portal', icons.icon_portal);
        updateIcons('.icon-trivia', icons.icon_trivia);
        updateIcons('.icon-memory', icons.icon_memory);
        updateIcons('.icon-hangman', icons.icon_hangman);
        updateIcons('.icon-ranking', icons.icon_ranking);
        updateIcons('.icon-win', icons.icon_win);
        updateIcons('.icon-games', icons.icon_games);
        updateIcons('.icon-memories', icons.icon_memories);
    }
}


/**
 * ⭐️ FUNCIÓN loadEventConfig (MODIFICADA) ⭐️
 * (Tu código original, sin cambios)
 */
export async function loadEventConfig(eventId) {
    const configRef = ref(database, `events/${eventId}/config`);
    let config = {};
    window.eventConfig = {}; // ⭐️ NUEVO: Guardar config globalmente
    
    try {
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            config = snapshot.val();
        } else {
            console.warn("No se encontró configuración. Usando valores por defecto.");
            const isHost = window.location.pathname.includes('host.html');
            const isRanking = window.location.pathname.includes('ranking.html');
            
            if (isHost || isRanking) {
                 console.warn("Host/Ranking: Cuidado, no hay config. Se usarán defaults.");
            } else {
                throw new Error("Configuración de evento no encontrada.");
            }
        }
    } catch (error) {
        console.error("Error cargando configuración:", error);
        throw new Error("Error al cargar la configuración del evento.");
    }
    window.eventConfig = config; // ⭐️ NUEVO: Guardar config globalmente

    // --- 1. CHEQUEO DE EVENTO ACTIVO ---
    const isHost = window.location.pathname.includes('host.html');
    const isRanking = window.location.pathname.includes('ranking.html');

    if (!isHost && !isRanking && (!config.status || config.status.is_active === false)) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #333;">
                <h1>Evento Finalizado</h1>
                <p>Este portal de recuerdos ya no se encuentra disponible.</p>
            </div>
        `;
        throw new Error("El evento está deshabilitado.");
    }

    // --- 2. APLICAR TEMA VISUAL ---
    applyDynamicTheme(config.theme || {}, config.texts || {}); // ⭐️ CORRECCIÓN: Pasar ambos objetos de configuración
    
    // --- 3. APLICAR FUNCIONALIDADES (Juegos) ---
    if (config.features && config.features.games_enabled === false) {
        if (isHost) {
            const triviaAdmin = document.querySelector('.quiz-section'); 
            const triviaRanking = document.querySelector('.ranking-section'); 
            const memoryAdmin = document.getElementById('memory-game-admin');
            const memoryRanking = document.querySelector('.ranking-section[aria-label="Ranking de Memoria"]'); 
            const hangmanAdmin = document.getElementById('hangman-admin');
            const playerLinks = document.querySelector('.mode-selector'); 
            
            if (playerLinks) playerLinks.style.display = 'none';
            if (triviaAdmin) triviaAdmin.style.display = 'none';
            if (triviaRanking) triviaRanking.style.display = 'none';
            if (memoryAdmin) memoryAdmin.style.display = 'none';
            if (memoryRanking) memoryRanking.style.display = 'none';
            if (hangmanAdmin) hangmanAdmin.style.display = 'none';
            
            const headerTitle = document.getElementById('header-title');
            if(headerTitle) headerTitle.innerHTML = `Panel: ${eventId} <br><span style="font-size: 0.6em; color: red;">(Juegos Deshabilitados)</span>`;
        }
        
        if (isRanking) {
             document.querySelectorAll('.ranking-box').forEach(box => box.style.display = 'none');
             document.body.innerHTML = `
                <h1 style="text-align: center;">Módulo de Juegos Deshabilitado</h1>
                <p style="text-align: center;">Este módulo no está activo para este evento.</p>
             `;
        }

        // ⭐️ CORRECCIÓN: Este bloqueo solo debe aplicarse a las páginas de juegos, no a todas las páginas.
        const isGamePage = window.location.pathname.includes('player.html') ||
                             window.location.pathname.includes('memory.html') ||
                             window.location.pathname.includes('hangman.html');

        if (isGamePage) { // Si estamos en una página de juego y los juegos están deshabilitados...
            document.body.innerHTML = `
                <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #333;">
                    <h1>Módulo de Juegos Deshabilitado</h1>
                    <p>Este módulo no está activo para este evento.</p>
                    <a href="index.html?event=${eventId}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #333; color: #fff; text-decoration: none; border-radius: 5px;">Volver al portal</a>
                </div>
            `;
            throw new Error("Módulo de juegos deshabilitado.");
        }
    }

    // --- 4. ⭐️ NUEVO: APLICAR FUNCIONALIDAD DE PROYECTOR ---
    if (config.features && config.features.projector_enabled === false) {
        // Si el proyector está deshabilitado, oculta el botón del menú principal del host.
        const showProjectorMenuBtn = document.getElementById('show-projector-menu-btn');
        if (showProjectorMenuBtn) {
            showProjectorMenuBtn.style.display = 'none';
        }
    }

    // --- 4. ⭐️ NUEVO: APLICAR TEXTOS DINÁMICOS ---
    if (config.texts) {
        const triviaTitle = document.getElementById('trivia-title-text');
        if (triviaTitle) {
            triviaTitle.innerHTML = config.texts.trivia_title || '';
            // ⭐️ CORRECCIÓN DEFINITIVA: Aplicar estilos de fuente y espaciado
            if(config.texts.trivia_title_font_family) triviaTitle.style.fontFamily = config.texts.trivia_title_font_family;
            if(config.texts.trivia_title_letter_spacing) triviaTitle.style.letterSpacing = config.texts.trivia_title_letter_spacing;
            // ⭐️ NUEVO: Aplicar tamaño de fuente
            if(config.texts.trivia_title_font_size) triviaTitle.style.fontSize = config.texts.trivia_title_font_size;
            // ⭐️ NUEVO: Aplicar contorno específico
            if(config.texts.trivia_title_stroke_width && config.texts.trivia_title_stroke_color) {
                triviaTitle.style.webkitTextStroke = `${config.texts.trivia_title_stroke_width} ${config.texts.trivia_title_stroke_color}`;
            }
        }

        const triviaWelcome = document.getElementById('trivia-welcome-text');
        if (triviaWelcome) {
            triviaWelcome.innerHTML = config.texts.trivia_welcome || '';
            // ⭐️ CORRECCIÓN DEFINITIVA: Aplicar estilos de fuente y espaciado
            if(config.texts.trivia_welcome_font_family) triviaWelcome.style.fontFamily = config.texts.trivia_welcome_font_family;
            if(config.texts.trivia_welcome_letter_spacing) triviaWelcome.style.letterSpacing = config.texts.trivia_welcome_letter_spacing;
            // ⭐️ NUEVO: Aplicar contorno específico
            if(config.texts.trivia_welcome_stroke_width && config.texts.trivia_welcome_stroke_color) {
                triviaWelcome.style.webkitTextStroke = `${config.texts.trivia_welcome_stroke_width} ${config.texts.trivia_welcome_stroke_color}`;
            }
        }

        const triviaSubtitle = document.getElementById('trivia-subtitle-text');
        if (triviaSubtitle) triviaSubtitle.innerHTML = config.texts.trivia_subtitle || ''; // Este no tiene personalización de fuente

        // Textos de Memoria
        const memoryTitle = document.getElementById('memory-title-text');
        if (memoryTitle) {
            memoryTitle.innerHTML = config.texts.memory_title || '';
            // ⭐️ CORRECCIÓN DEFINITIVA: Aplicar estilos de fuente y espaciado
            if(config.texts.memory_title_font_family) memoryTitle.style.fontFamily = config.texts.memory_title_font_family;
            if(config.texts.memory_title_letter_spacing) memoryTitle.style.letterSpacing = config.texts.memory_title_letter_spacing;
            // ⭐️ NUEVO: Aplicar tamaño de fuente
            if(config.texts.memory_title_font_size) memoryTitle.style.fontSize = config.texts.memory_title_font_size;
            // ⭐️ NUEVO: Aplicar contorno específico
            if(config.texts.memory_title_stroke_width && config.texts.memory_title_stroke_color) {
                memoryTitle.style.webkitTextStroke = `${config.texts.memory_title_stroke_width} ${config.texts.memory_title_stroke_color}`;
            }
        }

        // ⭐️ NUEVO: Textos de Ahorcado
        const hangmanTitle = document.getElementById('hangman-title-text');
        if (hangmanTitle) {
            hangmanTitle.innerHTML = config.texts.hangman_title || '';
            // ⭐️ CORRECCIÓN DEFINITIVA: Aplicar estilos de fuente y espaciado
            if(config.texts.hangman_title_font_family) hangmanTitle.style.fontFamily = config.texts.hangman_title_font_family;
            if(config.texts.hangman_title_letter_spacing) hangmanTitle.style.letterSpacing = config.texts.hangman_title_letter_spacing;
            // ⭐️ NUEVO: Aplicar tamaño de fuente
            if(config.texts.hangman_title_font_size) hangmanTitle.style.fontSize = config.texts.hangman_title_font_size;
            // ⭐️ NUEVO: Aplicar contorno específico
            if(config.texts.hangman_title_stroke_width && config.texts.hangman_title_stroke_color) {
                hangmanTitle.style.webkitTextStroke = `${config.texts.hangman_title_stroke_width} ${config.texts.hangman_title_stroke_color}`;
            }
        }

        const hangmanSubtitle = document.getElementById('hangman-subtitle-text');
        if (hangmanSubtitle) {
            hangmanSubtitle.innerHTML = config.texts.hangman_subtitle || '';
            // ⭐️ CORRECCIÓN DEFINITIVA: Aplicar estilos de fuente y espaciado
            if(config.texts.hangman_subtitle_font_family) hangmanSubtitle.style.fontFamily = config.texts.hangman_subtitle_font_family;
            if(config.texts.hangman_subtitle_letter_spacing) hangmanSubtitle.style.letterSpacing = config.texts.hangman_subtitle_letter_spacing;
            // ⭐️ NUEVO: Aplicar contorno específico
            if(config.texts.hangman_subtitle_stroke_width && config.texts.hangman_subtitle_stroke_color) {
                hangmanSubtitle.style.webkitTextStroke = `${config.texts.hangman_subtitle_stroke_width} ${config.texts.hangman_subtitle_stroke_color}`;
            }
        }

        // ⭐️ NUEVO: Textos de Ranking
        const rankingTitle = document.getElementById('ranking-title-text');
        if (rankingTitle) {
            rankingTitle.innerHTML = config.texts.ranking_title || 'Rankings';
            
            // ⭐️ SOLUCIÓN: Aplicar la fuente de forma consistente, igual que en los otros juegos.
            // Solo aplicamos una fuente si está definida específicamente para este título.
            // Si no, heredará la fuente global del body, manteniendo la consistencia.
            if (config.texts.ranking_title_font_family) {
                rankingTitle.style.fontFamily = config.texts.ranking_title_font_family;
            }

            if (config.texts.ranking_title_letter_spacing) rankingTitle.style.letterSpacing = config.texts.ranking_title_letter_spacing;
            if (config.texts.ranking_title_font_size) rankingTitle.style.fontSize = config.texts.ranking_title_font_size;
            if (config.texts.ranking_title_color) rankingTitle.style.color = config.texts.ranking_title_color;
            // ⭐️ NUEVO: Aplicar contorno específico
            if (config.texts.ranking_title_stroke_width && config.texts.ranking_title_stroke_color) {
                rankingTitle.style.webkitTextStroke = `${config.texts.ranking_title_stroke_width} ${config.texts.ranking_title_stroke_color}`;
            }
        }

        // ⭐️ NUEVO: Textos de Anfitrión
        const hostLoginTitle = document.getElementById('host-login-title-text');
        if (hostLoginTitle && config.texts.host_login_title) {
            hostLoginTitle.innerHTML = config.texts.host_login_title;
        }
        const hostPanelTitle = document.getElementById('host-panel-title-text');
        if (hostPanelTitle && config.texts.host_panel_title) {
            hostPanelTitle.innerHTML = config.texts.host_panel_title;
        }

        // ⭐️ NUEVO: Título del documento para Host
        const isHostPage = window.location.pathname.includes('host.html');
        if (isHostPage && config.texts.host_document_title) {
            document.title = config.texts.host_document_title;
        }

    }
}


// =======================================================================
// FUNCIONES DE UTILIDAD Y ALMACENAMIENTO (TRIVIA)
// (Tu código original, sin cambios)
// =======================================================================

function fixFirebaseArray(data) {
    if (data && data.options && !Array.isArray(data.options) && typeof data.options === 'object') {
        data.options = Object.values(data.options);
    }
    return data;
}

function listenForQuestions(callback) {
    onValue(questionsRef, (snapshot) => {
        const data = snapshot.val();
        quizQuestions = [];
        if (data) {
            Object.keys(data).forEach(key => {
                let questionData = data[key];
                questionData = fixFirebaseArray(questionData);
                quizQuestions.push({
                    id: key,
                    ...questionData
                });
            });
        }
        console.log(`[Firebase] Preguntas cargadas: ${quizQuestions.length}`);
        // ⭐️ CORRECCIÓN: Se pasa la lista de preguntas al callback una sola vez para evitar renderizados múltiples.
        if (callback) callback(quizQuestions);
    });
}

function saveNewQuestion(questionData) {
    return push(questionsRef, questionData); 
}

function deleteQuestion(id) {
    const questionToRemoveRef = ref(database, `juegos-cumple-default-rtdb/events/${EVENT_ID}/data/questions/${id}`);
    return remove(questionToRemoveRef);
}

async function saveFinalResult(data) {
    // ⭐️ LOGICA MODIFICADA: Evitar duplicados y guardar solo el mejor puntaje en Trivia
    try {
        // ⭐️ CAMBIO: Traemos todos los rankings y filtramos aquí para evitar error de índice en Firebase
        const snapshot = await get(rankingsRef);
        
        let existingKey = null;
        let existingData = null;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const val = child.val();
                if (val.name === data.name) {
                    existingKey = child.key;
                    existingData = val;
                }
            });
        }

        if (existingKey) {
            // Criterio: Mayor puntaje es mejor. A igual puntaje, menor tiempo es mejor.
            const isBetter = data.score > existingData.score || (data.score === existingData.score && data.time < existingData.time);
            
            if (isBetter) {
                const updateRef = ref(database, `events/${EVENT_ID}/data/rankings/${existingKey}`);
                await update(updateRef, data);
                console.log("Ranking Trivia actualizado con mejor puntuación.");
            }
        } else {
            // Usuario nuevo
            await push(rankingsRef, data);
        }
    } catch (error) {
        console.error("Error al guardar ranking Trivia:", error);
    }
}

function listenForRankings(renderCallback) {
    onValue(rankingsRef, (snapshot) => {
        const data = snapshot.val();
        let rankingList = [];
        if (data) {
            Object.keys(data).forEach(key => {
                rankingList.push(data[key]);
            });
        }
        renderCallback(rankingList); 
    });
}

function renderTriviaRanking(results) {
    const container = document.getElementById('ranking-list');
    if (!container) return; 
    results.forEach(r => {
        r.rankingValue = r.score - (r.time / 10); 
    });
    results.sort((a, b) => {
        if (b.rankingValue !== a.rankingValue) return b.rankingValue - a.rankingValue;
        if (b.score !== a.score) return a.time - b.time;
    });
    container.innerHTML = '';
    if (results.length === 0) {
        container.innerHTML = '<li class="p-2 text-gray-500 italic text-center">Aún no hay resultados...</li>';
        return;
    }
    results.forEach((r, index) => {
        const li = document.createElement('li');
        li.className = `question-item ${index === 0 ? 'top-winner-trivia' : ''}`;
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.innerHTML = `
            <div style="font-weight: bold; display: flex; align-items: center;">
                <span style="font-size: 1.2em; width: 30px;">${index + 1}.</span>
                <span>${r.name}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: bold; color: #e69900;">${r.score} pts</span>
                <span style="font-size: 0.9em; color: #666;">(${r.time}s usados)</span>
            </div>
        `;
        container.appendChild(li);
    });
}

// =======================================================================
// --- FUNCIONES DE ALMACENAMIENTO (JUEGO DE MEMORIA) ---
// (Tu código original, sin cambios)
// =======================================================================

async function uploadMemoryImages(files, progressCallback, statusCallback) {
    const uploadPromises = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uniqueName = `${Date.now()}-${file.name}`; // ⭐️ CORREGIDO: Ruta actualizada
        const sRef = storageRef(storage, `events/${EVENT_ID}/data/memoryImages/${uniqueName}`);
        statusCallback(`Subiendo ${i + 1} de ${files.length}: ${file.name}`);
        const uploadTask = uploadBytesResumable(sRef, file);
        const uploadPromise = new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    progressCallback(progress); 
                }, 
                (error) => { reject(error); }, 
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    const imageData = { url: downloadURL, storagePath: sRef.fullPath, name: file.name };
                    await push(memoryImagesRef, imageData);
                    resolve(imageData);
                }
            );
        });
        uploadPromises.push(uploadPromise);
    }
    await Promise.all(uploadPromises);
    statusCallback("¡Todas las imágenes se subieron con éxito!");
}

function listenForMemoryImages(renderCallback) {
    onValue(memoryImagesRef, (snapshot) => {
        const images = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                images.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        renderCallback(images);
    });
}

async function clearAllMemoryImages() {
    const snapshot = await get(memoryImagesRef);
    if (!snapshot.exists()) {
        alert("No hay imágenes para borrar.");
        return;
    }
    const deletePromises = [];
    snapshot.forEach((childSnapshot) => {
        const imgData = childSnapshot.val();
        if (imgData.storagePath) {
            const sRef = storageRef(storage, imgData.storagePath);
            deletePromises.push(deleteObject(sRef));
        }
    });
    try {
        await Promise.all(deletePromises);
        await remove(memoryImagesRef); 
        alert("Se eliminaron todas las imágenes correctamente.");
    } catch (error) {
        console.error("Error al borrar imágenes:", error);
        alert("Error al borrar imágenes. Revisa la consola.");
    }
}

async function deleteSingleMemoryImage(id, storagePath) {
    try {
        const sRef = storageRef(storage, storagePath);
        await deleteObject(sRef);
        const dbImgRef = ref(database, `events/${EVENT_ID}/data/memoryImages/${id}`);
        await remove(dbImgRef);
    } catch (error) {
        console.error("Error al borrar imagen:", error);
        alert("Error al borrar la imagen.");
    }
}

function listenForMemoryRankings(renderCallback) {
    onValue(memoryRankingsRef, (snapshot) => {
        const results = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                results.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
        }
        renderCallback(results);
    });
}

function renderMemoryRanking(results) {
    const container = document.getElementById('memory-ranking-list');
    if (!container) return; 

    results.sort((a, b) => a.time - b.time); 
    container.innerHTML = '';
    if (results.length === 0) {
        container.innerHTML = '<li class="p-2 text-gray-500 italic text-center">Aún no hay resultados...</li>';
        return;
    }
    results.forEach((r, index) => {
        const li = document.createElement('li');
        li.className = `question-item ${index === 0 ? 'top-winner-memory' : ''}`; 
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.innerHTML = `
            <div style="font-weight: bold; display: flex; align-items: center;">
                <span style="font-size: 1.2em; width: 30px;">${index + 1}.</span>
                <span>${r.name}</span>
            </div>
            <div style="text-align: right;">
                <span style="font-weight: bold; color: #007bff;">${r.time.toFixed(2)} s</span>
            </div>
        `;
        container.appendChild(li);
    });
}


// =======================================================================
// MODO ANFITRIÓN (host.html)
// (Tu código original, sin cambios)
// =======================================================================

function initializeHost() {
    // --- ⭐️ NUEVO: Lógica del submenú de Host ⭐️ ---
    const mainMenu = document.getElementById('host-main-menu');
    const gameConfigSections = document.getElementById('game-config-sections');
    const showGameConfigBtn = document.getElementById('show-game-config-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');

    // --- ⭐️ NUEVO: Lógica del submenú de Proyector ⭐️ ---
    const projectorMenu = document.getElementById('projector-menu-sections');
    const showProjectorMenuBtn = document.getElementById('show-projector-menu-btn');
    const backToMenuFromProjectorBtn = document.getElementById('back-to-menu-from-projector-btn');
    const shareProjectorLinkBtn = document.getElementById('share-projector-link-btn');

    if (showProjectorMenuBtn) {
        showProjectorMenuBtn.addEventListener('click', () => {
            if (mainMenu) mainMenu.style.display = 'none';
            if (projectorMenu) projectorMenu.style.display = 'block';
        });
    }

    if (backToMenuFromProjectorBtn) {
        backToMenuFromProjectorBtn.addEventListener('click', () => {
            if (mainMenu) mainMenu.style.display = 'block';
            if (projectorMenu) projectorMenu.style.display = 'none';
        });
    }
    // --- Fin de la lógica del submenú de Proyector ---


    if (showGameConfigBtn) {
        showGameConfigBtn.addEventListener('click', () => {
            if (mainMenu) mainMenu.style.display = 'none';
            if (gameConfigSections) gameConfigSections.style.display = 'block';
        });
    }

    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', () => {
            if (mainMenu) mainMenu.style.display = 'block';
            if (gameConfigSections) gameConfigSections.style.display = 'none';
        });
    }
    // --- Fin de la lógica del submenú ---


    // --- NUEVO: Actualizar enlaces del host ---
    document.querySelectorAll('a[href="player.html"]').forEach(a => a.href = `player.html?event=${EVENT_ID}`);
    document.querySelectorAll('a[href="memory.html"]').forEach(a => a.href = `memory.html?event=${EVENT_ID}`);
    document.querySelectorAll('a[href="slideshow.html"]').forEach(a => a.href = `slideshow.html?event=${EVENT_ID}`);

    // --- ⭐️ NUEVO: Lógica para compartir enlace del proyector ⭐️ ---
    if (shareProjectorLinkBtn) {
        shareProjectorLinkBtn.addEventListener('click', () => {
            const projectorUrl = `https://app.tufiestadigital.com.ar/slideshow.html?event=${EVENT_ID}`;
            navigator.clipboard.writeText(projectorUrl).then(() => {
                alert('¡Enlace del proyector copiado al portapapeles!');
            }).catch(err => {
                console.error('Error al copiar el enlace: ', err);
                alert('No se pudo copiar el enlace. Por favor, cópialo manually.');
            });
        });
    }
    // Actualiza el título del header
    // ⭐️ CORREGIDO: Ahora usa el texto personalizado y reemplaza {EVENT_ID}
    const hostPanelTitle = document.getElementById('host-panel-title-text');
    if (hostPanelTitle) {
        // Obtiene el texto que ya fue cargado por loadEventConfig
        let titleText = hostPanelTitle.textContent || 'Panel: {EVENT_ID}';
        // Reemplaza la variable por el ID real
        hostPanelTitle.textContent = titleText.replace('{EVENT_ID}', EVENT_ID);
    }


    // --- Lógica de TRIVIA ---
    const form = document.getElementById('question-form');
    const questionsList = document.getElementById('questions-list');
    const clearAllBtn = document.getElementById('clear-all-btn');

    listenForQuestions(renderQuestionsList);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const questionText = document.getElementById('q-text').value.trim();
        const optionsText = document.getElementById('q-options').value.trim();
        const answerText = document.getElementById('q-answer').value.trim();
        const options = optionsText.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        if (options.length < 2) {
            alert('Debes ingresar al menos dos opciones para la pregunta.');
            return;
        }
        if (!options.includes(answerText)) {
            alert('La respuesta correcta debe coincidir exactamente con una de las opciones.');
            return;
        }
        const newQuestionData = { question: questionText, options: options, answer: answerText };
        try {
            await saveNewQuestion(newQuestionData);
            form.reset();
        } catch (error) {
            console.error("Error al guardar la pregunta:", error);
            alert(`Error al guardar la pregunta en Firebase: ${error.message}`);
        }
    });

    clearAllBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres ELIMINAR TODAS las preguntas de la TRIVIA?')) {
            try {
                await set(questionsRef, null); 
            } catch (error) {
                console.error("Error al eliminar todas las preguntas:", error);
            }
        }
    });

    questionsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const idToDelete = e.target.dataset.id;
            try {
                await deleteQuestion(idToDelete);
            } catch (error) {
                console.error("Error al eliminar la pregunta:", error);
            }
        }
    });

    function renderQuestionsList(questions) { 
        questionsList.innerHTML = '';
        if (questions.length === 0) {
            questionsList.innerHTML = '<li class="text-gray-500 italic p-2">Aún no hay preguntas cargadas...</li>';
            clearAllBtn.classList.add('hidden');
            return;
        }
        clearAllBtn.classList.remove('hidden');
        questions.forEach((q, index) => {
            const li = document.createElement('li');
            li.className = 'question-item'; 
            li.innerHTML = `
                <div class="q-display">
                    <strong>P${index + 1}:</strong> ${q.question}
                    <p class="text-xs text-green-700">Rta: ${q.answer}</p>
                </div>
                <button class="delete-btn" data-id="${q.id}">Eliminar</button>
            `;
            questionsList.appendChild(li);
        });
    }

    // --- Lógica del JUEGO DE MEMORIA ---
    const memoryForm = document.getElementById('memory-image-form');
    const memoryFilesInput = document.getElementById('memory-files');
    const memoryImagesList = document.getElementById('memory-images-list');
    const clearMemoryImagesBtn = document.getElementById('clear-memory-images-btn');
    const progressContainer = document.getElementById('memory-upload-progress-bar-container');
    const progressBar = document.getElementById('memory-upload-progress');
    const progressStatus = document.getElementById('memory-upload-status');
    const saveMemoryBtn = document.getElementById('save-memory-images-btn');

    listenForMemoryImages(renderMemoryImagesList);

    // --- ⭐️ NUEVO: Lógica de Exportación de Recuerdos ---
    const exportBtn = document.getElementById('export-memories-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            await exportMemoriesToHTML(EVENT_ID);
        });
    }
    // --- Fin de la lógica de exportación ---

    memoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const files = memoryFilesInput.files;
        if (!files || files.length === 0) {
            alert("Por favor, selecciona al menos una imagen.");
            return;
        }
        saveMemoryBtn.disabled = true;
        progressContainer.classList.remove('hidden');

        try {
            const progressCallback = (progress) => { progressBar.style.width = `${progress}%`; };
            const statusCallback = (status) => { progressStatus.textContent = status; };
            await uploadMemoryImages(files, progressCallback, statusCallback);
            setTimeout(() => {
                progressContainer.classList.add('hidden');
                progressStatus.textContent = "Subiendo...";
                progressBar.style.width = "0%";
                memoryForm.reset();
            }, 2000);
        } catch (error) {
            console.error("Error en la subida:", error);
            alert("Hubo un error al subir las imágenes.");
            progressStatus.textContent = "Error en la subida.";
        } finally {
            saveMemoryBtn.disabled = false;
        }
    });

    clearMemoryImagesBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres ELIMINAR TODAS las imágenes del juego de memoria? Esta acción no se puede deshacer.')) {
            clearAllMemoryImages(); 
        }
    });

    memoryImagesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const path = e.target.dataset.path;
            if (confirm(`¿Seguro que quieres borrar la imagen ${e.target.dataset.name}?`)) {
                await deleteSingleMemoryImage(id, path);
            }
        }
    });

    function renderMemoryImagesList(images) {
        memoryImagesList.innerHTML = '';
        if (images.length === 0) {
            memoryImagesList.innerHTML = '<li class="p-2 text-gray-500 italic text-center">Aún no hay imágenes...</li>';
            clearMemoryImagesBtn.classList.add('hidden');
            return;
        }
        clearMemoryImagesBtn.classList.remove('hidden');
        images.forEach(img => {
            const li = document.createElement('li');
            li.className = 'question-item image-preview-item'; 
            li.innerHTML = `
                <img src="${img.url}" alt="${img.name}">
                <span class="q-display text-sm truncate">${img.name}</span>
                <button class="delete-btn" 
                        data-id="${img.id}" 
                        data-path="${img.storagePath}" 
                        data-name="${img.name}">
                    Eliminar
                </button>
            `;
            memoryImagesList.appendChild(li);
        });
    }

    // --- Lógica del JUEGO DEL AHORCADO ---
    const hangmanForm = document.getElementById('hangman-word-form');
    const hangmanWordInput = document.getElementById('h-word');
    const hangmanWordsList = document.getElementById('hangman-words-list');
    const clearHangmanWordsBtn = document.getElementById('clear-hangman-words-btn');
    
    listenForHangmanWords(renderHangmanWordsList); 

    hangmanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const word = hangmanWordInput.value.trim().toUpperCase();
        if (word.length < 3) {
            alert("La palabra debe tener al menos 3 caracteres.");
            return;
        }
        try {
            await push(hangmanWordsRef, { word: word });
            hangmanForm.reset();
        } catch (error) {
            console.error("Error al guardar la palabra:", error);
            alert("Error al guardar la palabra.");
        }
    });

    clearHangmanWordsBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres ELIMINAR TODAS las palabras del Ahorcado?')) {
            try {
                await set(hangmanWordsRef, null); 
            } catch (error) {
                console.error("Error al eliminar las palabras:", error);
            }
        }
    });

    hangmanWordsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const idToDelete = e.target.dataset.id;
            try {
                const wordRef = ref(database, `events/${EVENT_ID}/data/hangmanWords/${idToDelete}`);
                await remove(wordRef);
            } catch (error) {
                console.error("Error al eliminar la palabra:", error);
            }
        }
    });
    
    function listenForHangmanWords(renderCallback) {
        onValue(hangmanWordsRef, (snapshot) => {
            const words = [];
            if (snapshot.exists()) {
                snapshot.forEach((childSnapshot) => {
                    words.push({
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
            }
            renderCallback(words);
        });
    }

    function renderHangmanWordsList(words) {
        hangmanWordsList.innerHTML = '';
        if (words.length === 0) {
            hangmanWordsList.innerHTML = '<li class="p-2 text-gray-500 italic text-center">Aún no hay palabras...</li>';
            clearHangmanWordsBtn.classList.add('hidden');
            return;
        }
        clearHangmanWordsBtn.classList.remove('hidden');
        words.forEach((w) => {
            const li = document.createElement('li');
            li.className = 'question-item'; 
            li.innerHTML = `
                <div class="q-display">
                    <strong class="text-gray-700">${w.word}</strong>
                </div>
                <button class="delete-btn" data-id="${w.id}">Eliminar</button>
            `;
            hangmanWordsList.appendChild(li);
        });
    }
}


// =======================================================================
// MODO JUGADOR (player.html) - LÓGICA DE TRIVIA
// (Tu código original, sin cambios)
// =======================================================================

/**
 * ⭐️ NUEVO: Verifica si un nombre ya está siendo usado en el ranking.
 * Permite el reingreso si el usuario es el mismo (validado por sessionStorage).
 */
async function checkNameAvailability(name, gameContext) {
    // 1. Obtener ID único local (generarlo si no existe, igual que en portalScript)
    let uniqueId = localStorage.getItem(`guestUniqueId_${EVENT_ID}`);
    if (!uniqueId) {
        uniqueId = crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`;
        localStorage.setItem(`guestUniqueId_${EVENT_ID}`, uniqueId);
    }

    // 2. Verificar identidad local
    const storedName = localStorage.getItem(`playerName_${EVENT_ID}`);
    if (storedName && storedName.toLowerCase() === name.toLowerCase()) {
        return true; // Es el mismo usuario, permitir jugar.
    }

    // 3. Verificar en la lista central de GUESTS
    const guestsRef = ref(database, `events/${EVENT_ID}/data/guests`);
    const snapshot = await get(guestsRef);
    if (!snapshot.exists()) return true; // Nadie ha jugado aún.

    let isTaken = false;
    snapshot.forEach(child => {
        const val = child.val();
        if (val.name && val.name.toLowerCase() === name.toLowerCase()) {
            // Si el nombre existe y el ID es diferente, está tomado.
            if (val.uniqueId !== uniqueId) {
                isTaken = true;
            }
        }
    });

    return !isTaken; // Si está tomado, retorna false (no disponible).
}

/**
 * ⭐️ NUEVO: Registra el nombre en la lista central si no viene del portal
 */
async function registerGuestName(name) {
    let uniqueId = localStorage.getItem(`guestUniqueId_${EVENT_ID}`);
    if (!uniqueId) {
        uniqueId = crypto.randomUUID ? crypto.randomUUID() : `guest-${Date.now()}`;
        localStorage.setItem(`guestUniqueId_${EVENT_ID}`, uniqueId);
    }
    const guestsRef = ref(database, `events/${EVENT_ID}/data/guests`);
    await push(guestsRef, { name: name, uniqueId: uniqueId, timestamp: Date.now() });
}

export function initializePlayer() {
    // --- NUEVO: Actualizar enlaces "Volver" ---
    document.querySelectorAll("button[onclick=\"window.location.href='index.html'\"]").forEach(btn => {
        btn.onclick = () => window.location.href = `index.html?event=${EVENT_ID}`;
    });

    // --- Lógica de TRIVIA (Sin cambios internos) ---
    const startForm = document.getElementById('start-form');
    const nameInput = document.getElementById('player-name-input');
    const nameDisplay = document.getElementById('player-name-display'); 
    const startButton = document.getElementById('start-game-btn');
    const noQuestionsMsg = document.getElementById('player-no-questions-msg');
    const scoreElement = document.getElementById('score'); 
    const scoreSpan = scoreElement ? scoreElement.querySelector('span') : null; 
    const timerElement = document.getElementById('timer'); 
    const timerSpan = timerElement ? timerElement.querySelector('span') : null; 
    const questionElement = document.getElementById('question');
    const optionsContainer = document.getElementById('options-container');
    const nextButtonContainer = document.getElementById('next-button-fixed-container'); 
    const nextButton = document.getElementById('next-btn'); 
    const gameModeContainer = document.getElementById('game-mode');
    const startScreenContainer = document.getElementById('start-screen');
    const resultsContainer = document.getElementById('results');
    const finalScoreElement = document.getElementById('final-score');
    
    if (startForm) {
        // ⭐️ NUEVO: Pre-llenar nombre si ya jugó antes
        const storedName = localStorage.getItem(`playerName_${EVENT_ID}`);
        if (storedName && nameInput) {
            nameInput.value = storedName;
            nameInput.disabled = true; // 🔒 Bloquear el input para que no puedan cambiarlo
            nameInput.style.backgroundColor = "#f0f0f0"; // Feedback visual
        }

        listenForQuestions(initializePlayerScreen);
        if (nextButtonContainer) nextButtonContainer.classList.add('hidden'); 

        startForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            if (name) {
                // ⭐️ NUEVO: Verificar si el nombre está disponible
                const isAvailable = await checkNameAvailability(name, 'trivia');
                if (!isAvailable) {
                    alert('Este nombre ya está en uso por otro jugador. Por favor, elige otro.');
                    return;
                }
                // Si el nombre no estaba guardado (es nuevo ingreso directo al juego), lo registramos
                if (!localStorage.getItem(`playerName_${EVENT_ID}`)) {
                    await registerGuestName(name);
                }
                localStorage.setItem(`playerName_${EVENT_ID}`, name); // Guardar identidad

                triviaPlayerName = name.substring(0, 20);
                if (quizQuestions.length > 0) {
                    startGame();
                } else {
                    if (noQuestionsMsg) noQuestionsMsg.classList.remove('hidden');
                    alert('El anfitrión aún no ha cargado preguntas.');
                }
            }
        });
        
        if (nextButton) nextButton.addEventListener('click', () => {
            currentQuestionIndex++;
            loadQuestion();
        });
    }

    function initializePlayerScreen(questions) {
        if (questions.length > 0) {
            if (noQuestionsMsg) noQuestionsMsg.classList.add('hidden');
            if (startButton) startButton.disabled = false;
        } else {
            if (noQuestionsMsg) noQuestionsMsg.classList.remove('hidden');
            if (startButton) startButton.disabled = true;
        }
    }

    function startGame() {
        if (nameDisplay) nameDisplay.textContent = `Jugador: ${triviaPlayerName}`;
        if (startScreenContainer) startScreenContainer.classList.add('hidden');
        if (gameModeContainer) gameModeContainer.classList.remove('hidden');
        currentQuestionIndex = 0;
        score = 0;
        timeBonusTotal = 0; 
        totalTime = 0; 
        if (timerSpan) timerSpan.textContent = timeLeft; 
        if (scoreSpan) scoreSpan.textContent = score; 
        quizQuestions.sort(() => Math.random() - 0.5);
        loadQuestion();
    }

    function startTimer() {
        timeLeft = 10;
        if (timerSpan) timerSpan.textContent = timeLeft; 
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            timeLeft--;
            if (timerSpan) timerSpan.textContent = timeLeft; 
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                handleAnswer(null); 
            }
        }, 1000);
    }

    function loadQuestion() {
        if (currentQuestionIndex >= quizQuestions.length) {
            showResults();
            return;
        }
        const currentQuestion = quizQuestions[currentQuestionIndex];
        if (!currentQuestion || !currentQuestion.options || currentQuestion.options.length === 0) {
            currentQuestionIndex++; 
            loadQuestion();
            return;
        }
        if (optionsContainer) optionsContainer.innerHTML = '';
        if (nextButtonContainer) nextButtonContainer.classList.add('hidden'); 
        if (questionElement) questionElement.textContent = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
        const shuffledOptions = [...currentQuestion.options].sort(() => Math.random() - 0.5);
        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-btn'; 
            button.addEventListener('click', () => handleAnswer(option, button));
            if (optionsContainer) optionsContainer.appendChild(button);
        });
        if (nextButton) {
            nextButton.textContent = (currentQuestionIndex < quizQuestions.length - 1) ? "Siguiente Pregunta" : "Ver Resultados";
        }
        startTimer();
    }

    function handleAnswer(selectedOption, button) {
        clearInterval(timerInterval); 
        const currentQuestion = quizQuestions[currentQuestionIndex];
        const isCorrect = selectedOption === currentQuestion.answer;
        const allButtons = optionsContainer.querySelectorAll('.option-btn'); 
        allButtons.forEach(btn => {
            btn.disabled = true;
            if (btn.textContent === currentQuestion.answer) {
                btn.classList.add('correct'); 
            } else if (btn === button) { 
                btn.classList.add('incorrect'); 
            }
        });
        if (isCorrect) {
            score += timeLeft + 5; 
            timeBonusTotal += timeLeft; 
            if (scoreSpan) scoreSpan.textContent = score; 
        }
        setTimeout(() => {
            if (nextButtonContainer) nextButtonContainer.classList.remove('hidden'); 
        }, 1000); 
    }

    function showResults() {
        if (gameModeContainer) gameModeContainer.classList.add('hidden');
        if (nextButtonContainer) nextButtonContainer.classList.add('hidden');
        if (resultsContainer) resultsContainer.classList.remove('hidden');
        const numQuestions = quizQuestions.length;
        const totalPossibleTime = numQuestions * 10;
        totalTime = totalPossibleTime - timeBonusTotal; 
        if (totalTime < 0) totalTime = 0; 
        if (finalScoreElement) finalScoreElement.textContent = `¡${triviaPlayerName}, tu puntuación final es de: ${score} puntos! Tiempo total: ${totalTime}s. ¡Gracias por jugar!`;
        const finalData = {
            name: triviaPlayerName,
            score: score,
            time: totalTime, 
            timestamp: Date.now()
        };
        saveFinalResult(finalData); 
    }
}


// =======================================================================
// LÓGICA DEL JUEGO DE MEMORIA (memory.html)
// (Tu código original, sin cambios)
// =======================================================================

// 1. Carga las URLs de Firebase y prepara el tablero
async function setupMemoryGame() {
    const gridContainer = document.getElementById('memory-game-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = 'Cargando imágenes...';
    gridContainer.style.display = 'grid'; 
    gridContainer.style.opacity = '1';

    try {
        const snapshot = await get(memoryImagesRef);
        if (!snapshot.exists()) {
            gridContainer.innerHTML = '<p class="text-center text-red-500">Error: No se han cargado imágenes en el portal del anfitrión.</p>';
            return;
        }
        const imagesObject = snapshot.val();
        const imageUrls = Object.values(imagesObject).map(item => item.url);
        if (imageUrls.length < 2) {
            gridContainer.innerHTML = '<p class="text-center text-red-500">Se necesitan al menos 2 imágenes diferentes para jugar (mínimo 4 cartas).</p>';
            return;
        }
        const numPairs = Math.min(imageUrls.length, 8); 
        const totalCards = numPairs * 2;
        const columns = Math.ceil(Math.sqrt(totalCards));
        gridContainer.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
        const pairImages = imageUrls.slice(0, numPairs); 
        memoryGameImages = [...pairImages, ...pairImages];
        shuffle(memoryGameImages);
        gridContainer.innerHTML = ''; 
        memoryGameImages.forEach((url, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.setAttribute('data-image', url);
            card.dataset.index = index;
            card.innerHTML = `
                <div class="card-inner">
                    <div class="card-face card-back">🐝</div>
                    <div class="card-face card-front"><img src="${url}" alt="Memoria ${index}"></div>
                </div>
            `;
            card.addEventListener('click', flipCard);
            gridContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Error al cargar imágenes para el juego de memoria:", error);
        gridContainer.innerHTML = '<p class="text-center text-red-500">Error al cargar el juego. Revisa la consola.</p>';
    }
}

// 2-6. Lógica de juego (flip, check, disable, unflip, reset)
function flipCard() {
    if (lockBoard) return;
    if (this === firstCard) return;
    if (!memoryTimer && matchCount === 0) {
        startMemoryTimer();
    }
    this.classList.add('flipped');
    if (!hasFlippedCard) {
        hasFlippedCard = true;
        firstCard = this;
        return;
    }
    secondCard = this;
    checkForMatch();
}
function checkForMatch() {
    const isMatch = firstCard.dataset.image === secondCard.dataset.image;
    if (isMatch) { disableCards(); } else { unflipCards(); }
}
function disableCards() {
    firstCard.removeEventListener('click', flipCard);
    secondCard.removeEventListener('click', flipCard);
    firstCard.classList.add('matched', 'match-pulse');
    secondCard.classList.add('matched', 'match-pulse');
    
    // Remover la clase de animación después de que termine (0.6s)
    const card1 = firstCard;
    const card2 = secondCard;
    setTimeout(() => {
        card1.classList.remove('match-pulse');
        card2.classList.remove('match-pulse');
    }, 600);

    matchCount++;
    resetBoard();
    if (matchCount === memoryGameImages.length / 2) {
        setTimeout(showMemoryResults, 1000);
    }
}
function unflipCards() {
    lockBoard = true;
    setTimeout(() => {
        firstCard.classList.remove('flipped');
        secondCard.classList.remove('flipped');
        resetBoard();
    }, 1000);
}
function resetBoard() {
    [hasFlippedCard, lockBoard] = [false, false];
    [firstCard, secondCard] = [null, null];
}

// 7. Manejo del temporizador
function startMemoryTimer() {
    const timerDisplay = document.querySelector('#timer span');
    secondsElapsed = 0;
    if (timerDisplay) timerDisplay.textContent = secondsElapsed;
    memoryTimer = setInterval(() => {
        secondsElapsed++;
        if (timerDisplay) timerDisplay.textContent = secondsElapsed;
    }, 1000);
}
function stopMemoryTimer() {
    clearInterval(memoryTimer);
    memoryTimer = null;
}

// 8. Mostrar Resultados y Guardar en Firebase
function showMemoryResults() {
    stopMemoryTimer();
    const gameContainer = document.getElementById('game-mode-container');
    const resultsContainer = document.getElementById('results');
    const finalTimeElement = document.getElementById('final-time');
    if (gameContainer) gameContainer.classList.add('hidden');
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    if (finalTimeElement) finalTimeElement.textContent = `¡${memoryPlayerName}, completaste el juego en: ${secondsElapsed} segundos!`;
    const finalData = { name: memoryPlayerName, time: secondsElapsed, timestamp: Date.now() };
    
    // Disparar confeti al ganar el juego de memoria
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
        });
    }

    // ⭐️ LOGICA MODIFICADA: Evitar duplicados y guardar solo el mejor tiempo
    // ⭐️ CAMBIO: Filtrado en cliente para evitar error de índice
    get(memoryRankingsRef).then((snapshot) => {
        let existingKey = null;
        let existingData = null;

        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const val = child.val();
                if (val.name === memoryPlayerName) {
                    existingKey = child.key;
                    existingData = val;
                }
            });
        }

        if (existingKey) {
            // Criterio: Menor tiempo es mejor
            if (finalData.time < existingData.time) {
                const updateRef = ref(database, `events/${EVENT_ID}/data/memoryRankings/${existingKey}`);
                update(updateRef, finalData).then(() => console.log("Mejor tiempo de Memoria actualizado."));
            }
        } else {
            push(memoryRankingsRef, finalData)
                .then(() => console.log("Resultado de Memoria guardado con éxito."))
                .catch(error => console.error("Error al guardar el resultado de Memoria:", error));
        }
    }).catch(error => console.error("Error verificando ranking de memoria:", error));
}


// 9. FUNCIÓN DE INICIALIZACIÓN GLOBAL para memory.html
export function initializeMemoryGame() {
    // --- NUEVO: Actualizar enlaces "Volver" ---
    document.querySelectorAll("button[onclick=\"window.location.href='index.html'\"]").forEach(btn => {
        btn.onclick = () => window.location.href = `index.html?event=${EVENT_ID}`;
    });

    // --- Lógica de MEMORIA ---
    const startScreen = document.getElementById('start-screen');
    const modalGameContainer = document.getElementById('modal-memory-game');
    const startButton = document.getElementById('start-btn');
    const nameInput = document.getElementById('player-name-input');
    const nameDisplay = document.getElementById('player-name-display');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const playAgainBtn = document.getElementById('play-again-modal-btn'); 

    if (!startButton || !modalGameContainer) return; 

    // ⭐️ NUEVO: Pre-llenar nombre si ya jugó antes
    const storedName = localStorage.getItem(`playerName_${EVENT_ID}`);
    if (storedName && nameInput) {
        nameInput.value = storedName;
        nameInput.disabled = true; // 🔒 Bloquear el input
        nameInput.style.backgroundColor = "#f0f0f0";
    }

    async function startMemory() {
        const name = nameInput.value.trim();
        if (name.length > 0) {
            // ⭐️ NUEVO: Verificar si el nombre está disponible
            const isAvailable = await checkNameAvailability(name, 'memory');
            if (!isAvailable) {
                alert('Este nombre ya está en uso por otro jugador. Por favor, elige otro.');
                return;
            }
            // Registrar si es nuevo
            if (!localStorage.getItem(`playerName_${EVENT_ID}`)) {
                await registerGuestName(name);
            }
            localStorage.setItem(`playerName_${EVENT_ID}`, name); // Guardar identidad

            memoryPlayerName = name;
            if(nameDisplay) nameDisplay.textContent = `Jugador: ${memoryPlayerName}`;
            if (startScreen) startScreen.classList.add('hidden');
            if (modalGameContainer) modalGameContainer.classList.remove('hidden'); 
            const resultsContainer = document.getElementById('results');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            matchCount = 0;
            secondsElapsed = 0;
            stopMemoryTimer(); 
            resetBoard(); 
            setupMemoryGame(); 
        } else {
            alert('Por favor, ingresa tu nombre para comenzar.');
        }
    }

    startButton.addEventListener('click', startMemory);
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modalGameContainer) modalGameContainer.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
            stopMemoryTimer();
        });
    }
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            const gameContainer = document.getElementById('game-mode-container');
            const resultsContainer = document.getElementById('results');
            if (resultsContainer) resultsContainer.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('hidden'); 
            matchCount = 0;
            secondsElapsed = 0;
            stopMemoryTimer(); 
            resetBoard(); 
            setupMemoryGame();
        });
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


// =======================================================================
// LÓGICA DEL JUEGO DEL AHORCADO (hangman.html)
// (Tu código original, sin cambios)
// =======================================================================

async function startHangmanGame() {
    const snapshot = await get(hangmanWordsRef);
    const wordsObject = snapshot.val();
    const wordList = wordsObject ? Object.values(wordsObject).map(item => item.word) : [];

    if (wordList.length === 0) {
        document.getElementById('game-status').textContent = "❌ ERROR: El anfitrión no ha cargado palabras para jugar.";
        document.querySelectorAll('.hangman-part').forEach(part => part.classList.add('hidden')); 
        return false;
    }
    const wordToUse = wordList[Math.floor(Math.random() * wordList.length)];
    const cleanWord = wordToUse.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/g, '');
    hangmanWord = cleanWord; 
    maskedWord = Array.from(hangmanWord).map(char => (char === ' ') ? ' ' : '_');
    guessedLetters = [];
    lives = 7; 
    updateHangmanDisplay();
    enableKeyboard();
    document.getElementById('game-status').textContent = 'Adivina la palabra. Tienes 7 intentos.';
    const playAgainBtn = document.getElementById('play-again-hangman-btn');
    if (playAgainBtn) playAgainBtn.classList.add('hidden');
    return true;
}

function updateHangmanDisplay() {
    const wordDisplay = document.getElementById('word-display');
    const lettersDisplay = document.getElementById('guessed-letters');
    const livesDisplay = document.getElementById('lives-display');
    // ⭐️ CORRECCIÓN: Se reordena el array para que el dibujo aparezca en el orden correcto.
    const HANGMAN_PARTS_IDS = [
        'hg-head', 'hg-body', 'hg-arm-l', 'hg-arm-r', 'hg-leg-l', 'hg-leg-r', 'hg-face'
    ];

    // ⭐️ CORRECCIÓN DEFINITIVA: Forzar el ocultamiento de todas las partes al inicio de la actualización.
    // Esto previene que partes visibles por defecto en el HTML interfieran con la lógica.
    document.querySelectorAll('.hangman-part').forEach(part => {
        part.classList.remove('hidden'); // Por si acaso, quitamos la clase conflictiva.
        part.style.display = 'none'; // Ocultamos directamente con JS.
    });

    wordDisplay.textContent = maskedWord.join(' ');
    lettersDisplay.textContent = 'Letras usadas: ' + guessedLetters.join(', ');
    livesDisplay.textContent = `Vidas restantes: ${lives}`;
    const errors = 7 - lives;
    HANGMAN_PARTS_IDS.forEach((partId, index) => {
        const partElement = document.getElementById(partId);
        // Ahora, solo mostramos las partes que corresponden al número de errores.
        if (partElement && index < errors) {
            // ⭐️ SOLUCIÓN: Forzar la visibilidad eliminando la clase y aplicando el estilo.
            partElement.classList.remove('hidden');
            partElement.style.display = 'block';
        }
    });
}

function guessLetter(letter) {
    letter = letter.toUpperCase();
    if (lives === 0 || !maskedWord.includes('_')) return;
    const button = document.querySelector(`.key-btn[data-letter="${letter}"]`);
    if (button) button.disabled = true;
    if (guessedLetters.includes(letter)) return; 
    guessedLetters.push(letter);
    let found = false;
    for (let i = 0; i < hangmanWord.length; i++) {
        if (hangmanWord[i] === letter) {
            maskedWord[i] = letter;
            found = true;
        }
    }
    if (!found) {
        lives--;
        if (button) button.style.backgroundColor = '#F44336';
        
        // Sacudir el dibujo de la horca por cometer un error
        const graphicContainer = document.getElementById('hangman-graphic-container');
        if (graphicContainer) {
            graphicContainer.classList.add('shake');
            setTimeout(() => {
                graphicContainer.classList.remove('shake');
            }, 500);
        }
    } else {
        if (button) button.style.backgroundColor = 'var(--spring-green)';
    }
    updateHangmanDisplay();
    checkGameStatus();
}

function checkGameStatus() {
    const gameStatus = document.getElementById('game-status');
    const wordDisplay = document.getElementById('word-display');
    const playAgainBtn = document.getElementById('play-again-hangman-btn');
    if (!maskedWord.includes('_')) {
        gameStatus.textContent = `🎉 ¡FELICIDADES, ${hangmanPlayerName}! Adivinaste la palabra.`;
        // ⭐️ CORRECCIÓN: Al ganar, revelamos la palabra completa sin espacios extra.
        wordDisplay.textContent = hangmanWord;
        disableKeyboard();
        playAgainBtn.classList.remove('hidden');
        
        // Disparar confeti al ganar
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 }
            });
        }
    } else if (lives === 0) {
        gameStatus.textContent = `💀 ¡TE AHORCASTE! La palabra era: ${hangmanWord}.`;
        wordDisplay.textContent = hangmanWord.split('').join(' ');
        disableKeyboard();
        playAgainBtn.classList.remove('hidden');
    } else {
        gameStatus.textContent = `Te quedan ${lives} intentos. ¡Sigue adivinando!`;
    }
}

// Lógica de Teclado (botones)
function enableKeyboard() {
    const keyboardContainer = document.getElementById('keyboard-container');
    if (!keyboardContainer) return;
    keyboardContainer.innerHTML = '';
    const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
    const letters = Array.from(alphabet);
    letters.forEach(letter => {
        const button = document.createElement('button');
        button.textContent = letter;
        button.className = 'key-btn';
        button.dataset.letter = letter;
        button.addEventListener('click', (e) => {
            const btn = e.target;
            if (!btn.disabled) { 
                guessLetter(btn.dataset.letter);
            }
        });
        keyboardContainer.appendChild(button);
    });
}
function disableKeyboard() {
    const buttons = document.querySelectorAll('.key-btn');
    buttons.forEach(btn => btn.disabled = true);
}


// FUNCIÓN DE INICIALIZACIÓN GLOBAL para hangman.html
export function initializeHangmanGame() {
    // --- NUEVO: Actualizar enlaces "Volver" ---
    document.querySelectorAll("button[onclick=\"window.location.href='index.html'\"]").forEach(btn => {
        btn.onclick = () => window.location.href = `index.html?event=${EVENT_ID}`;
    });

    // --- Lógica de AHORCADO ---
    const startScreen = document.getElementById('start-screen-hangman');
    const gameModeContainer = document.getElementById('game-mode-hangman');
    const startButton = document.getElementById('start-btn-hangman'); 
    const nameInput = document.getElementById('player-name-input-hangman');
    const nameDisplay = document.getElementById('player-name-display-hangman');
    const playAgainBtn = document.getElementById('play-again-hangman-btn');

    if (!startButton) return; 
    if (playAgainBtn) playAgainBtn.classList.add('hidden');

    // ⭐️ NUEVO: Pre-llenar nombre en Ahorcado
    const storedName = localStorage.getItem(`playerName_${EVENT_ID}`);
    if (storedName && nameInput) {
        nameInput.value = storedName;
        nameInput.disabled = true; // 🔒 Bloquear el input
        nameInput.style.backgroundColor = "#f0f0f0";
    }

    async function handleStartGame() {
        const name = nameInput.value.trim();
        if (name.length > 0) {
            // ⭐️ NUEVO: Verificar disponibilidad en Ahorcado también
            const isAvailable = await checkNameAvailability(name, 'hangman');
            if (!isAvailable) {
                alert('Este nombre ya está en uso por otro jugador.');
                return;
            }
            if (!localStorage.getItem(`playerName_${EVENT_ID}`)) {
                await registerGuestName(name);
            }
            localStorage.setItem(`playerName_${EVENT_ID}`, name);

            hangmanPlayerName = name.substring(0, 20);
            if(nameDisplay) nameDisplay.textContent = `Jugador: ${hangmanPlayerName}`;
            
            const success = await startHangmanGame(); 
            if (success) {
                if (startScreen) startScreen.classList.add('hidden');
                if (gameModeContainer) gameModeContainer.classList.remove('hidden');
                if (playAgainBtn) playAgainBtn.classList.add('hidden');
            } else {
                if (startScreen) startScreen.classList.remove('hidden');
                if (gameModeContainer) gameModeContainer.classList.add('hidden');
            }
        } else {
            alert('Por favor, ingresa tu nombre para comenzar.');
        }
    }
    startButton.addEventListener('click', handleStartGame);
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', () => {
            playAgainBtn.classList.add('hidden');
            handleStartGame(); // Esto prepara la lógica del nuevo juego.
            // ⭐️ CORRECCIÓN: Se añade la llamada para limpiar el dibujo y reiniciar el contador visualmente.
            updateHangmanDisplay();
        });
    }

    // Llamada para asegurar que el estado visual (vidas, dibujo) esté limpio al cargar la página.
    updateHangmanDisplay();
}

// =======================================================================
// --- LÓGICA PARA LA PÁGINA DE RANKING (ranking.html) ---
// (Tu código original, sin cambios)
// =======================================================================
export function initializeRankingPage() {
    listenForRankings(renderTriviaRanking);
    listenForMemoryRankings(renderMemoryRanking);
}


// =======================================================================
// ⭐️⭐️⭐️ INICIALIZACIÓN PRINCIPAL: REESTRUCTURADA CON AUTH ⭐️⭐️⭐️
// =======================================================================

// ⭐️ Variable para asegurar que la inicialización solo ocurra una vez y se pueda esperar
let initializationPromise = null;

async function ensureAppInitialized() {
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        // 1. Obtener el ID del evento
        EVENT_ID = getEventId();
        
        // 2. Cargar la configuración
        await loadEventConfig(EVENT_ID);

        // 3. Asignar las referencias principales de la base de datos AHORA
        const basePath = `events/${EVENT_ID}/data`;
        questionsRef = ref(database, `${basePath}/questions`);
        rankingsRef = ref(database, `${basePath}/rankings`);
        memoryImagesRef = ref(database, `${basePath}/memoryImages`);
        memoryRankingsRef = ref(database, `${basePath}/memoryRankings`);
        hangmanWordsRef = ref(database, `${basePath}/hangmanWords`);

        // ⭐️ SOLUCIÓN FOUC
        const mainContainer = document.querySelector('.quiz-container');
        if (mainContainer) mainContainer.style.opacity = '1';
    })();
    return initializationPromise;
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await ensureAppInitialized();

        // 4. Enrutador de Autenticación
        const path = window.location.pathname;

        if (path.includes('host.html')) {
            // Esta es una página protegida, necesita login de cliente
            handleHostAuth();
        } else {
            // Evitar doble ejecución si initializePage ya fue llamado manualmente
            if (!window.appLogicInitialized) {
                window.appLogicInitialized = true;
                initializeAppPage(path);
            }
        }

    } catch (error) {
        // Si getEventId o loadEventConfig fallan, la app se detiene.
        console.error("Error al inicializar la aplicación:", error.message);
    }
});

/**
 * ⭐️ NUEVA FUNCIÓN: Maneja la autenticación de la página HOST
 * Verifica si el usuario logueado tiene permisos para ESTE evento.
 */
function handleHostAuth() {
    const loginContainer = document.getElementById('host-login-container');
    const panelContainer = document.getElementById('host-panel-container');
    const loginForm = document.getElementById('host-login-form');
    const loginError = document.getElementById('host-login-error');

    // Mostramos el login por defecto
    loginContainer.style.display = 'block';

    // Manejador del formulario de login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const submitButton = loginForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        
        // ⭐️ CORRECCIÓN: Obtener el nombre de usuario de la configuración del evento.
        const username = window.eventConfig && window.eventConfig.auth ? window.eventConfig.auth.username : null;
        if (!username) {
            loginError.textContent = "Error: Evento no configurado para login de anfitrión.";
            submitButton.disabled = false;
            return;
        }
        const email = `${username}@tufiestadigital.com.ar`;
        const password = document.getElementById('host-login-password').value;

        try {
            // ⭐️ SOLUCIÓN DEFINITIVA: Forzar la persistencia LOCAL.
            // Esto evita que la sesión se cierre automáticamente después de un tiempo.
            // Debe llamarse ANTES de signInWithEmailAndPassword.
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            // Si el login es exitoso, el 'onAuthStateChanged' se encargará del resto
        } catch (error) {
            console.error("Error de login:", error.message);
            loginError.textContent = "Error: Email o contraseña incorrectos.";
        } finally {
            submitButton.disabled = false;
        }
    });

    // Escuchamos los cambios de Auth
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            loginError.textContent = "Verificando permisos..."; // Feedback para el usuario
            
            // ⭐️ CORREGIDO: Verificar que el email del usuario logueado coincida con el configurado
            const expectedUsername = window.eventConfig.auth.username;
            const expectedEmail = `${expectedUsername}@tufiestadigital.com.ar`;

            if (user.email.toLowerCase() === expectedEmail.toLowerCase()) {
                // ¡PERMISO CONCEDIDO!
                loginError.textContent = ""; // Limpiar mensaje
                loginContainer.style.display = 'none';
                panelContainer.style.display = 'block';

                // Añadimos botón de "Salir"
                const header = panelContainer.querySelector('header');
                if (header && !document.getElementById('host-logout-btn')) {
                    header.insertAdjacentHTML('afterbegin', '<button id="host-logout-btn" class="delete-btn" style="float: right; box-shadow: none;">Salir</button>');
                    document.getElementById('host-logout-btn').addEventListener('click', () => {
                        if(confirm("¿Seguro que quieres salir del panel?")) {
                            signOut(auth);
                        }
                    });
                }
                
                // Ahora sí, inicializamos el panel de Host
                initializeHost();
            } else {
                // ⭐️ CORRECCIÓN: Logueado pero SIN permiso para este evento.
                loginError.textContent = "No tienes permiso para ver este evento.";
                // Retrasamos el signOut para que el usuario pueda leer el mensaje
                setTimeout(() => {
                    signOut(auth);
                }, 2000);
            }
        } else {
            // Usuario no logueado
            loginContainer.style.display = 'block';
            panelContainer.style.display = 'none';
        }
    });
}

/**
 * ⭐️ NUEVA FUNCIÓN: Inicializa la página pública solicitada
 * (Esto es el 'else' de tu 'DOMContentLoaded' original)
 */
export function initializeAppPage(path) {
    // ⭐️ CORRECCIÓN: Se elimina la inicialización de juegos de la página de índice.
    if (path.includes('player.html')) {
        initializePlayer();
    } else if (path.includes('memory.html')) {
        initializeMemoryGame();
    } else if (path.includes('hangman.html')) {
        initializeHangmanGame();
    } else if (path.includes('ranking.html')) {
        initializeRankingPage();
    } else if (path.includes('index.html')) {
        // Aquí se puede inicializar la lógica específica del portal de recuerdos si es necesario en el futuro.
    }
}

// =======================================================================
// --- ⭐️ NUEVO: MÓDULO DE EXPORTACIÓN DE RECUERDOS ⭐️ ---
// =======================================================================

/**
 * Convierte una URL de un archivo (imagen/video) a un string Base64 (Data URL).
 * @param {string} url - La URL del archivo en Firebase Storage.
 * @returns {Promise<string>} Una promesa que resuelve con el Data URL en formato Base64.
 */
async function convertUrlToDataURL(url) {
    // ⭐️ SOLUCIÓN DEFINITIVA: Usar XMLHttpRequest y FileReader.
    // Este método no depende de una Cloud Function y es más fiable para este caso.
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
            const reader = new FileReader();
            reader.onloadend = function() {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = function() {
            console.error(`Error de red al intentar descargar: ${url}`);
            reject(new Error(`Fallo de red para la URL: ${url}`));
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob'; // Pedimos la respuesta como un objeto binario (blob)
        xhr.send();
    });
}

/**
 * ⭐️ NUEVO: Función para buscar y convertir fuentes locales a Base64 dentro de un texto CSS.
 * @param {string} cssText - El contenido del archivo style.css.
 * @returns {Promise<string>} El texto CSS con las fuentes incrustadas.
 */
async function embedFontsInCSS(cssText) {
    // Expresión regular para encontrar todas las declaraciones @font-face con url().
    const fontFaceRegex = /@font-face\s*\{[^\}]*url\(['"]?([^'"]+)['"]?\)[^\}]*\}/g;
    const fontPromises = [];
    
    // Busca todas las coincidencias.
    cssText.replace(fontFaceRegex, (match, url) => {
        const promise = convertUrlToDataURL(url)
            .then(dataUrl => ({ originalUrl: url, dataUrl }))
            .catch(err => {
                console.warn(`No se pudo incrustar la fuente: ${url}`, err);
                return null; // Si falla, no reemplazamos nada.
            });
        fontPromises.push(promise);
    });

    const resolvedFonts = await Promise.all(fontPromises);
    resolvedFonts.forEach(font => font && (cssText = cssText.replace(font.originalUrl, font.dataUrl)));
    return cssText;
}
/**
 * Función principal para exportar los recuerdos de un evento a un archivo HTML estático.
 * @param {string} eventId - El ID del evento a exportar.
 */
async function exportMemoriesToHTML(eventId) {
    const exportButton = document.getElementById('export-memories-btn');
    // ⭐️ NUEVO: Mapa de emojis para traducir las reacciones guardadas.
    const REACTION_EMOJIS = {
        'like': '👍',
        'love': '❤️',
        'haha': '😂',
        'wow': '😮',
        'sad': '😢',
        'angry': '😡'
    };

    const originalButtonText = exportButton.innerHTML;
    exportButton.disabled = true;
    exportButton.innerHTML = 'Exportando... (puede tardar varios minutos)';

    try {
        // 1. Obtener la configuración del evento y todos los recuerdos
        const configRef = ref(database, `events/${eventId}/config`);
        const memoriesRef = ref(database, `events/${eventId}/data/memories`);

        // ⭐️ NUEVO: Obtener el contenido de style.css
        const styleSheetResponse = await fetch('style.css');
        let styleSheetText = await styleSheetResponse.text();

        // ⭐️ NUEVO: Incrustar las fuentes personalizadas en el CSS
        styleSheetText = await embedFontsInCSS(styleSheetText);
        const [configSnapshot, memoriesSnapshot] = await Promise.all([get(configRef), get(memoriesRef)]);

        if (!memoriesSnapshot.exists()) {
            alert("No hay recuerdos para exportar en este evento.");
            return;
        }

        const config = configSnapshot.val() || {};
        const memoriesData = memoriesSnapshot.val();

        // 2. Procesar recuerdos y convertir medios a Base64
        let memoriesHtmlContent = '';
        const memoriesArray = Object.values(memoriesData).sort((a, b) => b.timestamp - a.timestamp);

        for (const memory of memoriesArray) {
            let mediaContent = '';
            // ⭐️ SOLUCIÓN: Usar consistentemente 'fileUrl' y 'fileType', que es como portalScript.js lo guarda.
            const url = memory.fileUrl;
            const type = memory.fileType;

            if (url) {
                // Convertir la URL del archivo a Data URL (Base64)
                const dataUrl = await convertUrlToDataURL(url);
                if (dataUrl) {
                    const isVideo = type && type.startsWith('video');
                    if (isVideo) {
                        mediaContent = `<video controls src="${dataUrl}" style="width: 100%; max-height: 250px; border-radius: 8px; margin-top: 8px;"></video>`;
                    } else {
                        mediaContent = `<img src="${dataUrl}" alt="Recuerdo de ${memory.name}" class="memory-image" style="width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; margin-top: 8px; cursor: pointer;">`;
                    }
                }
            }

            // Generar HTML para comentarios
            let commentsHtml = '';
            if (memory.comments) {
                commentsHtml = '<div style="margin-top: 10px; padding-left: 15px; border-left: 2px solid #eee;">';
                // ⭐️ CORRECCIÓN: Iterar correctamente sobre los valores de los comentarios
                Object.values(memory.comments).forEach(comment => {
                    commentsHtml += `
                        <div style="font-size: 0.8em; margin-bottom: 5px;">
                            <strong style="color: #333;">${comment.name || 'Anónimo'}:</strong>
                            <span style="color: #555;">${comment.comment || ''}</span>
                        </div>
                    `;
                });
                commentsHtml += '</div>';
            }

            // ⭐️ CORRECCIÓN: Generar HTML para las nuevas reacciones en lugar del antiguo 'likeCount'.
            let reactionsHtml = '';
            const reactionSummary = memory.reactionSummary;
            if (reactionSummary && Object.keys(reactionSummary).length > 0) {
                reactionsHtml = '<div style="display: flex; align-items: center; gap: 8px;">';
                for (const reactionType in reactionSummary) {
                    const count = reactionSummary[reactionType];
                    if (count > 0 && REACTION_EMOJIS[reactionType]) {
                        reactionsHtml += `<span style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 10px;">${REACTION_EMOJIS[reactionType]} ${count}</span>`;
                    }
                }
                reactionsHtml += '</div>';
            }

            const formattedDate = new Date(memory.timestamp).toLocaleString('es-ES');

            memoriesHtmlContent += `
                <div class="memory-item">
                    <p style="font-weight: bold; color: #111;">${memory.name}</p>
                    <p style="font-size: 0.9em; color: #444; margin-top: 4px;">${memory.message || ''}</p>
                    ${mediaContent}
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.8em; color: #666;">
                        ${reactionsHtml}
                        <span>${formattedDate}</span>
                    </div>
                    ${commentsHtml}
                </div>
            `;
        }

        // 3. Construir el documento HTML final
        const theme = config.theme || {};
        const texts = config.texts || {};
        const cssVariables = `
            :root {
                ${Object.entries(theme).map(([key, value]) => value && typeof value !== 'object' ? `--${key.replace(/_/g, '-')}: ${value};` : '').join('\n')}
            }
        `;

        // ⭐️ CORRECCIÓN: Generar HTML solo para los primeros dos stickers del portal
        let stickersHtml = '';
        if (theme.portal_stickers && Array.isArray(theme.portal_stickers)) {
            // Tomamos solo los primeros 2 stickers del portal
            const stickersToExport = theme.portal_stickers.slice(0, 2);

            stickersToExport.forEach(sticker => {
                if (!sticker || !sticker.url) return;

                // Construimos el tag <img> con los estilos en línea
                stickersHtml += `
                    <img src="${sticker.url}" alt="Sticker Decorativo" style="
                        position: fixed;
                        z-index: 1000;
                        pointer-events: none;
                        ${sticker.width ? `width: ${sticker.width};` : ''}
                        ${sticker.transform ? `transform: ${sticker.transform};` : ''}
                        ${sticker.top ? `top: ${sticker.top};` : ''}
                        ${sticker.bottom ? `bottom: ${sticker.bottom};` : ''}
                        ${sticker.left ? `left: ${sticker.left};` : ''}
                        ${sticker.right ? `right: ${sticker.right};` : ''}
                    ">`;
            });
        }

        // ⭐️ INICIO DE LA SOLUCIÓN MEJORADA: Generar un script de personalización completo ⭐️
        let dynamicApplicationScript = `
            document.addEventListener('DOMContentLoaded', () => {
                const applyStyle = (elementId, styles) => {
                    const element = document.getElementById(elementId);
                    if (!element) return;
                    
                    if (styles.text) element.textContent = styles.text;
                    if (styles.fontFamily && styles.fontFamily !== 'null') element.style.fontFamily = styles.fontFamily;
                    if (styles.letterSpacing && styles.letterSpacing !== 'null') element.style.letterSpacing = styles.letterSpacing;
                    if (styles.fontSize && styles.fontSize !== 'null') element.style.fontSize = styles.fontSize;
                    if (styles.color && styles.color !== 'null') element.style.color = styles.color;
                    if (styles.strokeWidth && styles.strokeWidth !== 'null' && styles.strokeColor) {
                        element.style.webkitTextStroke = \`\${styles.strokeWidth} \${styles.strokeColor}\`;
                    }
                };

                // Asignar IDs a los elementos del HTML exportado para que el script los encuentre
                const h1 = document.querySelector('.container h1');
                if(h1) h1.id = 'portal-title-text';
                
                const greeting = document.querySelector('.container p.greeting');
                if(greeting) greeting.id = 'portal-greeting-text';

                const subtitle = document.querySelector('.container p.subtitle');
                if(subtitle) subtitle.id = 'portal-subtitle-text';

                // Aplicar todos los estilos de texto configurados
                applyStyle('portal-greeting-text', {
                    text: "${texts.portal_greeting || ''}",
                    fontFamily: "${texts.portal_greeting_font_family || ''}",
                    letterSpacing: "${texts.portal_greeting_letter_spacing || ''}",
                    fontSize: "${texts.portal_greeting_font_size || ''}",
                    color: "${texts.portal_greeting_color || ''}",
                    strokeWidth: "${texts.portal_greeting_stroke_width || ''}",
                    strokeColor: "${texts.portal_greeting_stroke_color || ''}"
                });

                applyStyle('portal-title-text', {
                    text: "${texts.portal_title || ''}",
                    fontFamily: "${texts.portal_title_font_family || ''}",
                    letterSpacing: "${texts.portal_title_letter_spacing || ''}",
                    fontSize: "${theme.portal_title_font_size || ''}",
                    color: "${theme.portal_title_color || ''}",
                    strokeWidth: "${texts.portal_title_stroke_width || ''}",
                    strokeColor: "${texts.portal_title_stroke_color || ''}"
                });
                
                applyStyle('portal-subtitle-text', {
                    text: "${texts.portal_subtitle || ''}",
                    fontFamily: "${texts.portal_subtitle_font_family || ''}",
                    letterSpacing: "${texts.portal_subtitle_letter_spacing || ''}",
                    fontSize: "${texts.portal_subtitle_font_size || ''}",
                    color: "${texts.portal_subtitle_color || ''}",
                    strokeWidth: "${texts.portal_subtitle_stroke_width || ''}",
                    strokeColor: "${texts.portal_subtitle_stroke_color || ''}"
                });
            });
        `;
        // ⭐️ FIN DE LA SOLUCIÓN MEJORADA ⭐️


        const finalHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recuerdos de ${eventId}</title>
                <!-- ⭐️ NUEVO: Enlace a Google Fonts para cargar las fuentes externas -->
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Caveat&family=Creepster&family=EB+Garamond&family=Inter&family=Lato&family=Lobster&family=Lora&family=Luckiest+Guy&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Oswald&family=PT+Serif&family=Pacifico&family=Playfair+Display&family=Poppins&family=Press+Start+2P&family=Righteous&family=Roboto&family=Roboto+Mono&family=Special+Elite&display=swap" rel="stylesheet">
                <style>
                    ${cssVariables}
                    /* ⭐️ NUEVO: Incrustar el contenido completo de style.css con fuentes */
                    ${styleSheetText}
                    body {
                        font-family: ${theme.font_family || 'sans-serif'};
                        background-color: #f0f2f5;
                        color: var(--color-text, #333);
                        margin: 0;
                        padding: 20px;
                        ${theme.background_image_url ? `background-image: url('${theme.background_image_url}'); background-size: ${theme.background_image_size || 'cover'}; background-position: ${theme.background_image_position || 'center'}; background-attachment: fixed;` : ''}
                    }
                    .container { max-width: 800px; margin: auto; background-color: var(--portal-bg, rgba(255, 255, 255, 0.9)); border-radius: var(--portal-border-radius, 15px); padding: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
                    h1 { color: var(--portal-title-color, #000); text-align: center; }
                    .memory-item { background-color: #fff; border: 1px solid #ddd; border-radius: 10px; padding: 15px; margin-bottom: 15px; }
                </style>
                <style>
                    /* Estilos para el modal (lightbox) */
                    .modal {
                        display: none;
                        position: fixed;
                        z-index: 1000;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        overflow: auto;
                        background-color: rgba(0,0,0,0.9);
                        justify-content: center;
                        align-items: center;
                        flex-direction: column; /* Para apilar imagen y botón */
                    }
                    .modal-content {
                        margin: auto;
                        display: block;
                        max-width: 90%;
                        max-height: 80%;
                    }
                    .close-modal {
                        position: absolute;
                        top: 15px;
                        right: 35px;
                        color: #f1f1f1;
                        font-size: 40px;
                        font-weight: bold;
                        cursor: pointer;
                    }
                    .download-btn {
                        display: block;
                        width: fit-content;
                        margin: 20px auto;
                        padding: 12px 20px;
                        background-color: #4CAF50;
                        color: white;
                        text-align: center;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <!-- ⭐️ NUEVO: Contenedor para los stickers -->
                ${stickersHtml}
                <div class="container">
                    <!-- ⭐️ SOLUCIÓN: Añadir clases para que el script los encuentre -->
                    <p class="greeting" style="text-align: center; text-transform: uppercase; font-weight: 600; color: #6B7280;"></p>
                    <h1 style="text-align: center;"></h1>
                    <p class="subtitle" style="text-align: center; color: #4B5563; margin-top: 0.5rem;"></p>
                    
                    <!-- ⭐️ MEJORA: Filtro de búsqueda -->
                    <div style="margin: 20px 0;">
                        <input type="text" id="search-filter" placeholder="Buscar por nombre o mensaje..." style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #ccc;">
                    </div>

                    <div id="memories-list" style="margin-top: 20px;">
                        ${memoriesHtmlContent}
                    </div>
                </div>

                <!-- El Modal para maximizar la imagen -->
                <div id="imageModal" class="modal">
                    <span class="close-modal">&times;</span>
                    <img class="modal-content" id="modalImage">
                    <a id="downloadLink" class="download-btn" href="#" download>Descargar Foto</a>
                </div>

                <!-- ⭐️ MEJORA: Botón "Volver Arriba" -->
                <button onclick="window.scrollTo({top: 0, behavior: 'smooth'});" style="position: fixed; bottom: 20px; right: 20px; background-color: #333; color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 24px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">
                    ↑
                </button>

                <script>
                    const modal = document.getElementById('imageModal');
                    const modalImg = document.getElementById('modalImage');
                    const downloadLink = document.getElementById('downloadLink');
                    document.querySelectorAll('.memory-image').forEach(img => {
                        img.onclick = function(){
                            modal.style.display = "flex";
                            modalImg.src = this.src;
                            downloadLink.href = this.src;
                        }
                    });
                    document.querySelector('.close-modal').onclick = () => modal.style.display = "none";
                </script>
                <!-- ⭐️ MEJORA: Script para el filtro de búsqueda -->
                <script>
                    document.getElementById('search-filter').addEventListener('input', function(e) {
                        const filterText = e.target.value.toLowerCase();
                        document.querySelectorAll('#memories-list .memory-item').forEach(item => {
                            const itemText = item.textContent.toLowerCase();
                            if (itemText.includes(filterText)) {
                                item.style.display = 'block';
                            } else {
                                item.style.display = 'none';
                            }
                        });
                    });
                </script>
                <!-- ⭐️ NUEVO: Script para aplicar estilos dinámicos al cargar -->
                <script>${dynamicApplicationScript}</script>
            </body>
            </html>
        `;

        // 4. Crear un Blob y disparar la descarga
        const blob = new Blob([finalHtml], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `recuerdos-${eventId}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert("¡Exportación completada! Se ha descargado el archivo HTML con todos los recuerdos.");

    } catch (error) {
        console.error("Error durante la exportación:", error);
        alert("Ocurrió un error al exportar los recuerdos. Es posible que un problema de red o de permisos (CORS) lo haya impedido. Revisa la consola para más detalles.");
    } finally {
        exportButton.disabled = false;
        exportButton.innerHTML = originalButtonText;
    }
}

// ⭐️ CORRECCIÓN: Exportar una función genérica para compatibilidad con llamadas externas
// Ahora es ASÍNCRONA y espera a que las referencias existan.
export async function initializePage() {
    try {
        await ensureAppInitialized();
        if (!window.appLogicInitialized) {
            window.appLogicInitialized = true;
            return initializeAppPage(window.location.pathname);
        }
    } catch (error) {
        console.error("Error en initializePage manual:", error);
    }
}