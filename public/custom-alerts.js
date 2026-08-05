/**
 * ⭐️ SISTEMA GLOBAL DE ALERTAS Y CONFIRMACIONES CON ESTILO ⭐️
 * Reemplaza los carteles nativos del navegador por modales animados, elegantes y temáticos.
 */

(function() {
    if (window.__customAlertSystemInstalled) return;
    window.__customAlertSystemInstalled = true;

    // 1. Inyectar estilos CSS
    const style = document.createElement('style');
    style.id = 'custom-alert-styles';
    style.textContent = `
        /* Overlay del Modal */
        .custom-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.25rem;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.25s ease, visibility 0.25s ease;
        }
        .custom-modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        /* Tarjeta del Modal */
        .custom-modal-card {
            background: #ffffff;
            width: 100%;
            max-width: 420px;
            border-radius: 24px;
            padding: 28px 24px;
            text-align: center;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
            transform: scale(0.85) translateY(12px);
            transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        }
        .custom-modal-overlay.active .custom-modal-card {
            transform: scale(1) translateY(0);
        }

        /* Ícono con Círculo Temático */
        .custom-modal-icon-box {
            width: 68px;
            height: 68px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 16px auto;
            box-shadow: inset 0 2px 4px rgba(255,255,255,0.8);
        }
        .custom-modal-icon-success { background: #DCFCE7; color: #16A34A; border: 2px solid #86EFAC; }
        .custom-modal-icon-error { background: #FEE2E2; color: #DC2626; border: 2px solid #FCA5A5; }
        .custom-modal-icon-warning { background: #FEF3C7; color: #D97706; border: 2px solid #FDE68A; }
        .custom-modal-icon-info { background: #FEF08A; color: #854D0E; border: 2px solid #FDE047; }

        /* Título y Mensaje */
        .custom-modal-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1F2937;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        .custom-modal-message {
            font-size: 0.95rem;
            color: #4B5563;
            line-height: 1.5;
            margin-bottom: 24px;
            word-break: break-word;
            white-space: pre-line;
        }

        /* Botones */
        .custom-modal-actions {
            display: flex;
            gap: 12px;
            justify-content: center;
        }
        .custom-modal-btn {
            flex: 1;
            font-weight: 700;
            font-size: 0.95rem;
            padding: 12px 20px;
            border-radius: 14px;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 2px solid transparent;
        }
        .custom-modal-btn-primary {
            background: #1F2937;
            color: #FACC15;
            border-color: #FACC15;
            box-shadow: 0 4px 0 #FACC15;
        }
        .custom-modal-btn-primary:hover {
            background: #374151;
            transform: translateY(2px);
            box-shadow: 0 2px 0 #FACC15;
        }
        .custom-modal-btn-primary:active {
            transform: translateY(4px);
            box-shadow: 0 0 0 #FACC15;
        }
        .custom-modal-btn-danger {
            background: #DC2626;
            color: #FFFFFF;
            border-color: #B91C1C;
            box-shadow: 0 4px 0 #991B1B;
        }
        .custom-modal-btn-danger:hover {
            background: #B91C1C;
            transform: translateY(2px);
            box-shadow: 0 2px 0 #991B1B;
        }
        .custom-modal-btn-secondary {
            background: #F3F4F6;
            color: #4B5563;
            border-color: #E5E7EB;
            box-shadow: 0 4px 0 #D1D5DB;
        }
        .custom-modal-btn-secondary:hover {
            background: #E5E7EB;
            transform: translateY(2px);
            box-shadow: 0 2px 0 #D1D5DB;
        }

        /* ⭐️ CORTINA Y ESCUDO ANTI-PARPADEO (ANTI-FOUC) ⭐️ */
        html.page-loading body {
            opacity: 0 !important;
        }
        body {
            transition: opacity 0.35s ease !important;
        }

        #global-page-loader {
            position: fixed;
            inset: 0;
            z-index: 99999999;
            background: #111827;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            opacity: 1;
            transition: opacity 0.35s ease, visibility 0.35s ease;
        }
        #global-page-loader.loaded {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .global-loader-circle {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(250, 204, 21, 0.15);
            border: 4px solid rgba(250, 204, 21, 0.3);
            border-top-color: #FACC15;
            animation: spinGlobalLoader 0.85s linear infinite;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            box-shadow: 0 0 25px rgba(250, 204, 21, 0.25);
        }
        @keyframes spinGlobalLoader {
            to { transform: rotate(360deg); }
        }
        .global-loader-text {
            color: #F3F4F6;
            font-size: 0.9rem;
            font-weight: 700;
            font-family: system-ui, -apple-system, sans-serif;
            letter-spacing: 0.5px;
        }

        /* ⭐️ SISTEMA DE TOASTS FLOTANTES ⭐️ */
        #custom-toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            pointer-events: none;
            max-width: 360px;
            width: calc(100vw - 40px);
        }
        .custom-toast {
            pointer-events: auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 14px 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
            animation: toastIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transition: all 0.3s ease;
        }
        .custom-toast.toast-out {
            opacity: 0;
            transform: translateX(100px);
        }
        @keyframes toastIn {
            from { opacity: 0; transform: translateY(-20px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .custom-toast-icon {
            font-size: 1.4rem;
            flex-shrink: 0;
        }
        .custom-toast-text {
            font-size: 0.9rem;
            font-weight: 600;
            color: #1F2937;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);

    // 2. Crear HTML del Modal en DOM
    function ensureModalDOM() {
        if (document.getElementById('custom-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'custom-modal-overlay';
        overlay.className = 'custom-modal-overlay';
        overlay.innerHTML = `
            <div class="custom-modal-card" role="dialog" aria-modal="true">
                <div class="custom-modal-icon-box" id="custom-modal-icon-box">🐝</div>
                <h3 class="custom-modal-title" id="custom-modal-title">Aviso</h3>
                <div class="custom-modal-message" id="custom-modal-message"></div>
                <div class="custom-modal-actions" id="custom-modal-actions">
                    <button class="custom-modal-btn custom-modal-btn-primary" id="custom-modal-btn-ok">Entendido</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const toastContainer = document.createElement('div');
        toastContainer.id = 'custom-toast-container';
        document.body.appendChild(toastContainer);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureModalDOM);
    } else {
        ensureModalDOM();
    }

    // 3. Función principal para Alertas
    window.customAlert = function(msg, customType, customTitle) {
        return new Promise((resolve) => {
            ensureModalDOM();
            const overlay = document.getElementById('custom-modal-overlay');
            const iconBox = document.getElementById('custom-modal-icon-box');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const actionsEl = document.getElementById('custom-modal-actions');

            const strMsg = String(msg || '');
            let type = customType || 'info';
            let title = customTitle || '';

            // Detección automática de tipo si no fue provisto
            if (!customType) {
                const lower = strMsg.toLowerCase();
                if (lower.includes('éxito') || lower.includes('exito') || lower.includes('correctamente') || lower.includes('guardad') || lower.includes('copiado')) {
                    type = 'success';
                } else if (lower.includes('error') || lower.includes('falló') || lower.includes('impedido') || lower.includes('incorrecta')) {
                    type = 'error';
                } else if (lower.includes('por favor') || lower.includes('atención') || lower.includes('debes') || lower.includes('obligatorio') || lower.includes('cancelada')) {
                    type = 'warning';
                }
            }

            if (!title) {
                title = type === 'success' ? '¡Excelente! 🎉' : 
                        type === 'error' ? 'Ocurrió un Problema ❌' : 
                        type === 'warning' ? 'Atención ⚠️' : 'Aviso 🐝';
            }

            // Aplicar estilo de ícono
            iconBox.className = 'custom-modal-icon-box custom-modal-icon-' + type;
            iconBox.textContent = type === 'success' ? '🎉' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '🐝';

            titleEl.textContent = title;
            messageEl.textContent = strMsg;

            actionsEl.innerHTML = `
                <button class="custom-modal-btn custom-modal-btn-primary" id="custom-modal-btn-ok">Entendido</button>
            `;

            overlay.classList.add('active');

            const okBtn = document.getElementById('custom-modal-btn-ok');
            okBtn.focus();

            function close() {
                overlay.classList.remove('active');
                okBtn.removeEventListener('click', close);
                window.removeEventListener('keydown', onKey);
                resolve();
            }

            function onKey(e) {
                if (e.key === 'Escape' || e.key === 'Enter') close();
            }

            okBtn.addEventListener('click', close);
            window.addEventListener('keydown', onKey);
        });
    };

    // 4. Función principal para Confirmaciones
    window.customConfirm = function(msg, customTitle) {
        return new Promise((resolve) => {
            ensureModalDOM();
            const overlay = document.getElementById('custom-modal-overlay');
            const iconBox = document.getElementById('custom-modal-icon-box');
            const titleEl = document.getElementById('custom-modal-title');
            const messageEl = document.getElementById('custom-modal-message');
            const actionsEl = document.getElementById('custom-modal-actions');

            const strMsg = String(msg || '');
            const title = customTitle || '¿Estás seguro? ❓';

            iconBox.className = 'custom-modal-icon-box custom-modal-icon-warning';
            iconBox.textContent = '❓';

            titleEl.textContent = title;
            messageEl.textContent = strMsg;

            const isDeleteAction = strMsg.toLowerCase().includes('eliminar') || strMsg.toLowerCase().includes('borrar');

            actionsEl.innerHTML = `
                <button class="custom-modal-btn custom-modal-btn-secondary" id="custom-modal-btn-cancel">Cancelar</button>
                <button class="custom-modal-btn ${isDeleteAction ? 'custom-modal-btn-danger' : 'custom-modal-btn-primary'}" id="custom-modal-btn-confirm">
                    ${isDeleteAction ? 'Sí, Eliminar' : 'Confirmar'}
                </button>
            `;

            overlay.classList.add('active');

            const cancelBtn = document.getElementById('custom-modal-btn-cancel');
            const confirmBtn = document.getElementById('custom-modal-btn-confirm');
            confirmBtn.focus();

            function finish(result) {
                overlay.classList.remove('active');
                cancelBtn.removeEventListener('click', onCancel);
                confirmBtn.removeEventListener('click', onConfirm);
                window.removeEventListener('keydown', onKey);
                resolve(result);
            }

            function onCancel() { finish(false); }
            function onConfirm() { finish(true); }
            function onKey(e) {
                if (e.key === 'Escape') finish(false);
            }

            cancelBtn.addEventListener('click', onCancel);
            confirmBtn.addEventListener('click', onConfirm);
            window.addEventListener('keydown', onKey);
        });
    };

    // 5. Toast Notificación Flotante Rápida
    window.showToast = function(msg, type = 'info', duration = 3000) {
        ensureModalDOM();
        const container = document.getElementById('custom-toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'custom-toast';

        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '🐝';
        toast.innerHTML = `
            <span class="custom-toast-icon">${icon}</span>
            <span class="custom-toast-text">${msg}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    };

    // ⭐️ REEMPLAZO GLOBAL DE WINDOW.ALERT Y WINDOW.CONFIRM ⭐️
    window.alert = function(msg) {
        return window.customAlert(msg);
    };

    const originalConfirm = window.confirm;
    window.confirm = function(msg) {
        window.customConfirm(msg);
        return true; 
    };

    // ⭐️ CONTROL DEL CARGADOR GLOBAL Y NAVEGACIÓN ⭐️
    window.hideGlobalPageLoader = function() {
        document.documentElement.classList.remove('page-loading');
        const loader = document.getElementById('global-page-loader');
        if (loader) {
            loader.classList.add('loaded');
            setTimeout(() => {
                if (loader && loader.parentElement) loader.parentElement.removeChild(loader);
            }, 450);
        }
    };

    // Fallback de seguridad: Ocultar el cargador automáticamente si Firebase tarda
    setTimeout(() => {
        if (typeof window.hideGlobalPageLoader === 'function') {
            window.hideGlobalPageLoader();
        }
    }, 3500);

    // ⭐️ NAVEGACIÓN SUAVE Y CONSERVACIÓN DEL EVENT_ID ⭐️
    window.navigateToPage = function(url) {
        if (!url) return;

        // Recuperar eventId actual de la URL
        const currentParams = new URLSearchParams(window.location.search);
        const eventId = currentParams.get('event');

        let targetUrl = url;
        if (eventId && !targetUrl.includes('event=')) {
            const separator = targetUrl.includes('?') ? '&' : '?';
            targetUrl += `${separator}event=${encodeURIComponent(eventId)}`;
        }

        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 150);
    };

    // Restauración cuando el usuario presiona el botón "Atrás" del navegador (BFCache)
    window.addEventListener('pageshow', (e) => {
        document.body.style.opacity = '1';
        if (e.persisted) {
            if (typeof window.hideGlobalPageLoader === 'function') {
                window.hideGlobalPageLoader();
            }
        }
    });

    // Interceptor universal de clics para enlaces y botones de retroceso/navegación
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (a) {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript') && a.target !== '_blank') {
                e.preventDefault();
                window.navigateToPage(href);
                return;
            }
        }

        const btn = e.target.closest('button[onclick*="index.html"], button[data-navigate]');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            const onclickAttr = btn.getAttribute('onclick') || '';
            const match = onclickAttr.match(/['"](.*\.html.*)['"]/);
            const targetUrl = match ? match[1] : 'index.html';
            window.navigateToPage(targetUrl);
            return;
        }
    }, true);

})();
