// TutorIngles — progress.js (NeumorphGlass Apple)
// Módulo de progreso: roadmap, stats, habilidades, countdown, logros, y las dos
// tarjetas de la IA (el consejo de la semana y lo que más fallas), que son lo
// único de esta pantalla con lo que se puede hacer algo.

// ── STATE ────────────────────────────────────────────────
let _progressInited = false;

// ── INIT ─────────────────────────────────────────────────
// El panel de números se pinta UNA vez por carga: sale de /stats y no cambia
// mientras se mira. Las tarjetas de la IA, en cambio, se repintan en CADA
// entrada (iaPintarProgreso): si acabas de conversar o de marcar "ya no lo
// fallo" en otra visita, al volver tiene que verse.
async function initProgress() {
  const container = document.getElementById('progress-content');
  if (!container) return;
  if (_progressInited) { iaPintarProgreso(); return; }
  _progressInited = true;

  container.innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;

  try {
    const stats = await apiGet('/stats') || {};
    renderProgressDashboard(stats);
    iaPintarProgreso();
  } catch (e) {
    // Se suelta el candado: sin esto, un fallo de red al entrar dejaba el error
    // puesto hasta recargar la app, porque volver a entrar no hacía nada.
    _progressInited = false;
    container.innerHTML = cajaError(e, 'initProgress');
  }
}

// ── DASHBOARD PRINCIPAL ───────────────────────────────────
function renderProgressDashboard(stats) {
  const container  = document.getElementById('progress-content');
  const levels     = ['A2', 'B1', 'B2', 'C1'];
  const levelColors = { A2: 'var(--level-a2)', B1: 'var(--level-b1)', B2: 'var(--level-b2)', C1: 'var(--level-c1)' };
  // Sin nivel demostrado, el roadmap arranca en A2 pero se marca como no confirmado.
  const hasLevel   = Boolean(stats.estimated_level);
  // En francés no hay simulacros ni fecha de examen todavía: la ruta es la del
  // DALF y la cuenta atrás no se enseña, en vez de contar hacia la del CAE.
  const frances    = stats.idioma === 'fr';
  const currentLvl = stats.estimated_level || 'A2';
  const currentIdx = levels.indexOf(currentLvl);

  // Configuración de examen (meta)
  // Sin fecha de examen no hay cuenta atrás. Antes se caía al 1-dic "por
  // defecto", y la pantalla contaba días hacia un examen que nadie tenía
  // puesto. Desde el 28-sep el Cambridge es un objetivo sin fecha.
  const conFecha   = !frances && Boolean(stats.exam_date);
  const targetDate = stats.exam_date || '2026-12-01';
  const now        = new Date();
  const examDt     = new Date(targetDate);
  const totalDays  = Math.ceil((examDt - new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())) / 864e5);
  const daysLeft   = Math.max(0, Math.ceil((examDt - now) / 864e5));
  const daysPct    = totalDays > 0 ? Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100)) : 0;

  // XP / Rango
  const xp       = stats.xp_total || 0;
  const rankData = calcRank ? calcRank(xp) : { rank: { rank: 'D', label: 'Principiante', xp: 0 }, next: { rank: 'C', xp: 500 } };
  const { rank, next } = rankData;
  const xpPct = next ? Math.min(100, Math.round(((xp - rank.xp) / (next.xp - rank.xp)) * 100)) : 100;

  // Habilidades. El nivel viene calculado del servidor con los intentos reales;
  // si no hay datos suficientes llega como null y aquí se muestra un guion.
  // Nunca se rellena con un nivel inventado.
  const sk = stats.skills || {};
  const skills = [
    { key: 'reading',   icon: '<img src="src/img/icons/vocab.png" alt="" class="ico">', name: 'Reading',    pct: sk.reading?.pct   ?? 0, estLvl: sk.reading?.level   || null },
    { key: 'writing',   icon: '<img src="src/img/icons/writing.png" alt="" class="ico">',  name: 'Writing',    pct: sk.writing?.pct   ?? 0, estLvl: sk.writing?.level   || null },
    { key: 'listening', icon: '<img src="src/img/icons/headphones.png" alt="" class="ico">', name: 'Listening',  pct: sk.listening?.pct ?? 0, estLvl: sk.listening?.level || null },
    { key: 'speaking',  icon: '<img src="src/img/icons/speak.png" alt="" class="ico">',  name: 'Speaking',   pct: sk.speaking?.pct  ?? 0, estLvl: sk.speaking?.level  || null },
    { key: 'vocab',     icon: '<img src="src/img/icons/gram.png" alt="" class="ico">', name: 'Vocabulary', pct: sk.vocab?.pct     ?? (stats.vocab_pct || 0), estLvl: sk.vocab?.level || null },
  ];

  // Logros disponibles
  const totalWords = stats.words_total || 1000;
  const achievements = [
    { icon: '<img src="src/img/icons/sprout.png" alt="" class="ico">', name: 'Primera palabra', desc: '¡Empezaste tu viaje!', done: (stats.words_mastered || 0) >= 1 },
    { icon: '<img src="src/img/icons/streak.png" alt="" class="ico">', name: 'Semana de fuego', desc: '7 días de racha',      done: (stats.streak_max  || 0) >= 7 },
    { icon: '<img src="src/img/icons/books.png" alt="" class="ico">', name: '100 palabras',    desc: 'Vocabulario sólido',   done: (stats.words_mastered || 0) >= 100 },
    { icon: '<img src="src/img/icons/exam.png" alt="" class="ico">', name: 'Primer examen',   desc: 'Simulacro completado', done: (stats.exams_done  || 0) >= 1 },
    { icon: '<img src="src/img/icons/star.png" alt="" class="ico">', name: 'Racha 30 días',   desc: 'Constancia legendaria', done: (stats.streak_max || 0) >= 30 },
    { icon: '<img src="src/img/icons/trophy.png" alt="" class="ico">', name: 'Nivel B1',        desc: 'Superaste A2',         done: currentIdx > 0 },
  ];

  // Roadmap progress %
  const roadmapPct = (currentIdx / (levels.length - 1)) * 100;

  // Countdown arc (SVG — dashoffset)
  const circumference = 2 * Math.PI * 30; // r=30
  const arcFilled = circumference * (daysPct / 100);
  const dashOffset = circumference - arcFilled;

  container.innerHTML = `

    <!-- 1. ROADMAP A2→B1→B2→C1 ─────────────────────────── -->
    <div class="glass-card-accent anim-fade-in">
      <div class="card-title" style="text-align:center;margin-bottom:16px">
        <img src="src/img/icons/trophy.png" alt="" class="ico"> ${frances ? 'FRANCÉS · DALF C1' : 'CAMBRIDGE CAE'} — RUTA DE APRENDIZAJE
      </div>
      <div class="prg-roadmap">
        <div class="prg-roadmap-line">
          <div class="prg-roadmap-fill" style="width:${roadmapPct}%"></div>
        </div>
        ${levels.map((lvl, i) => `
          <div class="prg-node ${i < currentIdx ? 'done' : ''} ${i === currentIdx ? 'current' : ''}">
            <div class="prg-node-circle">${i < currentIdx ? '✓' : lvl}</div>
            <div class="prg-node-label">${i === currentIdx ? 'AHORA' : i < currentIdx ? 'DONE' : lvl}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- 2. CARD GRANDE DE NIVEL ACTUAL ──────────────────── -->
    <div class="prg-level-card anim-slide-up">
      <div class="prg-level-tag">${hasLevel ? 'NIVEL ACTUAL' : 'NIVEL SIN MEDIR'}</div>
      <div class="prg-level-badge-big" style="color:${levelColors[currentLvl]};border-color:${levelColors[currentLvl]}33;background:${levelColors[currentLvl]}18${hasLevel ? '' : ';opacity:.4'}">
        ${hasLevel ? currentLvl : '—'}
      </div>
      <div class="prg-level-subtitle">${hasLevel
        ? `Estimado con ${stats.level_evidence} destreza${stats.level_evidence === 1 ? '' : 's'} medida${stats.level_evidence === 1 ? '' : 's'}`
        : 'Haz simulacros para que podamos medirlo'}</div>

      <div class="prg-level-xp-row">
        <span class="prg-level-xp-label">${xp.toLocaleString()} XP</span>
        <div class="progress-bar" style="flex:1">
          <div class="progress-fill" style="width:${xpPct}%"></div>
        </div>
        <span class="prg-level-pct">${xpPct}%</span>
      </div>
      <div style="font-family:var(--font-mono);font-size:0.55rem;color:var(--text-muted);text-align:right;margin-top:2px">
        ${next ? `${next.xp.toLocaleString()} XP para rango ${next.rank}` : 'Rango máximo'}
      </div>

      <div style="display:flex;justify-content:center;gap:12px;margin-top:16px">
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--warning)"><img src="src/img/icons/streak.png" alt="" class="ico"> ${stats.streak || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">RACHA ACTUAL</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.30)"></div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--success)">${stats.words_mastered || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">PALABRAS DOM.</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.30)"></div>
        <div style="text-align:center">
          <div style="font-family:var(--font-mono);font-size:1.2rem;font-weight:700;color:var(--accent)">${stats.sessions_this_week || 0}</div>
          <div style="font-size:0.55rem;color:var(--text-muted);letter-spacing:1.5px;margin-top:2px">SES / SEMANA</div>
        </div>
      </div>
    </div>

    <!-- 2b. IA: CONSEJO DE LA SEMANA y LO QUE MÁS FALLAS ──── -->
    <!-- Van aquí, antes de los números, porque son lo único accionable. Las
         rellena iaPintarProgreso() en cada entrada, no esta plantilla. -->
    <div class="glass-card anim-slide-up" id="ia-prg-consejo"></div>
    <div class="glass-card anim-slide-up" id="ia-prg-fallos" style="animation-delay:0.05s"></div>

    <!-- 3. STATS GRID (4 cards pequeñas) ────────────────── -->
    <div class="prg-stats-grid">
      <div class="prg-stat-card">
        <span class="prg-stat-icon"><img src="src/img/icons/books.png" alt="" class="ico"></span>
        <div class="prg-stat-value">${(stats.words_mastered || 0).toLocaleString()}</div>
        <div class="prg-stat-label">Palabras aprendidas</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon"><img src="src/img/icons/streak.png" alt="" class="ico"></span>
        <div class="prg-stat-value" style="color:var(--warning)">${stats.streak || 0}</div>
        <div class="prg-stat-label">Días de racha</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon"><img src="src/img/icons/exam.png" alt="" class="ico"></span>
        <div class="prg-stat-value" style="color:var(--success)">${stats.sessions_total || 0}</div>
        <div class="prg-stat-label">Sesiones totales</div>
      </div>
      <div class="prg-stat-card">
        <span class="prg-stat-icon"><img src="src/img/icons/star.png" alt="" class="ico"></span>
        <div class="prg-stat-value" style="color:var(--level-c1)">${stats.best_exam_score != null ? stats.best_exam_score + '%' : '—'}</div>
        <div class="prg-stat-label">Mejor nota examen</div>
      </div>
    </div>

    <!-- 4. PROGRESO POR HABILIDAD (5 barras) ────────────── -->
    <div class="prg-skills-card anim-slide-up" style="animation-delay:0.1s">
      <div class="card-title">PROGRESO POR HABILIDAD</div>
      ${skills.map(s => `
        <div class="prg-skill-row">
          <span class="prg-skill-icon">${s.icon}</span>
          <div class="prg-skill-info">
            <div class="prg-skill-header">
              <span class="prg-skill-name">${s.name}</span>
              <span class="prg-skill-lvl skill-lvl-${s.key}"
                    ${s.estLvl ? '' : 'style="opacity:.45" title="Sin datos suficientes: haz ejercicios de esta destreza"'}
                >${s.estLvl || '—'}</span>
            </div>
            <div class="prg-skill-bar">
              <div class="prg-skill-fill skill-${s.key}" style="width:${s.pct}%"></div>
            </div>
          </div>
          <span style="font-family:var(--font-mono);font-size:0.62rem;color:var(--text-muted);min-width:32px;text-align:right">${s.pct}%</span>
        </div>
      `).join('')}
    </div>

    <!-- 5. COUNTDOWN AL EXAMEN ───────────────────────────── -->
    <div class="prg-countdown-card anim-slide-up" style="animation-delay:0.15s;${conFecha ? '' : 'display:none'}">
      <div class="prg-countdown-svg">
        <svg viewBox="0 0 72 72" width="72" height="72">
          <defs>
            <linearGradient id="cntGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#34aadc"/>
              <stop offset="100%" style="stop-color:#007aff"/>
            </linearGradient>
          </defs>
          <circle class="prg-countdown-track" cx="36" cy="36" r="30"/>
          <circle class="prg-countdown-arc" cx="36" cy="36" r="30"
            id="cnt-arc"
            style="stroke-dashoffset:${dashOffset.toFixed(1)}"/>
        </svg>
        <div class="prg-countdown-center">
          <span class="prg-countdown-days">${daysLeft}</span>
          <span class="prg-countdown-dslabel">DÍAS</span>
        </div>
      </div>
      <div class="prg-countdown-info">
        <div class="prg-countdown-title">Faltan ${daysLeft} días para el CAE</div>
        <div class="prg-countdown-subtitle">
          ${daysPct}% del tiempo de preparación completado
        </div>
        <div class="prg-countdown-date">
          ${examDt.toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>
    </div>

    <!-- 6. LOGROS RECIENTES ──────────────────────────────── -->
    <div class="glass-card anim-slide-up" style="animation-delay:0.2s">
      <div class="card-title">LOGROS</div>
      <div class="prg-achievements-grid">
        ${achievements.map(a => `
          <div class="prg-achievement ${a.done ? '' : 'locked'}">
            ${a.done ? '<div class="prg-achievement-check">✓</div>' : ''}
            <span class="prg-achievement-icon">${a.icon}</span>
            <div class="prg-achievement-text">
              <div class="prg-achievement-name">${a.name}</div>
              <div class="prg-achievement-desc">${a.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Records / Best marks ──────────────────────────────── -->
    <div class="nm-card anim-slide-up" style="animation-delay:0.25s">
      <div class="card-title">RÉCORDS</div>
      <div class="prg-records-strip">
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--warning)"><img src="src/img/icons/streak.png" alt="" class="ico"> ${stats.streak_max || 0}</div>
          <div class="prg-record-label">Racha máxima</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.25)"></div>
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--accent)">${xp.toLocaleString()}</div>
          <div class="prg-record-label">XP Total</div>
        </div>
        <div style="width:1px;background:rgba(156,190,214,0.25)"></div>
        <div class="prg-record-item">
          <div class="prg-record-value" style="color:var(--success)">${conFecha ? daysLeft : '—'}</div>
          <div class="prg-record-label">${conFecha ? 'Días para CAE' : 'Sin fecha de examen'}</div>
        </div>
      </div>
    </div>

  `;

  // Animar el arco SVG con un pequeño delay para la transición
  requestAnimationFrame(() => {
    const arc = document.getElementById('cnt-arc');
    if (arc) {
      arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)';
    }
  });
}

// ── XP / RANGO ────────────────────────────────────────────
// (calcRank() puede estar definido en app.js; si no, la
//  función initProgress lo maneja con un fallback)

// ════════════════════════════════════════════════════════
// IA: CONSEJO DE LA SEMANA y LO QUE MÁS FALLAS
// ════════════════════════════════════════════════════════
// Las dos salen de la IA (ver "IA con la API de Claude" en CLAUDE.md), pero
// cuestan muy distinto, y eso decide cómo se cargan:
//
//  - LO QUE MÁS FALLAS es una consulta a la base (GET /ia/perfil): los errores
//    que Claude ha ido encontrando al corregirte, contados. Gratis, así que se
//    carga sola en cada entrada.
//  - EL CONSEJO es una llamada a Claude con todos tus datos: cuesta, así que
//    NUNCA se pide solo. El último se guarda en el móvil (localStorage, uno por
//    idioma) y se enseña con su fecha; pasada una semana, se invita a pedir
//    otro. No hay copia en el servidor: perderlo (otro móvil, datos borrados)
//    sólo obliga a pedirlo de nuevo.
//
// Todo lo que pintan viene de la IA o de la base, así que pasa por escaparHtml,
// y los botones llevan un id o un índice, nunca un texto (cabecera de ia.js).

const IA_PRG_MAX_FALLOS   = 8;   // los que se ven; del resto sólo se dice cuántos
const IA_PRG_DIAS_CONSEJO = 7;   // pasado esto, el consejo ya no es "de la semana"

// A dónde lleva cada prioridad del consejo. Claude elige `seccion` de una lista
// cerrada (SECCIONES_APP en lib/ia-prompts.js), pero aquí se valida igual: lo
// que no esté en este mapa se pinta sin botón. `nombre` es el de la pestaña,
// para que el botón diga a dónde vas con la palabra que ya ves en la barra.
const IA_PRG_DESTINOS = {
  sesion:     { sec: 'hoy',      nombre: 'LA SESIÓN' },
  trabajo:    { sec: 'work',     nombre: 'TRABAJO' },
  palabras:   { sec: 'vocab',    nombre: 'PALABRAS' },
  sonidos:    { sec: 'pron',     nombre: 'SONIDOS' },
  hablar:     { sec: 'speak',    nombre: 'HABLAR' },
  conversar:  { sec: 'speak',    nombre: 'CONVERSAR' },
  escribir:   { sec: 'escribir', nombre: 'ESCRIBIR' },
  gramatica:  { sec: 'gram',     nombre: 'GRAMÁTICA' },
  simulacros: { sec: 'exam',     nombre: 'SIMULACROS' },
  tetris:     { sec: 'hoy',      nombre: 'HOY' },
};

let iaPrgPerfil        = null;   // { lang, errores } de la última GET /ia/perfil
let iaPrgPeticion      = 0;      // para tirar las respuestas que llegan tarde
let iaPrgConsejoActual = null;   // el consejo pintado: los botones IR leen de aquí
let iaPrgPidiendo      = false;  // consejo en camino: ni otro pago ni repintar encima

/** Repinta las dos tarjetas. Lo llama initProgress en CADA entrada a PROGRESO. */
function iaPintarProgreso() {
  // Nada de aquí puede tumbar PROGRESO: initProgress la llama dentro de su
  // try, y un fallo en estas tarjetas cambiaría el panel entero por un error.
  try {
    // Con un consejo en camino no se repinta su tarjeta: se perdería el
    // "pensando…" y el botón volvería a estar activo para pagar otra vez.
    if (!iaPrgPidiendo) iaPrgPintarConsejo();
    iaPrgCargarFallos().catch((e) => console.error('[ia] progreso:', e));
  } catch (e) {
    console.error('[ia] progreso:', e);
  }
}

// ── Piezas puras (se prueban sin navegador) ─────────────

/** Días de calendario, en hora local, de `fecha` a `ahora`. null si no es una fecha. */
function iaPrgDiasDesde(fecha, ahora = new Date()) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  // Medianoche contra medianoche: "ayer a las 23:50" es ayer aunque hayan
  // pasado diez minutos, y el cambio de hora no descuadra la cuenta.
  const dia = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  return Math.max(0, Math.round((dia(ahora) - dia(d)) / 864e5));
}

/** 0 → 'hoy', 1 → 'ayer', n → 'hace n días'. */
function iaPrgHace(dias) {
  if (dias == null || !Number.isFinite(dias)) return '';
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${Math.round(dias)} días`;
}

/** El destino de una `seccion` del consejo, o null si no es de la lista. */
function iaPrgDestino(seccion) {
  return typeof seccion === 'string' && Object.prototype.hasOwnProperty.call(IA_PRG_DESTINOS, seccion)
    ? IA_PRG_DESTINOS[seccion] : null;
}

/**
 * Cómo se llega a `seccion`: `sec` es a dónde ir con goTo y `abrir`, qué abrir
 * después. `hay` dice qué funciones de otras pantallas existen (charlaAbrir,
 * empezarSesion): sin la conversación, CONVERSAR cae a HABLAR. null si la
 * sección no es de la lista.
 */
function iaPrgNavegacion(seccion, hay = {}) {
  const d = iaPrgDestino(seccion);
  if (!d) return null;
  if (seccion === 'conversar' && hay.charla) return { abrir: 'charla' };
  if (seccion === 'sesion' && hay.sesion) return { sec: 'hoy', abrir: 'sesion' };
  if (seccion === 'tetris') return { sec: 'hoy', abrir: 'tetris' };
  return { sec: d.sec };
}

/**
 * Los errores del perfil en dos montones: los que se vigilan, del más repetido
 * al menos (a igualdad, el más reciente primero), y los superados. El servidor
 * ya los manda así; se repite aquí porque "ya no lo fallo" cambia el estado en
 * local sin volver a pedirlos.
 */
function iaPrgOrdenarFallos(errores) {
  const lista = (Array.isArray(errores) ? errores : [])
    .filter((e) => e && Number.isInteger(Number(e.id)) && Number(e.id) > 0 && e.clave);
  const orden = (a, b) => ((Number(b.veces) || 0) - (Number(a.veces) || 0))
    || ((Date.parse(b.ultima) || 0) - (Date.parse(a.ultima) || 0));
  return {
    activos: lista.filter((e) => !e.superado).sort(orden),
    superados: lista.filter((e) => e.superado).sort(orden),
  };
}

/**
 * Lo que se guarda y se pinta de POST /ia/consejo: sólo los campos que se usan,
 * como texto, y tres prioridades como mucho. null si no trae nada que enseñar:
 * mejor un error claro que una tarjeta vacía guardada una semana.
 */
function iaPrgLimpiarConsejo(r) {
  if (!r || typeof r !== 'object') return null;
  const txt = (v) => (typeof v === 'string' ? v.trim() : '');
  const prioridades = (Array.isArray(r.prioridades) ? r.prioridades : [])
    .filter((p) => p && typeof p === 'object' && txt(p.titulo))
    .slice(0, 3)
    .map((p) => ({ titulo: txt(p.titulo), por_que: txt(p.por_que), como: txt(p.como), seccion: txt(p.seccion) }));
  const datos = {
    diagnostico: txt(r.diagnostico),
    prioridades,
    frase_semana: txt(r.frase_semana),
    frase_semana_es: txt(r.frase_semana_es),
    coste: Number(r.coste) || 0,
  };
  return datos.diagnostico || prioridades.length || datos.frase_semana ? datos : null;
}

/** Nombre del tipo de error ('gramatica' → 'gramática'), o '' si no se conoce. */
const iaPrgTipo = (t) => (typeof IA_TIPOS !== 'undefined' && Object.prototype.hasOwnProperty.call(IA_TIPOS, t) ? IA_TIPOS[t] : '');

/** Sólo 'en' o 'fr': va a atributos `lang` y a la voz. */
const iaPrgLang = (lang) => (lang === 'fr' ? 'fr' : 'en');

// ── El consejo guardado en el móvil ──────────────────────
// Clave `ia_consejo_<lang>` → { fecha (ISO), lang, datos }, con `datos` en la
// forma de iaPrgLimpiarConsejo. Otra pantalla puede leerlo (la frase de la
// semana, por ejemplo) con iaPrgConsejoGuardado(lang): no cuesta nada.

const iaPrgClaveConsejo = (lang) => `ia_consejo_${iaPrgLang(lang)}`;

function iaPrgConsejoGuardado(lang = _idioma) {
  try {
    const g = JSON.parse(localStorage.getItem(iaPrgClaveConsejo(lang)) || 'null');
    if (!g || typeof g !== 'object' || iaPrgDiasDesde(g.fecha) == null) return null;
    const datos = iaPrgLimpiarConsejo(g.datos);   // por si lo guardó otra versión
    return datos ? { fecha: g.fecha, lang: iaPrgLang(lang), datos } : null;
  } catch { return null; }
}

function iaPrgGuardarConsejo(lang, datos) {
  const g = { fecha: new Date().toISOString(), lang: iaPrgLang(lang), datos };
  // Sin almacenamiento (navegación privada, Safari sin espacio) se enseña igual:
  // sólo que la próxima vez no estará.
  try { localStorage.setItem(iaPrgClaveConsejo(lang), JSON.stringify(g)); } catch {}
  return g;
}

// ── Tarjeta: CONSEJO DE LA SEMANA ────────────────────────

const IA_PRG_P = 'font-size:0.8rem;line-height:1.55;color:var(--text-2);margin:0 0 12px';

function iaPrgPintarConsejo() {
  const caja = document.getElementById('ia-prg-consejo');
  if (!caja) return;
  iaPrgConsejoActual = iaPrgConsejoGuardado(_idioma);
  caja.innerHTML = iaPrgHtmlConsejo(iaPrgConsejoActual, _idioma);
}

function iaPrgHtmlConsejo(g, lang) {
  const titulo = '<div class="card-title">CONSEJO DE LA SEMANA</div>';
  // Aquí van el "pensando…" y los errores: debajo del botón, sin tapar el
  // consejo anterior, que sigue sirviendo mientras tanto.
  const hueco = '<div id="ia-prg-consejo-msg"></div>';
  const boton = (texto, clase = 'btn btn-subtle') =>
    `<button class="${clase}" id="ia-prg-consejo-btn" onclick="iaPrgPedirConsejo(this)">${texto}</button>`;

  if (!g) {
    return `${titulo}
      <p style="${IA_PRG_P}">Claude mira lo que has hecho en la app (lo que repasas, lo que practicas
        y lo que más fallas) y te dice las tres cosas que más te harían avanzar esta semana, con
        una frase para llevar en la cabeza.</p>
      ${boton(`${ico('idea', 18)} PEDIR CONSEJO`)}
      <div class="ia-pie">Es una llamada a la IA (unos céntimos). Se queda guardado en este móvil hasta que pidas otro.</div>
      ${hueco}`;
  }

  const dias = iaPrgDiasDesde(g.fecha);
  const cuerpo = iaPrgHtmlCuerpoConsejo(g.datos, lang);
  if (dias > IA_PRG_DIAS_CONSEJO) {
    return `${titulo}
      <p style="${IA_PRG_P}">Tu último consejo es de ${iaPrgHace(dias)}: ya no habla de esta semana.
        Pide otro y lo hará con lo que has hecho desde entonces.</p>
      ${boton(`${ico('idea', 18)} PEDIR CONSEJO NUEVO`)}
      ${hueco}
      ${iaHtmlPlegable('Ver el anterior', cuerpo)}`;
  }

  return `${titulo}
    <div class="ia-cabeza"><span class="ia-marca">IA</span><span>De ${iaPrgHace(dias)}</span></div>
    ${cuerpo}
    ${iaHtmlCoste(g.datos.coste)}
    <div class="ia-acciones">${boton('ACTUALIZAR', 'btn btn-subtle btn-sm')}</div>
    ${hueco}`;
}

/** Frase de la semana, diagnóstico y prioridades. Los botones IR llevan sólo el índice. */
function iaPrgHtmlCuerpoConsejo(d, lang) {
  const l = iaPrgLang(lang);
  const frase = d.frase_semana ? `
    <div class="ia-siguiente" style="margin-top:0">
      <div class="ia-bloque-tit" style="margin:0 0 6px">Frase de la semana</div>
      <div style="display:flex;align-items:center;gap:8px">
        <b lang="${l}" style="flex:1;min-width:0;font-size:0.95rem;line-height:1.4">${escaparHtml(d.frase_semana)}</b>
        ${iaHtmlBotonDecir(d.frase_semana, l)}
      </div>
      ${d.frase_semana_es ? `<div class="ia-expl">${escaparHtml(d.frase_semana_es)}</div>` : ''}
    </div>` : '';

  const prioridades = d.prioridades.map((p, i) => {
    const dest = iaPrgDestino(p.seccion);
    return `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(156,190,214,0.35)">
        <span style="font-family:var(--font-mono);font-weight:700;font-size:0.9rem;color:var(--accent);line-height:1.4">${i + 1}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;line-height:1.4">${escaparHtml(p.titulo)}</div>
          ${p.por_que ? `<div class="ia-expl">${escaparHtml(p.por_que)}</div>` : ''}
          ${p.como ? `<div style="margin-top:4px">${escaparHtml(p.como)}</div>` : ''}
          ${dest ? `<div class="ia-acciones" style="margin-top:8px">
            <button class="btn btn-ghost btn-sm" onclick="iaPrgIr(${i})">IR A ${dest.nombre} →</button>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `<div style="font-size:0.8rem;line-height:1.55;color:var(--text)">
    ${frase}
    ${d.diagnostico ? `<p style="margin:12px 0 4px">${escaparHtml(d.diagnostico)}</p>` : ''}
    ${prioridades ? `<div class="ia-bloque-tit">Esta semana, por orden</div>${prioridades}` : ''}
  </div>`;
}

/**
 * Pide un consejo nuevo (cuesta: sólo detrás de este botón). Sin `btn` (el
 * REINTENTAR de la caja de error) se usa el botón de la tarjeta.
 */
async function iaPrgPedirConsejo(btn) {
  if (iaPrgPidiendo) return;
  const lang = _idioma;
  iaPrgPidiendo = true;
  const restaurar = iaOcupar(btn || document.getElementById('ia-prg-consejo-btn'), 'PENSANDO…');
  const msg = document.getElementById('ia-prg-consejo-msg');
  if (msg) msg.innerHTML = iaHtmlCargando('Claude está mirando tus datos. Puede tardar un minuto…');
  try {
    const datos = iaPrgLimpiarConsejo(await iaPost('/ia/consejo', { lang }));
    if (!datos) throw Object.assign(new Error('La IA no ha devuelto ningún consejo. Vuelve a intentarlo.'), { codigo: 'vacio' });
    iaPrgGuardarConsejo(lang, datos);
    iaPrgPidiendo = false;
    iaPrgPintarConsejo();
  } catch (e) {
    iaPrgPidiendo = false;
    restaurar();
    const m = document.getElementById('ia-prg-consejo-msg');
    if (m) m.innerHTML = iaHtmlError(e, 'iaPrgPedirConsejo()');
  }
}

function iaPrgIr(i) {
  const p = iaPrgConsejoActual?.datos?.prioridades?.[Number(i)];
  if (p) iaPrgIrA(p.seccion);
}

function iaPrgIrA(seccion) {
  const plan = iaPrgNavegacion(seccion, {
    charla: typeof charlaAbrir === 'function',
    sesion: typeof empezarSesion === 'function',
  });
  if (!plan) return;
  // #cnt es el scroll de toda la app: sin subirlo, la pantalla de destino se
  // abría a la altura a la que estaba PROGRESO, que es casi al fondo.
  const cnt = document.getElementById('cnt');
  if (plan.abrir === 'charla') { charlaAbrir(); cnt?.scrollTo({ top: 0 }); return; }
  goTo(plan.sec);
  if (plan.abrir === 'sesion') { empezarSesion(); return; }   // ya sube arriba ella sola
  const tetris = plan.abrir === 'tetris' ? document.getElementById('tetris-hoy') : null;
  if (tetris && tetris.offsetHeight) tetris.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else cnt?.scrollTo({ top: 0 });
}

// ── Tarjeta: LO QUE MÁS FALLAS ───────────────────────────

const iaPrgTituloFallos = () => '<div class="card-title">LO QUE MÁS FALLAS</div>';

async function iaPrgCargarFallos() {
  const caja = document.getElementById('ia-prg-fallos');
  if (!caja) return;
  const lang = _idioma;
  const n = ++iaPrgPeticion;
  const hayAntes = !!iaPrgPerfil && iaPrgPerfil.lang === lang;
  // Lo de la visita anterior se queda a la vista mientras llega lo nuevo: un
  // parpadeo a "cargando" en cada entrada no aporta nada.
  if (!hayAntes) caja.innerHTML = iaPrgTituloFallos() + iaHtmlCargando('Cargando tus errores…');
  try {
    const r = await apiGet(`/ia/perfil?lang=${encodeURIComponent(lang)}`);
    if (n !== iaPrgPeticion) return;               // ya hay otra petición más nueva
    if (!r) throw new Error('Sin sesión');         // 401: apiFetch ya enseña el candado
    iaPrgPerfil = { lang, errores: Array.isArray(r.errores) ? r.errores : [] };
    iaPrgPintarFallos();
  } catch (e) {
    if (n !== iaPrgPeticion) return;
    console.error('[ia] perfil:', e);
    // Una línea discreta: esta tarjeta es un extra y no puede tumbar PROGRESO.
    const texto = typeof navigator !== 'undefined' && navigator.onLine === false
      ? 'Sin conexión: no se han podido cargar tus errores.'
      : `No se han podido ${hayAntes ? 'actualizar' : 'cargar'} tus errores.`;
    const linea = `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px;font-size:0.72rem;color:#8a3028">
        <span>${texto}</span>
        <button class="btn btn-ghost btn-sm" style="width:auto" onclick="iaPrgCargarFallos()">REINTENTAR</button>
      </div>`;
    if (hayAntes) iaPrgPintarFallos(linea);
    else caja.innerHTML = iaPrgTituloFallos() + linea;
  }
}

function iaPrgPintarFallos(extra = '') {
  const caja = document.getElementById('ia-prg-fallos');
  if (!caja || !iaPrgPerfil) return;
  // Si el plegable de superados estaba abierto (reactivando uno), sigue abierto.
  const abierto = !!caja.querySelector('details.ia-plegable[open]');
  caja.innerHTML = iaPrgHtmlFallos(iaPrgPerfil.errores, iaPrgPerfil.lang) + extra;
  if (abierto) { const d = caja.querySelector('details.ia-plegable'); if (d) d.open = true; }
}

function iaPrgHtmlFallos(errores, lang) {
  const { activos, superados } = iaPrgOrdenarFallos(errores);
  const plegados = superados.length
    ? iaHtmlPlegable(`Superados (${superados.length})`,
      `<div class="ia-correcciones">${superados.map((e) => iaPrgHtmlSuperado(e, lang)).join('')}</div>
       <div class="ia-pie">Si alguno vuelve a salir en una corrección, vuelve solo a la lista.</div>`)
    : '';

  if (!activos.length) {
    return `${iaPrgTituloFallos()}
      <p style="${IA_PRG_P}">${superados.length ? 'Ahora mismo no hay ningún error que vigilar.' : 'Todavía no hay errores apuntados.'}
        Aparecen cuando la IA te corrige: al CONVERSAR, al ESCRIBIR, en el oral de HABLAR y al
        corregir tu pronunciación en SONIDOS. El que se repite dos veces entra solo en tu repaso
        de palabras (los de pronunciación no: ésos se trabajan en SONIDOS).</p>
      <button class="btn btn-subtle" onclick="iaPrgIrA('conversar')">${ico('speak', 18)} CONVERSAR</button>
      ${plegados}`;
  }

  const vistos = activos.slice(0, IA_PRG_MAX_FALLOS);
  const resto = activos.length - vistos.length;
  const enRepaso = activos.filter((e) => e.word_id).length;
  const porTipo = {};
  for (const e of activos) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1;
  const chips = Object.entries(porTipo).sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span class="fase-chip">${escaparHtml(iaPrgTipo(t) || t)} · ${n}</span>`).join('');

  return `${iaPrgTituloFallos()}
    <div style="font-size:0.76rem;line-height:1.5;color:var(--text-2);margin-bottom:8px">
      ${activos.length} ${activos.length === 1 ? 'error que la IA vigila' : 'errores que la IA vigila'} cuando te corrige${enRepaso
        ? `; ${enRepaso} ya ${enRepaso === 1 ? 'está' : 'están'} en tu repaso` : ''}.
    </div>
    ${chips ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${chips}</div>` : ''}
    <div class="ia-correcciones">${vistos.map((e) => iaPrgHtmlFallo(e, lang)).join('')}</div>
    ${resto > 0 ? `<div class="ia-pie">Y ${resto} más, menos repetido${resto === 1 ? '' : 's'}.</div>` : ''}
    <div class="ia-pie">«Ya no lo fallo» lo deja de vigilar. Si vuelve a salir en una corrección, vuelve solo.</div>
    ${plegados}`;
}

/** Una fila: el nombre del error, lo dicho tachado → lo bueno, y cuántas veces. */
function iaPrgHtmlFallo(e, lang) {
  const id = Number(e.id);
  const veces = Math.max(1, Number(e.veces) || 1);
  const tipo = iaPrgTipo(e.tipo);
  const l = iaPrgLang(lang);
  const hace = iaPrgHace(iaPrgDiasDesde(e.ultima));
  return `
    <div class="ia-correccion">
      ${tipo ? `<span class="ia-tipo">${tipo}</span>` : ''}
      <div style="font-size:0.8rem;font-weight:700;line-height:1.4;padding-right:${tipo ? 84 : 0}px">${escaparHtml(e.clave)}</div>
      ${e.mal || e.bien ? `
        <div class="ia-par" style="padding-right:0;margin-top:4px;display:flex;align-items:center;flex-wrap:wrap;gap:2px 6px">
          ${e.mal ? `<span class="ia-mal">${escaparHtml(e.mal)}</span>${e.bien ? '<span class="ia-flecha">→</span>' : ''}` : ''}
          ${e.bien ? `<span class="ia-bien" lang="${l}">${escaparHtml(e.bien)}</span>${iaHtmlBotonDecir(e.bien, l)}` : ''}
        </div>` : ''}
      ${e.traduccion ? `<div class="ia-expl" style="font-style:italic">${escaparHtml(e.traduccion)}</div>` : ''}
      ${e.explicacion ? `<div class="ia-expl">${escaparHtml(e.explicacion)}</div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:8px">
        <span style="font-size:0.66rem;line-height:1.5;color:var(--text-3)">
          <b style="color:var(--text-2)">${veces} ${veces === 1 ? 'vez' : 'veces'}</b>${hace ? ` · la última, ${hace}` : ''}
          ${e.word_id ? `<span style="display:inline-block;margin-left:4px;font-family:var(--font-mono);font-size:0.52rem;letter-spacing:1px;color:#1f6f3d;background:rgba(48,209,88,0.12);border-radius:999px;padding:2px 7px">EN TU REPASO</span>` : ''}
        </span>
        <button class="btn btn-ghost btn-sm" style="width:auto" data-ia-id="${id}" onclick="iaPrgSuperar(this, true)">YA NO LO FALLO</button>
      </div>
    </div>`;
}

/** Una fila de los superados, plegada: el nombre, lo bueno y cómo reactivarlo. */
function iaPrgHtmlSuperado(e, lang) {
  return `
    <div class="ia-correccion" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div style="min-width:0;font-size:0.76rem;line-height:1.4">
        <b>${escaparHtml(e.clave)}</b>
        ${e.bien ? `<div class="ia-bien" lang="${iaPrgLang(lang)}" style="font-size:0.74rem">${escaparHtml(e.bien)}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-sm" style="width:auto;flex:none" data-ia-id="${Number(e.id)}" onclick="iaPrgSuperar(this, false)">AÚN LO FALLO</button>
    </div>`;
}

/** "Ya no lo fallo" (superado = true) o "Aún lo fallo" (false). El id va en data-ia-id. */
async function iaPrgSuperar(btn, superado) {
  const id = Number(btn?.dataset?.iaId);
  if (!Number.isInteger(id) || id <= 0) return;
  const restaurar = iaOcupar(btn);
  try {
    const r = await apiPut(`/ia/perfil/${id}`, { superado: !!superado });
    if (!r) { restaurar(); return; }               // 401: ya se ve el candado
    const e = iaPrgPerfil?.errores?.find((x) => Number(x.id) === id);
    if (e) e.superado = !!r.superado;
    iaPrgPintarFallos();
    toast(superado ? 'Ya no se vigila' : 'Se vuelve a vigilar', 'success');
  } catch (err) {
    restaurar();
    // 404: ya no existe. Se recarga la lista en vez de dejar una fila que no
    // se puede tocar.
    if (err?.status === 404) iaPrgCargarFallos();
    else toastError(err);
  }
}
