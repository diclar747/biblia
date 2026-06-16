// public/js/games.js

// --- SINTETIZADOR DE AUDIO DE JUEGOS (Web Audio API) ---
const GameAudio = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },
  playTone(freq, type, duration, delay = 0) {
    try {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + delay + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {
      console.error("Audio error:", e);
    }
  },
  playCorrect() {
    // Triada mayor alegre en arpegio rápido: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    this.playTone(523.25, 'triangle', 0.12, 0);
    this.playTone(659.25, 'triangle', 0.12, 0.08);
    this.playTone(784.00, 'triangle', 0.12, 0.16);
    this.playTone(1046.50, 'triangle', 0.35, 0.24);
  },
  playIncorrect() {
    // Zumbido grave descendente disonante (sawtooth)
    try {
      this.init();
      if (!this.ctx) return;
      
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.4);
    } catch (e) {
      console.error(e);
    }
  },
  playLevelUp() {
    // Escala rápida brillante hacia arriba: C4, D4, E4, F4, G4, A4, B4, C5
    const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
    scale.forEach((freq, idx) => {
      this.playTone(freq, 'sine', 0.12, idx * 0.05);
    });
    // Triunfo final acorde mayor
    setTimeout(() => {
      this.playTone(523.25, 'triangle', 0.5, 0);
      this.playTone(659.25, 'triangle', 0.5, 0);
      this.playTone(784.00, 'triangle', 0.5, 0);
    }, 400);
  },
  playWin() {
    // Fanfarria victoriosa
    this.playTone(392.00, 'triangle', 0.12, 0);
    this.playTone(523.25, 'triangle', 0.12, 0.08);
    this.playTone(659.25, 'triangle', 0.12, 0.16);
    this.playTone(784.00, 'triangle', 0.35, 0.24);
    
    setTimeout(() => {
      this.playTone(523.25, 'sine', 0.6, 0);
      this.playTone(659.25, 'sine', 0.6, 0);
      this.playTone(784.00, 'sine', 0.6, 0);
      this.playTone(1046.50, 'sine', 0.6, 0);
    }, 350);
  },
  playLoss() {
    // Secuencia melancólica menor descendente
    this.playTone(392.00, 'sine', 0.22, 0);
    this.playTone(349.23, 'sine', 0.22, 0.18);
    this.playTone(311.13, 'sine', 0.22, 0.36);
    this.playTone(261.63, 'sine', 0.45, 0.54);
  }
};

// --- GESTIÓN DE LA MASCOTA LEONEL 🦁 ---
function updateMascot(state, msg) {
  const mascotContainer = document.getElementById('game-mascot-container');
  if (!mascotContainer) return;

  let mascotEmoji = '🦁';
  let animationClass = 'bounce-slow';

  if (state === 'correct') {
    mascotEmoji = '🦁🎉';
    animationClass = 'mascot-correct';
  } else if (state === 'incorrect') {
    mascotEmoji = '🥺🦁';
    animationClass = 'mascot-incorrect';
  } else if (state === 'victory') {
    mascotEmoji = '🦁👑';
    animationClass = 'mascot-victory';
  } else if (state === 'loss') {
    mascotEmoji = '🥺🦁';
    animationClass = 'mascot-loss';
  }

  mascotContainer.className = `mascot-container ${animationClass}`;
  mascotContainer.innerHTML = `
    <div class="mascot-avatar">${mascotEmoji}</div>
    <div class="mascot-bubble">
      <p>${msg}</p>
    </div>
  `;
}

// Estado de juego activo
let currentGameMode = '';
let currentGameQuestions = [];
let currentQuestionIndex = 0;
let currentGameLives = 3;
let currentGameXpEarned = 0;
let currentGameCrownsEarned = 0;
let gameTimerInterval = null;
let gameSecondsLeft = 30;

// Respuestas del usuario en el juego actual
let selectedAnswerOption = null;
let currentCharacterCluesCount = 1;
let currentOrderedWords = [];

// Logros bíblicos configurados
const ALL_ACHIEVEMENTS = {
  first_game: { title: "Primera Piedra", desc: "Completaste tu primer juego bíblico.", icon: "🧱" },
  streak_3: { title: "Racha de Fe", desc: "Alcanzaste una racha de 3 días seguidos.", icon: "🔥" },
  level_10: { title: "Discípulo Maduro", desc: "Llegaste al Nivel 10 de sabiduría.", icon: "📜" },
  crown_15: { title: "Corona de Justicia", desc: "Acumulaste 15 coronas de oro.", icon: "👑" }
};

// Configurar eventos al cargar DOM
document.addEventListener('DOMContentLoaded', () => {
  const navGames = document.getElementById('nav-games');
  if (navGames) {
    navGames.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isLoggedIn()) {
        showToast('Inicia sesión para acceder a la Academia de Juegos.', 'warning');
        if (window.showSection) window.showSection('section-auth');
        return;
      }
      showGamesHub();
    });
  }

  // Hook del botón de la Arena
  const actionBtn = document.getElementById('game-action-btn');
  if (actionBtn) {
    actionBtn.addEventListener('click', handleGameAction);
  }

  // Ocultar bottom nav cuando un input del juego recibe foco (evita que suba con el teclado virtual)
  const answerZone = document.getElementById('game-answer-zone');
  const bottomNav = document.getElementById('bottom-nav');
  if (answerZone && bottomNav) {
    answerZone.addEventListener('focusin', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        bottomNav.classList.add('hidden');
      }
    });
    answerZone.addEventListener('focusout', () => {
      bottomNav.classList.remove('hidden');
    });
  }
});

// Mostrar panel de juegos y cargar datos
function showGamesHub() {
  // Ocultar otras secciones
  document.getElementById('section-search-home').classList.add('hidden');
  document.getElementById('section-search-results').classList.add('hidden');
  document.getElementById('section-user-dashboard').classList.add('hidden');
  document.getElementById('section-games-hub').classList.remove('hidden');

  // Ajustar navegación activa
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-games').classList.add('active');

  // Cargar estadísticas, logros y ranking
  loadGameStats();
  loadLeaderboard();
  backToGameSelection();
}

// Cargar estadísticas y logros del servidor
async function loadGameStats() {
  try {
    const res = await fetch('/api/games/stats', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Error al obtener estadísticas.');
    const stats = await res.json();

    // Actualizar UI
    document.getElementById('game-user-range').textContent = stats.range;
    document.getElementById('game-user-level').textContent = stats.level;
    document.getElementById('game-user-xp').textContent = `${stats.xp} XP`;
    document.getElementById('game-user-streak').textContent = stats.streak;
    document.getElementById('game-user-crowns').textContent = stats.crowns;
    document.getElementById('game-user-rank').textContent = stats.ranking;

    // Barra de progreso (50 XP por nivel como escala base para animación sencilla)
    const xpInCurrentLevel = stats.xp % 50;
    const progressPercent = (xpInCurrentLevel / 50) * 100;
    document.getElementById('game-user-xp-bar').style.width = `${progressPercent}%`;
    document.getElementById('game-next-level-xp').textContent = `Siguiente nivel en ${50 - xpInCurrentLevel} XP`;

    // Cargar logros
    renderAchievements(stats.achievements);
  } catch (error) {
    console.error(error);
  }
}

// Renderizar logros/medallas
function renderAchievements(unlockedKeys) {
  const container = document.getElementById('game-achievements-list');
  if (!container) return;

  container.innerHTML = '';
  Object.keys(ALL_ACHIEVEMENTS).forEach(key => {
    const ach = ALL_ACHIEVEMENTS[key];
    const isUnlocked = unlockedKeys.includes(key);

    const div = document.createElement('div');
    div.className = 'glass-panel flex-center';
    div.style.padding = '10px 14px';
    div.style.opacity = isUnlocked ? '1' : '0.4';
    div.style.borderLeft = isUnlocked ? '4px solid var(--success)' : '4px solid var(--border-color)';
    
    div.innerHTML = `
      <div style="font-size: 1.8rem; margin-right: 10px;">${ach.icon}</div>
      <div style="flex:1;">
        <h5 style="font-weight:700; margin:0; font-size:0.9rem; color: var(--text-primary);">${ach.title}</h5>
        <p style="margin:0; font-size:0.75rem; color: var(--text-secondary);">${ach.desc}</p>
      </div>
      ${isUnlocked ? '<span style="color:var(--success); font-weight:bold; font-size:0.8rem;">Desbloqueado</span>' : '<span style="color:var(--text-muted); font-size:0.75rem;">Bloqueado</span>'}
    `;
    container.appendChild(div);
  });
}

// Cargar Leaderboard (posiciones globales)
async function loadLeaderboard() {
  const container = document.getElementById('game-leaderboard-list');
  if (!container) return;

  try {
    const res = await fetch('/api/games/leaderboard');
    const ranking = await res.json();

    container.innerHTML = '';
    ranking.forEach((user, idx) => {
      const div = document.createElement('div');
      div.className = 'flex-between';
      div.style.padding = '8px 10px';
      div.style.borderBottom = '1px solid var(--border-color)';

      // Puesto con colores distintivos
      let medal = `${idx + 1}.`;
      if (idx === 0) medal = '🥇';
      else if (idx === 1) medal = '🥈';
      else if (idx === 2) medal = '🥉';

      // Avatar
      const avatarHTML = user.profile_image ? 
        `<img src="${user.profile_image}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; margin-right:8px;">` :
        `<div class="user-avatar" style="width:26px; height:26px; font-size:0.8rem; margin-right:8px; display:inline-flex;">${user.name.charAt(0).toUpperCase()}</div>`;

      div.innerHTML = `
        <div style="display:flex; align-items:center;">
          <span style="font-weight:bold; margin-right:10px; width:20px; text-align:center;">${medal}</span>
          ${avatarHTML}
          <span style="font-weight:600; font-size:0.85rem; color: var(--text-primary);">${escapeHTML(user.name)}</span>
        </div>
        <div style="text-align:right;">
          <span style="font-weight:bold; color:var(--accent); font-size:0.85rem;">${user.xp} XP</span>
          <span style="display:block; font-size:0.7rem; color:var(--text-secondary);">Nivel ${user.level}</span>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    console.error(error);
  }
}

// Iniciar un nuevo juego
async function startNewGame(mode) {
  currentGameMode = mode;
  currentQuestionIndex = 0;
  currentGameLives = 3;
  currentGameXpEarned = 0;
  currentGameCrownsEarned = 0;
  selectedAnswerOption = null;

  // Ajustar vidas en la interfaz
  updateLivesUI();

  // Resetear timer
  clearInterval(gameTimerInterval);
  document.getElementById('game-timer-container').classList.add('hidden');

  // Mostrar play panel
  document.getElementById('game-selection-panel').classList.add('hidden');
  document.getElementById('game-results-panel').classList.add('hidden');
  document.getElementById('game-play-panel').classList.remove('hidden');
  adjustGameArenaHeight();

  // Mensaje cargando
  document.getElementById('game-question-zone').innerHTML = '<p>Cargando preguntas de la Academia...</p>';
  document.getElementById('game-answer-zone').innerHTML = '';
  document.getElementById('game-feedback-msg').textContent = '';
  
  const actionBtn = document.getElementById('game-action-btn');
  actionBtn.textContent = 'Comprobar';
  actionBtn.disabled = true;

  try {
    const res = await fetch(`/api/games/questions?mode=${mode}`);
    currentGameQuestions = await res.json();

    if (currentGameQuestions.length === 0) {
      showToast('No hay suficientes preguntas de este modo actualmente.', 'warning');
      backToGameSelection();
      return;
    }

    renderCurrentQuestion();

    // Activar temporizador si es Modo Cronómetro
    if (mode === 'timer') {
      startCountdownTimer();
    }
  } catch (error) {
    showToast('Error al iniciar el juego.', 'error');
    backToGameSelection();
  }
}

// Renderizar pregunta actual
function renderCurrentQuestion() {
  if (currentQuestionIndex >= currentGameQuestions.length) {
    endGame(true);
    return;
  }

  const q = currentGameQuestions[currentQuestionIndex];
  const qZone = document.getElementById('game-question-zone');
  const aZone = document.getElementById('game-answer-zone');
  const actionBtn = document.getElementById('game-action-btn');
  const feedbackMsg = document.getElementById('game-feedback-msg');

  // Limpiar campos
  feedbackMsg.textContent = '';
  feedbackMsg.className = '';
  actionBtn.textContent = 'Comprobar';
  actionBtn.disabled = true;
  selectedAnswerOption = null;

  // Actualizar barra de progreso del juego
  const progressPercent = (currentQuestionIndex / currentGameQuestions.length) * 100;
  document.getElementById('game-quiz-progress-bar').style.width = `${progressPercent}%`;

  qZone.innerHTML = '';
  aZone.innerHTML = '';

  // Renderizar según Modo de Juego
  const mode = q.type || currentGameMode;

  if (mode === 'riddles' || currentGameMode === 'riddles') {
    // 1. ACERTIJOS BÍBLICOS
    qZone.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: 700; text-align: center; max-width: 500px; line-height: 1.5;">
        "${escapeHTML(q.riddle)}"
      </div>
      <p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px;">Categoría: ${q.category || 'General'}</p>
    `;
    aZone.innerHTML = `
      <div class="form-group" style="max-width: 100%; margin: 0 auto;">
        <input type="text" id="game-text-answer" class="form-control game-text-input" placeholder="Escribe tu respuesta aquí..." autocomplete="off" style="text-align: center; font-weight:600;">
      </div>
    `;
    const input = document.getElementById('game-text-answer');
    safeFocus(input);
    input.addEventListener('input', () => {
      actionBtn.disabled = input.value.trim() === '';
    });
  } 
  else if (mode === 'characters' || currentGameMode === 'characters') {
    // 2. ADIVINAR EL PERSONAJE
    currentCharacterCluesCount = 1;
    renderCharacterClues(q);
  }
  else if (mode === 'verses' || q.type === 'verses') {
    // 3. COMPLETAR VERSÍCULO
    qZone.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: 600; text-align: center; max-width: 500px; line-height: 1.5; font-style: italic;">
        "${escapeHTML(q.incomplete)}"
      </div>
      <p style="font-size:0.82rem; font-weight:bold; color:var(--accent); margin-top:10px;">${escapeHTML(q.citation)}</p>
    `;
    renderMultipleChoiceOptions(q.options);
  }
  else if (mode === 'order_verses' || currentGameMode === 'order_verses') {
    // 4. ORDENAR VERSÍCULOS
    currentOrderedWords = [];
    qZone.innerHTML = `
      <div style="font-size: 1.1rem; font-weight: 700; color:var(--text-secondary); margin-bottom:15px; text-align:center;">Reordena las palabras:</div>
      <div id="order-box-answer" class="glass-panel" style="min-height:55px; width: 100%; max-width:550px; padding: 10px; display:flex; flex-wrap:wrap; gap:8px; justify-content:center; align-items:center; border: 2px dashed var(--border-color); border-radius: var(--radius-sm);">
        <p style="color:var(--text-muted); font-size:0.9rem;">Haz clic abajo para ordenar</p>
      </div>
      <p style="font-size:0.82rem; font-weight:bold; color:var(--accent); margin-top:10px;">Cita: ${escapeHTML(q.citation)}</p>
    `;

    // Desordenar palabras
    const wordsShuffled = [...q.words].sort(() => 0.5 - Math.random());
    const wordPool = document.createElement('div');
    wordPool.className = 'order-word-pool';
    wordPool.style.display = 'flex';
    wordPool.style.flexWrap = 'wrap';
    wordPool.style.gap = '8px';
    wordPool.style.justifyContent = 'center';
    wordPool.style.marginTop = '15px';

    wordsShuffled.forEach((w, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.style.borderRadius = '20px';
      btn.style.padding = '6px 14px';
      btn.textContent = w;
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true;
        btn.style.opacity = '0.3';
        
        // Agregar a la respuesta
        currentOrderedWords.push({ text: w, buttonEl: btn });
        renderOrderedAnswer();
        actionBtn.disabled = currentOrderedWords.length !== q.words.length;
      });
      wordPool.appendChild(btn);
    });
    aZone.appendChild(wordPool);
  }
  else if (mode === 'stories' || currentGameMode === 'stories') {
    // 5. HISTORIAS INTERACTIVAS (Primero leemos, luego preguntamos)
    // Para simplificar, guardamos la pregunta del subcuestionario actual en un estado
    qZone.innerHTML = `
      <div class="game-story-box" style="max-height: min(220px, 35vh); overflow-y:auto; padding:15px; border-radius:var(--radius-sm); border:1px solid var(--border-color); background-color:var(--bg-tertiary); margin-bottom:15px; text-align:left; font-size:0.92rem; line-height:1.5;">
        <strong>Historia: ${escapeHTML(q.title)}</strong><br><br>
        ${escapeHTML(q.story)}
      </div>
      <div style="font-weight:700; text-align:center; font-size:1.05rem;">
        Pregunta: ${escapeHTML(q.questions[0].question)}
      </div>
    `;
    renderMultipleChoiceOptions(q.questions[0].options);
  }
  else if (mode === 'true_false' || q.type === 'true_false') {
    // 6. VERDADERO O FALSO BÍBLICO
    qZone.innerHTML = `
      <div style="font-size: 1.2rem; font-weight: 700; text-align: center; max-width: 500px; line-height: 1.5; margin-bottom:10px;">
        "${escapeHTML(q.statement)}"
      </div>
      <p style="font-size:0.85rem; color:var(--text-secondary);">¿La frase anterior es verdadera o falsa?</p>
    `;
    aZone.innerHTML = `
      <div class="tf-wrap" style="display:flex; justify-content:center; gap:20px; max-width:300px; margin:0 auto; width:100%;">
        <button class="btn btn-secondary tf-btn" onclick="selectTrueFalse(true)" style="border: 2px solid var(--success); flex:1; color:var(--success);">VERDADERO</button>
        <button class="btn btn-secondary tf-btn" onclick="selectTrueFalse(false)" style="border: 2px solid var(--danger); flex:1; color:var(--danger);">FALSO</button>
      </div>
    `;
  }
  else if (mode === 'books' || q.type === 'books') {
    // 7. ENCUENTRA EL LIBRO BÍBLICO
    qZone.innerHTML = `
      <div style="font-size: 1.15rem; font-weight: 700; text-align: center; max-width: 500px; line-height: 1.5;">
        ${escapeHTML(q.question)}
      </div>
    `;
    renderMultipleChoiceOptions(q.options);
  }
  else if (mode === 'memory' || currentGameMode === 'memory') {
    // 8. JUEGO DE MEMORIA BÍBLICA
    // Se muestra una cuadrícula de cartas para combinar
    renderMemoryGameGrid(q);
  }

  // Cargar burbuja de la mascota Leonel en cada nueva pregunta
  let mascotMsg = '¡Tú puedes hacerlo! Concéntrate.';
  if (currentGameMode === 'riddles') mascotMsg = '¿Podrás adivinar este acertijo de la Biblia? ¡Lee con atención!';
  else if (currentGameMode === 'characters') mascotMsg = '¡Este personaje bíblico es muy famoso! ¿Sabes quién es?';
  else if (currentGameMode === 'verses') mascotMsg = '¡Completa la palabra que falta en este hermoso versículo!';
  else if (currentGameMode === 'order_verses') mascotMsg = '¡Reordena las palabras para reconstruir el pasaje sagrado!';
  else if (currentGameMode === 'stories') mascotMsg = 'Lee esta fascinante historia de fe y responde la pregunta.';
  else if (currentGameMode === 'true_false') mascotMsg = '¿Esta afirmación es verdadera o falsa? ¡Decide rápido!';
  else if (currentGameMode === 'books') mascotMsg = '¿En qué libro de la Biblia sucedió esto? ¡Piénsalo bien!';
  else if (currentGameMode === 'memory') mascotMsg = 'Empareja cada personaje con su respectiva hazaña bíblica.';
  
  updateMascot('idle', mascotMsg);
}

// Renderizar pistas progresivas para adivinar el personaje
function renderCharacterClues(q) {
  const qZone = document.getElementById('game-question-zone');
  const aZone = document.getElementById('game-answer-zone');
  const actionBtn = document.getElementById('game-action-btn');

  qZone.innerHTML = `
    <h4 style="font-family:var(--font-title); font-weight:700; color:var(--accent); margin-bottom:12px;">Pistas Desbloqueadas (${currentCharacterCluesCount}/3)</h4>
    <div id="clues-list" style="display:flex; flex-direction:column; gap:8px; max-width:480px; width:100%; text-align:left;">
      <!-- Pistas dinámicas -->
    </div>
  `;

  const cluesList = document.getElementById('clues-list');
  for (let i = 0; i < currentCharacterCluesCount; i++) {
    const clueDiv = document.createElement('div');
    clueDiv.className = 'glass-panel';
    clueDiv.style.padding = '10px 14px';
    clueDiv.style.borderLeft = '4px solid var(--accent)';
    clueDiv.style.fontSize = '0.92rem';
    clueDiv.innerHTML = `<strong>Pista ${i + 1}:</strong> ${escapeHTML(q.clues[i])}`;
    cluesList.appendChild(clueDiv);
  }

  // Si hay más pistas, ofrecer un botón para pedir pista
  if (currentCharacterCluesCount < 3) {
    const getClueBtn = document.createElement('button');
    getClueBtn.className = 'btn btn-secondary';
    getClueBtn.style.marginTop = '10px';
    getClueBtn.textContent = '🔓 Pedir otra pista (Reduce XP del juego)';
    getClueBtn.addEventListener('click', () => {
      currentCharacterCluesCount++;
      renderCharacterClues(q);
    });
    cluesList.appendChild(getClueBtn);
  }

  aZone.innerHTML = `
    <div class="form-group" style="max-width: 100%; margin: 15px auto 0 auto;">
      <label style="font-weight:600; font-size:0.8rem;">¿Quién es el personaje?</label>
      <input type="text" id="game-character-answer" class="form-control game-text-input" placeholder="Escribe el nombre aquí..." autocomplete="off" style="text-align: center; font-weight:600;">
    </div>
  `;

  const charInput = document.getElementById('game-character-answer');
  safeFocus(charInput);
  charInput.addEventListener('input', () => {
    actionBtn.disabled = charInput.value.trim() === '';
  });
}

// Renderizar opciones de opción múltiple
function renderMultipleChoiceOptions(options) {
  const aZone = document.getElementById('game-answer-zone');
  const actionBtn = document.getElementById('game-action-btn');

  const grid = document.createElement('div');
  grid.className = 'opt-btn-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
  grid.style.gap = '12px';
  grid.style.maxWidth = '550px';
  grid.style.width = '100%';
  grid.style.margin = '0 auto';

  options.forEach((opt) => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary opt-btn';
    btn.textContent = opt;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('btn-primary'));
      btn.classList.add('btn-primary');
      selectedAnswerOption = opt;
      actionBtn.disabled = false;
    });

    grid.appendChild(btn);
  });

  aZone.appendChild(grid);
}

// Dibujar palabras ordenadas
function renderOrderedAnswer() {
  const box = document.getElementById('order-box-answer');
  if (!box) return;

  box.innerHTML = '';
  if (currentOrderedWords.length === 0) {
    box.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Haz clic abajo para ordenar</p>';
    return;
  }

  currentOrderedWords.forEach((wordObj, idx) => {
    const span = document.createElement('span');
    span.className = 'verse-tag-item';
    span.style.padding = '6px 12px';
    span.style.fontSize = '0.92rem';
    span.style.cursor = 'pointer';
    span.innerHTML = `${escapeHTML(wordObj.text)} <span style="font-weight:bold; margin-left:4px;">&times;</span>`;
    span.addEventListener('click', () => {
      // Devolver palabra
      wordObj.buttonEl.disabled = false;
      wordObj.buttonEl.style.opacity = '1';
      currentOrderedWords.splice(idx, 1);
      renderOrderedAnswer();
      document.getElementById('game-action-btn').disabled = true;
    });
    box.appendChild(span);
  });
}

// Seleccionar opción de Verdadero/Falso
function selectTrueFalse(val) {
  selectedAnswerOption = val;
  const actionBtn = document.getElementById('game-action-btn');
  actionBtn.disabled = false;

  document.querySelectorAll('.tf-btn').forEach((b, idx) => {
    b.style.backgroundColor = '';
    b.style.color = idx === 0 ? 'var(--success)' : 'var(--danger)';
    if ((idx === 0 && val === true) || (idx === 1 && val === false)) {
      b.style.backgroundColor = val === true ? 'var(--success-light)' : 'rgba(239, 68, 68, 0.1)';
    }
  });
}

// MEMORY GAME GRID (Mini-tablero de emparejar)
let memorySelectedCard = null;
let memoryMatchesFound = 0;
function renderMemoryGameGrid(q) {
  const qZone = document.getElementById('game-question-zone');
  const aZone = document.getElementById('game-answer-zone');
  const actionBtn = document.getElementById('game-action-btn');
  
  qZone.innerHTML = `
    <div style="font-size: 1.15rem; font-weight: 700; text-align: center; margin-bottom:6px;">Juego de Memoria</div>
    <p style="color:var(--text-secondary); font-size:0.82rem;">Empareja cada personaje con su respectiva hazaña bíblica.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'memory-grid';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '10px';
  grid.style.maxWidth = '550px';
  grid.style.width = '100%';
  grid.style.margin = '10px auto';

  memoryMatchesFound = 0;
  memorySelectedCard = null;

  // En el modo memoria, el backend nos da un array con 8 elementos o 4 parejas (8 tarjetas totales)
  // Re-barajar tarjetas para mostrarlas en la rejilla
  const cards = [...q].sort(() => 0.5 - Math.random());

  cards.forEach((cardData, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-panel memory-card';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'center';
    card.style.padding = '8px';
    card.style.fontWeight = 'bold';
    card.style.cursor = 'pointer';
    card.style.textAlign = 'center';
    card.style.border = '2px solid var(--border-color)';
    card.textContent = '❓'; // Mostrar cubierta inicialmente

    card.addEventListener('click', () => {
      if (card.classList.contains('matched') || card === memorySelectedCard) return;

      // Voltear tarjeta (revelar texto)
      card.textContent = cardData.text;
      card.style.borderColor = 'var(--accent)';
      card.style.backgroundColor = 'var(--accent-light)';

      if (!memorySelectedCard) {
        memorySelectedCard = { el: card, data: cardData };
      } else {
        // Segunda tarjeta volteada. Comprobar pareja
        const first = memorySelectedCard;
        const second = { el: card, data: cardData };
        
        if (first.data.match === second.data.text) {
          // Acierto
          first.el.classList.add('matched');
          second.el.classList.add('matched');
          first.el.style.borderColor = 'var(--success)';
          first.el.style.backgroundColor = 'var(--success-light)';
          second.el.style.borderColor = 'var(--success)';
          second.el.style.backgroundColor = 'var(--success-light)';
          memoryMatchesFound += 2;
          memorySelectedCard = null;

          // Si se emparejaron todas
          if (memoryMatchesFound === cards.length) {
            actionBtn.disabled = false;
            actionBtn.textContent = 'Continuar';
            // Simular check exitoso
            document.getElementById('game-feedback-msg').textContent = '¡Excelente memoria! Has emparejado todo.';
            document.getElementById('game-feedback-msg').style.color = 'var(--success)';
          }
        } else {
          // Fallo
          setTimeout(() => {
            first.el.textContent = '❓';
            first.el.style.borderColor = 'var(--border-color)';
            first.el.style.backgroundColor = '';
            second.el.textContent = '❓';
            second.el.style.borderColor = 'var(--border-color)';
            second.el.style.backgroundColor = '';
          }, 900);
          memorySelectedCard = null;
        }
      }
    });

    grid.appendChild(card);
  });

  aZone.appendChild(grid);
}

// Actualizar corazones de vida en pantalla
function updateLivesUI() {
  const container = document.getElementById('game-lives-container');
  if (!container) return;

  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    if (i < currentGameLives) {
      container.innerHTML += '❤️ ';
    } else {
      container.innerHTML += '🖤 ';
    }
  }
}

// Temporizador Modo Cronómetro
function startCountdownTimer() {
  const timerContainer = document.getElementById('game-timer-container');
  const timerVal = document.getElementById('game-timer-value');
  const actionBtn = document.getElementById('game-action-btn');

  timerContainer.classList.remove('hidden');
  gameSecondsLeft = 30;
  timerVal.textContent = gameSecondsLeft;

  gameTimerInterval = setInterval(() => {
    gameSecondsLeft--;
    timerVal.textContent = gameSecondsLeft;

    if (gameSecondsLeft <= 0) {
      clearInterval(gameTimerInterval);
      showToast('¡Se agotó el tiempo!', 'warning');
      endGame(true); // Terminar y sumar lo ganado
    }
  }, 1000);
}

// Acción del Botón Principal (Comprobar respuesta o Continuar)
function handleGameAction() {
  const actionBtn = document.getElementById('game-action-btn');
  
  if (actionBtn.textContent === 'Continuar') {
    currentQuestionIndex++;
    renderCurrentQuestion();
    return;
  }

  // Comprobar la respuesta según tipo de juego
  const q = currentGameQuestions[currentQuestionIndex];
  const mode = q.type || currentGameMode;
  let isCorrect = false;
  let correctAnswerText = '';

  if (mode === 'riddles' || currentGameMode === 'riddles') {
    const userVal = document.getElementById('game-text-answer').value.trim();
    correctAnswerText = q.answer;
    isCorrect = normalizeText(userVal) === normalizeText(q.answer);
  }
  else if (mode === 'characters' || currentGameMode === 'characters') {
    const userVal = document.getElementById('game-character-answer').value.trim();
    correctAnswerText = q.name;
    isCorrect = normalizeText(userVal) === normalizeText(q.name);
  }
  else if (mode === 'verses' || q.type === 'verses') {
    correctAnswerText = q.correct;
    isCorrect = selectedAnswerOption === q.correct;
  }
  else if (mode === 'order_verses' || currentGameMode === 'order_verses') {
    const constructed = currentOrderedWords.map(w => w.text).join(' ');
    correctAnswerText = q.correct;
    isCorrect = normalizeText(constructed) === normalizeText(q.correct);
  }
  else if (mode === 'stories' || currentGameMode === 'stories') {
    const currentQ = q.questions[0]; // Simplificado al primer elemento
    correctAnswerText = currentQ.correct;
    isCorrect = selectedAnswerOption === currentQ.correct;
  }
  else if (mode === 'true_false' || q.type === 'true_false') {
    correctAnswerText = q.correct ? 'Verdadero' : 'Falso';
    isCorrect = selectedAnswerOption === q.correct;
  }
  else if (mode === 'books' || q.type === 'books') {
    correctAnswerText = q.correct;
    isCorrect = selectedAnswerOption === q.correct;
  }
  else if (mode === 'memory' || currentGameMode === 'memory') {
    // La memoria se auto-valida al completar. El botón actúa sólo como continuar
    isCorrect = true;
  }

  // Evaluar respuesta
  const feedbackMsg = document.getElementById('game-feedback-msg');
  if (isCorrect) {
    feedbackMsg.textContent = '¡Respuesta Correcta!';
    feedbackMsg.style.color = 'var(--success)';
    
    // Sumar XP acumulativo según modo de juego
    let pts = 5;
    if (currentGameMode === 'characters') {
      // Menos pistas = más XP (Pistas 1=15xp, 2=10xp, 3=5xp)
      pts = Math.max(5, 15 - (currentCharacterCluesCount - 1) * 5);
    } else if (currentGameMode === 'stories') {
      pts = 10;
    } else if (currentGameMode === 'riddles' || currentGameMode === 'order_verses') {
      pts = 8;
    }
    
    currentGameXpEarned += pts;
    showToast(`+${pts} XP`, 'success');

    // Reacción mascota Leonel y Audio
    const correctMsgs = [
      '¡Impresionante! ¡Respuesta correcta!',
      '¡Excelente! Tu sabiduría crece.',
      '¡Gloria a Dios! ¡Sigue así!',
      '¡Brillante! Has acertado.',
      '¡Eso es! La palabra es correcta.'
    ];
    const rMsg = correctMsgs[Math.floor(Math.random() * correctMsgs.length)];
    updateMascot('correct', rMsg);
    GameAudio.playCorrect();
  } else {
    feedbackMsg.textContent = `Incorrecto. Respuesta: ${correctAnswerText}`;
    feedbackMsg.style.color = 'var(--danger)';
    
    // Vibrar pantalla (micro-animación)
    const playPanel = document.getElementById('game-play-panel');
    playPanel.style.animation = 'shake 0.4s';
    setTimeout(() => { playPanel.style.animation = ''; }, 400);

    // Restar vida
    currentGameLives--;
    updateLivesUI();

    // Reacción mascota Leonel y Audio
    const incorrectMsgs = [
      '¡Oh, no! Pero de los errores se aprende.',
      '¡Casi! Sigue leyendo las escrituras.',
      'No te desanimes, ¡la próxima acertarás!',
      '¡Oh! Esa no era la respuesta, ¡sigue adelante!',
      '¡Ánimo! El estudio de la Palabra toma tiempo.'
    ];
    const wMsg = incorrectMsgs[Math.floor(Math.random() * incorrectMsgs.length)];
    updateMascot('incorrect', `${wMsg}<br>Respuesta: <strong>${correctAnswerText}</strong>`);
    GameAudio.playIncorrect();

    if (currentGameLives <= 0) {
      clearInterval(gameTimerInterval);
      setTimeout(() => endGame(false), 1200);
      return;
    }
  }

  actionBtn.textContent = 'Continuar';
}

// Enfocar input sin romper el layout en móvil (evita scroll brusco con teclado virtual)
function safeFocus(input) {
  if (!input) return;
  requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    // Asegurar que el input sea visible sin desplazar toda la pantalla
    setTimeout(() => {
      if (input.getBoundingClientRect().bottom > window.innerHeight - 120) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  });
}

// Ajustar altura del arena de juego al viewport disponible (útil al mostrar/ocultar teclado)
function adjustGameArenaHeight() {
  const arena = document.querySelector('.game-arena');
  if (!arena) return;
  const header = document.querySelector('header');
  const bottomNav = document.querySelector('.bottom-nav');
  const headerH = header ? header.offsetHeight : 0;
  const bottomH = (bottomNav && window.getComputedStyle(bottomNav).display !== 'none') ? bottomNav.offsetHeight : 0;
  const available = window.innerHeight - headerH - bottomH - 40;
  arena.style.minHeight = `${Math.max(360, available)}px`;
}

window.addEventListener('resize', adjustGameArenaHeight);
window.addEventListener('orientationchange', () => {
  setTimeout(adjustGameArenaHeight, 200);
});

// Normalizar texto para tolerar tildes, mayúsculas y espacios extra
function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-z0-9]/g, "");     // Solo letras y números
}

// Terminar el juego (Completado o Sin vidas)
async function endGame(isSuccess) {
  clearInterval(gameTimerInterval);
  
  document.getElementById('game-play-panel').classList.add('hidden');
  document.getElementById('game-results-panel').classList.remove('hidden');

  const summary = document.getElementById('game-results-summary');
  const resultsXp = document.getElementById('game-results-xp');
  const resultsCrowns = document.getElementById('game-results-crowns');

  if (isSuccess) {
    summary.textContent = '¡Felicitaciones! Has completado el desafío con éxito.';
    // Si completó todo el juego sin perder, regalar corona
    if (currentGameLives === 3) {
      currentGameCrownsEarned = 1;
    }
    triggerConfetti();
    updateMascot('victory', '¡Maravilloso! Has completado el desafío. ¡Tu corona de oro te espera!');
    GameAudio.playWin();
  } else {
    summary.textContent = 'Te has quedado sin vidas. ¡Sigue leyendo y vuelve a intentarlo!';
    currentGameXpEarned = Math.floor(currentGameXpEarned / 2); // Consuelo: mitad de XP
    updateMascot('loss', 'Te has quedado sin vidas. ¡No te rindas! Lee las escrituras y vuelve a la arena.');
    GameAudio.playLoss();
  }

  // Multiplicador del desafío diario
  if (currentGameMode === 'daily' && isSuccess) {
    currentGameXpEarned *= 2;
    currentGameCrownsEarned += 1;
  }

  resultsXp.textContent = `+${currentGameXpEarned} XP`;
  resultsCrowns.textContent = `+${currentGameCrownsEarned}`;

  // Consultar explicación teológica de la IA
  const lastQ = currentGameQuestions[currentQuestionIndex - 1] || currentGameQuestions[0];
  let questionText = lastQ.riddle || lastQ.incomplete || lastQ.statement || lastQ.question || 'Pasaje general';
  let answerText = lastQ.answer || lastQ.correct || lastQ.name || 'Respuesta';
  
  if (typeof answerText === 'boolean') answerText = answerText ? 'Verdadero' : 'Falso';

  // Mostrar carga de la IA
  document.getElementById('game-results-ai-explanation').textContent = 'Consultando a la IA Bíblica...';

  try {
    const aiRes = await fetch('/api/games/ai-explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: questionText, answer: answerText, isCorrect: isSuccess })
    });
    const aiData = await aiRes.json();

    document.getElementById('game-results-ai-name').textContent = aiData.aiName;
    document.getElementById('game-results-ai-explanation').textContent = aiData.aiExplanation;
    document.getElementById('game-results-ai-motivation').textContent = aiData.motivationMsg;
  } catch (error) {
    document.getElementById('game-results-ai-explanation').textContent = 'La IA Bíblica no pudo conectarse. Sigue aprendiendo con Biblia Online.';
  }

  // Guardar estadísticas ganadas en el servidor
  try {
    const resSave = await fetch('/api/games/add-xp', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        xpToAdd: currentGameXpEarned,
        crownsToAdd: currentGameCrownsEarned,
        completeGame: isSuccess
      })
    });
    const dataSave = await resSave.json();

    if (dataSave.isLevelUp) {
      showToast(`¡Subiste de Nivel! Ahora eres Nivel ${dataSave.level} (${dataSave.range})`, 'success');
      GameAudio.playLevelUp();
    }

    if (dataSave.unlockedAchievements && dataSave.unlockedAchievements.length > 0) {
      dataSave.unlockedAchievements.forEach(achKey => {
        const ach = ALL_ACHIEVEMENTS[achKey];
        if (ach) showToast(`🏆 Medalla Desbloqueada: ${ach.title}`, 'success');
      });
    }

    // Refrescar cabecera de estadísticas y ranking
    loadGameStats();
    loadLeaderboard();
  } catch (error) {
    console.error('Error al guardar progreso:', error);
  }
}

// Salir del juego activo
function exitActiveGame() {
  if (confirm('¿Estás seguro de que deseas salir? Perderás el progreso de esta partida.')) {
    clearInterval(gameTimerInterval);
    backToGameSelection();
  }
}

// Volver al selector de juegos
function backToGameSelection() {
  document.getElementById('game-play-panel').classList.add('hidden');
  document.getElementById('game-results-panel').classList.add('hidden');
  document.getElementById('game-selection-panel').classList.remove('hidden');
}

// Animación de confeti usando HTML5 Canvas
let confettiAnimationId = null;
function triggerConfetti() {
  const canvas = document.getElementById('game-confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;
  
  let particles = [];
  const colors = ['#4A3F8C', '#6B5FB5', '#C9A96E', '#10B981', '#EF4444'];
  
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 5 + 3,
      d: Math.random() * canvas.height,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 8 - 4,
      tiltAngleIncremental: Math.random() * 0.05 + 0.02,
      tiltAngle: 0
    });
  }

  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach(p => {
      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 2.5 + p.r / 2) / 2;
      p.x += Math.sin(p.tiltAngle);
      p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 12;

      if (p.y < canvas.height) {
        active = true;
      }

      ctx.beginPath();
      ctx.lineWidth = p.r;
      ctx.strokeStyle = p.color;
      ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
      ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx.stroke();
    });

    if (active) {
      confettiAnimationId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  draw();
}
