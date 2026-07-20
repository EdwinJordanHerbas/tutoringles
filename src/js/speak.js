// TutorIngles — speak.js
// Módulo de práctica de Speaking
// TODO: Implementar grabación de audio, análisis de pronunciación, puntuación

// ── FRASES DE PRÁCTICA ──────────────────────────────────
// Banco local de frases (se puede ampliar conectando a la API)
const SPEAKING_PHRASES = [
  { phrase: "Could you elaborate on that point?", level: "B2", topic: "Discussion" },
  { phrase: "I'd like to draw your attention to the fact that...", level: "C1", topic: "Formal" },
  { phrase: "In my opinion, this raises a number of concerns.", level: "B2", topic: "Opinion" },
  { phrase: "It's worth bearing in mind that...", level: "B2", topic: "Discussion" },
  { phrase: "I strongly believe that the benefits outweigh the drawbacks.", level: "C1", topic: "Argument" },
  { phrase: "What are your thoughts on this matter?", level: "B1", topic: "Question" },
  { phrase: "To put it another way, we need to reconsider our approach.", level: "C1", topic: "Reformulation" },
  { phrase: "The evidence suggests that there has been a substantial change.", level: "B2", topic: "Academic" },
  { phrase: "I'm inclined to agree with the first option, largely because...", level: "C1", topic: "Debate" },
  { phrase: "On reflection, I think the situation is more nuanced than it appears.", level: "C1", topic: "Critical thinking" },
];

// ── STATE ───────────────────────────────────────────────
let _currentPhrase = null;
let _isRecording   = false;
let _speakInited   = false;

// ── INIT ─────────────────────────────────────────────────
function initSpeak() {
  const container = document.getElementById('speak-content');
  if (!container || _speakInited) return;
  _speakInited = true;
  renderSpeakSection();
}

function renderSpeakSection() {
  const container = document.getElementById('speak-content');
  _currentPhrase  = SPEAKING_PHRASES[Math.floor(Math.random() * SPEAKING_PHRASES.length)];

  container.innerHTML = `
    <div class="glass-card-accent anim-slide-up">
      <div class="card-title" style="display:flex;justify-content:space-between">
        FRASE DEL DÍA
        <span class="badge badge-${_currentPhrase.level.toLowerCase()}">${_currentPhrase.level}</span>
      </div>
      <div class="speak-phrase" id="speak-phrase">"${_currentPhrase.phrase}"</div>
      <div style="font-size:0.65rem;color:var(--text-3);margin-bottom:16px;font-family:var(--font-mono)">
        TOPIC: ${_currentPhrase.topic.toUpperCase()}
      </div>
      <div style="text-align:center;margin-bottom:20px">
        <button class="speak-record-btn" id="speak-record-btn" onclick="toggleRecording()">🎙️</button>
        <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-top:10px;letter-spacing:2px" id="speak-status">
          TOCA PARA GRABAR
        </div>
      </div>
      <div class="speak-transcript" id="speak-transcript" style="display:none"></div>
      <div id="speak-actions" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <button class="btn btn-subtle" onclick="nextPhrase()">SIGUIENTE →</button>
          <button class="btn btn-ghost"  onclick="saveSpeak()">GUARDAR</button>
        </div>
      </div>
    </div>

    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">TIPS CAMBRIDGE CAE</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.7">
        • Usa <strong>discourse markers</strong>: "Nevertheless", "On the other hand", "In spite of"<br>
        • Evita el silencio: <strong>"Let me think about that for a moment..."</strong><br>
        • Muestra rango léxico: no repitas las mismas palabras<br>
        • Habla de forma <strong>natural y fluida</strong>, no perfecta
      </div>
    </div>

    <div class="glass-card">
      <div class="card-title">HISTORIAL DE HOY</div>
      <div id="speak-history"><div class="empty-state" style="padding:12px 0">Cargando...</div></div>
    </div>
  `;

  loadSpeakHistory();
}

function toggleRecording() {
  // TODO: Implementar Web Speech API / MediaRecorder
  // Por ahora simula el flujo de grabación
  _isRecording = !_isRecording;
  const btn    = document.getElementById('speak-record-btn');
  const status = document.getElementById('speak-status');

  if (_isRecording) {
    btn.classList.add('recording');
    btn.textContent = '⏹';
    status.textContent = 'GRABANDO… TOCA PARA PARAR';
  } else {
    btn.classList.remove('recording');
    btn.textContent = '🎙️';
    status.textContent = 'REPRODUCIENDO…';

    // Simular transcript (cuando se integre Web Speech API, aquí va el resultado real)
    setTimeout(() => {
      const transcript = document.getElementById('speak-transcript');
      transcript.style.display = 'block';
      transcript.innerHTML = `
        <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-bottom:6px;letter-spacing:2px">TU RESPUESTA:</div>
        <div style="font-style:italic;color:var(--text-2)">[Transcripción de voz — próximamente con Web Speech API]</div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--surface-2);font-size:0.7rem;color:var(--text-3)">
          Puntúate tú mismo al pulsar Guardar
        </div>
      `;
      document.getElementById('speak-actions').style.display = 'block';
      status.textContent = 'TOCA PARA GRABAR DE NUEVO';
    }, 800);
  }
}

function nextPhrase() {
  _speakInited = false;
  renderSpeakSection();
}

async function saveSpeak() {
  // Guardar práctica de speaking (sin score real por ahora)
  try {
    await apiPost('/speaking-practice', {
      phrase_en: _currentPhrase.phrase,
      user_transcript: '[grabado]',
      score: null,
      notes: _currentPhrase.topic
    });
    // Marcar meta de speaking como completada
    const today = new Date().toISOString().split('T')[0];
    await apiPut(`/daily-goals/${today}`, { speaking_done: true });
    toast('✅ Práctica guardada', 'success');
    await apiPost('/study-sessions', { type: 'speaking', duration_minutes: 5 });
    showXpPop(15);
    nextPhrase();
  } catch (e) {
    toast(`Error: ${e.message}`, 'error');
  }
}

async function loadSpeakHistory() {
  // TODO: Endpoint específico de speaking-practice por fecha
  const hist = document.getElementById('speak-history');
  if (!hist) return;
  hist.innerHTML = '<div class="empty-state" style="padding:12px 0">Historial disponible próximamente</div>';
}
