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
let _recognition   = null;
let _lastTranscript = '';
let _lastScore     = null;

// ¿Soporta el navegador reconocimiento de voz? (Chrome/Edge/Android sí; iOS Safari limitado)
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── INIT ─────────────────────────────────────────────────
// `forzar` lo usa el botón de VOLVER de una tarea del oral: esa tarea ha pintado
// encima de esta sección, así que hay que repintarla aunque ya estuviera hecha.
function initSpeak(forzar = false) {
  const container = document.getElementById('speak-content');
  if (!container || (_speakInited && !forzar)) return;
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
      <div id="speak-pron"></div>
      <div style="font-size:0.65rem;color:var(--text-3);margin-bottom:16px;font-family:var(--font-mono)">
        TOPIC: ${_currentPhrase.topic.toUpperCase()}
      </div>
      <div style="display:flex;justify-content:center;gap:20px;align-items:center;margin-bottom:14px">
        <button class="btn btn-subtle" onclick="speakPhrase()" title="Escuchar" style="min-width:auto;padding:12px 16px"><img src="src/img/icons/listen.png" alt="" class="ico"> ESCUCHAR</button>
        <button class="speak-record-btn" id="speak-record-btn" onclick="toggleRecording()"><img src="src/img/icons/mic.png" alt="" class="ico"></button>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);letter-spacing:2px" id="speak-status">
          ${SpeechRec ? 'TOCA EL MICRO Y LEE LA FRASE' : 'ESCUCHA Y REPITE EN VOZ ALTA'}
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

    <!-- Las 5 tareas del oral del C1 vivían dentro de EXAMEN, y EXAMEN salió de
         la barra el 2-ago. Como sólo las cargaba exam.js, se quedaron
         inalcanzables sin que nadie lo notara: speaking_practice llevaba cero
         filas desde julio. Su sitio es éste, que es la pestaña de hablar. -->
    <div class="glass-card-accent" style="margin-top:8px">
      <div class="card-title">LAS 4 PARTES DEL ORAL · C1</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px">
        Con cronómetro para el minuto seguido. El examen es el 1 de diciembre.
      </p>
      <div id="speaking-tasks"><div class="empty-state" style="padding:8px 0"><div class="spinner"></div></div></div>
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
  cargarPronFrase();
  // Vive en writing.js (comparte pantalla con las tareas escritas del C1).
  if (typeof loadSpeakingTasks === 'function') loadSpeakingTasks();
}

// Pide al servidor cómo se lee la frase del día. El banco de frases de esta
// sección es local, así que la figurada no puede venir con los datos: hay que
// pedirla aparte.
async function cargarPronFrase() {
  const caja = document.getElementById('speak-pron');
  if (!caja || !_currentPhrase || typeof pronFrase !== 'function') return;
  try {
    const p = await apiPost('/pronunciation/text', { texto: _currentPhrase.phrase });
    if (!p) return;
    caja.innerHTML = pronFrase(p) +
      (typeof pronAvisosFrase === 'function' ? `<div>${pronAvisosFrase(p)}</div>` : '') +
      (typeof pronLeyenda === 'function' ? pronLeyenda(p.leyenda, 'ley-speak') : '');
  } catch { /* sin figurada se sigue pudiendo practicar */ }
}

// Reproduce la frase. La elección de voz vive en voz.js.
function speakPhrase() {
  if (!_currentPhrase) return;
  vozDecir(_currentPhrase.phrase);
}

// Compara lo dicho con la frase objetivo → % de palabras acertadas.
function scoreSpeech(target, said) {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s']/g, '').split(/\s+/).filter(Boolean);
  const t = clean(target), s = new Set(clean(said));
  if (!t.length) return 0;
  const hit = t.filter((w) => s.has(w)).length;
  return Math.round((hit / t.length) * 100);
}

function toggleRecording() {
  const btn    = document.getElementById('speak-record-btn');
  const status = document.getElementById('speak-status');
  const transcript = document.getElementById('speak-transcript');

  // Sin reconocimiento de voz: modo manual (escucha y repite, autopuntúa).
  if (!SpeechRec) {
    transcript.style.display = 'block';
    transcript.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-bottom:6px;letter-spacing:2px">MODO SIN MICRO</div>
      <div style="color:var(--text-2);font-size:0.8rem">Este navegador no transcribe voz (iOS lo limita). Escucha con <img src="src/img/icons/listen.png" alt="" class="ico">, repite en alto y puntúate al guardar.</div>`;
    document.getElementById('speak-actions').style.display = 'block';
    _lastTranscript = '[repetido en voz alta]';
    _lastScore = null;
    return;
  }

  if (_isRecording) { _recognition?.stop(); return; }

  _recognition = new SpeechRec();
  _recognition.lang = 'en-GB';
  _recognition.interimResults = false;
  _recognition.maxAlternatives = 1;

  _recognition.onstart = () => {
    _isRecording = true;
    btn.classList.add('recording');
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico">';
    status.textContent = 'ESCUCHANDO… HABLA AHORA';
  };
  _recognition.onerror = (e) => {
    status.textContent = e.error === 'not-allowed' ? 'PERMISO DE MICRO DENEGADO' : 'ERROR: ' + e.error;
    _isRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
  };
  _recognition.onend = () => {
    _isRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
    if (status.textContent.includes('ESCUCHANDO')) status.textContent = 'TOCA EL MICRO PARA REPETIR';
  };
  _recognition.onresult = (ev) => {
    const said = ev.results[0][0].transcript;
    const score = scoreSpeech(_currentPhrase.phrase, said);
    _lastTranscript = said;
    _lastScore = score;
    const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    transcript.style.display = 'block';
    transcript.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-bottom:6px;letter-spacing:2px">TE HE OÍDO:</div>
      <div style="color:var(--text-2)">"${said}"</div>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--surface-2);display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:0.7rem;color:var(--text-3)">Reconocimiento</span>
        <span style="font-family:var(--font-mono);font-weight:700;color:${color}">${score}%</span>
      </div>
      <!-- Decir "Precisión" aquí era mentira: el reconocedor autocorrige hacia
           lo que espera oír, así que se puede sacar un 100% con acento pésimo.
           Mide si el móvil te ha entendido, no cómo pronuncias. -->
      <div style="font-size:0.62rem;color:var(--text-4);margin-top:6px;line-height:1.45">
        Mide si el móvil te ha entendido, no tu pronunciación: el reconocedor
        corrige hacia lo que espera oír.
      </div>`;
    document.getElementById('speak-actions').style.display = 'block';
  };

  try { _recognition.start(); }
  catch { status.textContent = 'NO SE PUDO INICIAR EL MICRO'; }
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
      user_transcript: _lastTranscript || '[grabado]',
      score: _lastScore,
      notes: _currentPhrase.topic
    });
    // Marcar meta de speaking como completada
    const today = hoyLocal();
    await apiPut(`/daily-goals/${today}`, { speaking_done: true });
    toast('Práctica guardada', 'success');
    await apiPost('/study-sessions', { type: 'speaking', duration_minutes: 5 });
    showXpPop(15);
    nextPhrase();
  } catch (e) {
    toastError(e);
  }
}

async function loadSpeakHistory() {
  const hist = document.getElementById('speak-history');
  if (!hist) return;
  try {
    const rows = await apiGet('/speaking-practice');
    if (!rows || !rows.length) {
      hist.innerHTML = '<div class="empty-state" style="padding:12px 0">Aún no has practicado. ¡Empieza arriba!</div>';
      return;
    }
    hist.innerHTML = rows.slice(0, 6).map((r) => {
      const sc = r.score != null
        ? `<span style="font-family:var(--font-mono);font-weight:700;color:${r.score >= 80 ? 'var(--success)' : r.score >= 50 ? 'var(--warning)' : 'var(--danger)'}">${r.score}%</span>`
        : '<span style="font-size:0.65rem;color:var(--text-3)">—</span>';
      return `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--surface-2)">
        <span style="font-size:0.72rem;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">"${r.phrase_en}"</span>
        ${sc}
      </div>`;
    }).join('');
  } catch {
    hist.innerHTML = '<div class="empty-state" style="padding:12px 0">No se pudo cargar el historial</div>';
  }
}
