// TutorIngles — work.js
// Carril diario: el inglés de tu sector, por situación real.
//
// Dos modos por situación:
//   · FRASES  → las que tienes que saber decir. Escuchar, repetir, comprobar.
//   · ROLE-PLAY → la conversación entera, turno a turno. Tú contestas en alto.
//
// Nota sobre la puntuación: hasta que entre el análisis fonema a fonema, lo que
// se mide aquí es RECONOCIMIENTO (si el móvil ha entendido lo que has dicho),
// no pronunciación fina. Está etiquetado como tal a propósito.

// ── STATE ───────────────────────────────────────────────
let _wkSituations = [];
let _wkCurrent    = null;      // situación abierta
let _wkTab        = 'keys';    // 'keys' | 'roleplay'
let _wkTurn       = 0;         // turno del role-play
let _wkScores     = [];        // puntuaciones de la sesión
let _wkRec        = null;
let _wkRecording  = false;
let _wkInited     = false;

// Lo que entendió el reconocedor en el último intento de cada frase, con sus
// alternativas, para el «¿POR QUÉ? · IA». Va aquí y no dentro del onclick: las
// frases francesas llevan apóstrofos ("l'addition", "s'il vous plaît") y un
// `onclick="f('…')"` con el texto dentro se rompe. El botón sólo lleva la clave
// ('k-3' = frase clave 3, 't-5' = turno 5 del role-play).
let iaWkIntentos = {};

const WkSpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

// ── INIT ─────────────────────────────────────────────────
async function initWork() {
  const container = document.getElementById('work-content');
  if (!container || _wkInited) return;
  _wkInited = true;
  await loadWorkSituations();
}

// ── TEXTO A VOZ ──────────────────────────────────────────
// Estas frases son las que llevan audio grabado (src/audio/frase-<id>.mp3),
// así que se pasa el id: si existe la grabación se oye esa, y si no la voz del
// sistema. voz.js decide.
function wkSpeak(text, btn, id) {
  vozFrase(id, text, { btn, lang: wkVoz() });
}

// El idioma de la situación abierta, no el activo a secas: la columna `en` de
// situation_lines guarda el texto en el idioma del sector, y en la Suiza
// romanda es francés. Micrófono y voz tienen que ir con él.
function wkVoz() {
  return _wkCurrent?.lang === 'fr' ? 'fr-FR'
       : _wkCurrent?.lang === 'en' ? 'en-GB'
       : (typeof idiomaVoz === 'function' ? idiomaVoz() : 'en-GB');
}

// El idioma de la situación como lo piden las rutas /ia/*: el código corto
// ('en' | 'fr'), no la etiqueta de voz de wkVoz().
function iaWkLang() {
  if (_wkCurrent?.lang === 'fr' || _wkCurrent?.lang === 'en') return _wkCurrent.lang;
  return typeof _idioma !== 'undefined' && _idioma ? _idioma : 'en';
}

// ── COMPARAR LO DICHO CON LO ESPERADO ────────────────────
// Normaliza y compara palabra a palabra. Es una medida de reconocimiento.
//
// Sin tildes y con el apóstrofo como separador, a los dos lados. En francés
// las dos cosas hundían la nota sin motivo: el reconocedor escribe "a" donde la
// base tiene "à", o "l’addition" con el apóstrofo tipográfico donde la base
// tiene "l'addition", y la palabra entera contaba como fallada. Partiendo la
// elisión ("l addition", "s il") las dos formas dan lo mismo. La œ se abre en
// "oe" porque NFD no la descompone y "cœur" perdía la mitad.
function wkCompare(expected, said) {
  const norm = (s) => String(s ?? '').toLowerCase()
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const a = norm(expected).split(' ').filter(Boolean);
  const b = norm(said).split(' ').filter(Boolean);
  if (!a.length) return 0;
  const pool = [...b];
  let hits = 0;
  for (const w of a) {
    const i = pool.indexOf(w);
    if (i !== -1) { hits++; pool.splice(i, 1); }
  }
  return Math.round((hits / a.length) * 100);
}

// ── CÓMO SE LEE CADA FRASE ───────────────────────────────
// La figurada llega del servidor en `linea.pron`, ya troceada en sílabas. Es la
// pieza que faltaba: hasta ahora había que adivinar cómo sonaba la frase o
// fiarse de la voz sintética al vuelo.
function wkPron(linea) {
  if (!linea?.pron || typeof pronFrase !== 'function') return '';
  const avisos = typeof pronAvisosFrase === 'function' ? pronAvisosFrase(linea.pron) : '';
  // Sin la leyenda, la ə y la æ salían aquí sin nada que las explicase.
  const ley = typeof pronLeyenda === 'function'
    ? pronLeyenda(linea.pron.leyenda, `ley-wk-${linea.id ?? 'x'}`) : '';
  return pronFrase(linea.pron) + (avisos ? `<div>${avisos}</div>` : '') + ley;
}

// ── LISTA DE SITUACIONES ─────────────────────────────────
async function loadWorkSituations() {
  const c = document.getElementById('work-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const [profile, situations] = await Promise.all([
      apiGet('/profile'),
      apiGet('/situations')
    ]);
    _wkSituations = situations || [];

    if (!_wkSituations.length) {
      c.innerHTML = `<div class="empty-state" style="padding:24px 0">
        No hay situaciones cargadas todavía.<br>
        <span style="font-size:0.7rem">Aplica la migración de contenido de tu sector.</span>
      </div>`;
      return;
    }

    const done  = _wkSituations.filter(s => s.completed).length;
    const total = _wkSituations.length;
    const pct   = Math.round((done / total) * 100);

    c.innerHTML = `
      <div class="glass-card-accent anim-slide-up">
        <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
          TU SECTOR
          <span class="badge">${ico(profile?.track_icon || 'work', 14)} ${escaparHtml(profile?.track_name || '—')}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-2);margin-bottom:12px">
          Situaciones reales de tu trabajo. Escúchalas, dilas en alto y practica la conversación entera.
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="progress-label">${done} de ${total} situaciones practicadas</div>
      </div>

      <div id="work-list">
        ${_wkSituations.map(s => `
          <div class="topic-item" onclick="openSituation(${s.id})">
            <div class="topic-item-info">
              <div class="topic-item-title">${escaparHtml(s.title_es)}</div>
              <div class="topic-item-meta">
                ${escaparHtml(s.title_en)} · ${Number(s.key_count) || 0} frases${s.practiced_count ? ` · practicada ${Number(s.practiced_count)}×` : ''}
              </div>
            </div>
            <span class="badge badge-${escaparAttr((s.level || 'a2').toLowerCase())}">${escaparHtml(s.level)}</span>
            <div class="topic-check">${s.completed ? '✓' : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

// ── DETALLE DE UNA SITUACIÓN ─────────────────────────────
async function openSituation(id) {
  const c = document.getElementById('work-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _wkCurrent = await apiGet(`/situations/${id}`);
    _wkTab     = 'keys';
    _wkTurn    = 0;
    _wkScores  = [];
    iaWkIntentos = {};
    renderSituation();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

function renderSituation() {
  const s = _wkCurrent;
  if (!s) return;
  const c = document.getElementById('work-content');

  c.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="loadWorkSituations()" style="margin-bottom:10px">← Situaciones</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        ${escaparHtml(s.title_es)}
        <span class="badge badge-${escaparAttr((s.level || 'a2').toLowerCase())}">${escaparHtml(s.level)}</span>
      </div>
      <div style="font-size:0.72rem;color:var(--text-3);font-family:var(--font-mono);margin-bottom:8px">
        ${escaparHtml(String(s.title_en || '').toUpperCase())}
      </div>
      ${s.context_es ? `<div style="font-size:0.78rem;color:var(--text-2)">${escaparHtml(s.context_es)}</div>` : ''}
      <!-- Lo que el guion no da: improvisar. La IA hace de la otra persona en
           esta misma situación, contesta a lo que digas y te corrige. Es un
           btn-subtle y no un tercer chip porque sale de la pantalla (abre la
           conversación), y los chips cambian de panel sin moverse de aquí. -->
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--surface-2)">
        <div style="font-size:0.7rem;color:var(--text-3);line-height:1.45">
          Improvísala: la IA hace de ${iaWkLang() === 'fr' ? 'la otra persona' : 'cliente'}, te contesta y te corrige.
        </div>
        <div class="ia-acciones" style="margin-top:8px">
          <button class="btn btn-subtle btn-sm" onclick="iaWkConversar()">${ico('speak', 14)} CONVERSAR CON IA</button>
        </div>
      </div>
    </div>

    <div class="vocab-filters" style="margin:12px 0">
      <button class="filter-chip ${_wkTab === 'keys' ? 'active' : ''}"     onclick="setWorkTab('keys')">Frases clave</button>
      <button class="filter-chip ${_wkTab === 'roleplay' ? 'active' : ''}" onclick="setWorkTab('roleplay')">Role-play</button>
    </div>

    <div id="work-panel"></div>
  `;

  renderWorkPanel();
}

function setWorkTab(tab) {
  _wkTab  = tab;
  _wkTurn = 0;
  renderSituation();
}

function renderWorkPanel() {
  if (_wkTab === 'keys') renderKeyPhrases();
  else                   renderRoleplay();
}

// Abre la conversación con IA sobre la situación abierta (charla.js). Antes se
// para lo que esté sonando o escuchando aquí: el micro de esta pantalla seguiría
// abierto debajo de la conversación y se quedaría con lo que se diga allí.
function iaWkConversar() {
  if (!_wkCurrent) return;
  if (typeof charlaAbrir !== 'function') { toast('La conversación con IA no está disponible', 'error'); return; }
  try { _wkRec?.abort(); } catch { /* ya estaba parado */ }
  _wkRecording = false;
  if (typeof vozParar === 'function') vozParar();
  charlaAbrir({ situacion_id: _wkCurrent.id, titulo: _wkCurrent.title_es });
}

// ── FRASES CLAVE ─────────────────────────────────────────
//
// Se practican POR TANDAS, no las doce de golpe. Las 12 situaciones llevaban
// desde julio con cero prácticas registradas, y no era por no llegar —TRABAJO
// está en la barra, a un toque—: era que cada situación pedía 12-13 frases con
// micrófono y sólo contaba al terminarla entera, mientras la sesión de cinco
// minutos daba la misma marca en HOY sin sacar el móvil del bolsillo. Puestas
// al lado, entrar aquí era triplicar el esfuerzo por el mismo resultado.
//
// Cuatro frases son ~3 minutos y se retoman por donde se dejaron
// (`situation_progress.lines_done`).
function renderKeyPhrases() {
  const panel = document.getElementById('work-panel');
  const todas = _wkCurrent.keys || [];
  const tanda = _wkCurrent.batch || 4;
  const desde = Math.min(_wkCurrent.progress?.lines_done || 0, Math.max(0, todas.length - 1));
  const hasta = Math.min(desde + tanda, todas.length);
  const keys  = todas.slice(desde, hasta);
  const ultima = hasta >= todas.length;

  panel.innerHTML = `
    <div class="wk-tanda">
      <div class="wk-tanda-barra"><div class="wk-tanda-fill" style="width:${Math.round((desde / todas.length) * 100)}%"></div></div>
      <div class="wk-tanda-et">Frases ${desde + 1}-${hasta} de ${todas.length}${desde ? ' · sigues donde lo dejaste' : ''}</div>
    </div>

    ${keys.map((k, j) => { const i = desde + j; return `
      <div class="glass-card" style="margin-bottom:10px" id="wk-line-${i}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1">
            <div style="font-size:0.92rem;font-weight:600;color:var(--text);line-height:1.35">${escaparHtml(k.en)}</div>
            <div style="font-size:0.78rem;color:var(--text-2);margin-top:3px">${escaparHtml(k.es)}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn-icon" data-wk-texto="${escaparAttr(k.en)}" onclick="wkSpeak(this.dataset.wkTexto, this, ${JSON.stringify(k.id ?? null)})" title="Escuchar"><img src="src/img/icons/listen.png" alt="" class="ico"></button>
            <button class="btn-icon" onclick="wkPractice(${i}, this)" title="Repetir"><img src="src/img/icons/mic.png" alt="" class="ico"></button>
          </div>
        </div>
        ${wkPron(k)}
        ${k.note ? `<div style="font-size:0.68rem;color:var(--text-3);margin-top:8px;padding-top:8px;border-top:1px solid var(--surface-2)"><img src="src/img/icons/idea.png" alt="" class="ico"> ${escaparHtml(k.note)}</div>` : ''}
        <div id="wk-result-${i}" style="display:none;margin-top:8px"></div>
        ${iaWkHtmlTeclado(`wk-dict-k-${i}`, k.en)}
      </div>
    `; }).join('')}

    <button class="btn btn-primary" onclick="terminarTanda(${hasta}, ${ultima})" style="margin-top:6px">
      ${ultima ? 'TERMINAR LA SITUACIÓN' : `HECHO · QUEDAN ${todas.length - hasta}`}
    </button>
    ${ultima ? '' : `
      <button class="btn btn-ghost btn-sm" onclick="terminarTanda(${hasta}, true)" style="margin-top:8px;width:100%">
        Darla por practicada entera
      </button>`}
  `;
}

/**
 * Cierra una tanda. `hasta` es por qué frase se sigue la próxima vez.
 *
 * El score sólo se manda si se ha usado el micrófono: en el servidor su
 * presencia es lo que marca la meta de HABLAR, y marcarla sin hablar es
 * exactamente lo que tuvo esta sección a cero durante tres semanas.
 */
async function terminarTanda(hasta, completa) {
  if (!_wkCurrent) return;
  const avg = _wkScores.length
    ? Math.round(_wkScores.reduce((a, b) => a + b, 0) / _wkScores.length)
    : null;

  try {
    await apiPost(`/situations/${_wkCurrent.id}/practice`, {
      score: avg, completed: !!completa, lines_done: hasta,
    });
    _wkScores = [];

    if (completa) {
      toast('Situación practicada entera', 'success');
      showXpPop(avg != null ? 10 : 4);
      updateXpBar(_xpTotal + (avg != null ? 10 : 4));
      return loadWorkSituations();
    }

    // Sigue en la misma situación, con la tanda siguiente ya cargada.
    _wkCurrent.progress = { ...(_wkCurrent.progress || {}), lines_done: hasta };
    toast(`Hecho. Quedan ${(_wkCurrent.keys || []).length - hasta}`, 'success');
    showXpPop(4);
    updateXpBar(_xpTotal + 4);
    renderKeyPhrases();
    document.getElementById('work-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    toast('No se ha podido guardar', 'error');
  }
}

// ── LA IA SOBRE UN INTENTO ───────────────────────────────
// Las dos rutas de micrófono (frase clave y turno del role-play) pintan lo
// mismo: lo que se oyó, la nota de reconocimiento y el botón que pregunta a la
// IA por qué el móvil entendió otra cosa. Todo lo que viene del reconocedor se
// escapa: lo que se dicta acaba en pantalla tal cual.

/** Guarda el intento y devuelve su HTML. `clave`: 'k-<i>' o 't-<turno>'. */
function iaWkHtmlIntento(clave, objetivo, alternativas, score) {
  iaWkIntentos[clave] = { objetivo, alternativas, lang: iaWkLang() };
  const said  = alternativas[0]?.transcript || '';
  const color = score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)';
  return `
    <div style="font-size:0.7rem;color:var(--text-3)">Te he oído: «${escaparHtml(said)}»</div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
      <span style="font-size:0.62rem;color:var(--text-4)">reconocimiento</span>
      <span style="font-family:var(--font-mono);font-weight:700;color:${color}">${score}%</span>
    </div>
    <div class="ia-acciones" style="margin-top:6px">
      <button class="btn btn-subtle btn-sm" onclick="iaWkPorQue('${clave}', this)">¿POR QUÉ? · IA</button>
    </div>
    <div id="wk-ia-${clave}"></div>`;
}

/**
 * El diagnóstico del último intento de esa frase (POST /ia/pronunciacion). Si
 * sale bien el botón se quita, como en SONIDOS: otro toque pagaría la misma
 * respuesta y sumaría los mismos errores al repaso. Vuelve con el siguiente
 * intento, que repinta la caja del resultado entera.
 */
async function iaWkPorQue(clave, btn) {
  const i = iaWkIntentos[clave];
  const caja = document.getElementById(`wk-ia-${clave}`);
  if (!i?.objetivo || !i.alternativas?.length || !caja) { toast('Dila primero con el micro', 'error'); return; }
  await iaDiagnosticarPron({
    objetivo: i.objetivo, alternativas: i.alternativas, lang: i.lang, caja, btn,
  });
  if (caja.querySelector('.ia-caja') && btn?.isConnected) btn.remove();
}

/**
 * Con micro, el campo de dictado también está (toda entrada de voz acepta
 * texto): con ruido el reconocedor da "no-speech" una y otra vez y sólo
 * quedaba el error. Va plegado, para no competir con el micro, y fuera de
 * wk-result-* / wk-turn-result, que se reescriben en cada intento y se
 * llevarían lo dictado. Sin micro no se pinta aquí: sale abierto al tocar el
 * micro (iaWkMostrarDictado) con el mismo id, así que nunca hay dos. Como el
 * de abajo, no suma a `_wkScores`.
 */
function iaWkHtmlTeclado(id, objetivo) {
  if (!WkSpeechRec) return '';
  return iaHtmlPlegable('¿Prefieres dictarla con el teclado?', iaHtmlDictadoPron(id, objetivo, iaWkLang()));
}

/**
 * Sin micro de la app (iPhone con la app instalada, o el permiso denegado): la
 * frase se dicta con el micro del teclado y la IA dice qué se entendió. El
 * dictado no suma a `_wkScores`: no sale del reconocedor de la app, y la media
 * que se manda al cerrar es justo lo que marca HABLAR en el servidor.
 */
function iaWkHtmlDictado(id, objetivo, motivo) {
  return `<div style="font-size:0.7rem;color:var(--text-3);line-height:1.45">${motivo}
      Dila en alto o díctala con el micro del teclado, y la IA te dice qué se entiende.</div>
    ${iaHtmlDictadoPron(id, objetivo, iaWkLang())}`;
}

// Errores del micro que no se arreglan pulsando otra vez: ahí se ofrece dictar.
const IA_WK_SIN_SALIDA = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network']);

function iaWkHtmlErrorMicro(error, idDictado, objetivo) {
  const msg = typeof iaTextoErrorMicro === 'function' ? iaTextoErrorMicro(error) : `Error del micrófono: ${error}`;
  if (IA_WK_SIN_SALIDA.has(error)) {
    // El campo ya está debajo, plegado (iaWkHtmlTeclado): se abre ése en vez de
    // pintar otro con el mismo id.
    const plegado = document.getElementById(idDictado)?.closest?.('.ia-plegable');
    if (!plegado) return iaWkHtmlDictado(idDictado, objetivo, `${escaparHtml(msg)}`);
    plegado.open = true;
    return `<div style="font-size:0.7rem;color:var(--danger)">${escaparHtml(msg)}</div>
      <div style="font-size:0.7rem;color:var(--text-3);line-height:1.45;margin-top:4px">
        Dila en alto o díctala con el micro del teclado, aquí debajo, y la IA te dice qué se entiende.</div>`;
  }
  return `<div style="font-size:0.7rem;color:var(--danger)">${escaparHtml(msg)}</div>`;
}

/** Pinta el campo de dictado en `out` sin borrar lo que ya se hubiera dictado. */
function iaWkMostrarDictado(out, id, objetivo, motivo) {
  out.style.display = 'block';
  if (!document.getElementById(id)) out.innerHTML = iaWkHtmlDictado(id, objetivo, motivo);
  // Dentro del toque, el iPhone abre el teclado: queda a un toque del micro.
  document.getElementById(`${id}-txt`)?.focus();
}

// Repetir una frase y comprobar si se ha entendido
function wkPractice(idx, btn) {
  const line = _wkCurrent.keys[idx];
  const out  = document.getElementById(`wk-result-${idx}`);
  if (!line || !out) return;

  if (!WkSpeechRec) {
    iaWkMostrarDictado(out, `wk-dict-k-${idx}`, line.en,
      'Aquí la app no puede usar el micro (el iPhone no lo deja con la app instalada).');
    return;
  }

  if (_wkRecording) { _wkRec?.stop(); return; }

  _wkRec = new WkSpeechRec();
  _wkRec.lang = wkVoz();
  _wkRec.interimResults = false;
  // Cinco y no una: la segunda y la tercera dicen qué otra cosa pudo entender
  // el móvil, que es justo lo que lee la IA para decir qué sonido falla.
  _wkRec.maxAlternatives = 5;

  _wkRec.onstart = () => {
    _wkRecording = true;
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico">';
    btn.classList.add('recording');
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:0.7rem;color:var(--accent)">Escuchando… di la frase.</div>';
  };

  _wkRec.onerror = (e) => {
    // Con el permiso denegado no llega a haber onstart: la caja sigue oculta.
    out.style.display = 'block';
    out.innerHTML = iaWkHtmlErrorMicro(e.error, `wk-dict-k-${idx}`, line.en);
  };

  _wkRec.onend = () => {
    _wkRecording = false;
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
    btn.classList.remove('recording');
  };

  _wkRec.onresult = (ev) => {
    const alts = iaAlternativasDe(ev.results[0]);
    if (!alts.length) return;
    const score = wkCompare(line.en, alts[0].transcript);
    _wkScores.push(score);
    out.innerHTML = iaWkHtmlIntento(`k-${idx}`, line.en, alts, score);
  };

  try { _wkRec.start(); }
  catch { out.style.display = 'block'; out.innerHTML = '<div style="font-size:0.7rem;color:var(--danger)">No se pudo abrir el micrófono</div>'; }
}

// ── ROLE-PLAY ────────────────────────────────────────────
function renderRoleplay() {
  const panel = document.getElementById('work-panel');
  const turns = _wkCurrent.dialogue || [];

  if (!turns.length) {
    panel.innerHTML = '<div class="empty-state">Esta situación no tiene role-play todavía.</div>';
    return;
  }

  const visible = turns.slice(0, _wkTurn + 1);
  const current = turns[_wkTurn];
  const isLast  = _wkTurn >= turns.length - 1;

  panel.innerHTML = `
    <div class="glass-card">
      <div class="card-title">LA CONVERSACIÓN</div>
      <div id="wk-chat">
        ${visible.map((t, i) => `
          <div style="display:flex;justify-content:${t.kind === 'you' ? 'flex-end' : 'flex-start'};margin-bottom:8px">
            <div style="max-width:82%;padding:9px 12px;border-radius:14px;
                        background:${t.kind === 'you' ? 'var(--accent-dim)' : 'var(--surface-2)'};
                        ${i === _wkTurn ? 'outline:1px solid var(--accent)' : ''}">
              <div style="font-size:0.58rem;font-family:var(--font-mono);color:var(--text-4);letter-spacing:1px;margin-bottom:3px">
                ${t.kind === 'you' ? 'TÚ' : (_wkCurrent?.lang === 'fr' ? 'INTERLOCUTOR' : 'CLIENTE')}
              </div>
              <div style="font-size:0.85rem;color:var(--text);line-height:1.35">${escaparHtml(t.en)}</div>
              ${i === _wkTurn ? wkPron(t) : ''}
              <div style="font-size:0.72rem;color:var(--text-3);margin-top:3px">${escaparHtml(t.es)}</div>
              ${t.note && i === _wkTurn ? `<div style="font-size:0.65rem;color:var(--text-3);margin-top:6px;padding-top:6px;border-top:1px solid var(--surface-3)"><img src="src/img/icons/idea.png" alt="" class="ico"> ${escaparHtml(t.note)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <div id="wk-turn-result" style="display:none;margin:8px 0"></div>
      ${current.kind === 'you' ? iaWkHtmlTeclado(`wk-dict-t-${_wkTurn}`, current.en) : ''}

      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="btn btn-ghost" style="flex:1" data-wk-texto="${escaparAttr(current.en)}" onclick="wkSpeak(this.dataset.wkTexto, this, ${JSON.stringify(current.id ?? null)})">
          <img src="src/img/icons/listen.png" alt="" class="ico"> Escuchar
        </button>
        ${current.kind === 'you' ? `
          <button class="btn btn-ghost" style="flex:1" onclick="wkPracticeTurn(this)"><img src="src/img/icons/mic.png" alt="" class="ico"> Decirlo</button>
        ` : ''}
        <button class="btn btn-primary" style="flex:1" onclick="${isLast ? 'finishSituation()' : 'wkNextTurn()'}">
          ${isLast ? 'TERMINAR' : 'SIGUIENTE →'}
        </button>
      </div>
      <div class="progress-bar" style="margin-top:12px">
        <div class="progress-fill" style="width:${Math.round(((_wkTurn + 1) / turns.length) * 100)}%"></div>
      </div>
      <div class="progress-label">Turno ${_wkTurn + 1} de ${turns.length}</div>
    </div>
  `;
}

function wkNextTurn() {
  const turns = _wkCurrent.dialogue || [];
  if (_wkTurn < turns.length - 1) {
    _wkTurn++;
    renderRoleplay();
    // Si el turno nuevo es del cliente, léelo solo
    const t = turns[_wkTurn];
    if (t.kind === 'customer') setTimeout(() => wkSpeak(t.en, null, t.id ?? null), 250);
  }
}

function wkPracticeTurn(btn) {
  const turns   = _wkCurrent.dialogue || [];
  const current = turns[_wkTurn];
  const out     = document.getElementById('wk-turn-result');
  if (!current || !out) return;

  const turno = _wkTurn;
  if (!WkSpeechRec) {
    iaWkMostrarDictado(out, `wk-dict-t-${turno}`, current.en,
      'Aquí la app no puede usar el micro (el iPhone no lo deja con la app instalada).');
    return;
  }

  if (_wkRecording) { _wkRec?.stop(); return; }

  _wkRec = new WkSpeechRec();
  _wkRec.lang = wkVoz();
  _wkRec.interimResults = false;
  _wkRec.maxAlternatives = 5;   // ver wkPractice

  _wkRec.onstart = () => {
    _wkRecording = true;
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico"> Grabando';
    out.style.display = 'block';
    out.innerHTML = '<div style="font-size:0.7rem;color:var(--accent)">Escuchando…</div>';
  };
  _wkRec.onerror = (e) => {
    out.style.display = 'block';   // ver wkPractice
    out.innerHTML = iaWkHtmlErrorMicro(e.error, `wk-dict-t-${turno}`, current.en);
  };
  _wkRec.onend = () => {
    _wkRecording = false;
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico"> Decirlo';
  };
  _wkRec.onresult = (ev) => {
    const alts = iaAlternativasDe(ev.results[0]);
    if (!alts.length) return;
    const score = wkCompare(current.en, alts[0].transcript);
    _wkScores.push(score);
    out.innerHTML = iaWkHtmlIntento(`t-${turno}`, current.en, alts, score);
  };

  try { _wkRec.start(); }
  catch { out.style.display = 'block'; out.innerHTML = '<div style="font-size:0.7rem;color:var(--danger)">No se pudo abrir el micrófono</div>'; }
}

// ── CERRAR LA SITUACIÓN ──────────────────────────────────
//
// No hay PUT /daily-goals {speaking_done:true} aquí, y no se debe volver a
// poner. Lo había, sin condición, y marcaba HABLAR con sólo pulsar SIGUIENTE
// hasta el final del guion sin abrir la boca. Quien marca es el servidor: POST
// /situations/:id/practice escribe speaking_done=TRUE (y la sesión de speaking
// y la racha) sólo si llega `score`, y `score` sólo existe si el reconocedor
// del micro devolvió algo (`_wkScores`; el dictado del teclado no suma).
async function finishSituation() {
  if (!_wkCurrent) return;
  const avg = _wkScores.length
    ? Math.round(_wkScores.reduce((a, b) => a + b, 0) / _wkScores.length)
    : null;

  try {
    await apiPost(`/situations/${_wkCurrent.id}/practice`, { score: avg, completed: true });
    _wkScores = [];
    toast('Situación practicada', 'success');
    // Lo mismo que suma el servidor: 10 con micro, 4 sin él.
    const xp = avg != null ? 10 : 4;
    showXpPop(xp);
    updateXpBar(_xpTotal + xp);
    _wkInited = false;
    await loadWorkSituations();
  } catch (e) {
    toastError(e);
  }
}
