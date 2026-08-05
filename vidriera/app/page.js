// Este es tu nuevo "index": vidriera/app/page.js
// Usamos "use client" para poder usar animaciones y el estado del formulario
"use client";

import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, connectDatabaseEmulator } from "firebase/database";
import { motion } from "framer-motion";
import { useState, useEffect } from 'react';

// --- ⭐️ NUEVO: CONFIGURACIÓN DE FIREBASE ⭐️ ---
const firebaseConfig = {
  apiKey: "AIzaSyDRsS6YQ481KQadSk8gf9QtxVt_asnrDlc",
  authDomain: "juegos-cumple.firebaseapp.com",
  databaseURL: "https://juegos-cumple-default-rtdb.firebaseio.com",
  projectId: "juegos-cumple",
};
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
  try {
    connectDatabaseEmulator(database, "localhost", 9000);
    console.log("Conectado al emulador de Realtime Database en la vidriera");
  } catch (e) {
    console.warn("Error conectando al emulador de Database:", e);
  }
}

// Planes por defecto como fallback si no hay datos en Firebase
const DEFAULT_PLANS = [
  {
    id: "base",
    name: "Plan Base",
    price: "$15.000",
    period: "pago único",
    description: "Ideal para reuniones o festejos íntimos.",
    features: ["Trivia personalizada", "Juego de Memoria", "Hasta 30 invitados", "Soporte estándar"],
    active: true,
    popular: false,
    ctaText: "Cotizar Base"
  },
  {
    id: "pro",
    name: "Plan Pro",
    price: "$25.000",
    period: "pago único",
    description: "El más elegido para cumpleaños y eventos sociales.",
    features: ["Todo lo del Plan Base", "Galería de Recuerdos en vivo", "Hasta 100 invitados", "Modo Proyector para TV/Pantalla"],
    active: true,
    popular: true,
    ctaText: "Cotizar Pro"
  },
  {
    id: "full",
    name: "Plan Full",
    price: "$38.000",
    period: "pago único",
    description: "Experiencia premium completa sin límites para grandes celebraciones.",
    features: ["Todo lo del Plan Pro", "Invitados ilimitados", "Descarga HD de todas las fotos", "Diseño y colores 100% personalizados", "Soporte Prioritario VIP"],
    active: true,
    popular: false,
    ctaText: "Cotizar Full"
  }
];

// Pequeños componentes para los íconos (mejora la legibilidad)
const IconTrivia = () => <span className="text-3xl">✍️</span>;
const IconMemoria = () => <span className="text-3xl">🧠</span>;
const IconRecuerdos = () => <span className="text-3xl">🖼️</span>;

// ⭐️ NUEVO: Componente que usa la imagen SVG desde la carpeta /public
const WhatsAppIcon = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src="/whatsapp.svg" alt="WhatsApp" className="w-8 h-8" />
);

export default function LandingPage() {

  // Estado para el formulario de contacto (opcional, para futuro)
  const [email, setEmail] = useState('');
  // ⭐️ NUEVO: Estado para manejar la carga y los errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ⭐️ NUEVO: Estado de planes dinámicos desde Realtime Database
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  // ⭐️ LECTURA PUNTUAL (una sola vez al cargar la página para evitar flujo continuo de datos)
  useEffect(() => {
    async function fetchPlans() {
      // Rutas en orden de prioridad
      const paths = [
        'events/vidriera/config/plans',
        'events/vidriera/config/status/plans',
      ];

      for (const path of paths) {
        try {
          console.log(`[Vidriera] Intentando leer planes desde: ${path}`);
          const snapshot = await get(ref(database, path));
          if (snapshot.exists()) {
            const data = snapshot.val();
            let loadedPlans = [];
            if (Array.isArray(data)) {
              loadedPlans = data.filter(p => p != null);
            } else if (typeof data === 'object') {
              loadedPlans = Object.values(data).filter(p => p != null);
            }
            if (loadedPlans.length > 0) {
              console.log(`[Vidriera] ✅ Planes cargados desde ${path}:`, loadedPlans.map(p => `${p.name}(active=${p.active})`));
              setPlans(loadedPlans);
              return; // Éxito, no seguir intentando
            }
          }
          console.log(`[Vidriera] ⚠️ Sin datos en: ${path}`);
        } catch (err) {
          console.warn(`[Vidriera] ❌ Error leyendo ${path}:`, err.message || err);
        }
      }

      console.log('[Vidriera] ⚠️ Usando planes por defecto (no se pudo leer de Firebase)');
    }
    fetchPlans();
  }, []);

  // ⭐️ CORREGIDO: Ahora la función solo valida si el evento existe y está activo.
  const getEventStatus = async (eventId) => {
    setLoading(true);
    setError('');
    try {
      const eventRef = ref(database, `events/${eventId}/config/status`);
      const snapshot = await get(eventRef);
      if (snapshot.exists()) {
        const status = snapshot.val();
        if (status.is_active !== false) {
          return { exists: true };
        }
      }
      return { exists: false };
    } catch (err) {
      console.error("Error verificando el evento:", err);
      setError("Error de conexión. Inténtalo de nuevo.");
      return { exists: false };
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-gray-200">

      {/* --- ⭐️ BOTÓN DE WHATSAPP FLOTANTE ⭐️ --- */}
      <a
        href="https://wa.me/5491135844624"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-transform hover:scale-110"
        aria-label="Contactar por WhatsApp"
      >
        <WhatsAppIcon />
      </a>
      {/* --- FIN BOTÓN DE WHATSAPP --- */}


      {/* --- NAVEGACIÓN (BOTÓN ELIMINADO) --- */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-abeja.png" alt="TuFiestaDigital Logo" className="w-9 h-9 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]" />
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400">
              TuFiestaDigital
            </span>
          </motion.div>

          {/* ⭐️ BOTÓN ELIMINADO ⭐️ 
              Ahora el layout 'justify-between' solo dejará el logo a la izquierda.
              Si prefieres el logo centrado, cambia 'justify-between' por 'justify-center'.
          */}

        </div>
      </nav>

      {/* --- SECCIÓN HERO --- */}
      <main className="flex-grow">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center py-24 md:py-32 px-6"
        >
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            La <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">App</span> Definitiva
            <br />
            para tu Evento
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Involucra a tus invitados con trivias personalizadas, juegos de memoria
            y un álbum de recuerdos digital en tiempo real.
          </p>
          <motion.a
            href="#caracteristicas"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 font-bold text-lg text-black bg-yellow-400 rounded-lg shadow-xl"
          >
            Conoce Más
          </motion.a>
        </motion.section>


        {/* --- SECCIÓN DE ACCESO (PARA INVITADOS Y ANFITRIONES) --- */}
        <section id="acceso" className="pb-24 pt-12 text-center bg-black bg-opacity-20">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-black mb-16">
              ¿Listo para ingresar?
            </h2>

            <div className="grid md:grid-cols-2 gap-10 max-w-4xl mx-auto">

              {/* --- Formulario de INVITADO --- */}
              <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">Soy Invitado</h3>
                <p className="text-gray-400 mb-6">Ingresa el ID del evento para unirte a la fiesta.</p>
                <form
                  className="flex"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // @ts-ignore
                    const eventId = e.target.elements.guestEventId.value.trim().toLowerCase();
                    if (eventId) {
                      const status = await getEventStatus(eventId);
                      if (status.exists) {
                        window.location.href = `https://app.tufiestadigital.com.ar/index.html?event=${eventId}`;
                      } else {
                        setError(`El evento "${eventId}" no fue encontrado. Verifica el ID.`);
                      }
                    } else {
                      alert("Por favor, escribe un ID de evento.");
                    }
                    setLoading(false);
                  }}
                >
                  <input
                    type="text"
                    name="guestEventId"
                    placeholder="Ej: boda-ana-y-pablo"
                    required
                    className="px-6 py-4 w-full rounded-l-lg border-0 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-4 font-bold text-black bg-yellow-400 rounded-r-lg disabled:bg-yellow-600"
                  >
                    {loading ? '...' : 'Entrar'}
                  </button>
                </form>
              </div>

              {/* --- Formulario de ANFITRIÓN --- */}
              <div className="bg-zinc-900 p-8 rounded-2xl border border-white/10">
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">Soy Anfitrión</h3>
                <p className="text-gray-400 mb-6">Ingresa el ID de tu evento para administrarlo.</p>
                <form
                  className="flex"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    // @ts-ignore
                    const eventId = e.target.elements.hostEventId.value.trim().toLowerCase();
                    if (eventId) {
                      const status = await getEventStatus(eventId);
                      if (status.exists) {
                        window.location.href = `https://app.tufiestadigital.com.ar/host.html?event=${eventId}`;
                      } else {
                        setError(`El evento "${eventId}" no fue encontrado. Verifica el ID.`);
                      }
                    } else {
                      alert("Por favor, escribe el ID de tu evento.");
                    }
                    setLoading(false);
                  }}
                >
                  <input
                    type="text"
                    name="hostEventId"
                    placeholder="Escribe el ID de tu evento"
                    required
                    className="px-6 py-4 w-full rounded-l-lg border-0 bg-zinc-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-400"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-4 font-bold text-black bg-yellow-400 rounded-r-lg disabled:bg-yellow-600"
                  >
                    {loading ? '...' : 'Administrar'}
                  </button>
                </form>
              </div>

            </div>
            {/* ⭐️ NUEVO: Contenedor para mostrar el mensaje de error */}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 text-red-400 font-semibold">
                {error}
              </motion.div>
            )}
          </div>
        </section>


        {/* --- SECCIÓN DE CARACTERÍSTICAS --- */}
        <section id="caracteristicas" className="py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-black text-center mb-16">
              Una Experiencia Interactiva
            </h2>
            <div className="grid md:grid-cols-3 gap-8">

              {/* Tarjeta 1 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconTrivia />
                <h3 className="text-2xl font-bold my-4">Trivia Personalizada</h3>
                <p className="text-gray-400">
                  Carga tus propias preguntas y respuestas desde un panel de anfitrión
                  fácil de usar.
                </p>
              </motion.div>

              {/* Tarjeta 2 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconMemoria />
                <h3 className="text-2xl font-bold my-4">Juego de Memoria</h3>
                <p className="text-gray-400">
                  Sube tus propias fotos para crear un "memotest" único y
                  revivir momentos especiales.
                </p>
              </motion.div>

              {/* Tarjeta 3 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="p-8 bg-zinc-900 rounded-2xl border border-white/10 shadow-xl"
              >
                <IconRecuerdos />
                <h3 className="text-2xl font-bold my-4">Galería de Recuerdos</h3>
                <p className="text-gray-400">
                  Tus invitados suben fotos y videos del evento en tiempo real.
                  Todos los recuerdos en un solo lugar.
                </p>
              </motion.div>

            </div>
          </div>
        </section>

        {/* --- SECCIÓN DE PRECIOS/CONTACTO --- */}
        <section id="precios" className="py-20 bg-black bg-opacity-20">
          <div className="container mx-auto px-6 text-center">
            {(() => {
              const activePlans = plans.filter(p => p && p.active !== false && p.active !== 'false' && p.active !== 0 && p.active !== '0');
              const isSingle = activePlans.length === 1;

              return (
                <>
                  <h2 className="text-4xl font-black mb-4">
                    {isSingle ? 'Plan para tu Evento' : 'Nuestros Planes'}
                  </h2>
                  <p className="text-gray-400 max-w-xl mx-auto mb-16">
                    {isSingle
                      ? 'Todo lo necesario para hacer de tu fiesta una experiencia digital e interactiva única.'
                      : 'Elige la opción perfecta para tu celebración. Sin costos ocultos.'}
                  </p>

                  {/* Grid Dinámica de Tarjetas de Planes */}
                  <div className={`grid grid-cols-1 ${isSingle ? 'max-w-md' : activePlans.length === 2 ? 'md:grid-cols-2 max-w-4xl' : 'md:grid-cols-3 max-w-6xl'} gap-8 mx-auto items-stretch`}>
                    {activePlans.map((plan, idx) => (
                      <motion.div
                        key={plan.id || idx}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                        viewport={{ once: true }}
                        className={`relative flex flex-col justify-between bg-zinc-900 rounded-2xl border ${plan.popular ? 'border-yellow-400 ring-2 ring-yellow-400/50 shadow-2xl scale-105 z-10' : 'border-white/10 shadow-xl'
                          } p-8 text-left`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                            ⭐ Más Popular ⭐
                          </div>
                        )}

                        <div>
                          <h3 className="text-2xl font-bold mb-2 text-white">{plan.name}</h3>
                          <p className="text-gray-400 text-sm mb-6 min-h-[40px]">{plan.description}</p>

                          <div className="mb-6">
                            <span className="text-4xl font-black text-yellow-400">{plan.price}</span>
                            <span className="text-gray-400 text-sm ml-2">/ {plan.period || 'pago único'}</span>
                          </div>

                          <ul className="space-y-3 mb-8 text-sm text-gray-300">
                            {(Array.isArray(plan.features) ? plan.features : (plan.features || '').split(',')).map((feat, fIdx) => (
                              <li key={fIdx} className="flex items-center gap-2">
                                <span className="text-green-400 font-bold">✓</span>
                                <span>{typeof feat === 'string' ? feat.trim() : feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <a
                          href={`https://wa.me/5491135844624?text=${encodeURIComponent(`Hola! Me interesa cotizar el ${plan.name} (${plan.price}) para mi evento.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`w-full py-4 block text-center font-bold text-sm rounded-lg transition-transform hover:scale-105 ${plan.popular ? 'bg-yellow-400 text-black shadow-lg hover:bg-yellow-500' : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10'
                            }`}
                        >
                          {plan.ctaText || `Cotizar ${plan.name}`}
                        </a>
                      </motion.div>
                    ))}
                  </div>

                  {/* Formulario de consulta rápida por email */}
                  <div className="mt-16 max-w-lg mx-auto bg-zinc-900/60 border border-white/10 p-6 rounded-2xl">
                    <h4 className="text-lg font-bold text-white mb-2">¿Tienes alguna duda o presupuesto especial?</h4>
                    <p className="text-xs text-gray-400 mb-4">Déjanos tu email y te asesoramos para tu fiesta.</p>
                    <form
                      className="flex"
                      onSubmit={(e) => {
                        e.preventDefault();
                        alert("¡Gracias por tu interés! Pronto nos contactaremos.");
                        setEmail('');
                      }}
                    >
                      <input
                        type="email"
                        placeholder="Tu email de contacto"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="px-4 py-3 w-full rounded-l-lg border-0 bg-zinc-800 text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-yellow-400"
                      />
                      <button
                        type="submit"
                        className="px-6 py-3 font-bold text-sm text-black bg-yellow-400 rounded-r-lg hover:bg-yellow-500"
                      >
                        Enviar
                      </button>
                    </form>
                  </div>
                </>
              );
            })()}
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-6 text-center flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-abeja.png" alt="TuFiestaDigital Logo" className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400">
              TuFiestaDigital
            </span>
          </div>
          <p className="text-gray-500">
            &copy; 2025 Tu Fiesta Digital. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}