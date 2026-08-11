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

// ⭐️ NUEVO: Inyectar spinner de carga inmediatamente para evitar pantalla en blanco
(function showSpinner() {
    // Si ya existe o estamos en una página que no es de juego que requiera esto, no hacer nada
    if (document.getElementById('loading-spinner')) return;
    
    const style = document.createElement('style');
    style.id = 'spinner-styles';
    style.innerHTML = `
        .loading-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background-color: rgba(255, 255, 255, 0.95);
            display: flex; justify-content: center; align-items: center;
            z-index: 999999;
            transition: opacity 0.3s ease-out;
        }
        .spinner {
            width: 50px; height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #F59E0B;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.id = 'loading-spinner';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
})();

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
 * ⭐️ NUEVO: Carga dinámicamente las fuentes de Google Fonts requeridas.
 * @param {Array} fonts - Lista de familias de fuentes configuradas.
 */
function loadGoogleFonts(fonts) {
    const fontNames = new Set();
    fonts.forEach(fontString => {
        if (!fontString) return;
        let firstFont = fontString.split(',')[0].trim();
        firstFont = firstFont.replace(/^['"]|['"]$/g, '').trim();
        const localFonts = ['pokemon solid', 'lasirenita', 'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];
        if (firstFont && !localFonts.includes(firstFont.toLowerCase())) {
            fontNames.add(firstFont);
        }
    });

    if (fontNames.size === 0) return;

    const families = Array.from(fontNames)
        .map(name => `family=${name.replace(/\s+/g, '+')}`)
        .join('&');
    const url = `https://fonts.googleapis.com/css2?${families}&display=swap`;

    let linkTag = document.querySelector('link[href^="https://fonts.googleapis.com/css2?"]');
    if (!linkTag) {
        linkTag = document.createElement('link');
        linkTag.rel = 'stylesheet';
        document.head.appendChild(linkTag);
    }
    linkTag.href = url;
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

    // Cargar dinámicamente fuentes de Google Fonts
    const fontsToLoad = [];
    if (themeConfig && themeConfig.font_family) {
        fontsToLoad.push(themeConfig.font_family);
    }
    if (textsConfig) {
        for (const key in textsConfig) {
            if (key.endsWith('font_family') && textsConfig[key]) {
                fontsToLoad.push(textsConfig[key]);
            }
        }
    }
    loadGoogleFonts(fontsToLoad);

    const styleTag = document.createElement('style');
    let cssVariables = ":root {\n";

    // 1. Iterar sobre las claves del TEMA
    for (const key in themeConfig) {
        if (typeof themeConfig[key] === 'object' && themeConfig[key] !== null) {
            continue;
        }
        const value = themeConfig[key];
        if (!value || key === 'background_image_url') {
            continue; 
        }
        const cssVarName = `--${key.replace(/_/g, '-')}`; 
        cssVariables += `    ${cssVarName}: ${value};\n`;
    }
    
    // ⭐️ CORRECCIÓN: Iterar sobre las claves de TEXTOS (Esta era la parte que faltaba)
    if (textsConfig) {
        for (const key in textsConfig) {
            if (textsConfig[key]) cssVariables += `    --${key.replace(/_/g, '-')}: ${textsConfig[key]};\n`;
        }
    }
    cssVariables += "}\n";

    // 2. Manejar la fuente
    if (themeConfig.font_family) { 
        // ⭐️ CORRECCIÓN: Se aplica la fuente al body para que se herede,
        // pero sin !important, para permitir que estilos más específicos (como en un h1) la anulen.
        cssVariables += `
            body { font-family: ${themeConfig.font_family}; }
        `;
    }

    // 3. Manejar la imagen de fondo
    const primaryColor = themeConfig.color_primary || '#FACC15';
    const secondaryColor = themeConfig.color_secondary || '#F59E0B';

    if (themeConfig.background_image_url) {
         cssVariables += `
            body {
                background-image: url('${themeConfig.background_image_url}') !important;
                background-size: ${themeConfig.background_image_size || 'cover'} !important;
                background-position: ${themeConfig.background_image_position || 'center'} !important;
                background-repeat: no-repeat !important;
                background-attachment: fixed !important;
            }
        `;
    } else {
         cssVariables += `
            body {
                background-image: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%) !important;
                background-color: ${primaryColor} !important;
                background-size: cover !important;
                background-attachment: fixed !important;
                background-repeat: no-repeat !important;
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
            if (sticker.opacity !== undefined) stickerImg.style.opacity = sticker.opacity;

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
                    el.innerHTML = icon;
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
        updateIcons('.icon-memories', icons.icon_memories);
    }
}
/**
 * ⭐️ FUNCIÓN AUXILIAR: Aplica toda la configuración (tema, textos) a las páginas de juegos
 * @param {object} config - La configuración completa del evento (con theme, texts, features, status)
 */
export function applyConfigToGames(config) {
    if (!config) return;

    // --- 1. APLICAR TEMA VISUAL ---
    applyDynamicTheme(config.theme || {}, config.texts || {});
    
    // Iniciar partículas flotantes temáticas
    const showParticles = (config.theme && config.theme.show_particles !== false);
    if (showParticles) {
        const particlesIcon = (config.theme && config.theme.icons) ? (config.theme.icons.icon_particles || config.theme.icons.icon_main) : '🐝';
        initFloatingParticles(particlesIcon);
    } else {
        const existing = document.getElementById('particles-container');
        if (existing) existing.remove();
    }

    // --- 2. APLICAR TEXTOS DINÁMICOS Y SUS ESTILOS ---
    if (config.texts) {
        // Trivia
        const triviaTitle = document.getElementById('trivia-title-text');
        if (triviaTitle) {
            triviaTitle.innerHTML = config.texts.trivia_title || '';
            triviaTitle.style.fontFamily = config.texts.trivia_title_font_family || '';
            triviaTitle.style.letterSpacing = config.texts.trivia_title_letter_spacing || '';
            triviaTitle.style.fontSize = config.texts.trivia_title_font_size || '';
            if (config.texts.trivia_title_stroke_width && config.texts.trivia_title_stroke_color) {
                triviaTitle.style.webkitTextStroke = `${config.texts.trivia_title_stroke_width} ${config.texts.trivia_title_stroke_color}`;
            } else {
                triviaTitle.style.webkitTextStroke = '';
            }
        }

        const triviaWelcome = document.getElementById('trivia-welcome-text');
        if (triviaWelcome) {
            triviaWelcome.innerHTML = config.texts.trivia_welcome || '';
            triviaWelcome.style.fontFamily = config.texts.trivia_welcome_font_family || '';
            triviaWelcome.style.letterSpacing = config.texts.trivia_welcome_letter_spacing || '';
            if (config.texts.trivia_welcome_stroke_width && config.texts.trivia_welcome_stroke_color) {
                triviaWelcome.style.webkitTextStroke = `${config.texts.trivia_welcome_stroke_width} ${config.texts.trivia_welcome_stroke_color}`;
            } else {
                triviaWelcome.style.webkitTextStroke = '';
            }
        }

        const triviaSubtitle = document.getElementById('trivia-subtitle-text');
        if (triviaSubtitle) triviaSubtitle.innerHTML = config.texts.trivia_subtitle || '';

        // Memoria
        const memoryTitle = document.getElementById('memory-title-text');
        if (memoryTitle) {
            memoryTitle.innerHTML = config.texts.memory_title || '';
            memoryTitle.style.fontFamily = config.texts.memory_title_font_family || '';
            memoryTitle.style.letterSpacing = config.texts.memory_title_letter_spacing || '';
            memoryTitle.style.fontSize = config.texts.memory_title_font_size || '';
            if (config.texts.memory_title_stroke_width && config.texts.memory_title_stroke_color) {
                memoryTitle.style.webkitTextStroke = `${config.texts.memory_title_stroke_width} ${config.texts.memory_title_stroke_color}`;
            } else {
                memoryTitle.style.webkitTextStroke = '';
            }
        }

        // Ahorcado
        const hangmanTitle = document.getElementById('hangman-title-text');
        if (hangmanTitle) {
            hangmanTitle.innerHTML = config.texts.hangman_title || '';
            hangmanTitle.style.fontFamily = config.texts.hangman_title_font_family || '';
            hangmanTitle.style.letterSpacing = config.texts.hangman_title_letter_spacing || '';
            hangmanTitle.style.fontSize = config.texts.hangman_title_font_size || '';
            if (config.texts.hangman_title_stroke_width && config.texts.hangman_title_stroke_color) {
                hangmanTitle.style.webkitTextStroke = `${config.texts.hangman_title_stroke_width} ${config.texts.hangman_title_stroke_color}`;
            } else {
                hangmanTitle.style.webkitTextStroke = '';
            }
        }

        const hangmanSubtitle = document.getElementById('hangman-subtitle-text');
        if (hangmanSubtitle) {
            hangmanSubtitle.innerHTML = config.texts.hangman_subtitle || '';
            hangmanSubtitle.style.fontFamily = config.texts.hangman_subtitle_font_family || '';
            hangmanSubtitle.style.letterSpacing = config.texts.hangman_subtitle_letter_spacing || '';
            if (config.texts.hangman_subtitle_stroke_width && config.texts.hangman_subtitle_stroke_color) {
                hangmanSubtitle.style.webkitTextStroke = `${config.texts.hangman_subtitle_stroke_width} ${config.texts.hangman_subtitle_stroke_color}`;
            } else {
                hangmanSubtitle.style.webkitTextStroke = '';
            }
        }

        // Rankings
        const rankingTitle = document.getElementById('ranking-title-text');
        if (rankingTitle) {
            rankingTitle.innerHTML = config.texts.ranking_title || 'Rankings';
            rankingTitle.style.fontFamily = config.texts.ranking_title_font_family || '';
            rankingTitle.style.letterSpacing = config.texts.ranking_title_letter_spacing || '';
            rankingTitle.style.fontSize = config.texts.ranking_title_font_size || '';
            rankingTitle.style.color = config.texts.ranking_title_color || '';
            if (config.texts.ranking_title_stroke_width && config.texts.ranking_title_stroke_color) {
                rankingTitle.style.webkitTextStroke = `${config.texts.ranking_title_stroke_width} ${config.texts.ranking_title_stroke_color}`;
            } else {
                rankingTitle.style.webkitTextStroke = '';
            }
        }

        // Host
        const hostLoginTitle = document.getElementById('host-login-title-text');
        if (hostLoginTitle && config.texts.host_login_title) {
            hostLoginTitle.innerHTML = config.texts.host_login_title;
        }
        const hostPanelTitle = document.getElementById('host-panel-title-text');
        if (hostPanelTitle && config.texts.host_panel_title) {
            hostPanelTitle.innerHTML = config.texts.host_panel_title;
        }

        const isHostPage = window.location.pathname.includes('host.html');
        if (isHostPage && config.texts.host_document_title) {
            document.title = config.texts.host_document_title;
        }
    }
}

// Escuchar mensajes en tiempo real desde el super-admin
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'applyPreviewConfig') {
        applyConfigToGames(event.data.config);
    }
});

export async function loadEventConfig(eventId) {
    if (eventId === 'preview') {
        window.eventConfig = {
            status: { is_active: true },
            features: { games_enabled: true, camera_enabled: true, projector_enabled: true },
            theme: {
                color_primary: '#FACC15',
                color_secondary: '#F59E0B',
                color_text: '#1F2937',
                font_family: "'Inter', sans-serif"
            },
            texts: {}
        };
        applyConfigToGames(window.eventConfig);
        return;
    }
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

    // --- 2. APLICAR CONFIGURACIÓN ---
    applyConfigToGames(config);

    if (typeof window.hideGlobalPageLoader === 'function') {
        window.hideGlobalPageLoader();
    }

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

    // --- 4. APLICAR FUNCIONALIDAD DE PROYECTOR ---
    if (config.features && config.features.projector_enabled === false) {
        const showProjectorMenuBtn = document.getElementById('show-projector-menu-btn');
        if (showProjectorMenuBtn) {
            showProjectorMenuBtn.style.display = 'none';
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
    if (EVENT_ID === 'preview') {
        quizQuestions = [{
            id: 'mock-q1',
            question: '¿De qué color es la abeja de Tu Fiesta Digital?',
            options: ['Amarilla y negra', 'Azul y roja', 'Verde y morada', 'Blanca y gris'],
            correct: 0,
            timer: 15
        }];
        if (callback) callback(quizQuestions);
        return;
    }
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
    if (EVENT_ID === 'preview') {
        const mockResults = [
            { name: 'Lisandro Dileva', score: 10, time: 24 },
            { name: 'Ana Gomez', score: 9, time: 30 },
            { name: 'Juan Perez', score: 8, time: 35 }
        ];
        renderCallback(mockResults);
        return;
    }
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
    if (EVENT_ID === 'preview') {
        const mockImages = [
            { id: 'm1', name: 'Abeja', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=300' },
            { id: 'm2', name: 'Fiesta', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300' },
            { id: 'm3', name: 'Regalo', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300' }
        ];
        renderCallback(mockImages);
        return;
    }
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
    if (EVENT_ID === 'preview') {
        const mockResults = [
            { name: 'Lisandro Dileva', time: 15 },
            { name: 'Ana Gomez', time: 22 },
            { name: 'Juan Perez', time: 29 }
        ];
        renderCallback(mockResults);
        return;
    }
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
    // --- Fin de la lógica del enlace de proyector ---

    // --- ⭐️ EXPORT BUTTONS ---
    const exportHtmlBtn = document.getElementById('export-memories-btn');
    if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', async () => {
            const config = await showExportConfigModal('html', EVENT_ID);
            if (config) {
                exportMemoriesToHTML(EVENT_ID, config.customTitle, config.fileHandle);
            }
        });
    }
    const exportVideoBtn = document.getElementById('export-memories-video-btn');
    if (exportVideoBtn) {
        exportVideoBtn.addEventListener('click', async () => {
            const config = await showExportConfigModal('video', EVENT_ID);
            if (config) {
                exportMemoriesToVideo(EVENT_ID, config.customTitle, config.orientation, config.fileHandle);
            }
        });
    }
    // --- Fin de los botones de export ---

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
        if (await customConfirm('¿Estás seguro de que quieres ELIMINAR TODAS las preguntas de la TRIVIA?')) {
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

    clearMemoryImagesBtn.addEventListener('click', async () => {
        if (await customConfirm('¿Estás seguro de que quieres ELIMINAR TODAS las imágenes del juego de memoria? Esta acción no se puede deshacer.')) {
            clearAllMemoryImages(); 
        }
    });

    memoryImagesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.dataset.id;
            const path = e.target.dataset.path;
            if (await customConfirm(`¿Seguro que quieres borrar la imagen ${e.target.dataset.name}?`)) {
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
        if (EVENT_ID === 'preview') {
            renderCallback([
                { id: 'hw1', word: 'FIESTA' },
                { id: 'hw2', word: 'DIGITAL' }
            ]);
            return;
        }
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
        const nameInputContainer = document.getElementById('player-name-input-container');
        const nameBadge = document.getElementById('player-name-badge');
        const nameBadgeText = document.getElementById('player-name-badge-text');

        if (storedName && nameInput) {
            nameInput.value = storedName;
            if (nameInputContainer) nameInputContainer.classList.add('hidden');
            if (nameBadge) nameBadge.classList.remove('hidden');
            if (nameBadgeText) nameBadgeText.textContent = storedName;
        } else {
            if (nameInput) nameInput.required = true;
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
        let imageUrls = [];
        if (EVENT_ID === 'preview') {
            imageUrls = [
                'https://picsum.photos/id/1025/150/150',
                'https://picsum.photos/id/1062/150/150',
                'https://picsum.photos/id/1074/150/150',
                'https://picsum.photos/id/1084/150/150'
            ];
        } else {
            const snapshot = await get(memoryImagesRef);
            if (!snapshot.exists()) {
                gridContainer.innerHTML = '<p class="text-center text-red-500">Error: No se han cargado imágenes en el portal del anfitrión.</p>';
                return;
            }
            const imagesObject = snapshot.val();
            imageUrls = Object.values(imagesObject).map(item => item.url);
        }
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
    const nameInputContainer = document.getElementById('player-name-input-container');
    const nameBadge = document.getElementById('player-name-badge');
    const nameBadgeText = document.getElementById('player-name-badge-text');

    if (storedName && nameInput) {
        nameInput.value = storedName;
        if (nameInputContainer) nameInputContainer.classList.add('hidden');
        if (nameBadge) nameBadge.classList.remove('hidden');
        if (nameBadgeText) nameBadgeText.textContent = storedName;
    } else {
        if (nameInput) nameInput.required = true;
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
    let wordList = [];
    if (EVENT_ID === 'preview') {
        wordList = ['CUMPLEAÑOS', 'FIESTA', 'DIGITAL', 'AMIGOS'];
    } else {
        const snapshot = await get(hangmanWordsRef);
        const wordsObject = snapshot.val();
        wordList = wordsObject ? Object.values(wordsObject).map(item => item.word) : [];
    }

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
    const nameInputContainer = document.getElementById('player-name-input-container-hangman');
    const nameBadge = document.getElementById('player-name-badge-hangman');
    const nameBadgeText = document.getElementById('player-name-badge-text-hangman');

    if (storedName && nameInput) {
        nameInput.value = storedName;
        if (nameInputContainer) nameInputContainer.classList.add('hidden');
        if (nameBadge) nameBadge.classList.remove('hidden');
        if (nameBadgeText) nameBadgeText.textContent = storedName;
    } else {
        if (nameInput) nameInput.required = true;
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

        // Ocultar y remover spinner de carga
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.style.opacity = '0';
            setTimeout(() => {
                spinner.remove();
                const spinnerStyles = document.getElementById('spinner-styles');
                if (spinnerStyles) spinnerStyles.remove();
            }, 300);
        }
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

    // En modo vista previa, mostrar el panel de anfitrión directamente
    if (EVENT_ID === 'preview') {
        if (loginContainer) loginContainer.style.display = 'none';
        if (panelContainer) panelContainer.style.display = 'block';
        initializeHost();
        return;
    }

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
 * @param {string} [forcedMimeType] - MIME type forzado (ej: 'video/mp4') si el blob carece de tipo.
 * @returns {Promise<string>} Una promesa que resuelve con el Data URL en formato Base64.
 */
async function convertUrlToDataURL(url, forcedMimeType = null) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
            let blob = xhr.response;
            if (forcedMimeType && (!blob.type || blob.type === 'application/octet-stream' || blob.type === 'binary/octet-stream')) {
                blob = blob.slice(0, blob.size, forcedMimeType);
            }
            const reader = new FileReader();
            reader.onloadend = function() {
                let result = reader.result;
                if (forcedMimeType && typeof result === 'string' && (result.startsWith('data:application/octet-stream') || result.startsWith('data:binary/octet-stream') || result.startsWith('data:;'))) {
                    result = result.replace(/^data:[^;]*;/, `data:${forcedMimeType};`);
                }
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        };
        xhr.onerror = function() {
            console.error(`Error de red al intentar descargar: ${url}`);
            reject(new Error(`Fallo de red para la URL: ${url}`));
        };
        xhr.open('GET', url);
        xhr.responseType = 'blob';
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

// ⭐️ MODAL DE CONFIGURACIÓN DE EXPORTACIÓN (Título y Orientación)
function showExportConfigModal(type, eventId, defaultTitle = 'Portal de Recuerdos 🐝') {
    return new Promise((resolve) => {
        let modal = document.getElementById('export-config-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'export-config-modal';
            modal.style.cssText = 'display:none; position:fixed; inset:0; z-index:99999; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); justify-content:center; align-items:center;';
            modal.innerHTML = `
                <div style="background:#ffffff; border-radius:24px; padding:32px 24px; max-width:420px; width:90%; box-shadow:0 25px 60px rgba(0,0,0,0.35); color:#1f2937; animation:popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275);">
                    <h3 id="export-modal-heading" style="font-size:1.3rem; font-weight:800; margin-bottom:18px; text-align:center; color:#111827;">
                        ⚙️ Configurar Exportación
                    </h3>
                    
                    <div style="margin-bottom:18px; text-align:left;">
                        <label style="display:block; font-size:0.875rem; font-weight:700; color:#374151; margin-bottom:6px;">
                            Título Principal del Evento:
                        </label>
                        <input type="text" id="export-modal-title-input" style="width:100%; padding:12px; border:2px solid #fde047; border-radius:12px; font-size:1rem; font-weight:600; color:#1f2937; outline:none; box-sizing:border-box;" placeholder="Ej: Recuerdos de XV Jazmín">
                    </div>

                    <div id="export-modal-orientation-wrap" style="margin-bottom:22px; text-align:left;">
                        <label style="display:block; font-size:0.875rem; font-weight:700; color:#374151; margin-bottom:8px;">
                            Orientación del Video:
                        </label>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div id="orient-option-vertical" style="border:2px solid #2563eb; background:#eff6ff; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer; transition:all 0.2s;">
                                <div style="font-size:1.6rem; margin-bottom:4px;">📱</div>
                                <div style="font-weight:700; font-size:0.85rem; color:#1f2937;">Vertical (9:16)</div>
                                <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">Reels / TikTok / Celular</div>
                            </div>
                            <div id="orient-option-horizontal" style="border:2px solid #e5e7eb; background:#ffffff; border-radius:14px; padding:14px 8px; text-align:center; cursor:pointer; transition:all 0.2s;">
                                <div style="font-size:1.6rem; margin-bottom:4px;">🖥️</div>
                                <div style="font-weight:700; font-size:0.85rem; color:#1f2937;">Horizontal (16:9)</div>
                                <div style="font-size:0.75rem; color:#6b7280; margin-top:2px;">Proyector / TV / PC</div>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:10px; margin-top:24px;">
                        <button type="button" id="export-modal-cancel-btn" style="flex:1; padding:12px; border-radius:12px; background:#f3f4f6; color:#374151; font-weight:700; border:none; cursor:pointer; font-size:0.95rem;">
                            Cancelar
                        </button>
                        <button type="button" id="export-modal-confirm-btn" style="flex:1.5; padding:12px; border-radius:12px; background:#2563eb; color:#ffffff; font-weight:700; border:none; cursor:pointer; font-size:0.95rem; box-shadow:0 4px 12px rgba(37,99,235,0.35);">
                            🚀 Descargar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        const heading = document.getElementById('export-modal-heading');
        const titleInput = document.getElementById('export-modal-title-input');
        const orientWrap = document.getElementById('export-modal-orientation-wrap');
        const optionVert = document.getElementById('orient-option-vertical');
        const optionHoriz = document.getElementById('orient-option-horizontal');
        const cancelBtn = document.getElementById('export-modal-cancel-btn');
        const confirmBtn = document.getElementById('export-modal-confirm-btn');

        let selectedOrientation = 'vertical';

        const updateOrientationUI = (orient) => {
            selectedOrientation = orient;
            if (orient === 'vertical') {
                optionVert.style.borderColor = '#2563eb';
                optionVert.style.background = '#eff6ff';
                optionHoriz.style.borderColor = '#e5e7eb';
                optionHoriz.style.background = '#ffffff';
            } else {
                optionHoriz.style.borderColor = '#2563eb';
                optionHoriz.style.background = '#eff6ff';
                optionVert.style.borderColor = '#e5e7eb';
                optionVert.style.background = '#ffffff';
            }
        };

        optionVert.onclick = () => updateOrientationUI('vertical');
        optionHoriz.onclick = () => updateOrientationUI('horizontal');

        heading.textContent = type === 'html' ? '📄 Exportar Galería HTML' : '🎬 Exportar Video de Recuerdos';
        titleInput.value = defaultTitle || 'Portal de Recuerdos 🐝';
        orientWrap.style.display = type === 'html' ? 'none' : 'block';

        modal.style.display = 'flex';

        cancelBtn.onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };

        confirmBtn.onclick = async () => {
            const customTitle = titleInput.value.trim() || defaultTitle || 'Portal de Recuerdos';
            const orientation = selectedOrientation;
            
            // ⭐️ SÍNCRONO AL CLIC EN CONFIRMAR: Abrir showSaveFilePicker con User Gesture activo
            const titleSlug = customTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || eventId;
            let fileExt = 'webm';
            let videoMime = 'video/webm';
            if (type === 'video') {
                if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
                    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1') || MediaRecorder.isTypeSupported('video/mp4')) {
                        fileExt = 'mp4';
                        videoMime = 'video/mp4';
                    }
                }
            }

            const filename = type === 'html' ? `recuerdos-${titleSlug}.html` : `recuerdos-${titleSlug}.${fileExt}`;
            let fileHandle = null;

            if ('showSaveFilePicker' in window) {
                try {
                    fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [ type === 'html' 
                            ? { description: 'Archivo HTML estático', accept: { 'text/html': ['.html'] } }
                            : { description: 'Video de Recuerdos', accept: { [videoMime]: [`.${fileExt}`] } }
                        ]
                    });
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.log("Exportación cancelada por el usuario.");
                        modal.style.display = 'none';
                        resolve(null);
                        return;
                    }
                    console.warn("showSaveFilePicker no disponible o falló, usando fallback de descarga:", err);
                    fileHandle = null;
                }
            }

            modal.style.display = 'none';
            resolve({ customTitle, orientation, fileHandle, filename });
        };
    });
}

// ⭐️ HELPERS DEL OVERLAY DE EXPORTACIÓN
function showExportOverlay(title) {
    const overlay = document.getElementById('export-progress-overlay');
    if (!overlay) return;
    document.getElementById('export-progress-title').textContent = title || 'Generando archivo...';
    document.getElementById('export-progress-step').textContent = 'Iniciando...';
    document.getElementById('export-progress-bar-fill').style.width = '0%';
    document.getElementById('export-progress-pct').textContent = '0%';
    overlay.classList.add('active');
}
function updateExportProgress(step, pct) {
    const s = document.getElementById('export-progress-step');
    const b = document.getElementById('export-progress-bar-fill');
    const p = document.getElementById('export-progress-pct');
    if (s) s.textContent = step;
    if (b) b.style.width = pct + '%';
    if (p) p.textContent = Math.round(pct) + '%';
}
function hideExportOverlay(success) {
    const overlay = document.getElementById('export-progress-overlay');
    if (!overlay) return;
    const spinner = document.getElementById('export-progress-spinner');
    const title = document.getElementById('export-progress-title');
    if (success) {
        if (spinner) spinner.style.borderTopColor = '#22c55e';
        if (title) { title.textContent = '✅ ¡Listo!'; title.style.color = '#16a34a'; }
        updateExportProgress('Archivo generado con éxito.', 100);
        setTimeout(() => {
            overlay.classList.remove('active');
            if (spinner) spinner.style.borderTopColor = '#FACC15';
            if (title) { title.style.color = '#1F2937'; }
        }, 1800);
    } else {
        overlay.classList.remove('active');
    }
}

/**
 * Función principal para exportar los recuerdos de un evento a un archivo HTML estático.
 * @param {string} eventId - El ID del evento a exportar.
 */
async function exportMemoriesToHTML(eventId, customTitle = null, preOpenedFileHandle = null) {
    let fileHandle = preOpenedFileHandle;

    const titleSlug = (customTitle || eventId).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || eventId;
    const filename = `recuerdos-${titleSlug}.html`;

    if (!fileHandle && 'showSaveFilePicker' in window) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Archivo HTML estático',
                    accept: { 'text/html': ['.html'] }
                }]
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Guardado de HTML cancelado por el usuario.");
                return;
            }
            console.warn("showSaveFilePicker no disponible o falló, se utilizará fallback de descarga:", err);
            fileHandle = null;
        }
    }

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

    const originalButtonText = exportButton ? exportButton.innerHTML : '';
    if (exportButton) {
        exportButton.disabled = true;
        exportButton.innerHTML = '⏳ Exportando...';
    }
    showExportOverlay('📄 Generando HTML...');
    updateExportProgress('Cargando datos del evento...', 5);

    try {
        // 1. Obtener la configuración del evento y todos los recuerdos
        const configRef = ref(database, `events/${eventId}/config`);
        const memoriesRef = ref(database, `events/${eventId}/data/memories`);

        // ⭐️ NUEVO: Obtener el contenido de style.css
        const styleSheetResponse = await fetch('style.css');
        let styleSheetText = await styleSheetResponse.text();

        // ⭐️ NUEVO: Incrustar las fuentes personalizadas en el CSS
        updateExportProgress('Procesando estilos y fuentes...', 12);
        styleSheetText = await embedFontsInCSS(styleSheetText);
        const [configSnapshot, memoriesSnapshot] = await Promise.all([get(configRef), get(memoriesRef)]);

        if (!memoriesSnapshot.exists()) {
            hideExportOverlay(false);
            alert("No hay recuerdos para exportar en este evento.");
            return;
        }

        const config = configSnapshot.val() || {};
        const memoriesData = memoriesSnapshot.val();

        // 2. Procesar recuerdos y construir trozos de HTML (htmlChunks) para evitar V8 RangeError: Invalid string length
        const htmlChunks = [];
        const memoriesArray = Object.values(memoriesData).sort((a, b) => b.timestamp - a.timestamp);
        const totalMems = memoriesArray.length;

        const theme = config.theme || {};
        const texts = config.texts || {};
        const cssVariables = `
            :root {
                ${Object.entries(theme).map(([key, value]) => value && typeof value !== 'object' ? `--${key.replace(/_/g, '-')}: ${value};` : '').join('\n')}
            }
            ${theme.text_stroke_width && theme.text_stroke_color ? `
                h1, h2, h3, p, span, button, a, div {
                    -webkit-text-stroke-width: ${theme.text_stroke_width};
                    -webkit-text-stroke-color: ${theme.text_stroke_color};
                }
            ` : ''}
        `;

        // Generar HTML para los stickers del portal
        let stickersHtml = '';
        if (theme.portal_stickers && Array.isArray(theme.portal_stickers)) {
            const stickersToExport = theme.portal_stickers.slice(0, 2);
            stickersToExport.forEach(sticker => {
                if (!sticker || !sticker.url) return;
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
                        ${sticker.opacity !== undefined ? `opacity: ${sticker.opacity};` : ''}
                    ">`;
            });
        }

        // Script para partículas flotantes
        let particlesScript = '';
        if (theme.show_particles !== false) {
            const particleIcon = theme.icons && theme.icons.icon_particles ? theme.icons.icon_particles : '🐝';
            particlesScript = `
                <script>
                    document.addEventListener('DOMContentLoaded', () => {
                        setInterval(() => {
                            const particle = document.createElement('div');
                            particle.innerHTML = "${particleIcon}";
                            particle.style.position = 'fixed';
                            particle.style.bottom = '-50px';
                            particle.style.left = (Math.random() * 100) + 'vw';
                            particle.style.fontSize = (Math.random() * 20 + 20) + 'px';
                            particle.style.opacity = (Math.random() * 0.4 + 0.1).toFixed(2);
                            particle.style.pointerEvents = 'none';
                            particle.style.zIndex = '99999';
                            particle.style.transition = 'transform 8s linear, opacity 8s linear';
                            document.body.appendChild(particle);

                            setTimeout(() => {
                                particle.style.transform = \`translateY(-110vh) rotate(\${Math.random() * 360}deg)\`;
                            }, 50);

                            setTimeout(() => {
                                particle.remove();
                            }, 8500);
                        }, 2000);
                    });
                </script>
            `;
        }

        // Script de personalización dinámico de textos
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
                    text: "${texts.portal_title || 'Portal de Recuerdos'}",
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

                applyStyle('memories-section-title-label', {
                    text: "${texts.text_memories_section_title || 'Deja tu Recuerdo'}",
                    fontFamily: "${texts.text_memories_section_title_font_family || ''}",
                    letterSpacing: "${texts.text_memories_section_title_letter_spacing || ''}",
                    color: "${texts.text_memories_section_title_color || ''}",
                    strokeWidth: "${texts.text_memories_section_title_stroke_width || ''}",
                    strokeColor: "${texts.text_memories_section_title_stroke_color || ''}"
                });

                applyStyle('memories-list-title-text', {
                    text: "${texts.text_memories_list_title || 'Recuerdos de la Colmena'}",
                    fontFamily: "${texts.text_memories_list_title_font_family || ''}",
                    letterSpacing: "${texts.text_memories_list_title_letter_spacing || ''}",
                    color: "${texts.text_memories_list_title_color || ''}",
                    strokeWidth: "${texts.text_memories_list_title_stroke_width || ''}",
                    strokeColor: "${texts.text_memories_list_title_stroke_color || ''}"
                });
            });
        `;

        // 3. Agregar encabezado HTML al arreglo de trozos
        htmlChunks.push(`<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Recuerdos de ${eventId}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Anton&family=Bangers&family=Caveat&family=Creepster&family=EB+Garamond&family=Inter&family=Lato&family=Lobster&family=Lora&family=Luckiest+Guy&family=Merriweather&family=Montserrat&family=Nunito&family=Open+Sans&family=Oswald&family=PT+Serif&family=Pacifico&family=Playfair+Display&family=Poppins&family=Press+Start+2P&family=Righteous&family=Roboto&family=Roboto+Mono&family=Special+Elite&display=swap" rel="stylesheet">
            <style>
                ${cssVariables}
                ${styleSheetText}
                body {
                    font-family: ${theme.font_family || 'sans-serif'};
                    background-color: #f0f2f5;
                    color: var(--color-text, #333);
                    margin: 0;
                    padding: 20px;
                    ${theme.background_image_url ? `
                        background-image: url('${theme.background_image_url}');
                        background-size: ${theme.background_image_size || 'cover'} !important;
                        background-position: ${theme.background_image_position || 'center'} !important;
                        background-repeat: no-repeat !important;
                        background-attachment: fixed !important;
                    ` : `
                        background-image: linear-gradient(135deg, ${theme.color_primary || '#FACC15'} 0%, ${theme.color_secondary || '#F59E0B'} 100%) !important;
                        background-size: cover !important;
                        background-attachment: fixed !important;
                        background-repeat: no-repeat !important;
                    `}
                }
                .portal-container {
                    max-width: 800px;
                    margin: auto;
                    background-color: var(--portal-bg, rgba(255, 255, 255, 0.9));
                    border-radius: var(--portal-border-radius, 24px);
                    padding: 24px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.15);
                    position: relative;
                    z-index: 1;
                }
                .portal-container h1 {
                    color: var(--portal-title-color, #1F2937);
                    font-size: var(--portal-title-font-size, 2.25rem);
                    text-align: center;
                }
                .memory-item:hover {
                    transform: rotate(0deg) scale(1.02) !important;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15) !important;
                }
                #memories-list {
                    column-count: 1;
                    column-gap: 15px;
                }
                @media (min-width: 640px) {
                    #memories-list {
                        column-count: 2;
                    }
                }
            </style>
            <style>
                .modal {
                    display: none;
                    position: fixed;
                    z-index: 100000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                    background-color: rgba(0,0,0,0.9);
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
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
            ${stickersHtml}

            <div class="portal-container">
                <header style="margin-bottom: 24px; text-align: center;">
                    <p id="portal-greeting-text" style="text-transform: uppercase; font-weight: 600; color: #6B7280; margin-bottom: 8px;"></p>
                    <h1 id="portal-title-text">${customTitle || texts.portal_title || 'Portal de Recuerdos'} <span class="icon-main">${theme.icons && theme.icons.icon_main ? theme.icons.icon_main : '🐝'}</span></h1>
                    <p id="portal-subtitle-text" style="color: #4B5563; margin-top: 8px; font-size: 1.25rem;"></p>
                </header>
                
                <h2 id="memories-section-title-text" style="text-align: center; font-size: 1.5rem; font-weight: bold; margin-bottom: 16px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <span>${theme.icons && theme.icons.icon_memories ? theme.icons.icon_memories : '💖'}</span>
                    <span id="memories-section-title-label">Recuerdos</span>
                </h2>

                <div style="margin: 20px 0;">
                    <input type="text" id="search-filter" placeholder="Buscar por nombre o mensaje..." style="width: 100%; padding: 12px; border-radius: 12px; border: 1px solid #cbd5e1; box-sizing: border-box; font-size: 1rem; outline: none; background: white;">
                </div>

                <h3 id="memories-list-title-text" style="font-size: 1.25rem; font-weight: bold; margin-bottom: 16px; color: #374151;">Recuerdos de la Colmena</h3>

                <div id="memories-list" style="margin-top: 20px;">
        `);

        // 4. Procesar recuerdos uno a uno agregándolos directamente al arreglo htmlChunks
        for (const [memIdx, memory] of memoriesArray.entries()) {
            let mediaContent = '';
            const url = memory.fileUrl;
            const type = memory.fileType;

            updateExportProgress(`Procesando recuerdo ${memIdx + 1} de ${totalMems}...`, 15 + ((memIdx / totalMems) * 72));

            if (url) {
                const isVideo = type && type.startsWith('video');
                const targetMime = (type && type.startsWith('video/')) ? type : (isVideo ? 'video/mp4' : null);
                const dataUrl = await convertUrlToDataURL(url, targetMime);
                if (dataUrl) {
                    if (isVideo) {
                        let validVideoUrl = dataUrl;
                        const videoMime = (type && type.startsWith('video/')) ? type : 'video/mp4';
                        if (validVideoUrl.startsWith('data:application/octet-stream') || validVideoUrl.startsWith('data:binary/octet-stream') || validVideoUrl.startsWith('data:;')) {
                            validVideoUrl = validVideoUrl.replace(/^data:[^;]*;/, `data:${videoMime};`);
                        }
                        mediaContent = `
                            <video controls playsinline preload="metadata" style="width: 100%; max-height: 350px; border-radius: 8px; margin-top: 8px; background: #000; outline: none;">
                                <source src="${validVideoUrl}" type="${videoMime}">
                                <source src="${validVideoUrl}">
                                Tu navegador no soporta la reproducción de este video.
                            </video>`;
                    } else {
                        mediaContent = `<img src="${dataUrl}" alt="Recuerdo de ${memory.name}" class="memory-image" style="width: 100%; max-height: 350px; object-fit: contain; border-radius: 8px; margin-top: 8px; cursor: pointer;">`;
                    }
                }
            }

            let commentsHtml = '';
            if (memory.comments) {
                commentsHtml = '<div style="margin-top: 10px; padding-left: 15px; border-left: 2px solid #eee;">';
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
            const randomRotation = (Math.random() * 6 - 3).toFixed(2);

            htmlChunks.push(`
                <div style="width: 100%; display: inline-block; break-inside: avoid; margin-bottom: 15px;">
                    <div class="memory-item" style="transform: rotate(${randomRotation}deg); transition: transform 0.3s ease; background-color: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <p style="font-weight: bold; color: #111; font-size: 1.1em; margin-bottom: 4px;">${memory.name}</p>
                        <p style="font-size: 0.95em; color: #444; margin-bottom: 8px;">${memory.message || ''}</p>
                        ${mediaContent}
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.8em; color: #666;">
                            ${reactionsHtml}
                            <span>${formattedDate}</span>
                        </div>
                        ${commentsHtml}
                    </div>
                </div>
            `);
        }

        // 5. Agregar el pie de página HTML a htmlChunks
        htmlChunks.push(`
                </div>
            </div>

            <div id="imageModal" class="modal">
                <span class="close-modal">&times;</span>
                <img class="modal-content" id="modalImage">
                <a id="downloadLink" class="download-btn" href="#" download>Descargar Foto</a>
            </div>

            <button onclick="window.scrollTo({top: 0, behavior: 'smooth'});" style="position: fixed; bottom: 20px; right: 20px; background-color: #333; color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 24px; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.3); z-index: 9999;">
                ↑
            </button>

            ${particlesScript}

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
            <script>${dynamicApplicationScript}</script>
        </body>
        </html>
        `);

        // 6. Escribir archivo usando un objeto Blob multi-bloque (evita concantena cadenas gigantes de V8)
        const htmlBlob = new Blob(htmlChunks, { type: 'text/html;charset=utf-8' });

        if (fileHandle) {
            updateExportProgress('Escribiendo archivo en disco...', 95);
            const writable = await fileHandle.createWritable();
            await writable.write(htmlBlob);
            await writable.close();
        } else {
            // Fallback para navegadores que no soportan File System Access API
            const fallbackBlob = htmlBlob;
            const url = URL.createObjectURL(fallbackBlob);

            window._lastHtmlExportBlob = fallbackBlob;
            window._lastHtmlExportUrl = url;

            const link = document.createElement('a');
            link.style.display = 'none';
            link.href = url;
            link.download = filename;
            link.setAttribute('download', filename);
            document.body.appendChild(link);

            try {
                link.click();
            } catch (e) {
                const clickEvt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                link.dispatchEvent(clickEvt);
            }

            setTimeout(() => {
                if (link.parentNode) link.parentNode.removeChild(link);
            }, 3000);

            setTimeout(() => {
                if (window._lastHtmlExportUrl === url) {
                    URL.revokeObjectURL(url);
                    window._lastHtmlExportUrl = null;
                    window._lastHtmlExportBlob = null;
                }
            }, 300000);
        }

        updateExportProgress('Archivo guardado con éxito.', 100);
        hideExportOverlay(true);

    } catch (error) {
        console.error("Error durante la exportación:", error);
        hideExportOverlay(false);
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

// =======================================================================
// --- ⭐️ NUEVAS FUNCIONES DE EFECTOS VISUALES Y PARTÍCULAS ⭐️ ---
// =======================================================================

function initFloatingParticles(emoji = '✨') {
    const existing = document.getElementById('particles-container');
    if (existing) {
        existing.remove();
    }
    
    const container = document.createElement('div');
    container.id = 'particles-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '99999'; /* Float in front of content cards */
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
    
    const maxParticles = 12;
    for (let i = 0; i < maxParticles; i++) {
        createParticle(container, emoji);
    }
}

function createParticle(container, emoji) {
    const particle = document.createElement('span');
    particle.textContent = emoji;
    particle.style.position = 'absolute';
    particle.style.fontSize = `${Math.random() * 20 + 12}px`;
    particle.style.opacity = Math.random() * 0.4 + 0.1;
    particle.style.left = `${Math.random() * 100}vw`;
    particle.style.bottom = `-50px`;
    
    const duration = Math.random() * 15 + 12;
    particle.style.transition = `transform ${duration}s linear, opacity ${duration}s linear`;
    container.appendChild(particle);
    
    setTimeout(() => {
        animateParticle(particle, duration);
    }, 100);
}

function animateParticle(particle, duration) {
    if (!particle.parentElement) return;
    
    const travelX = (Math.random() * 160 - 80);
    particle.style.transform = `translate(${travelX}px, -110vh) rotate(${Math.random() * 360}deg)`;
    particle.style.opacity = '0';
    
    setTimeout(() => {
        particle.style.transition = 'none';
        particle.style.transform = 'translate(0, 0) rotate(0deg)';
        particle.style.opacity = Math.random() * 0.4 + 0.1;
        particle.style.left = `${Math.random() * 100}vw`;
        
        setTimeout(() => {
            particle.style.transition = `transform ${duration}s linear, opacity ${duration}s linear`;
            animateParticle(particle, duration);
        }, 100);
    }, duration * 1000);
}

/**
 * ⭐️ EXPORTACIÓN CLOUD DE VIDEO (Google Cloud Run + FFmpeg)
 * Desacoplado del navegador para evitar colapsar memoria RAM/GPU en el cliente.
 */
async function exportMemoriesToVideo(eventId, customTitle = null, orientation = 'vertical', preOpenedFileHandle = null) {
    const videoBtn = document.getElementById('export-memories-video-btn');
    if (!videoBtn) return;

    let fileHandle = preOpenedFileHandle;
    const titleSlug = (customTitle || eventId).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || eventId;
    const filename = `recuerdos-${titleSlug}.mp4`;

    if (!fileHandle && 'showSaveFilePicker' in window) {
        try {
            fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Video de Recuerdos (MP4)',
                    accept: { 'video/mp4': ['.mp4'] }
                }]
            });
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("Guardado de video cancelado por el usuario.");
                return;
            }
            console.warn("showSaveFilePicker no disponible o falló, se utilizará fallback de descarga:", err);
            fileHandle = null;
        }
    }

    const originalBtnText = videoBtn.innerHTML;
    videoBtn.disabled = true;
    videoBtn.textContent = '⏳ Procesando en Cloud...';

    try {
        showExportOverlay('🎬 Generando Video en Google Cloud...');
        updateExportProgress('Enviando petición al servidor de Google Cloud...', 15);

        const cloudRunEndpoint = 'https://video-exporter-595312538655.us-central1.run.app/generate-video';

        updateExportProgress('Normalizando y uniendo recuerdos con FFmpeg en la nube...', 45);

        const response = await fetch(cloudRunEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                eventId,
                customTitle: customTitle || 'Portal de Recuerdos 🐝',
                orientation
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `Error en el servidor Cloud Run (${response.status})`);
        }

        const data = await response.json();

        if (!data.success || !data.videoUrl) {
            throw new Error(data.error || 'No se obtuvo una URL válida del video generado.');
        }

        updateExportProgress('Descargando archivo .mp4 final...', 90);

        if (fileHandle) {
            const videoRes = await fetch(data.videoUrl);
            const videoBlob = await videoRes.blob();
            const writable = await fileHandle.createWritable();
            await writable.write(videoBlob);
            await writable.close();
        } else {
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = data.videoUrl;
            a.download = data.fileName || filename;
            a.setAttribute('download', data.fileName || filename);
            document.body.appendChild(a);
            a.click();
            setTimeout(() => a.remove(), 3000);
        }

        updateExportProgress('¡Video generado con éxito!', 100);
        hideExportOverlay(true);

    } catch (error) {
        console.error("Error al exportar video vía Cloud Run:", error);
        hideExportOverlay(false);
        alert("Ocurrió un error al generar el video en la nube: " + error.message);
    } finally {
        videoBtn.disabled = false;
        videoBtn.innerHTML = originalBtnText;
    }
}