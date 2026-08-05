// REEMPLAZA TUS IMPORTACIONES EN portalScript.js CON ESTO:
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref as dbRef, push, onValue, get, connectDatabaseEmulator, query, limitToLast } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, connectStorageEmulator } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { runTransaction } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js"; // ⭐️ NUEVA IMPORTACIÓN
// CONFIGURACIÓN DE FIREBASE (Se mantiene igual)
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

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  try {
    connectDatabaseEmulator(database, "localhost", 9000);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("Conectado a los emuladores locales de Database y Storage en portalScript.js");
  } catch (e) {
    console.warn("Error conectando a los emuladores locales:", e);
  }
} 

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 50 MB

// =======================================================================
// VARIABLES GLOBALES DE ARQUITECTURA (NUEVO)
// =======================================================================
let EVENT_ID;
// ⭐️ CORRECCIÓN: 'dataRef' ya no es necesaria, creamos 'memoriesRef' directamente
let GUEST_NAME = ''; // Global variable for the guest's name
let GUEST_UNIQUE_ID = ''; // Global variable for a unique guest ID
let memoriesRef;

// ⭐️ NUEVO: Inyectar spinner de carga inmediatamente para evitar pantalla en blanco
(function showSpinner() {
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

// ⭐️ NUEVO: Emojis de reacción disponibles
const REACTION_EMOJIS = {
    'like': '👍',
    'love': '❤️',
    'haha': '😂',
    'wow': '😮',
    'sad': '😢',
    'angry': '😡'
};

// FUNCIONES DE ARQUITECTURA (NUEVO)
// =======================================================================

/**
 * Obtiene el ID del evento desde el parámetro 'event' de la URL.
 * Si no existe, bloquea la aplicación.
 */
function getEventId() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('event');
    if (!eventId) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #333;">
                <h1>Error: Evento no encontrado</h1>
                <p>Asegúrate de que el enlace (URL) que estás usando sea correcto.</p>
            </div>
        `;
        throw new Error('Event ID no especificado en la URL.');
    }
    return eventId;
}

/**
 * ⭐️ NUEVO: Motor de Temas Dinámico
 * Itera sobre el objeto de tema de Firebase y lo inyecta como
 * variables CSS en el <head>.
 * @param {object} themeConfig - El objeto config.theme de Firebase.
 * @param {object} textsConfig - El objeto config.texts de Firebase.
 */
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
 * ⭐️ NUEVO: Motor de Temas Dinámico
 * Itera sobre el objeto de tema de Firebase y lo inyecta como
 * variables CSS en el <head>.
 * @param {object} themeConfig - El objeto config.theme de Firebase.
 * @param {object} textsConfig - El objeto config.texts de Firebase.
 */
function applyDynamicTheme(themeConfig, textsConfig) {
    if (!themeConfig && !textsConfig) {
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

    let styleTag = document.getElementById('dynamic-theme-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-theme-styles';
        document.head.appendChild(styleTag);
    }
    let cssVariables = ":root {\n";
    
    // 1. Iterar sobre las claves del TEMA (colores, fuentes, etc.)
    for (const key in themeConfig) {
        // Ignorar objetos anidados como 'icons' (los manejamos por separado)
        if (typeof themeConfig[key] === 'object' && themeConfig[key] !== null) {
            continue;
        }

        const value = themeConfig[key];
        
        // Si el valor está vacío o nulo o es la URL de imagen de fondo (que se asigna en body abajo), no lo agregamos a :root
        if (!value || key === 'background_image_url') {
            continue; 
        }

        // Convertir 'color_primary' a '--color-primary'
        // Convertir 'portal_bg' a '--portal-bg'
        const cssVarName = `--${key.replace(/_/g, '-')}`; 
        
        // Añadir la variable al string
        // ej:    --color-primary: #FF0000;
        cssVariables += `    ${cssVarName}: ${value};\n`;
    }
    
    // 2. ⭐️ CORREGIDO: Iterar sobre las claves de TEXTOS (color, tamaño de fuente)
    if (textsConfig) {
        for (const key in textsConfig) {
            if (textsConfig[key]) cssVariables += `    --${key.replace(/_/g, '-')}: ${textsConfig[key]};\n`;
        }
    }

    cssVariables += "}\n";

    // 2. Manejar la fuente por separado
    if (themeConfig.font_family) { // Usando la variable global
        // ⭐️ CORRECCIÓN: Se aplica la fuente al body para que se herede,
        // pero sin !important, para permitir que estilos más específicos (como en un h1) la anulen.
        cssVariables += `
            body { font-family: ${themeConfig.font_family}; }
        `;
    }

    // 3. Manejar la imagen de fondo por separado o gradiente de respaldo
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

    // ⭐️ NUEVO: Manejar el contorno de texto
    if (themeConfig.text_stroke_width && themeConfig.text_stroke_color) {
        cssVariables += `
            h1, h2, h3, p, span, button, a {
                -webkit-text-stroke-width: ${themeConfig.text_stroke_width};
                -webkit-text-stroke-color: ${themeConfig.text_stroke_color};
            }
        `;
    }

    // ⭐️ NUEVO: Manejar el sticker del portal
    // ⭐️ CORRECCIÓN: La ruta correcta es themeConfig.stickers.portal
    // ⭐️ CORRECCIÓN FINAL: La ruta correcta es directamente themeConfig.portal_stickers
    // ⭐️ CORRECCIÓN FINAL (DE NUEVO): La ruta correcta es directamente themeConfig.portal_stickers
    // Eliminar stickers decorativos antiguos
    document.querySelectorAll('.decorative-sticker').forEach(el => el.remove());

    if (themeConfig.portal_stickers && Array.isArray(themeConfig.portal_stickers)) {
        themeConfig.portal_stickers.forEach(sticker => {
            if (!sticker || !sticker.url) return;

            const stickerImg = document.createElement('img');
            stickerImg.classList.add('decorative-sticker');
            stickerImg.src = sticker.url;
            stickerImg.alt = "Sticker Decorativo";
            stickerImg.style.position = 'fixed';
            stickerImg.style.zIndex = '1000';
            stickerImg.style.pointerEvents = 'none';

            // Aplicar estilos dinámicos
            if (sticker.width) stickerImg.style.width = sticker.width;
            if (sticker.transform) stickerImg.style.transform = sticker.transform;
            if (sticker.top) stickerImg.style.top = sticker.top;
            if (sticker.bottom) stickerImg.style.bottom = sticker.bottom;
            if (sticker.left) stickerImg.style.left = sticker.left;
            if (sticker.right) stickerImg.style.right = sticker.right;
            if (sticker.opacity !== undefined) stickerImg.style.opacity = sticker.opacity;

            document.body.appendChild(stickerImg);

            // ⭐️ NUEVO: Flotado suave y tridimensional usando GSAP
            if (typeof gsap !== 'undefined') {
                gsap.to(stickerImg, {
                    y: '+=15',
                    rotation: '+=5',
                    duration: 3 + Math.random() * 2,
                    repeat: -1,
                    yoyo: true,
                    ease: "sine.inOut"
                });
            }
        });
    }

    // 4. Inyectar en el <head>
    styleTag.innerHTML = cssVariables;
    
    // 5. Manejar los iconos (como ya lo hacías)
    if (themeConfig.icons) {
        const icons = themeConfig.icons;
        // Helper function to update icons by class
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
        updateIcons('.icon-games', icons.icon_games);
        updateIcons('.icon-memories', icons.icon_memories);
        // También para el botón del menú de juegos
        updateIcons('.icon-menu-juegos', icons.icon_games);
    }
}


/**
 * ⭐️ FUNCIÓN loadEventConfig (MODIFICADA) ⭐️
 * Carga la configuración (tema, features, status) desde Firebase
 * y la aplica a la página.
 * @param {string} eventId - El ID del evento actual.
 */
/**
 * ⭐️ FUNCIÓN AUXILIAR: Aplica toda la configuración (tema, textos, características) al portal
 * @param {object} config - La configuración completa del evento (con theme, texts, features, status)
 */
function applyConfigToPortal(config) {
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
        const portalGreeting = document.getElementById('portal-greeting-text');
        if (portalGreeting) {
            portalGreeting.innerHTML = config.texts.portal_greeting || '¡Bienvenido!';
            portalGreeting.style.fontFamily = config.texts.portal_greeting_font_family || '';
            portalGreeting.style.letterSpacing = config.texts.portal_greeting_letter_spacing || '';
            if (config.texts.portal_greeting_stroke_width && config.texts.portal_greeting_stroke_color) {
                portalGreeting.style.webkitTextStroke = `${config.texts.portal_greeting_stroke_width} ${config.texts.portal_greeting_stroke_color}`;
            } else {
                portalGreeting.style.webkitTextStroke = '';
            }
        }

        const portalTitle = document.getElementById('portal-title-text');
        if (portalTitle) {
            portalTitle.innerHTML = config.texts.portal_title || '';
            portalTitle.style.fontFamily = config.texts.portal_title_font_family || '';
            portalTitle.style.letterSpacing = config.texts.portal_title_letter_spacing || '';
            if (config.texts.portal_title_stroke_width && config.texts.portal_title_stroke_color) {
                portalTitle.style.webkitTextStroke = `${config.texts.portal_title_stroke_width} ${config.texts.portal_title_stroke_color}`;
            } else {
                portalTitle.style.webkitTextStroke = '';
            }
        }

        const portalSubtitle = document.getElementById('portal-subtitle-text');
        if (portalSubtitle) {
            portalSubtitle.innerHTML = config.texts.portal_subtitle || '';
            portalSubtitle.style.fontFamily = config.texts.portal_subtitle_font_family || '';
            portalSubtitle.style.letterSpacing = config.texts.portal_subtitle_letter_spacing || '';
            if (config.texts.portal_subtitle_stroke_width && config.texts.portal_subtitle_stroke_color) {
                portalSubtitle.style.webkitTextStroke = `${config.texts.portal_subtitle_stroke_width} ${config.texts.portal_subtitle_stroke_color}`;
            } else {
                portalSubtitle.style.webkitTextStroke = '';
            }
        }

        const memoriesSectionTitleText = document.getElementById('memories-section-title-text');
        if (memoriesSectionTitleText) {
            memoriesSectionTitleText.textContent = config.texts.memories_section_title || '';
            memoriesSectionTitleText.style.fontFamily = config.texts.memories_section_title_font_family || '';
            memoriesSectionTitleText.style.letterSpacing = config.texts.memories_section_title_letter_spacing || '';
            if (config.texts.memories_section_title_stroke_width && config.texts.memories_section_title_stroke_color) {
                memoriesSectionTitleText.style.webkitTextStroke = `${config.texts.memories_section_title_stroke_width} ${config.texts.memories_section_title_stroke_color}`;
            } else {
                memoriesSectionTitleText.style.webkitTextStroke = '';
            }
        }

        const memoriesListTitleText = document.getElementById('memories-list-title-text');
        if (memoriesListTitleText) {
            memoriesListTitleText.textContent = config.texts.memories_list_title || '';
            memoriesListTitleText.style.fontFamily = config.texts.memories_list_title_font_family || '';
            memoriesListTitleText.style.letterSpacing = config.texts.memories_list_title_letter_spacing || '';
            if (config.texts.memories_list_title_stroke_width && config.texts.memories_list_title_stroke_color) {
                memoriesListTitleText.style.webkitTextStroke = `${config.texts.memories_list_title_stroke_width} ${config.texts.memories_list_title_stroke_color}`;
            } else {
                memoriesListTitleText.style.webkitTextStroke = '';
            }
        }

        // Aplicar textos de botones de juegos
        const triviaBtnText = document.getElementById('juegos-menu-trivia-text');
        if (triviaBtnText) {
            triviaBtnText.textContent = config.texts.juegos_menu_trivia || '¿Cuanto conoces a Amo?';
        }

        const memoryBtnText = document.getElementById('juegos-menu-memory-text');
        if (memoryBtnText) {
            memoryBtnText.textContent = config.texts.juegos_menu_memory || 'Memoria con Amo';
        }

        const hangmanBtnText = document.getElementById('juegos-menu-hangman-text');
        if (hangmanBtnText) {
            hangmanBtnText.textContent = config.texts.juegos_menu_hangman || 'Ahorcado';
        }
    }

    // --- 3. APLICAR FUNCIONALIDADES (Juegos y Cámara) ---
    const gamesMenuToggle = document.getElementById('menu-juegos-toggle');
    const rankingTrophyBtn = document.getElementById('ranking-trophy-btn');
    if (config.features && config.features.games_enabled === false) {
        if (gamesMenuToggle) {
            const parentDiv = gamesMenuToggle.parentElement;
            if (parentDiv) parentDiv.style.display = 'none';
        }
        if (rankingTrophyBtn) {
            rankingTrophyBtn.style.display = 'none';
        }
    } else {
        if (gamesMenuToggle) {
            const parentDiv = gamesMenuToggle.parentElement;
            if (parentDiv) parentDiv.style.display = '';
        }
        if (rankingTrophyBtn) {
            rankingTrophyBtn.style.display = '';
        }
    }

    const photoInputWrapper = document.getElementById('guest-file-photo')?.closest('.file-input-wrapper');
    const videoInputWrapper = document.getElementById('guest-file-video')?.closest('.file-input-wrapper');
    const galleryInputWrapper = document.getElementById('guest-file-gallery')?.closest('.file-input-wrapper');
    
    if (config.features && config.features.camera_enabled === false) {
        if (photoInputWrapper) photoInputWrapper.style.display = 'none';
        if (videoInputWrapper) videoInputWrapper.style.display = 'none';
        if (galleryInputWrapper) galleryInputWrapper.style.display = 'none';
    } else {
        if (photoInputWrapper) photoInputWrapper.style.display = '';
        if (videoInputWrapper) videoInputWrapper.style.display = '';
        if (galleryInputWrapper) galleryInputWrapper.style.display = '';
    }
}

/**
 * ⭐️ FUNCIÓN loadEventConfig (MODIFICADA) ⭐️
 * Carga la configuración (tema, features, status) desde Firebase
 * y la aplica a la página.
 * @param {string} eventId - El ID del evento actual.
 */
async function loadEventConfig(eventId) {
    if (eventId === 'preview') {
        window.eventConfig = {
            status: { is_active: true },
            features: { games_enabled: true, camera_enabled: true },
            theme: { portal_bg: 'rgba(255, 255, 255, 0.95)', btn_portal_bg: '#1F2937', btn_portal_text_color: '#FACC15', btn_portal_border_color: '#FACC15' },
            texts: { portal_title: 'Título de Prueba', portal_greeting: '¡Bienvenidos!' }
        };
        applyConfigToPortal(window.eventConfig);
        return;
    }
    const configRef = dbRef(database, `events/${eventId}/config`);
    let config = {};
    
    try {
        const snapshot = await get(configRef);
        if (snapshot.exists()) {
            config = snapshot.val();
        } else {
            console.warn("No se encontró configuración de 'super-admin'. Usando valores por defecto.");
        }
    } catch (error) {
        console.error("Error cargando configuración:", error);
        throw new Error("Error al cargar la configuración del evento.");
    }

    // --- 1. CHEQUEO DE EVENTO ACTIVO (¡IMPORTANTE!) ---
    if (!config.status || config.status.is_active === false) {
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: sans-serif; color: #333;">
                <h1>Evento Finalizado</h1>
                <p>Este portal de recuerdos ya no se encuentra disponible.</p>
            </div>
        `;
        throw new Error("El evento está deshabilitado.");
    }

    // --- 2. APLICAR CONFIGURACIÓN ---
    applyConfigToPortal(config);

    if (typeof window.hideGlobalPageLoader === 'function') {
        window.hideGlobalPageLoader();
    }
}


// =======================================================================
// FUNCIONES DE RECUPERACIÓN Y RENDERIZACIÓN DE RECUERDOS (MODIFICADA)
// =======================================================================

/**
 * ⭐️ NUEVO: Maneja la reacción de un usuario a un recuerdo.
 * Permite al usuario reaccionar, cambiar su reacción o quitarla.
 * @param {string} memoryId - El ID del recuerdo.
 * @param {string} reactionType - El tipo de reacción (ej. 'love', 'like', 'haha').
 */
function handleReaction(memoryId, reactionType) {
    if (!GUEST_UNIQUE_ID) {
        console.error("GUEST_UNIQUE_ID no está definido. No se puede registrar la reacción.");
        return;
    }

    const memoryRef = dbRef(database, `events/${EVENT_ID}/data/memories/${memoryId}`);

    // ⭐️ CORRECCIÓN DEFINITIVA: Se utiliza una única transacción sobre el recuerdo completo.
    // Esto garantiza que todas las actualizaciones (conteos y reacción del usuario) ocurran
    // de forma atómica y segura, evitando la pérdida de datos por concurrencia.
    runTransaction(memoryRef, (memoryData) => {
        if (!memoryData) {
            return memoryData; // Si el recuerdo no existe, no hacer nada.
        }

        // 1. Inicializar las estructuras de datos si no existen.
        memoryData.userReactions = memoryData.userReactions || {};
        memoryData.reactionSummary = memoryData.reactionSummary || {};
        memoryData.totalReactions = memoryData.totalReactions || 0;

        const oldReaction = memoryData.userReactions[GUEST_UNIQUE_ID]?.type;

        // 2. Lógica para decrementar el contador de la reacción anterior (si existía).
        if (oldReaction) {
            memoryData.reactionSummary[oldReaction] = (memoryData.reactionSummary[oldReaction] || 1) - 1;
            memoryData.totalReactions = (memoryData.totalReactions || 1) - 1;
            // Limpiar el contador si llega a cero.
            if (memoryData.reactionSummary[oldReaction] <= 0) {
                delete memoryData.reactionSummary[oldReaction];
            }
        }

        // 3. Lógica para la nueva reacción.
        if (oldReaction !== reactionType) {
            // Si es una reacción nueva o un cambio, se incrementa el nuevo contador.
            memoryData.reactionSummary[reactionType] = (memoryData.reactionSummary[reactionType] || 0) + 1;
            memoryData.totalReactions = (memoryData.totalReactions || 0) + 1;
            memoryData.userReactions[GUEST_UNIQUE_ID] = { type: reactionType, timestamp: Date.now() };
        } else {
            // Si el usuario hace clic en la misma reacción, se considera "quitar reacción".
            // El contador ya fue decrementado, así que solo borramos su registro.
            delete memoryData.userReactions[GUEST_UNIQUE_ID];
        }

        // 4. Recalcular la reacción más popular.
        memoryData.mostPopularReaction = Object.keys(memoryData.reactionSummary).reduce((a, b) => memoryData.reactionSummary[a] > memoryData.reactionSummary[b] ? a : b, null);

        return memoryData; // Devolver los datos actualizados para que Firebase los guarde.
    }).catch(error => {
        console.error("Error en la transacción de la reacción:", error);
    });
}

function renderMemories(memories) {
    const memoriesList = document.getElementById('memories-list');
    if (!memoriesList) return;
    memoriesList.innerHTML = ''; 

    if (memories.length === 0) {
        memoriesList.innerHTML = `<p class="text-sm text-gray-500 italic p-2 text-center">¡Sé el primero en dejar un recuerdo!</p>`;
        return;
    }

    memories.forEach(memory => {
        // Envoltura externa para evitar conflicto de transformaciones con AOS
        const itemContainer = document.createElement('div');
        itemContainer.style.width = '100%';
        itemContainer.style.display = 'inline-block';
        itemContainer.style.breakInside = 'avoid';
        
        // ⭐️ NUEVO: Transiciones AOS para entrada animada
        itemContainer.setAttribute('data-aos', 'fade-up');
        itemContainer.setAttribute('data-aos-duration', '700');

        const memoryItem = document.createElement('div');
        memoryItem.className = 'memory-item p-3 mb-4'; 
        
        // Inclinación aleatoria estilo Scrapbook / Polaroid
        const randomRotation = (Math.random() * 6 - 3).toFixed(2); // Entre -3 y 3 grados
        memoryItem.style.transform = `rotate(${randomRotation}deg)`; 
        
        let mediaContent = '';
        const fileUrl = memory.fileUrl || memory.mediaUrl;
        const fileType = memory.fileType || memory.mediaType;

        if (fileUrl) {
            const isVideo = fileType && fileType.startsWith('video');
            if (isVideo) {
                mediaContent = `<video controls src="${fileUrl}" class="media w-full h-auto max-h-48 object-cover rounded-lg shadow-md mt-2" preload="none" style="max-width: 100%;"></video>`;
            } else {
                mediaContent = `<img src="${fileUrl}" alt="Recuerdo de ${memory.name}" class="media w-full h-auto max-h-48 object-cover rounded-lg shadow-md mt-2" loading="lazy" style="max-width: 100%;">`;
            }
        }
        
        const date = memory.timestamp ? new Date(memory.timestamp) : new Date();
        const formattedDate = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        // ⭐️ NUEVO: Generar HTML para comentarios
        let commentsHtml = '<div class="comments-section mt-2 space-y-2">';
        if (memory.comments) {
            Object.values(memory.comments).forEach(comment => {
                commentsHtml += `
                    <div class="comment-item text-xs bg-gray-100 p-2 rounded-md">
                        <p class="font-bold text-gray-700">${comment.name}:</p>
                        <p class="text-gray-600">${comment.comment}</p>
                    </div>
                `;
            });
        }
        commentsHtml += '</div>';

        // ⭐️ NUEVO: Contar el número de comentarios
        const commentCount = memory.comments ? Object.keys(memory.comments).length : 0;

        // ⭐️ NUEVO: Lógica para mostrar reacciones
        const totalReactions = memory.totalReactions || 0;
        const mostPopularReactionType = memory.mostPopularReaction;
        const userReaction = memory.userReactions && memory.userReactions[GUEST_UNIQUE_ID] ? memory.userReactions[GUEST_UNIQUE_ID].type : null;

        let reactionDisplay = '';
        let userReactionEmoji = '';
        let defaultLikeEmoji = ''; // Fallback eliminado

        if (window.eventConfig && window.eventConfig.theme && window.eventConfig.theme.icons && window.eventConfig.theme.icons.icon_like) {
            defaultLikeEmoji = window.eventConfig.theme.icons.icon_like;
        }

        if (userReaction && REACTION_EMOJIS[userReaction]) {
            userReactionEmoji = REACTION_EMOJIS[userReaction];
        }

        if (totalReactions > 0) {
            const displayEmoji = REACTION_EMOJIS[mostPopularReactionType] || defaultLikeEmoji;
            reactionDisplay = `<span class="text-xl">${displayEmoji}</span> <span class="font-semibold text-sm">${totalReactions}</span>`;
        } else {
            reactionDisplay = `<span class="font-semibold text-sm">Reaccionar</span>`;
        }

        // Generate reaction picker HTML
        let reactionPickerHtml = '<div class="reaction-picker hidden absolute bottom-full left-0 mb-2 bg-white p-2 rounded-full shadow-lg flex space-x-2">';
        for (const type in REACTION_EMOJIS) {
            reactionPickerHtml += `<span class="reaction-emoji text-2xl cursor-pointer hover:scale-125 transition-transform" data-reaction-type="${type}">${REACTION_EMOJIS[type]}</span>`;
        }
        reactionPickerHtml += '</div>';

        // ⭐️ NUEVO: HTML para la sección de interacción (Reacciones y formulario de comentario)
        const interactionSection = `
            <div class="interaction-section mt-3 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <button data-memory-id="${memory.id}" class="reaction-btn-container flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors relative">
                        ${userReactionEmoji ? `<span class="text-xl user-reaction-emoji">${userReactionEmoji}</span>` : ''}
                        <span class="current-reaction-display">${reactionDisplay}</span>
                        ${reactionPickerHtml}
                    </button>
                </div>
                <button data-memory-id="${memory.id}" class="comment-bubble-btn flex items-center space-x-1 text-gray-500 hover:text-blue-500 transition-colors">
                    <span class="text-xl">💬</span>
                    <span class="font-semibold text-sm">${commentCount}</span>
                </button>
            </div>
            <form class="comment-form mt-2 hidden">
                <input type="hidden" name="memoryId" value="${memory.id}">
                <div class="flex gap-2">
                    <input type="text" name="commentText" required placeholder="Deja un comentario como ${GUEST_NAME}..." class="comment-input flex-grow">
                    <button type="submit" class="comment-submit-btn">Enviar</button>
                </div>
            </form>
        `;

        memoryItem.innerHTML = `
            <div class="flex items-start justify-between">
                <p class="font-bold text-gray-800 text-sm"><span class="icon-portal">💬</span> ${memory.name}</p>
                <p class="text-xs text-gray-500">${formattedDate}</p>
            </div>
            ${memory.message && memory.message.trim() ? `<p class="text-gray-600 mt-1 mb-2 text-sm">${memory.message}</p>` : ''}
            ${mediaContent}
            ${interactionSection}
            ${commentsHtml}
        `;
        itemContainer.appendChild(memoryItem);
        memoriesList.appendChild(itemContainer);
    });

    // ⭐️ NUEVO: Re-procesar iconos dinámicos y actualizar AOS para que detecte las nuevas tarjetas
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

function listenForMemories() {
    const memoriesList = document.getElementById('memories-list');
    if (!memoriesList || !memoriesRef) return; // Asegura que las referencias existan
    
    // ⚡ Optimización: Limitamos la escucha en tiempo real a los últimos 25 recuerdos
    const memoriesQuery = query(memoriesRef, limitToLast(25));
    
    onValue(memoriesQuery, (snapshot) => {
        const data = snapshot.val();
        const memories = [];
        if (data) {
            for (let key in data) {
                memories.push({ id: key, ...data[key] });
            }
            memories.sort((a, b) => b.timestamp - a.timestamp);
        }
        renderMemories(memories);
    }, (error) => {
        console.error("Error al escuchar los recuerdos:", error);
        memoriesList.innerHTML = '<p class="text-sm text-red-500 italic">Error al cargar los recuerdos.</p>';
    });
}

// ⭐️ NUEVO: Delegación de eventos para los nuevos elementos
document.addEventListener('click', function(e) {
    // 🔍 Visor de Fotos (Lightbox) al hacer click en fotos/videos de recuerdos
    const clickedMedia = e.target.closest('.memory-item .media');
    if (clickedMedia && !e.target.closest('.reaction-btn-container') && !e.target.closest('.comment-bubble-btn') && !e.target.closest('.comment-form')) {
        e.preventDefault();
        openLightbox(clickedMedia);
        return;
    }

    // Manejador para el botón de Reacción
    const reactionBtnContainer = e.target.closest('.reaction-btn-container');
    if (reactionBtnContainer) {
        e.preventDefault();
        const memoryId = reactionBtnContainer.dataset.memoryId;
        const reactionPicker = reactionBtnContainer.querySelector('.reaction-picker');

        // Toggle visibility of the reaction picker
        if (reactionPicker) {
            reactionPicker.classList.toggle('hidden');
        }

        // If a specific reaction emoji was clicked within the picker
        const reactionEmoji = e.target.closest('.reaction-emoji');
        if (reactionEmoji) {
            const reactionType = reactionEmoji.dataset.reactionType;
            if (memoryId && reactionType) {
                handleReaction(memoryId, reactionType);
            }
            // Hide picker after selection
            if (reactionPicker) reactionPicker.classList.add('hidden');
        }
    } else {
        // Si se hace clic fuera de cualquier botón de reacción, oculta todos los selectores
        document.querySelectorAll('.reaction-picker').forEach(picker => {
            picker.classList.add('hidden');
        });
    }

    // Manejador para el botón de "Comentar"
    const commentButton = e.target.closest('.comment-bubble-btn');
    if (commentButton) {
        e.preventDefault();
        const memoryItemDiv = commentButton.closest('.memory-item');
        if (memoryItemDiv) {
            const commentForm = memoryItemDiv.querySelector('.comment-form');
            if (commentForm) {
                commentForm.classList.remove('hidden');
                commentForm.querySelector('input[name="commentText"]').focus();
            }
        }
    }
});

document.addEventListener('submit', async function(e) {
    // Manejador para el formulario de comentarios
    if (e.target.classList.contains('comment-form')) {
        e.preventDefault();
        const form = e.target;
        const memoryId = form.elements.memoryId.value;
        const commenterName = GUEST_NAME; // ⭐️ CORREGIDO: Usar el nombre global guardado
        const commentText = form.elements.commentText.value.trim();

        if (!memoryId || !commenterName || !commentText) return;

        const commentsRef = dbRef(database, `events/${EVENT_ID}/data/memories/${memoryId}/comments`);
        await push(commentsRef, { name: commenterName, comment: commentText, timestamp: Date.now() });
        
        // ⭐️ CORREGIDO: Solo limpiar el campo del comentario, no el del nombre
        form.elements.commentText.value = '';

        // Ocultar el formulario de nuevo después de enviar
        form.classList.add('hidden');
    }
});

/**
 * ⭐️ NUEVO: Maneja la lógica para pedir y guardar el nombre del invitado.
 */
function handleGuestName() {
    const modal = document.getElementById('guest-name-modal');
    const form = document.getElementById('guest-name-form');
    const input = document.getElementById('modal-guest-name-input');
    const messageTextarea = document.getElementById('guest-message');

    if (!modal || !form || !input || !messageTextarea) return;

    // Usamos localStorage de forma segura
    const storageKey = `guestName_${EVENT_ID}`;
    const guestUniqueIdKey = `guestUniqueId_${EVENT_ID}`;
    
    let storedName = null;
    let storedUniqueId = null;

    try {
        storedName = localStorage.getItem(storageKey);
        storedUniqueId = localStorage.getItem(guestUniqueIdKey);
    } catch (e) {
        console.warn("Storage access denied or disabled by browser:", e);
    }

    if (!storedUniqueId) {
        // Generar ID robusto
        storedUniqueId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
            ? crypto.randomUUID() 
            : `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
            localStorage.setItem(guestUniqueIdKey, storedUniqueId);
        } catch (e) {
            console.warn("Failed to save guest unique ID:", e);
        }
    }
    GUEST_UNIQUE_ID = storedUniqueId;

    const updateUIWithName = (name) => {
        GUEST_NAME = name;
        messageTextarea.placeholder = `Deja un comentario como ${name} (opcional)`;
    };

    if (storedName) {
        updateUIWithName(storedName);
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex'; // Mostramos el modal si no hay nombre.
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = input.value.trim();
        if (name) {
            // Verificar si el nombre ya está en uso en la lista global de invitados
            let isTaken = false;
            const guestsRef = dbRef(database, `events/${EVENT_ID}/data/guests`);

            try {
                const snapshot = await get(guestsRef);
                if (snapshot.exists()) {
                    snapshot.forEach(child => {
                        const val = child.val();
                        if (val.name && val.name.toLowerCase() === name.toLowerCase()) {
                            if (val.uniqueId !== GUEST_UNIQUE_ID) {
                                isTaken = true;
                            }
                        }
                    });
                }
            } catch (error) {
                console.warn("No se pudo verificar unicidad del nombre. Se permite el acceso.", error);
            }

            if (isTaken) {
                alert('Este nombre ya está en uso por otro invitado. Por favor, elige otro.');
                return;
            }

            try {
                await push(guestsRef, { name: name, uniqueId: GUEST_UNIQUE_ID, timestamp: Date.now() });
            } catch (error) {
                console.warn("No se pudo registrar el invitado globalmente.", error);
            }

            try {
                localStorage.setItem(storageKey, name);
                localStorage.setItem(`playerName_${EVENT_ID}`, name); // Sincronizar con script.js para los juegos
            } catch (e) {
                console.warn("Failed to save guest name to storage:", e);
            }
            updateUIWithName(name);
            modal.style.display = 'none';
        }
    });
}


// =======================================================================
// --- NUEVO: FUNCIÓN DE INICIALIZACIÓN DEL PORTAL ---
// (Sin cambios internos)
// =======================================================================
function initializePortal() {
    // DECLARACIONES DEL DOM
    const form = document.getElementById('memory-form');
    const nameInput = document.getElementById('guest-name');
    const messageInput = document.getElementById('guest-message');
    const fileInputPhoto = document.getElementById('guest-file-photo'); 
    const fileInputVideo = document.getElementById('guest-file-video'); 
    const fileInputGallery = document.getElementById('guest-file-gallery'); 
    const submitButton = document.getElementById('submit-memory-btn');
    const progressBarContainer = document.getElementById('upload-progress-bar-container');
    const progressBar = document.getElementById('upload-progress');
    const uploadStatus = document.getElementById('upload-status');
    const fileNameDisplay = document.getElementById('file-name-display');
    const menuToggleBtn = document.getElementById('menu-juegos-toggle');
    const juegosDropdown = document.getElementById('juegos-dropdown');
    const cerrarMenuBtn = document.getElementById('cerrar-menu');
    
    // ⭐️ NUEVO: Iniciar el manejador del nombre del invitado
    handleGuestName();

    // ⭐️ NUEVO: Inicializar Lucide Icons y AOS en el arranque
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            once: true,
            offset: 50
        });
    }

    // --- ¡¡¡BUG CORREGIDO!!! ---
    // Actualiza los enlaces de los juegos para incluir el event_id
    document.querySelectorAll('a[href="player.html"]').forEach(a => a.href = `player.html?event=${EVENT_ID}`);
    document.querySelectorAll('a[href="memory.html"]').forEach(a => a.href = `memory.html?event=${EVENT_ID}`);
    document.querySelectorAll('a[href="hangman.html"]').forEach(a => a.href = `hangman.html?event=${EVENT_ID}`);
    // Actualiza también el enlace del trofeo (si existe)
    const rankingTrophy = document.getElementById('ranking-trophy-btn');
    if (rankingTrophy) {
        rankingTrophy.href = `ranking.html?event=${EVENT_ID}`;
    }

    // LÓGICA DEL MENÚ FLOTANTE
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
    document.addEventListener('click', (event) => {
        if (!juegosDropdown || juegosDropdown.classList.contains('hidden-dropdown')) return;
        const isClickInsideMenu = juegosDropdown.contains(event.target);
        const isClickOnToggle = menuToggleBtn && menuToggleBtn.contains(event.target);
        if (!isClickInsideMenu && !isClickOnToggle) {
            juegosDropdown.classList.add('hidden-dropdown');
        }
    });

    // LÓGICA DE ENVÍO DE MENSAJES
    if (fileInputPhoto) {
        fileInputPhoto.addEventListener('change', () => {
            fileNameDisplay.textContent = fileInputPhoto.files.length > 0 ? `Foto: ${fileInputPhoto.files[0].name}` : '';
            if (fileInputVideo) fileInputVideo.value = ''; 
            if (fileInputGallery) fileInputGallery.value = ''; 
        });
    }
    if (fileInputVideo) {
        fileInputVideo.addEventListener('change', () => {
            fileNameDisplay.textContent = fileInputVideo.files.length > 0 ? `Video: ${fileInputVideo.files[0].name}` : '';
            if (fileInputPhoto) fileInputPhoto.value = ''; 
            if (fileInputGallery) fileInputGallery.value = ''; 
        });
    }
    if (fileInputGallery) {
        fileInputGallery.addEventListener('change', () => {
            const count = fileInputGallery.files.length;
            fileNameDisplay.textContent = count > 0 
                ? `Galería: ${count} archivo${count > 1 ? 's' : ''} seleccionado${count > 1 ? 's' : ''}` 
                : '';
            if (fileInputPhoto) fileInputPhoto.value = ''; 
            if (fileInputVideo) fileInputVideo.value = ''; 
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // ¡Este es el "freno" que ahora funcionará!
            
            const name = GUEST_NAME; // ⭐️ CORREGIDO: Usar el nombre global guardado
            const message = messageInput.value.trim();
            
            // Recopilar todos los archivos a subir
            const filesToUpload = [];
            if (fileInputPhoto && fileInputPhoto.files.length > 0) {
                filesToUpload.push(fileInputPhoto.files[0]);
            }
            if (fileInputVideo && fileInputVideo.files.length > 0) {
                filesToUpload.push(fileInputVideo.files[0]);
            }
            if (fileInputGallery && fileInputGallery.files.length > 0) {
                for (let i = 0; i < fileInputGallery.files.length; i++) {
                    filesToUpload.push(fileInputGallery.files[i]);
                }
            }
            
            if (!name || (!message && filesToUpload.length === 0)) {
                alert('Por favor, ingresa tu nombre y un mensaje o al menos un archivo.');
                return;
            }
            if (filesToUpload.some(f => f.size > MAX_FILE_SIZE)) {
                alert('Uno de los archivos es demasiado grande (máximo 200MB por archivo).');
                return;
            }

            submitButton.disabled = true;

            try {
                const uploadedFilesInfo = [];

                if (filesToUpload.length > 0) {
                    progressBarContainer.classList.remove('hidden');
                    progressBar.style.width = '0%';
                    uploadStatus.textContent = 'Iniciando subida...';

                    const totalBytes = filesToUpload.reduce((acc, f) => acc + f.size, 0);
                    let totalBytesTransferred = 0;
                    const fileProgresses = new Array(filesToUpload.length).fill(0);

                    // Subir todos los archivos en paralelo
                    const uploadPromises = filesToUpload.map((file, index) => {
                        const fileName = `${Date.now()}-${index}-${file.name}`;
                        const sRef = storageRef(storage, `events/${EVENT_ID}/memories/${fileName}`);
                        
                        // Detectar y corregir contentType para evitar que falle por reglas de Firebase
                        let contentType = file.type;
                        if (!contentType || contentType === 'application/octet-stream') {
                            const ext = file.name.split('.').pop().toLowerCase();
                            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(ext)) {
                                contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                            } else if (['mp4', 'mov', 'avi', 'm4v', 'webm', '3gp'].includes(ext)) {
                                contentType = `video/${ext === 'mov' ? 'quicktime' : ext}`;
                            } else {
                                contentType = file.type.startsWith('video') ? 'video/mp4' : 'image/jpeg';
                            }
                        }

                        const metadata = { contentType: contentType };
                        const uploadTask = uploadBytesResumable(sRef, file, metadata);

                        return new Promise((resolve, reject) => {
                            uploadTask.on('state_changed', 
                                (snapshot) => {
                                    const transferred = snapshot.bytesTransferred;
                                    totalBytesTransferred -= fileProgresses[index];
                                    fileProgresses[index] = transferred;
                                    totalBytesTransferred += transferred;

                                    const percent = totalBytes > 0 ? (totalBytesTransferred / totalBytes) * 100 : 0;
                                    progressBar.style.width = percent + '%';
                                    uploadStatus.textContent = `Subiendo archivos: ${Math.round(percent)}%`;
                                }, 
                                (error) => reject(error), 
                                async () => {
                                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                                    uploadedFilesInfo.push({
                                        url: downloadUrl,
                                        type: contentType
                                    });
                                    resolve();
                                }
                            );
                        });
                    });

                    // Esperar a que terminen todas las cargas
                    await Promise.all(uploadPromises);
                }

                // Guardar en la base de datos
                if (uploadedFilesInfo.length > 0) {
                    for (let i = 0; i < uploadedFilesInfo.length; i++) {
                        const fileInfo = uploadedFilesInfo[i];
                        const newMemory = {
                            name: name,
                            message: message, // Compartir el mismo mensaje para todas las fotos
                            fileUrl: fileInfo.url,
                            fileType: fileInfo.type,
                            timestamp: Date.now() + i // Pequeño desfase para conservar el orden
                        };
                        await push(memoriesRef, newMemory);
                    }
                } else if (message) {
                    // Solo mensaje de texto
                    const newMemory = {
                        name: name,
                        message: message,
                        timestamp: Date.now()
                    };
                    await push(memoriesRef, newMemory);
                }

                // ⭐️ MOSTRAR TOAST PERSONALIZADO
                const toast = document.getElementById('custom-toast-message');
                if (toast) {
                    toast.classList.add('show');
                    if (typeof confetti === 'function') {
                        confetti({
                            particleCount: 120,
                            spread: 70,
                            origin: { y: 0.6 }
                        });
                    }
                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 4000);
                } else {
                    alert('¡Recuerdo enviado con éxito!');
                }
                
            } catch (error) {
                console.error("Error al enviar el recuerdo:", error);
                // ⭐️ CORREGIDO: No se resetea el nombre, solo el mensaje y archivo.
                messageInput.value = '';
                fileNameDisplay.textContent = '';
            } finally {
                form.reset();
                fileNameDisplay.textContent = '';
                progressBarContainer.classList.add('hidden');
                progressBar.style.width = '0%';
                submitButton.disabled = false;
                if (fileInputPhoto) fileInputPhoto.value = '';
                if (fileInputVideo) fileInputVideo.value = '';
                if (fileInputGallery) fileInputGallery.value = '';
            }
        });
    }

    // Iniciar la escucha de mensajes (AHORA que 'memoriesRef' está definido)
    listenForMemories();
}

// =======================================================================
// LÓGICA PRINCIPAL (REESTRUCTURADA)
// =======================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- 1. OBTENER ID Y CARGAR CONFIGURACIÓN ---
        EVENT_ID = getEventId();
        await loadEventConfig(EVENT_ID); // Espera a que la config se cargue
        
        if (EVENT_ID === 'preview') {
            // En modo de vista previa, no conectamos la base de datos de producción.
            // En su lugar, renderizamos recuerdos ficticios y configuramos el receptor de postMessage.
            const memoriesList = document.getElementById('memories-list');
            if (memoriesList) {
                memoriesList.innerHTML = `
                    <div class="memory-item p-3 mb-4" style="transform: rotate(1deg);">
                        <div class="flex items-start justify-between">
                            <p class="font-bold text-gray-800 text-sm">💬 Invitado de Ejemplo</p>
                            <p class="text-xs text-gray-500">Hace 2 min</p>
                        </div>
                        <p class="text-gray-600 mt-1 mb-2 text-sm">¡Esta es una felicitación de muestra para ver cómo lucirá el portal en tu evento!</p>
                        <img src="https://i.imgur.com/AbCqgSg.jpeg" class="media w-full h-auto max-h-48 object-cover rounded-lg shadow-md mt-2" loading="lazy">
                    </div>
                `;
            }

            // Ocultar formulario de envío ya que solo visualizamos
            const uploadForm = document.querySelector('form');
            if (uploadForm) uploadForm.style.display = 'none';

            // Escuchar mensajes en tiempo real desde el super-admin
            window.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'applyPreviewConfig') {
                    applyConfigToPortal(event.data.config);
                    // ⭐️ Re-cargar iconos de Lucide e inicializar transiciones en previsualización
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                    if (typeof AOS !== 'undefined') {
                        AOS.refresh();
                    }
                }
            });

            // ⭐️ Inicializar Lucide y AOS para la carga inicial del iframe en modo preview
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 800,
                    once: true,
                    offset: 50
                });
            }

            // Notificar al super-admin que el iframe está listo para recibir la configuración
            if (window.parent) {
                window.parent.postMessage({ type: 'iframeReady' }, '*');
            }

            const mainContainer = document.querySelector('.portal-container');
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
            return;
        }
        
        // --- 2. INICIALIZAR REFERENCIAS DE FIREBASE (⭐️ CORREGIDO) ---
        // Se construye la ruta completa directamente
        memoriesRef = dbRef(database, `events/${EVENT_ID}/data/memories`);
        
        // --- 3. INICIALIZAR EL PORTAL ---
        // Esta función ahora contiene todos los addEventListener
        initializePortal();

        // ⭐️ SOLUCIÓN FOUC: Hacer visible el contenido principal después de cargar la configuración.
        // Esto previene el "parpadeo" de contenido sin estilo.
        const mainContainer = document.querySelector('.portal-container');
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

    } catch (error) {
        // Esto atrapará el error de 'getEventId' o 'loadEventConfig'
        console.error("Error al inicializar la aplicación:", error.message);
        // La app se detendrá aquí si el evento no existe o está inactivo
    }
});

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

function openLightbox(mediaElement) {
    let lightbox = document.getElementById('lightbox-modal');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox-modal';
        lightbox.className = 'fixed inset-0 bg-black bg-opacity-95 flex flex-col items-center justify-center z-[11000] transition-opacity duration-300';
        lightbox.innerHTML = `
            <button id="lightbox-close" class="absolute top-4 right-4 text-white text-4xl font-bold cursor-pointer hover:text-red-500 transition-colors">&times;</button>
            <div id="lightbox-content" class="max-w-[90%] max-h-[85%] flex items-center justify-center"></div>
        `;
        document.body.appendChild(lightbox);
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.id === 'lightbox-close') {
                lightbox.classList.add('opacity-0');
                setTimeout(() => {
                    lightbox.style.display = 'none';
                }, 300);
            }
        });
    }
    
    const content = lightbox.querySelector('#lightbox-content');
    content.innerHTML = '';
    
    const clone = mediaElement.cloneNode(true);
    clone.style.maxWidth = '100%';
    clone.style.maxHeight = '80vh';
    clone.style.objectFit = 'contain';
    clone.style.borderRadius = '8px';
    clone.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
    if (clone.tagName === 'VIDEO') {
        clone.controls = true;
        clone.autoplay = true;
    }
    content.appendChild(clone);
    
    lightbox.style.display = 'flex';
    lightbox.classList.remove('opacity-0');
}