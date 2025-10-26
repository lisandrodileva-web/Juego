// =======================================================================
// FIREBASE CONFIGURATION (CORREGIDO)
// =======================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDRsS6YQ481KQadSk8gf9QtxVt_asnrDlc",
  authDomain: "juegos-cumple.firebaseapp.com",
  // ⚠️ databaseURL SIN BARRA FINAL (/) PARA MAYOR COMPATIBILIDAD
  databaseURL: "https://juegos-cumple-default-rtdb.firebaseio.com", 
  projectId: "juegos-cumple",
  storageBucket: "juegos-cumple.firebasestorage.app",
  messagingSenderId: "595312538655",
  appId: "1:595312538655:web:93220a84570ff7461fd12a",
  measurementId: "G-V1YXNZXVQR"
};

// =======================================================================
// INICIALIZACIÓN DE FIREBASE Y VARIABLES GLOBALES
// =======================================================================

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const questionsRef = ref(database, 'questions'); // Referencia a la colección de preguntas
const rankingsRef = ref(database, 'rankings'); // 🏆 Colección de resultados

let quizQuestions = []; 
let currentQuestionIndex = 0;
let score = 0;
let timerInterval;
let timeLeft = 10;
let playerName = 'Jugador Anónimo';
let timeBonusTotal = 0; // 🏆 Suma de los segundos que sobraron (tiempo de bonificación)
let totalTime = 0; // 💡 CORRECCIÓN CRÍTICA: Inicializar el tiempo total USADO

// =======================================================================
// FUNCIONES DE UTILIDAD
// =======================================================================

/**
 * Función CRÍTICA: Convierte el objeto de opciones de Firebase de vuelta a un array.
 */
function fixFirebaseArray(data) {
    if (data && data.options && !Array.isArray(data.options) && typeof data.options === 'object') {
        data.options = Object.values(data.options);
    }
    return data;
}

// =======================================================================
// FUNCIONES DE ALMACENAMIENTO (FIREBASE)
// =======================================================================

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
        callback();
    });
}

function saveNewQuestion(questionData) {
    return push(questionsRef, questionData);
}

function deleteQuestion(id) {
    const questionToRemoveRef = ref(database, `questions/${id}`);
    return remove(questionToRemoveRef);
}

/**
 * 🏆 Guarda el resultado final del jugador en la colección 'rankings'.
 */
function saveFinalResult(data) {
    return push(rankingsRef, data);
}

// =======================================================================
// DETECCIÓN DE MODO Y MAIN
// =======================================================================

const isHostPage = document.title.includes('Anfitrión');

if (isHostPage) {
    initializeHost();
} else {
    initializePlayer();
}

// =======================================================================
// MODO ANFITRIÓN (index.html)
// =======================================================================

function initializeHost() {
    const form = document.getElementById('question-form');
    const questionsList = document.getElementById('questions-list');
    const clearAllBtn = document.getElementById('clear-all-btn');

    // Escuchar cambios en las preguntas Y en el ranking
    listenForQuestions(renderQuestionsList);
    listenForRankings(); // 🏆 Cargar el ranking al iniciar

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

        const newQuestionData = {
            question: questionText,
            options: options,
            answer: answerText
        };

        try {
            await saveNewQuestion(newQuestionData);
            form.reset();
        } catch (error) {
            console.error("Error al guardar la pregunta:", error);
            alert(`Error al guardar la pregunta en Firebase: ${error.message}`);
        }
    });

    clearAllBtn.addEventListener('click', async () => {
        if (confirm('¿Estás seguro de que quieres ELIMINAR TODAS las preguntas cargadas?')) {
            try {
                await set(questionsRef, null); 
            } catch (error) {
                console.error("Error al eliminar todas las preguntas:", error);
                alert("Error al eliminar las preguntas de Firebase.");
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
                alert("Error al eliminar la pregunta de Firebase.");
            }
        }
    });

    function renderQuestionsList() {
        questionsList.innerHTML = '';
        
        if (quizQuestions.length === 0) {
            questionsList.innerHTML = '<li class="text-gray-500 italic p-2">Aún no hay preguntas cargadas en la base de datos.</li>';
            clearAllBtn.classList.add('hidden');
            return;
        }

        clearAllBtn.classList.remove('hidden');

        quizQuestions.forEach((q, index) => {
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

    /**
     * 🏆 Escucha los resultados de la colección 'rankings' y los ordena.
     */
    function listenForRankings() {
        onValue(rankingsRef, (snapshot) => {
            const data = snapshot.val();
            let rankingList = [];
            if (data) {
                Object.keys(data).forEach(key => {
                    rankingList.push(data[key]);
                });
            }
            renderRanking(rankingList);
        });
    }

    /**
     * 🏆 Calcula y renderiza el ranking en el DOM.
     * Criterio: Mayor Score, luego Menor Tiempo.
     */
    function renderRanking(results) {
        const rankingContainer = document.getElementById('ranking-list');
        if (!rankingContainer) return;
        
        // 1. FÓRMULA DE RANKING: Score - (Tiempo / factor de penalización)
        results.forEach(r => {
            // Utilizamos el tiempo efectivo (tiempo usado) para la fórmula
            r.rankingValue = r.score - (r.time / 10); 
        });
        
        // 2. ORDENAR: Por rankingValue (descendente), Score (descendente), Tiempo (ascendente)
        results.sort((a, b) => {
            if (b.rankingValue !== a.rankingValue) {
                return b.rankingValue - a.rankingValue;
            }
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.time - b.time; // Menor tiempo efectivo usado gana el desempate final
        });
        
        rankingContainer.innerHTML = '';
        
        if (results.length === 0) {
            rankingContainer.innerHTML = '<li class="p-2 text-gray-500 italic text-center">Aún no hay resultados para el ranking.</li>';
            return;
        }

        results.forEach((r, index) => {
            const li = document.createElement('li');
            
            // Aplicando estilos
            li.className = `question-item ${index === 0 ? 'top-winner' : ''}`;
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            li.innerHTML = `
                <div style="font-weight: bold; display: flex; align-items: center;">
                    <span style="font-size: 1.2em; width: 30px; display: inline-block; text-align: left;">${index + 1}.</span>
                    <span style="truncate">${r.name}</span>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: bold; color: #e69900;">${r.score} pts</span>
                    <span style="font-size: 0.9em; color: #666; margin-left: 5px;">(${r.time}s usados)</span>
                </div>
            `;
            rankingContainer.appendChild(li);
        });
    }
}


// =======================================================================
// MODO JUGADOR (player.html)
// =======================================================================

function initializePlayer() {
    // Referencias a elementos de la interfaz
    const startForm = document.getElementById('start-form');
    const nameInput = document.getElementById('player-name-input');
    const nameDisplay = document.getElementById('player-name-display'); 
    
    const startButton = document.getElementById('start-game-btn');
    const noQuestionsMsg = document.getElementById('player-no-questions-msg');
    
    // Elementos del juego 
    const scoreElement = document.getElementById('score'); 
    const scoreSpan = scoreElement ? scoreElement.querySelector('span') : null; 
    
    const timerElement = document.getElementById('timer'); 
    const timerSpan = timerElement ? timerElement.querySelector('span') : null; 

    const questionElement = document.getElementById('question');
    const optionsContainer = document.getElementById('options-container');
    
    // Referencias al botón fijo (CORREGIDO)
    const nextButtonContainer = document.getElementById('next-button-fixed-container'); 
    const nextButton = document.getElementById('next-btn'); 

    const gameModeContainer = document.getElementById('game-mode');
    const startScreenContainer = document.getElementById('start-screen');
    const resultsContainer = document.getElementById('results');
    const finalScoreElement = document.getElementById('final-score');
    
    listenForQuestions(initializePlayerScreen);

    // OCULTAR EL BOTÓN FIJO AL INICIO
    if (nextButtonContainer) nextButtonContainer.classList.add('hidden'); 

    // MANEJO DEL ENVÍO DEL FORMULARIO DE NOMBRE
    if (startForm) {
        startForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = nameInput.value.trim();
            if (name) {
                playerName = name.substring(0, 20);
                if (quizQuestions.length > 0) {
                    startGame();
                } else {
                    if (noQuestionsMsg) noQuestionsMsg.classList.remove('hidden');
                    alert('El anfitrión aún no ha cargado preguntas.');
                }
            }
        });
    }
    
    if (nextButton) nextButton.addEventListener('click', () => {
        currentQuestionIndex++;
        loadQuestion();
    });


    function initializePlayerScreen() {
        if (quizQuestions.length > 0) {
            if (noQuestionsMsg) noQuestionsMsg.classList.add('hidden');
            if (startButton) startButton.disabled = false;
        } else {
            if (noQuestionsMsg) noQuestionsMsg.classList.remove('hidden');
            if (startButton) startButton.disabled = true;
        }
    }

    function startGame() {
        if (nameDisplay) nameDisplay.textContent = `Jugador: ${playerName}`;
        
        if (startScreenContainer) startScreenContainer.classList.add('hidden');
        if (gameModeContainer) gameModeContainer.classList.remove('hidden');
        
        currentQuestionIndex = 0;
        score = 0;
        timeBonusTotal = 0; // ⏰ Resetear la bonificación de tiempo
        totalTime = 0; // 💡 Resetear el tiempo total usado
        
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
                handleAnswer(null); // Tiempo agotado
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
        if (nextButtonContainer) nextButtonContainer.classList.add('hidden'); // 💡 OCULTAR CONTENEDOR FIJO

        if (questionElement) questionElement.textContent = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
        
        const shuffledOptions = [...currentQuestion.options].sort(() => Math.random() - 0.5);

        shuffledOptions.forEach(option => {
            // 🚨 CORRECCIÓN FINAL: Crear elemento de tipo 'button'
            const button = document.createElement('button');
            button.textContent = option;
            
            // Asignamos la clase CSS para que se vea como botón
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
                // Usando las clases de style.css
                btn.classList.add('correct'); 
            } 
            
            else if (btn === button) { 
                // Usando las clases de style.css
                btn.classList.add('incorrect'); 
            }
        });

        if (isCorrect) {
            // 5 puntos base + tiempo restante (timeLeft es el tiempo que sobró)
            score += timeLeft + 5; 
            timeBonusTotal += timeLeft; // ⏰ SUMAMOS la bonificación de tiempo
            if (scoreSpan) scoreSpan.textContent = score; 
        }
        
        setTimeout(() => {
            if (nextButtonContainer) nextButtonContainer.classList.remove('hidden'); // 💡 MOSTRAR CONTENEDOR FIJO
        }, 1000); 
    }

    function showResults() {
        if (gameModeContainer) gameModeContainer.classList.add('hidden');
        if (nextButtonContainer) nextButtonContainer.classList.add('hidden');
        
        if (resultsContainer) resultsContainer.classList.remove('hidden');

        // ⏰ CÁLCULO DEL TIEMPO TOTAL EFECTIVO USADO
        const numQuestions = quizQuestions.length;
        const totalPossibleTime = numQuestions * 10;
        // Tiempo usado = Tiempo total posible - Tiempo de bonificación (lo que sobró)
        totalTime = totalPossibleTime - timeBonusTotal; 
        if (totalTime < 0) totalTime = 0; 
        
        if (finalScoreElement) finalScoreElement.textContent = `¡${playerName}, tu puntuación final es de: ${score} puntos! Tiempo total: ${totalTime}s. ¡Gracias por jugar!`;
        
        // 🏆 REGISTRO DEL RESULTADO PARA EL RANKING
        const finalData = {
            name: playerName,
            score: score,
            time: totalTime, // Guardamos el tiempo USADO (el valor bajo es mejor)
            timestamp: Date.now()
        };
        saveFinalResult(finalData);
    }
}