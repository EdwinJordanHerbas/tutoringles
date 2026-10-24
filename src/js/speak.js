// TutorIngles — speak.js
// HABLAR: la frase del día con el micro (o dictada con el teclado donde no hay
// micro, que es el iPhone con la app instalada), el «¿POR QUÉ? · IA» que lee
// lo que entendió el reconocedor, la entrada a CONVERSAR (charla.js) y las
// tareas del oral (writing.js). HABLAR sólo se marca si se usó el micro.

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

// Las del francés. No son frases de examen sueltas: son los andamios para
// hablar sin quedarse en blanco, que es lo que le falta a un A2 que entiende
// casi todo. Las primeras sirven desde el primer día en Suiza; las últimas son
// las que puntúan en el oral del DALF C1 (exposé y débat).
const SPEAKING_PHRASES_FR = [
  { phrase: "Excusez-moi, je ne suis pas sûr d'avoir bien compris.", level: "A2", topic: "Survie" },
  { phrase: "Pourriez-vous répéter un peu plus lentement, s'il vous plaît ?", level: "A2", topic: "Survie" },
  { phrase: "Je ne trouve pas le mot, mais c'est une chose qui sert à ranger les chaussures.", level: "B1", topic: "Reformuler" },
  { phrase: "Si j'ai bien compris, vous voulez dire que le magasin ouvre à neuf heures.", level: "B1", topic: "Vérifier" },
  { phrase: "Ce que je veux dire, c'est que j'ai besoin d'un peu plus de temps.", level: "B1", topic: "Reformuler" },
  { phrase: "Je suis tout à fait d'accord avec toi, mais il faut aussi penser aux clients.", level: "B1", topic: "Réunion" },
  { phrase: "À mon avis, ce serait plus simple de commencer par le rayon chaussures.", level: "B1", topic: "Réunion" },
  { phrase: "Je ne pense pas que ce soit une bonne idée, du moins pas tout de suite.", level: "B2", topic: "Nuancer" },
  { phrase: "Il me semble que le problème vient surtout du manque de personnel.", level: "B2", topic: "Opinion" },
  { phrase: "Certes, cette solution coûte cher ; néanmoins, elle nous ferait gagner du temps.", level: "C1", topic: "Argumenter" },
  { phrase: "Force est de constater que les habitudes de consommation ont profondément changé.", level: "C1", topic: "Exposé" },
  { phrase: "Pour conclure, je dirais que les avantages l'emportent largement sur les inconvénients.", level: "C1", topic: "Exposé" },
];

/** El banco de frases del idioma que se está estudiando. */
const frasesDelIdioma = () =>
  (typeof _idioma !== 'undefined' && _idioma === 'fr') ? SPEAKING_PHRASES_FR : SPEAKING_PHRASES;

// ── STATE ───────────────────────────────────────────────
let _currentPhrase = null;
let _isRecording   = false;
let _speakInited   = false;
let _recognition   = null;
let _lastTranscript = '';
let _lastScore     = null;

// Lo que entendió el reconocedor en el último intento, con sus alternativas,
// para el «¿POR QUÉ? · IA». Va en un global y no dentro del onclick: las frases
// francesas llevan apóstrofos ("s'il vous plaît") y romperían la cadena.
let iaSpeakAlternativas = [];

// Lo último que se dictó (o tecleó) en el campo de la frase del día, para
// GUARDAR. No se puede leer del campo al guardar: iaDictadoPron lo vacía tras
// cada diagnóstico, porque el dictado del iPhone AÑADE a lo que ya hay.
let iaSpeakDictado = '';

// ¿Soporta el navegador reconocimiento de voz? (Chrome/Edge/Android sí; iOS Safari limitado)
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

/** El idioma de la frase del día como lo piden las rutas /ia/*: 'en' | 'fr'. */
const iaSpeakLang = () => (frasesDelIdioma() === SPEAKING_PHRASES_FR ? 'fr' : 'en');

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
  const banco     = frasesDelIdioma();
  const frances   = banco === SPEAKING_PHRASES_FR;
  _currentPhrase  = banco[Math.floor(Math.random() * banco.length)];
  // Frase nueva, intento nuevo: lo de la anterior no puede acabar guardado (o
  // marcando HABLAR) con ésta.
  _lastTranscript = '';
  _lastScore = null;
  iaSpeakAlternativas = [];
  iaSpeakDictado = '';

  container.innerHTML = `
    <div class="glass-card-accent anim-slide-up">
      <div class="card-title" style="display:flex;justify-content:space-between">
        FRASE DEL DÍA
        <span class="badge badge-${_currentPhrase.level.toLowerCase()}">${_currentPhrase.level}</span>
      </div>
      <div class="speak-phrase" id="speak-phrase">"${escaparHtml(_currentPhrase.phrase)}"</div>
      <div id="speak-pron"></div>
      <div style="font-size:0.65rem;color:var(--text-3);margin-bottom:16px;font-family:var(--font-mono)">
        TOPIC: ${escaparHtml(_currentPhrase.topic.toUpperCase())}
      </div>
      <div style="display:flex;justify-content:center;gap:20px;align-items:center;margin-bottom:14px">
        <button class="btn btn-subtle" onclick="speakPhrase()" title="Escuchar" style="min-width:auto;padding:12px 16px"><img src="src/img/icons/listen.png" alt="" class="ico"> ESCUCHAR</button>
        <button class="speak-record-btn" id="speak-record-btn" onclick="toggleRecording()"><img src="src/img/icons/mic.png" alt="" class="ico"></button>
      </div>
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);letter-spacing:2px" id="speak-status">
          ${SpeechRec ? 'TOCA EL MICRO Y LEE LA FRASE' : 'ESCÚCHALA, REPÍTELA Y TOCA EL MICRO'}
        </div>
      </div>
      <div class="speak-transcript" id="speak-transcript" style="display:none"></div>
      <!-- Con micro, el dictado del teclado también está (toda entrada de voz
           acepta texto): con ruido el reconocedor da "no-speech" una y otra vez
           y no quedaba otra salida. Plegado, para no competir con el micro, y
           FUERA de #speak-transcript, que se reescribe en cada intento y se
           llevaría lo dictado. Sin micro sale abierto al tocar el micro. -->
      <div id="speak-teclado">${SpeechRec
        ? iaHtmlPlegable('¿Prefieres dictarla con el teclado?', iaHtmlDictadoPron('speak-dict', _currentPhrase.phrase, iaSpeakLang()))
        : ''}</div>
      <div id="speak-actions" style="display:none">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px">
          <button class="btn btn-subtle" onclick="nextPhrase()">SIGUIENTE →</button>
          <button class="btn btn-ghost"  onclick="saveSpeak()">GUARDAR</button>
        </div>
      </div>
    </div>

    <!-- La frase del día es una frase; en el mostrador te contestan. Aquí se
         practica eso antes de que pase: la IA hace de la otra persona y corrige
         lo que digas. Entra por un btn-subtle, sin btn-primary. -->
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">CONVERSAR</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6;margin-bottom:12px">
        ${frances
          ? 'Practica la panadería, la estación, la régie… antes de llegar. La IA hace de la otra persona, te contesta en francés y te corrige lo que digas.'
          : 'Practica una conversación de tu trabajo o del día a día. La IA hace de la otra persona, te contesta y te corrige lo que digas.'}
      </div>
      <button class="btn btn-subtle" onclick="iaSpeakConversar()">${typeof ico === 'function' ? ico('speak', 16) : ''} CONVERSAR CON IA</button>
    </div>

    ${frances ? speakTarjetasFrances() : ''}

    <!-- Las 5 tareas del oral del C1 vivían dentro de EXAMEN, y EXAMEN salió de
         la barra el 2-ago. Como sólo las cargaba exam.js, se quedaron
         inalcanzables sin que nadie lo notara: speaking_practice llevaba cero
         filas desde julio. Su sitio es éste, que es la pestaña de hablar.
         El servidor da las del idioma activo: en francés, las de hablar de
         ti (B1) y el exposé y el debate del DALF. -->
    <div class="glass-card-accent" style="margin-top:8px">
      <div class="card-title">${frances ? 'EL ORAL EN FRANCÉS' : 'LAS 4 PARTES DEL ORAL · C1'}</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px">
        ${frances
          ? 'Con cronómetro y en alto. Primero, hablar de ti y contar lo que te pasa; al final, el exposé y el debate del DALF.'
          : 'Con cronómetro para el minuto seguido.'}
      </p>
      <div id="speaking-tasks"><div class="empty-state" style="padding:8px 0"><div class="spinner"></div></div></div>
    </div>

    <div class="glass-card" style="margin-top:8px;${frances ? 'display:none' : ''}">
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

  iaSpeakVigilarDictado();
  loadSpeakHistory();
  // Vive en writing.js (comparte pantalla con las tareas escritas del C1).
  if (typeof loadSpeakingTasks === 'function') loadSpeakingTasks();
  // La figurada es del inglés.
  if (!frances) cargarPronFrase();
}

/**
 * Lo que va en HABLAR con el francés: el formato del oral del DALF C1, para
 * saber hacia dónde se va, y los trucos para no quedarse en blanco, que es lo
 * que hace falta hoy.
 */
function speakTarjetasFrances() {
  return `
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">PARA NO QUEDARTE EN BLANCO</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.7">
        • Si no sale la palabra, <strong>descríbela</strong>: "c'est un truc qui sert à…", "c'est comme… mais…"<br>
        • Gana tiempo sin callarte: <strong>"alors…", "voyons…", "comment dire…"</strong><br>
        • Comprueba en vez de asentir: <strong>"si j'ai bien compris…"</strong><br>
        • Con compañeros, casi siempre <strong>tu</strong>; con clientes y en la comuna, <strong>vous</strong>
      </div>
    </div>
    <div class="glass-card" style="margin-top:8px">
      <div class="card-title">EL ORAL DEL DALF C1</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.7">
        Una hora de preparación con un dossier de documentos, y después unos
        30 minutos ante el tribunal: un <strong>exposé</strong> en el que presentas el
        tema y defiendes una postura, y un <strong>débat</strong> en el que te llevan la
        contraria. Lo que puntúa: estructurar, argumentar y matizar. Tienes los
        dos más abajo, con cronómetro.
      </div>
    </div>`;
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
  // Sin tildes antes de filtrar: con el francés, "été" o "à" perdían letras y
  // las palabras acentuadas no llegaban a compararse enteras.
  const clean = (s) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
  const t = clean(target), s = new Set(clean(said));
  if (!t.length) return 0;
  const hit = t.filter((w) => s.has(w)).length;
  return Math.round((hit / t.length) * 100);
}

function toggleRecording() {
  const btn    = document.getElementById('speak-record-btn');
  const status = document.getElementById('speak-status');
  const transcript = document.getElementById('speak-transcript');

  // Sin reconocimiento de voz (el iPhone con la app instalada): se repite en
  // alto y, para que la IA diga qué se entiende, se dicta con el micro del
  // teclado. Nada de esto marca HABLAR: no ha pasado por el micro de la app.
  if (!SpeechRec) {
    iaSpeakMostrarDictado('Aquí la app no puede usar el micro (el iPhone no lo deja con la app instalada).');
    return;
  }

  if (_isRecording) { _recognition?.stop(); return; }

  _recognition = new SpeechRec();
  _recognition.lang = typeof idiomaVoz === 'function' ? idiomaVoz() : 'en-GB';
  _recognition.interimResults = false;
  // Cinco y no una: la segunda y la tercera dicen qué otra cosa pudo entender
  // el móvil, que es justo lo que lee la IA para decir qué sonido falla.
  _recognition.maxAlternatives = 5;

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
    // Un permiso denegado o un micro que no existe no se arreglan pulsando
    // otra vez: ahí se ofrece dictar con el teclado.
    if (IA_SPEAK_SIN_SALIDA.has(e.error)) {
      iaSpeakMostrarDictado(typeof iaTextoErrorMicro === 'function' ? escaparHtml(iaTextoErrorMicro(e.error)) : 'El micrófono no funciona.');
    }
  };
  _recognition.onend = () => {
    _isRecording = false;
    btn.classList.remove('recording');
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
    if (status.textContent.includes('ESCUCHANDO')) status.textContent = 'TOCA EL MICRO PARA REPETIR';
  };
  _recognition.onresult = (ev) => {
    const alts = iaAlternativasDe(ev.results[0]);
    if (!alts.length) return;
    const said = alts[0].transcript;
    const score = scoreSpeech(_currentPhrase.phrase, said);
    _lastTranscript = said;
    _lastScore = score;
    iaSpeakAlternativas = alts;
    const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
    transcript.style.display = 'block';
    transcript.innerHTML = `
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-bottom:6px;letter-spacing:2px">TE HE OÍDO:</div>
      <div style="color:var(--text-2)">"${escaparHtml(said)}"</div>
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
      </div>
      <!-- La IA lee las cinco alternativas del reconocedor: si la segunda dice
           "ship" donde tocaba "sheep", ahí está el sonido que falla. -->
      <div class="ia-acciones">
        <button class="btn btn-subtle btn-sm" onclick="iaSpeakPorQue(this)">¿POR QUÉ? · IA</button>
      </div>
      <div id="ia-speak-pron"></div>`;
    document.getElementById('speak-actions').style.display = 'block';
  };

  try { _recognition.start(); }
  catch { status.textContent = 'NO SE PUDO INICIAR EL MICRO'; }
}

// ── LA IA EN HABLAR ──────────────────────────────────────

// Errores del micro que no se arreglan pulsando otra vez: ahí se ofrece dictar.
const IA_SPEAK_SIN_SALIDA = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network']);

/**
 * Modo sin micro: la caja del transcript con el campo para dictar la frase con
 * el micro del teclado (ia.js) y pedir a la IA qué se entendió. `motivo` es
 * HTML ya escapado. No se repinta si ya está, o borraría lo que se ha dictado.
 */
function iaSpeakMostrarDictado(motivo) {
  const transcript = document.getElementById('speak-transcript');
  if (!transcript || !_currentPhrase) return;
  transcript.style.display = 'block';
  // Con micro (y el permiso denegado, o sin micrófono físico) el campo ya está
  // debajo, plegado: se abre ése en vez de pintar otro con el mismo id, y el
  // aviso va solo.
  const plegado = document.getElementById('speak-teclado')?.querySelector('.ia-plegable');
  const aviso = `
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-3);margin-bottom:6px;letter-spacing:2px">MODO SIN MICRO</div>
      <div style="color:var(--text-2);font-size:0.8rem;line-height:1.5">${motivo}
        Escúchala con <img src="src/img/icons/listen.png" alt="" class="ico">, repítela en alto y,
        si quieres que la IA te diga qué se entiende, díctala con el micro del teclado${plegado ? ', aquí debajo' : ''}.</div>`;
  if (plegado) {
    plegado.open = true;
    transcript.innerHTML = aviso;
  } else if (!document.getElementById('speak-dict')) {
    transcript.innerHTML = aviso + iaHtmlDictadoPron('speak-dict', _currentPhrase.phrase, iaSpeakLang());
    iaSpeakVigilarDictado();
  }
  document.getElementById('speak-actions').style.display = 'block';
  _lastTranscript = '[repetido en voz alta]';
  _lastScore = null;
  iaSpeakAlternativas = [];
  // Dentro del toque, el iPhone abre el teclado: queda a un toque del micro.
  document.getElementById('speak-dict-txt')?.focus();
}

/**
 * Apunta lo que se dicta en el campo (para GUARDAR) y, con lo primero que se
 * dicte, enseña SIGUIENTE / GUARDAR: con micro sólo salían tras un intento que
 * el reconocedor entendiera, y con "no-speech" seguido no se podía pasar de
 * frase. No toca `_lastScore`: dictar no marca HABLAR.
 */
function iaSpeakVigilarDictado() {
  const campo = document.getElementById('speak-dict-txt');
  if (!campo?.addEventListener) return;
  const apuntar = () => {
    const v = String(campo.value || '').trim();
    if (!v) return;
    iaSpeakDictado = v;
    const acciones = document.getElementById('speak-actions');
    if (acciones) acciones.style.display = 'block';
  };
  campo.addEventListener('input', apuntar);
  campo.addEventListener('change', apuntar);
}

/**
 * «¿POR QUÉ? · IA» tras grabar: el diagnóstico de las 5 alternativas. Si sale
 * bien el botón se quita, como en SONIDOS: otro toque pagaría la misma
 * respuesta y sumaría los mismos errores al repaso. Vuelve con el siguiente
 * intento, que repinta la caja entera.
 */
async function iaSpeakPorQue(btn) {
  const caja = document.getElementById('ia-speak-pron');
  if (!_currentPhrase || !iaSpeakAlternativas.length || !caja) { toast('Dila primero con el micro', 'error'); return; }
  await iaDiagnosticarPron({
    objetivo: _currentPhrase.phrase, alternativas: iaSpeakAlternativas,
    lang: iaSpeakLang(), caja, btn,
  });
  if (caja.querySelector('.ia-caja') && btn?.isConnected) btn.remove();
}

/** Abre CONVERSAR (charla.js) con su selector de situaciones y escenarios. */
function iaSpeakConversar() {
  if (typeof charlaAbrir !== 'function') { toast('La conversación con IA no está disponible', 'error'); return; }
  // Que el micro de esta pantalla no siga abierto debajo de la conversación.
  if (_isRecording) { try { _recognition?.abort(); } catch { /* ya parado */ } }
  if (typeof vozParar === 'function') vozParar();
  charlaAbrir();
}

function nextPhrase() {
  _speakInited = false;
  renderSpeakSection();
}

async function saveSpeak() {
  // Sólo hubo micro si el reconocedor devolvió algo: es lo único que deja
  // `_lastScore`. Repetirla en alto o dictarla con el teclado se guarda en el
  // historial, pero no marca HABLAR (ver CLAUDE.md: "una meta que se marca
  // sola no es una meta").
  const hubloMicro = _lastScore != null;
  const dictado = document.getElementById('speak-dict-txt')?.value.trim() || iaSpeakDictado;
  try {
    await apiPost('/speaking-practice', {
      phrase_en: _currentPhrase.phrase,
      user_transcript: hubloMicro ? _lastTranscript : (dictado || _lastTranscript || '[grabado]'),
      score: _lastScore,
      notes: _currentPhrase.topic
    });
    if (hubloMicro) await apiPut(`/daily-goals/${hoyLocal()}`, { speaking_done: true });
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
        <span style="font-size:0.72rem;color:var(--text-2);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">"${escaparHtml(r.phrase_en)}"</span>
        ${sc}
      </div>`;
    }).join('');
  } catch {
    hist.innerHTML = '<div class="empty-state" style="padding:12px 0">No se pudo cargar el historial</div>';
  }
}
