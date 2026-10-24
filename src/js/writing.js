// TutorIngles — writing.js
// Writing y Speaking del C1. Son las dos destrezas que ninguna clave de
// respuestas puede corregir, así que se usa el mismo sistema que un examinador:
// la rúbrica oficial de Cambridge, y tú te puntúas contra ella.
//
// Criterios de Writing (0-5 cada uno, 20 en total):
//   Content · Communicative Achievement · Organisation · Language
//
// Desde oct-2026 los corrige también la IA (la API de Claude, ver ia.js):
//  - ESCRIBIR: "CORREGIR CON IA" no guarda nada. Rellena la rúbrica con sus
//    notas (que siguen siendo tuyas: se pueden cambiar) y la corrección viaja
//    con GUARDAR, pero sólo si el texto que se guarda es el que se corrigió; si
//    se retocó después, esa nota sería la de otro texto.
//  - El oral: la respuesta se graba con el micro, se dicta con el teclado (el
//    iPhone con la app instalada no tiene reconocedor, y es el caso principal)
//    o se escribe. Al corregirla el servidor la GUARDA, así que después el botón
//    se apaga: pulsarlo otra vez con lo mismo sería pagar dos veces. Si la
//    llamada se corta (tiempo, red, el iPhone bloqueado), REINTENTAR sí es
//    seguro: el servidor recuerda unos minutos la respuesta a la misma petición
//    y la devuelve sin cobrarla ni guardarla otra vez (`repetida`).
//  - ESCRIBIR guarda un borrador en el móvil mientras se escribe: iOS cierra
//    la PWA en segundo plano sin avisar, y con ella se iba el texto.

// ── STATE ───────────────────────────────────────────────
let _wrTask   = null;
let _spTasks  = [];
let _spTimer  = null;

// La última corrección de la IA en ESCRIBIR: { tarea, texto, feedback, notas }.
// `tarea` es el objeto _wrTask de entonces, no su id: si se cierra y se vuelve a
// abrir la misma tarea, es otro objeto y la corrección vieja ya no vale.
// `notas` son las que la IA dejó puestas en la rúbrica, para saber si siguen ahí.
let iaEscritoUltimo = null;

// El borrador de ESCRIBIR se guarda con un pequeño retardo, no a cada letra.
let iaBorradorReloj = null;

// El oral abierto: la tarea, la grabación en curso, lo que dio el micro (para
// saber si se envía 'voz' o 'texto') y cuándo se puso el cronómetro (`queda`
// es local a startSpeakingTimer y no dice cuánto se ha hablado). Ver iaOralNuevo.
let iaOral = null;

// Con una tarea en francés, los mismos cuatro números (0-5, se guardan en las
// mismas columnas) pero con lo que mira un corrector del DALF. El DALF real
// puntúa cada prueba sobre 25 con una parrilla más larga: esto es una
// autoevaluación simplificada, y lo dice en pantalla.
const RUBRICA_FR = [
  { key: 'content',      nombre: 'Respect de la consigne',
    desc: '¿Has hecho lo que pedía, con la extensión pedida? En la síntesis: sin opinión propia ni "je".' },
  { key: 'achievement',  nombre: 'Registre et argumentation',
    desc: '¿Vous o tu, fórmulas y tono para ese destinatario? En el ensayo: ¿una postura clara y defendida?' },
  { key: 'organisation', nombre: 'Cohérence et cohésion',
    desc: '¿Párrafos con una idea cada uno? ¿Conectores (or, néanmoins, dès lors) bien usados?' },
  { key: 'language',     nombre: 'Lexique et grammaire',
    desc: '¿Vocabulario preciso y variado? ¿Acentos, concordancias, subjuntivo donde toca?' },
];

const RUBRICA = [
  { key: 'content',      nombre: 'Content',
    desc: '¿Has hecho lo que pedía la tarea, todo y solo eso?' },
  { key: 'achievement',  nombre: 'Communicative Achievement',
    desc: '¿El registro y el tono son los que pide el género?' },
  { key: 'organisation', nombre: 'Organisation',
    desc: '¿Se sigue con facilidad? ¿Párrafos y conectores?' },
  { key: 'language',     nombre: 'Language',
    desc: '¿Vocabulario variado y estructuras de nivel, sin errores que estorben?' },
];

// ══════════════════════ WRITING ══════════════════════
async function loadWritingTasks() {
  const box = document.getElementById('writing-tasks');
  if (!box) return;
  try {
    const tasks = await apiGet('/writing/tasks') || [];
    if (!tasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay tareas de Writing.</div>';
      return;
    }
    box.innerHTML = tasks.map(t => `
      <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="openWriting('${t.slug}')">
        <div class="topic-item-info">
          <div class="topic-item-title">${t.lang === 'fr' ? '' : `Part ${t.part} · `}${_esc(t.title)}</div>
          <div class="topic-item-meta">${wrGenero(t)} · ${t.word_min}-${t.word_max} palabras${t.attempts ? ` · escrita ${t.attempts}×` : ''}</div>
        </div>
        ${t.lang === 'fr' ? `<span class="badge badge-${(t.nivel || 'c1').toLowerCase()}">${t.nivel === 'C1' ? 'DALF' : t.nivel}</span>` : ''}
        ${t.attempts ? '<div class="topic-check">✓</div>' : ''}
      </button>`).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

/** El género, dicho como lo diría quien estudia. */
function wrGenero(t) {
  const nombres = { email: 'correo', synthese: 'síntesis de documentos', essai: 'ensayo argumentado' };
  return t.lang === 'fr' ? (nombres[t.kind] || (t.kind === 'letter' ? 'carta' : t.kind)) : t.kind;
}

// Writing tiene sección propia (ESCRIBIR) desde el 12-ago, así que ya no pinta
// dentro del panel de SIMULACROS: escribe en su propio contenedor y la lista de
// tareas se esconde mientras se redacta.
const _wrCaja = () => document.getElementById('writing-editor');
function _wrListaVisible(visible) {
  const lista = document.getElementById('writing-tasks')?.closest('.glass-card-accent');
  if (lista) lista.style.display = visible ? '' : 'none';
}

async function openWriting(slug) {
  const c = _wrCaja();
  if (!c) return;
  _wrListaVisible(false);
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _wrTask = await apiGet(`/writing/tasks/${slug}`);
    renderWriting();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

/** Cierra el editor y vuelve a la lista de tareas. */
function cerrarWriting() {
  const c = _wrCaja();
  if (iaBorradorReloj) iaBorradorGuardar(_wrTask);   // lo tecleado justo antes de VOLVER
  iaEscritoUltimo = null;
  if (c) c.innerHTML = '';
  _wrListaVisible(true);
  loadWritingTasks();
}

function renderWriting() {
  const t = _wrTask;
  const guia = Array.isArray(t.guidance) ? t.guidance : [];
  const c = _wrCaja();
  if (!c) return;
  const frances = t.lang === 'fr';
  const rubrica = frances ? RUBRICA_FR : RUBRICA;
  const cabecera = frances
    ? `${t.nivel === 'C1' ? 'DALF C1' : `FRANCÉS · ${t.nivel}`} · ${wrGenero(t).toUpperCase()}`
    : `WRITING · PART ${t.part} · ${t.kind.toUpperCase()}`;

  c.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="cerrarWriting()" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">${cabecera}</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:8px">${_esc(t.title)}</div>
      <div style="font-size:0.8rem;color:var(--text-2);line-height:1.6">${_esc(t.instructions)}</div>
    </div>

    ${t.input_text ? `
      <div class="glass-card">
        <div class="card-title">${frances ? 'LOS DOCUMENTOS' : 'TEXTO DE PARTIDA'}</div>
        <div class="reading-body" style="font-size:0.8rem">${_esc(t.input_text)}</div>
      </div>` : ''}

    <div class="glass-card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        TU RESPUESTA
        <span id="wr-count" class="badge">0 palabras</span>
      </div>
      <textarea id="wr-body" class="field-input" rows="16"
        style="resize:vertical;line-height:1.6;font-size:0.85rem"
        placeholder="Escribe aquí tu texto en ${frances ? 'francés' : 'inglés'}..."
        oninput="countWriting();iaEscritoAlEditar();iaBorradorProgramar()"></textarea>
      <div id="wr-range" style="font-size:0.68rem;color:var(--text-3);margin-top:6px">
        Objetivo: ${t.word_min}-${t.word_max} palabras. Pasarse o quedarse corto penaliza.
      </div>
      <div id="wr-borrador" style="font-size:0.68rem;color:var(--text-3);margin-top:4px"></div>
    </div>

    <div class="glass-card">
      <div class="card-title">CORRECCIÓN CON IA</div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:10px;line-height:1.55">
        Claude te corrige como un examinador con ${frances ? 'los criterios del DALF' : 'la rúbrica de Cambridge'}:
        te pone nota, te reescribe el texto y apunta tus errores. No se guarda nada hasta que pulses GUARDAR.
      </p>
      <button class="btn btn-subtle" id="wr-ia-btn" onclick="iaEscritoCorregir(this)">CORREGIR CON IA</button>
      <div id="wr-ia-aviso"></div>
      <div id="wr-ia"></div>
    </div>

    <div class="glass-card">
      <div class="card-title">QUÉ SE ESPERA</div>
      <ul style="margin:0;padding-left:18px;font-size:0.76rem;color:var(--text-2);line-height:1.7">
        ${guia.map(g => `<li>${_esc(g)}</li>`).join('')}
      </ul>
    </div>

    <div class="glass-card">
      <div class="card-title">AUTOEVALUACIÓN · ${frances ? 'CRITERIOS DEL DALF' : 'RÚBRICA DE CAMBRIDGE'}</div>
      <p style="font-size:0.7rem;color:var(--text-3);margin-bottom:12px">
        Puntúate de 0 a 5 en cada criterio. Sé honesto: un 5 regalado no te acerca al C1.
        ${frances ? '<br>El DALF de verdad puntúa sobre 25 con una parrilla más larga: esto es una versión simplificada para autocorregirte.' : ''}
        ${frances && t.nivel !== 'C1' ? '<br>Esta tarea es de práctica: la nota no cuenta como nivel de examen.' : ''}
      </p>
      <div id="wr-rubrica-ia"></div>
      ${rubrica.map(r => `
        <div class="wr-criterio">
          <div>
            <div class="wr-criterio-nombre">${r.nombre}</div>
            <div class="wr-criterio-desc">${r.desc}</div>
          </div>
          <div class="wr-escala">
            ${[0,1,2,3,4,5].map(n => `
              <button class="wr-punto" data-crit="${r.key}" data-val="${n}"
                      onclick="pickRubrica('${r.key}', ${n}, this)">${n}</button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="field" style="margin-top:12px">
        <label>Notas para ti (opcional)</label>
        <input class="field-input" id="wr-notes" placeholder="Qué te ha costado, qué repetirías...">
      </div>
      <button class="btn btn-primary" onclick="saveWriting()">GUARDAR</button>
    </div>
  `;
  _wrTask._scores = {};
  iaEscritoUltimo = null;   // editor recién pintado: aún no hay corrección
  iaBorradorRestaurar(t);
}

function countWriting() {
  const ta = document.getElementById('wr-body');
  const el = document.getElementById('wr-count');
  if (!ta || !el) return;
  const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
  el.textContent = `${n} palabras`;
  // Aviso visual al salirse del rango exigido
  const dentro = n >= _wrTask.word_min && n <= _wrTask.word_max;
  el.style.color = n === 0 ? '' : dentro ? 'var(--success)' : 'var(--warning)';
}

function pickRubrica(crit, val, btn) {
  _wrTask._scores = _wrTask._scores || {};
  _wrTask._scores[crit] = val;
  document.querySelectorAll(`.wr-punto[data-crit="${crit}"]`)
    .forEach(b => b.classList.toggle('selected', b === btn));
}

async function saveWriting() {
  const tarea = _wrTask;
  const body = document.getElementById('wr-body')?.value.trim();
  if (!body) { toast('Escribe algo antes de guardar', 'error'); return; }
  const s = tarea._scores || {};
  // Notas que la IA puso a OTRO texto: guardarlas las haría pasar por la nota
  // de éste (y en C1, por un intento de examen). Que se decida a sabiendas.
  const deOtro = iaEscritoNotasDeOtroTexto(body, s);
  if (deOtro != null && !confirm(`Las notas de la autoevaluación (${deOtro}/20) son las que la IA puso a tu texto anterior, no a éste.\n\n¿Guardar igualmente con esas notas? Con Cancelar no se guarda: puedes cambiarlas o volver a CORREGIR CON IA.`)) return;
  try {
    const r = await apiPost('/writing/submissions', {
      task_id: tarea.id,
      body,
      content:      s.content      ?? null,
      achievement:  s.achievement  ?? null,
      organisation: s.organisation ?? null,
      language:     s.language     ?? null,
      notes: document.getElementById('wr-notes')?.value.trim() || null,
      ia_feedback: iaEscritoFeedbackPara(body),
    });
    iaBorradorBorrar(tarea);   // ya está guardado de verdad
    const completa = Object.keys(s).length === 4;
    toast(completa
      ? `Guardado · ${Object.values(s).reduce((a, b) => a + b, 0)}/20`
      : `Guardado · ${r.word_count} palabras`, 'success');
    showXpPop(25);
    cerrarWriting();
  } catch (e) {
    toastError(e);
  }
}

// ── CORRECCIÓN CON IA (ESCRIBIR) ────────────────────────

/** Palabras como las cuenta el servidor (iaP.contarPalabras): así el aviso de "te faltan" coincide con su 400. */
const iaWrPalabras = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Una nota de la IA como entero 0-5: es el `data-val` de los botones de la rúbrica. */
const iaWrNota = (v) => Math.min(5, Math.max(0, Math.round(Number(v) || 0)));

async function iaEscritoCorregir(btn) {
  const tarea = _wrTask;
  const ta    = document.getElementById('wr-body');
  const caja  = document.getElementById('wr-ia');
  if (!tarea || !ta || !caja) return;
  const texto = ta.value.trim();
  const n = iaWrPalabras(texto);
  // El servidor también lo rechaza, pero preguntárselo es un viaje para nada.
  if (n < 15) {
    caja.innerHTML = `<div class="field-pista" style="margin-top:10px">Escribe al menos 15 palabras para que
      haya algo que corregir${n ? ` (llevas ${n})` : ''}.</div>`;
    return;
  }
  // El mismo texto ya corregido no se vuelve a pagar: la corrección está debajo.
  if (iaEscritoUltimo && iaEscritoUltimo.tarea === tarea && iaEscritoUltimo.texto === texto) {
    toast('Este texto ya está corregido. Cámbialo si quieres otra corrección.');
    return;
  }
  // En el iPhone el teclado tapa media pantalla: se baja para que se vea la espera.
  ta.blur();
  const restaurar = iaOcupar(btn, 'CORRIGIENDO…');
  caja.innerHTML = iaHtmlCargando('Claude está leyendo tu texto… puede tardar un minuto');
  try { caja.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
  try {
    const r = await iaPost('/ia/escritura', { task_id: tarea.id, texto });
    // Si mientras esperaba se cerró el editor o se abrió otra tarea, esto ya no es de nadie.
    if (_wrTask !== tarea || !caja.isConnected) return;
    iaEscritoUltimo = { tarea, texto, feedback: r };
    caja.innerHTML = iaEscritoHtml(r, tarea.lang === 'fr');
    iaEscritoUltimo.notas = iaEscritoRellenarRubrica(r);
    // Forzado: los dos avisos se repintan con esta corrección, y además salen
    // bien si se tocó el texto durante la espera.
    iaEscritoAlEditar(true);
  } catch (e) {
    if (_wrTask !== tarea || !caja.isConnected) return;
    caja.innerHTML = iaHtmlError(e, "iaEscritoCorregir(document.getElementById('wr-ia-btn'))");
  } finally {
    restaurar();
  }
}

function iaEscritoHtml(r, frances) {
  const notas = r.notas || {};
  const rubrica = frances ? RUBRICA_FR : RUBRICA;
  const total = Number.isFinite(Number(r.total)) ? Number(r.total)
    : rubrica.reduce((a, c) => a + iaWrNota(notas[c.key]), 0);
  const nivel = iaHtmlNivel(r.nivel_estimado);
  const fuertes = iaHtmlLista(r.puntos_fuertes);
  const correcciones = iaHtmlCorrecciones(r.correcciones);
  return `<div class="ia-caja">
    <div class="ia-cabeza">
      <span class="ia-marca">IA</span>
      <span class="ia-total">${total}/20</span>
      ${nivel ? `${nivel}<span>nivel que muestra el texto</span>` : ''}
    </div>
    <div class="ia-notas">${rubrica.map((c) => `
      <div class="ia-nota">
        <div class="ia-nota-nombre">${c.nombre}</div>
        <div class="ia-nota-valor">${iaWrNota(notas[c.key])}/5</div>
      </div>`).join('')}
    </div>
    ${r.comentario ? `<p class="ia-resumen">${escaparHtml(r.comentario)}</p>` : ''}
    ${fuertes ? `<div class="ia-bloque-tit">Puntos fuertes</div>${fuertes}` : ''}
    ${correcciones ? `<div class="ia-bloque-tit">Correcciones</div>${correcciones}` : ''}
    ${r.siguiente_paso ? `<div class="ia-siguiente"><b>Para subir nota:</b> ${escaparHtml(r.siguiente_paso)}</div>` : ''}
    ${iaHtmlPlegable('Versión mejorada de tu texto', r.version_mejorada ? iaHtmlParrafos(r.version_mejorada) : '')}
    <div class="ia-pie">Estas notas ya están puestas en la autoevaluación de abajo: cámbialas si no estás de
      acuerdo. La corrección se guarda con tu texto al pulsar GUARDAR.</div>
    ${r.cuenta_examen ? '' : '<div class="ia-pie">Nota de práctica: sólo las tareas C1 cuentan como intento de examen.</div>'}
    ${r.repetida ? '<div class="ia-pie">Ya estaba corregido: no se ha cobrado otra vez.</div>' : ''}
    ${iaHtmlTarjetas(r.tarjetas)}
    ${iaHtmlCoste(r.coste)}
  </div>`;
}

/**
 * Pone las notas de la IA en la rúbrica con el mismo pickRubrica que un toque
 * a mano, así que GUARDAR las manda igual y se pueden cambiar igual. Devuelve
 * las que ha puesto ({content: 4, …}); el aviso lo pinta iaEscritoAlEditar.
 */
function iaEscritoRellenarRubrica(r) {
  const caja = _wrCaja();
  const puestas = {};
  if (!caja || !r?.notas) return puestas;
  for (const k of ['content', 'achievement', 'organisation', 'language']) {
    const v = iaWrNota(r.notas[k]);
    const b = caja.querySelector(`.wr-punto[data-crit="${k}"][data-val="${v}"]`);
    if (b) { pickRubrica(k, v, b); puestas[k] = v; }
  }
  return puestas;
}

/**
 * Al escribir después de corregir, avisa de que la corrección ya no es la de
 * este texto (y por eso GUARDAR no la mandará) y de que las notas de la rúbrica
 * tampoco son suyas. Sólo toca el DOM al cambiar, salvo con `forzar`.
 */
function iaEscritoAlEditar(forzar = false) {
  const aviso = document.getElementById('wr-ia-aviso');
  if (!aviso) return;
  const u  = iaEscritoUltimo;
  const ta = document.getElementById('wr-body');
  const cambiado = !!(u && ta && u.tarea === _wrTask && ta.value.trim() !== u.texto);
  if (!forzar && aviso.dataset.cambiado === String(cambiado)) return;
  aviso.dataset.cambiado = String(cambiado);
  aviso.innerHTML = cambiado
    ? `<div class="field-pista" style="margin-top:8px;color:#8a5a00">Has cambiado el texto después de corregirlo.
        Si lo guardas así, la corrección no se guarda con él: vuelve a pulsar CORREGIR CON IA si la quieres guardada.</div>`
    : '';
  const rubrica = document.getElementById('wr-rubrica-ia');
  if (!rubrica) return;
  const puestas = u && u.tarea === _wrTask && u.notas;
  if (!puestas || !Object.keys(puestas).length) { rubrica.innerHTML = ''; return; }
  const total = Object.values(puestas).reduce((a, b) => a + b, 0);
  rubrica.innerHTML = cambiado
    ? `<div class="ia-siguiente" style="margin:0 0 12px">
        <span class="ia-marca">IA</span> <b>Ojo:</b> las notas que puso la IA (${total}/20) eran de tu texto
        anterior, no de éste. Vuelve a pulsar CORREGIR CON IA o cámbialas tú antes de GUARDAR.</div>`
    : `<div class="ia-siguiente" style="margin:0 0 12px">
        <span class="ia-marca">IA</span> Notas puestas por la IA (${total}/20). Son una propuesta:
        cámbialas si no estás de acuerdo antes de GUARDAR.</div>`;
}

/**
 * Si el texto ha cambiado desde la corrección y la rúbrica sigue EXACTAMENTE
 * con las notas que puso la IA, su total; si no, null. Con una sola nota tocada
 * a mano ya es la evaluación de quien escribe, y no se pregunta.
 */
function iaEscritoNotasDeOtroTexto(body, s) {
  const u = iaEscritoUltimo;
  if (!u?.notas || u.tarea !== _wrTask || u.texto === String(body ?? '').trim()) return null;
  const claves = Object.keys(u.notas);
  if (!claves.length || claves.length !== Object.keys(s || {}).length) return null;
  if (!claves.every((k) => s[k] === u.notas[k])) return null;
  return claves.reduce((a, k) => a + u.notas[k], 0);
}

// ── BORRADOR (ESCRIBIR) ─────────────────────────────────
// iOS cierra la PWA en segundo plano sin avisar: se mira un correo a mitad de
// un ensayo y al volver la app arranca de cero, con el texto perdido (y la
// corrección pagada, si la había). El borrador vive en el móvil, uno por tarea,
// y se borra al GUARDAR. La corrección no se guarda con él: si se pide otra vez
// para el mismo texto en unos minutos, el servidor la devuelve sin cobrarla.

const iaBorradorClave = (tarea) => `ia_borrador_${tarea.slug}`;

/** Al escribir: guarda dentro de un momento, no a cada letra. */
function iaBorradorProgramar() {
  clearTimeout(iaBorradorReloj);
  const tarea = _wrTask;
  iaBorradorReloj = setTimeout(() => iaBorradorGuardar(tarea), 700);
}

function iaBorradorGuardar(tarea) {
  clearTimeout(iaBorradorReloj);
  iaBorradorReloj = null;
  const ta = document.getElementById('wr-body');
  // Si entretanto se cerró el editor o se abrió otra tarea, este cuadro no es suyo.
  if (!tarea?.slug || _wrTask !== tarea || !ta) return;
  try {
    const texto = ta.value;
    if (texto.trim()) localStorage.setItem(iaBorradorClave(tarea), JSON.stringify({ texto, hora: Date.now() }));
    else localStorage.removeItem(iaBorradorClave(tarea));
  } catch {}
}

function iaBorradorBorrar(tarea) {
  clearTimeout(iaBorradorReloj);   // que un guardado pendiente no lo resucite
  iaBorradorReloj = null;
  try { if (tarea?.slug) localStorage.removeItem(iaBorradorClave(tarea)); } catch {}
}

/** Al abrir la tarea: si quedó un borrador, vuelve al cuadro y se dice en una línea. */
function iaBorradorRestaurar(tarea) {
  const ta = document.getElementById('wr-body');
  const linea = document.getElementById('wr-borrador');
  if (!tarea?.slug || !ta) return;
  let b = null;
  try { b = JSON.parse(localStorage.getItem(iaBorradorClave(tarea)) || 'null'); } catch {}
  if (!b || typeof b.texto !== 'string' || !b.texto.trim()) return;
  ta.value = b.texto;
  countWriting();
  if (linea) {
    const min = Math.max(0, Math.round((Date.now() - Number(b.hora || 0)) / 60_000));
    const h = Math.round(min / 60), d = Math.round(min / 1440);
    const cuando = !b.hora ? '' : min < 1 ? ' hace un momento'
      : min < 60 ? ` hace ${min} min` : min < 1440 ? ` hace ${h} h` : ` hace ${d} día${d === 1 ? '' : 's'}`;
    linea.textContent = `Borrador recuperado: lo dejaste a medias${cuando}. Se borra al GUARDAR.`;
  }
}

// Al pasar a segundo plano (es justo cuando iOS puede cerrar la app) se guarda
// ya lo pendiente, sin esperar al retardo.
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && iaBorradorReloj) iaBorradorGuardar(_wrTask);
  });
}

/** Lo que va en `ia_feedback` al guardar: la corrección, sólo si es la de este mismo texto. */
function iaEscritoFeedbackPara(body) {
  const u = iaEscritoUltimo;
  if (!u || u.tarea !== _wrTask || u.texto !== String(body ?? '').trim()) return undefined;
  // El servidor rechaza más de 100 000 caracteres, y con ellos el guardado
  // entero. Antes perder la corrección que el texto.
  try { if (JSON.stringify(u.feedback).length > 95_000) return undefined; } catch { return undefined; }
  return u.feedback;
}

// ══════════════════════ SPEAKING ══════════════════════
async function loadSpeakingTasks() {
  const box = document.getElementById('speaking-tasks');
  if (!box) return;
  try {
    _spTasks = await apiGet('/speaking/tasks') || [];
    if (!_spTasks.length) {
      box.innerHTML = '<div class="empty-state" style="padding:8px 0">Aún no hay tareas de Speaking.</div>';
      return;
    }
    box.innerHTML = _spTasks.map(t => `
      <button class="topic-item" style="width:100%;margin-bottom:6px" onclick="openSpeaking('${t.slug}')">
        <div class="topic-item-info">
          <div class="topic-item-title">${_esc(t.title)}</div>
          <div class="topic-item-meta">${Math.round(t.seconds / 60 * 10) / 10} min</div>
        </div>
        ${t.lang === 'fr' ? `<span class="badge badge-${(t.nivel || 'c1').toLowerCase()}">${t.nivel === 'C1' ? 'DALF' : t.nivel}</span>` : ''}
      </button>`).join('');
  } catch (e) {
    box.innerHTML = cajaError(e);
  }
}

function openSpeaking(slug) {
  const t = _spTasks.find(x => x.slug === slug);
  if (!t) return;
  // Estas tareas se pintan ahora dentro de HABLAR, que es donde tienen sentido.
  const c = document.getElementById('speak-content');
  if (!c) return;
  // Si quedaba algo en marcha de otra tarea (cronómetro, micro), se para aquí.
  iaOralParar();
  const tips = Array.isArray(t.tips) ? t.tips : [];
  const p = t.prompts;
  const frances = t.lang === 'fr';

  // Part 2 llega como objeto (pregunta + fotos); el resto, como lista de preguntas.
  let cuerpo = '';
  if (Array.isArray(p)) {
    cuerpo = `<ol class="sp-prompts">${p.map(q => `<li>${_esc(q)}</li>`).join('')}</ol>`;
  } else {
    cuerpo = `
      <div class="sp-question">${_esc(p.question || '')}</div>
      ${p.documents ? `
        <div class="card-title" style="margin-top:14px">EL DOSSIER</div>
        <ul class="sp-prompts">${p.documents.map(d => `<li>${_esc(d)}</li>`).join('')}</ul>` : ''}
      ${p.photos ? `
        <div class="card-title" style="margin-top:14px">LAS TRES ESCENAS · ELIGE DOS</div>
        <ol class="sp-photos">${p.photos.map(f => `<li>${_esc(f)}</li>`).join('')}</ol>` : ''}
      ${p.options ? `
        <div class="card-title" style="margin-top:14px">OPCIONES</div>
        <ul class="sp-prompts">${p.options.map(o => `<li>${_esc(o)}</li>`).join('')}</ul>` : ''}
      ${p.decision ? `<div class="sp-decision">${_esc(p.decision)}</div>` : ''}
      ${p.follow_up ? `<div class="sp-followup">${frances ? 'Pregunta del tribunal' : 'Pregunta de seguimiento'}: ${_esc(p.follow_up)}</div>` : ''}`;
  }

  c.innerHTML = `
    <button class="btn btn-subtle btn-sm" onclick="iaOralVolver()" style="margin-bottom:12px">← VOLVER</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">${frances ? (t.nivel === 'C1' ? 'ORAL · DALF C1' : `ORAL · FRANCÉS ${t.nivel}`) : `SPEAKING · PARTE ${t.part}`}</div>
      <div style="font-size:0.85rem;font-weight:600;color:var(--text);margin-bottom:8px">${_esc(t.title)}</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6">${_esc(t.instructions)}</div>
    </div>

    <div class="glass-card">
      <div class="card-title">LA TAREA</div>
      ${cuerpo}
    </div>

    <div class="glass-card" style="text-align:center">
      <div class="card-title">CRONÓMETRO</div>
      <div id="sp-clock" class="sp-clock">${fmtClock(t.seconds)}</div>
      <div style="font-size:0.68rem;color:var(--text-3);margin-bottom:14px">
        Habla en alto todo el tiempo. El silencio es lo que más penaliza.
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" id="sp-start" onclick="startSpeakingTimer(${t.seconds})">EMPEZAR</button>
        <button class="btn btn-subtle" style="flex:1" onclick="stopSpeakingTimer(${t.seconds})">REINICIAR</button>
      </div>
    </div>

    ${iaOralHtmlRespuesta(t)}

    ${tips.length ? `
      <div class="glass-card">
        <div class="card-title">CLAVES</div>
        <ul style="margin:0;padding-left:18px;font-size:0.76rem;color:var(--text-2);line-height:1.7">
          ${tips.map(x => `<li>${_esc(x)}</li>`).join('')}
        </ul>
      </div>` : ''}
  `;
  iaOral = iaOralNuevo(t);
}

function fmtClock(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function startSpeakingTimer(total) {
  stopSpeakingTimer(total);
  let queda = total;
  const el  = document.getElementById('sp-clock');
  const btn = document.getElementById('sp-start');
  if (btn) btn.textContent = 'EN MARCHA';
  if (iaOral) { iaOral.cronoInicio = Date.now(); iaOral.cronoFin = null; }
  _spTimer = setInterval(() => {
    queda--;
    if (el) {
      el.textContent = fmtClock(Math.max(0, queda));
      // Último 20%: aviso de que hay que ir cerrando
      el.classList.toggle('warning', queda <= total * 0.2 && queda > 0);
    }
    if (queda <= 0) {
      clearInterval(_spTimer);
      _spTimer = null;
      if (iaOral?.cronoInicio) iaOral.cronoFin = Date.now();
      if (el) { el.textContent = 'TIEMPO'; el.classList.remove('warning'); }
      if (btn) btn.textContent = 'EMPEZAR';
      toast('Se acabó el tiempo', '');
      // Registrar la práctica
      apiPost('/study-sessions', { type: 'speaking', duration_minutes: Math.round(total / 60) }).catch(() => {});
    }
  }, 1000);
}

function stopSpeakingTimer(total) {
  if (_spTimer) { clearInterval(_spTimer); _spTimer = null; }
  // REINICIAR es empezar de cero: lo cronometrado antes ya no mide esta respuesta.
  if (iaOral) { iaOral.cronoInicio = null; iaOral.cronoFin = null; }
  const el  = document.getElementById('sp-clock');
  const btn = document.getElementById('sp-start');
  if (el)  { el.textContent = fmtClock(total); el.classList.remove('warning'); }
  if (btn) btn.textContent = 'EMPEZAR';
}

// ══════════════════ EL ORAL CON IA ══════════════════
// La respuesta entra por tres sitios: el micro de la app (si el navegador
// tiene reconocedor), el micro del TECLADO (el iPhone con la app instalada no
// tiene reconocedor, y es donde se usa a diario) o tecleando. Las tres acaban
// en el mismo cuadro y se corrigen igual. Lo único que cambia es `via`: 'voz'
// sólo si lo enviado es exactamente lo que dio el micro de la app, que es lo
// que marca HABLAR de hoy (ver iaViaDe en ia.js).

function iaOralNuevo(tarea) {
  return {
    tarea,
    grab: null,        // { parar() } de iaGrabarLargo mientras se graba
    sesion: 0,         // número de toma: cada toma se cierra una sola vez
    grabDesde: 0,      // cuándo empezó la toma en curso
    grabFinal: '',     // lo último firme que ha dado el reconocedor en esta toma
    base: '',          // lo que había en el cuadro al empezar la toma
    baseMicro: true,   // ¿eso también salió del micro?
    tic: null,         // reloj de la toma, que además vigila (iaOralTic)
    parando: false,
    cierre: null,      // promesa de "la toma se ha cerrado" (la espera CORREGIR)
    alCerrar: null,
    grabSeg: 0,        // segundos hablados al micro, sumando tomas
    micTexto: null,    // el cuadro tal como lo dejó el micro: si se retoca, ya es 'texto'
    cronoInicio: null, // cuándo se pulsó EMPEZAR (y cuándo llegó a 0)
    cronoFin: null,
    corrigiendo: false, // CORREGIR en marcha (incluido el cierre de la toma): un segundo toque no hace nada
    envio: null,       // { texto, segundos, via } del último envío: REINTENTAR manda EXACTAMENTE lo mismo
    hecho: false,      // corregido y guardado: no se vuelve a mandar
  };
}

function iaOralHtmlRespuesta(t) {
  const frances = t.lang === 'fr';
  const micro = iaHayMicro();
  return `
    <div class="glass-card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        TU RESPUESTA
        <span id="ia-oral-count" class="badge">0 palabras</span>
      </div>
      <p style="font-size:0.72rem;color:var(--text-3);margin-bottom:12px;line-height:1.55">
        ${micro
          ? 'Pulsa el micro y responde en voz alta: se va escribiendo mientras hablas. También puedes dictarlo con el teclado o escribirlo.'
          : 'Toca el cuadro y responde en voz alta con el micro del teclado: se va escribiendo mientras hablas. También vale escribirlo.'}
        Claude lo corrige como un examinador (gramática, léxico, discurso y tarea) y queda guardado.
        ${micro ? 'Lo grabado con este micro, sin retocar, cuenta como HABLAR de hoy.' : ''}
      </p>
      ${micro ? `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:14px">
          <button class="speak-record-btn" id="ia-oral-mic" aria-label="Grabar" onclick="iaOralMicro()">${ico('mic', 30)}</button>
          <div id="ia-oral-mic-estado" style="font-family:var(--font-mono);font-size:0.55rem;letter-spacing:2px;color:var(--text-3);text-align:center">TOCA PARA GRABAR</div>
        </div>` : ''}
      <textarea id="ia-oral-txt" class="field-input" rows="7" lang="${frances ? 'fr' : 'en'}"
        autocapitalize="sentences" spellcheck="false"
        style="resize:vertical;line-height:1.6;font-size:0.85rem"
        placeholder="Lo que has dicho, en ${frances ? 'francés' : 'inglés'}…"
        oninput="iaOralContar()"></textarea>
      ${iaHtmlPistaDictado(t.lang)}
      <div class="ia-acciones">
        <button class="btn btn-subtle" style="flex:1" id="ia-oral-btn" onclick="iaOralCorregir(this)">CORREGIR CON IA</button>
        <button class="btn btn-ghost" style="flex:1;display:none" id="ia-oral-otro" onclick="iaOralOtro()">OTRO INTENTO</button>
      </div>
      <div id="ia-oral-res"></div>
    </div>`;
}

function iaOralContar() {
  const ta = document.getElementById('ia-oral-txt');
  const el = document.getElementById('ia-oral-count');
  if (!ta || !el) return;
  const n = iaWrPalabras(ta.value);
  el.textContent = `${n} palabra${n === 1 ? '' : 's'}`;
  // Cuadro vaciado a mano: es otra respuesta, y lo grabado antes ya no la mide.
  if (!n && iaOral && !iaOral.grab) { iaOral.grabSeg = 0; iaOral.micTexto = null; }
}

function iaOralPintarMicro(grabando, estado = '') {
  const b = document.getElementById('ia-oral-mic');
  const s = document.getElementById('ia-oral-mic-estado');
  if (b) {
    b.classList.toggle('recording', grabando);
    b.innerHTML = ico(grabando ? 'stop' : 'mic', 30);
    b.setAttribute('aria-label', grabando ? 'Parar la grabación' : 'Grabar');
    b.disabled = !!iaOral?.hecho;
    b.style.opacity = b.disabled ? '0.4' : '';
  }
  if (s) s.textContent = estado || (grabando ? 'GRABANDO · TOCA PARA PARAR' : 'TOCA PARA GRABAR');
}

/** El botón redondo: empieza una toma o para la que está en marcha. */
function iaOralMicro() {
  const o = iaOral;
  if (!o || o.hecho) return;
  if (o.grab) { iaOralPararGrabacion(); return; }
  const ta = document.getElementById('ia-oral-txt');
  if (!ta) return;
  if (typeof vozParar === 'function') vozParar();   // que el altavoz no se grabe a sí mismo
  // Cada toma se AÑADE a lo que ya hay: se puede parar a pensar y seguir.
  const base = ta.value.trim();
  const sesion = ++o.sesion;
  o.base = base;
  o.baseMicro = !base || iaViaDe(base, o.micTexto) === 'voz';
  o.grabDesde = Date.now();
  o.grabFinal = '';
  o.parando = false;
  // De sólo lectura mientras graba: si se tecleara a la vez, el reconocedor lo
  // pisaría con su siguiente resultado.
  ta.readOnly = true;
  iaOralPintarMicro(true);
  o.tic = setInterval(() => iaOralTic(sesion), 500);
  // La toma cuenta como abierta ANTES de llamar: si el reconocedor falla al
  // arrancar, alError llega dentro de la propia llamada y tiene que poder cerrarla.
  o.grab = { parar() {} };
  const grab = iaGrabarLargo({
    lang: o.tarea.lang,
    alTexto: (final, provisional) => {
      if (iaOral !== o || o.sesion !== sesion || !o.grab) return;
      o.grabFinal = final;
      // Lo provisional también se enseña, para ver que está entendiendo.
      ta.value = [base, final, provisional].filter(Boolean).join(' ');
      ta.scrollTop = ta.scrollHeight;
      iaOralContar();
    },
    alTerminar: (final) => iaOralFinGrab(o, sesion, final),
    alError: (e) => {
      if (iaOral === o && o.sesion === sesion && o.grab) toast(e.message, 'error');
      iaOralFinGrab(o, sesion, o.grabFinal);
      if (iaOral === o) iaOralPintarMicro(false, 'EL MICRO HA FALLADO · DÍCTALO O ESCRÍBELO');
    },
  });
  if (o.grab && o.sesion === sesion) o.grab = grab;   // salvo que ya se cerrara al arrancar
}

/**
 * Cada medio segundo: el tiempo de la toma y, sobre todo, el vigilante.
 * iaGrabarLargo vuelve a arrancar el reconocedor tras cada silencio, así que
 * si se cambia de pestaña o la app pasa a segundo plano, el micro seguiría
 * abierto fuera de aquí. Si la pantalla ya no está, se para.
 */
function iaOralTic(sesion) {
  const o = iaOral;
  if (!o || o.sesion !== sesion || !o.grab) return;
  const ta = document.getElementById('ia-oral-txt');
  const aqui = ta && document.getElementById('sec-speak')?.classList.contains('active') && !document.hidden;
  if (!aqui) { iaOralPararGrabacion(); return; }
  const s = document.getElementById('ia-oral-mic-estado');
  if (s && !o.parando) s.textContent = `GRABANDO · ${fmtClock(Math.floor((Date.now() - o.grabDesde) / 1000))} · TOCA PARA PARAR`;
}

/** Para la toma en curso. Devuelve una promesa que se cumple cuando se ha cerrado. */
function iaOralPararGrabacion() {
  const o = iaOral;
  if (!o?.grab) return Promise.resolve();
  if (!o.cierre) {
    const sesion = o.sesion;
    o.cierre = new Promise((ok) => { o.alCerrar = ok; });
    o.parando = true;
    const s = document.getElementById('ia-oral-mic-estado');
    if (s) s.textContent = 'PARANDO…';
    try { o.grab.parar(); } catch {}
    // Al parar, el reconocedor entrega lo último que entendió y avisa de que ha
    // terminado. Si no avisa (pasa), se cierra igual con lo que había.
    setTimeout(() => iaOralFinGrab(o, sesion, o.grabFinal), 2500);
  }
  return o.cierre;
}

/** Cierra una toma (una sola vez): fija el texto, suma el tiempo y apunta si es del micro. */
function iaOralFinGrab(o, sesion, final) {
  if (!o || o.sesion !== sesion || !o.grab) return;
  clearInterval(o.tic);
  o.tic = null;
  o.grab = null;
  o.parando = false;
  final = String(final || '').trim();
  if (final) o.grabSeg += (Date.now() - o.grabDesde) / 1000;
  const ta = document.getElementById('ia-oral-txt');
  if (iaOral === o && ta) {
    ta.value = [o.base, final].filter(Boolean).join(' ');
    ta.readOnly = o.hecho;
    o.micTexto = o.baseMicro ? ta.value : null;
    iaOralContar();
    iaOralPintarMicro(false, final ? '' : 'NO SE HA OÍDO NADA · TOCA PARA GRABAR');
  }
  const ok = o.alCerrar;
  o.alCerrar = null;
  o.cierre = null;
  if (ok) ok();
}

/**
 * Los segundos que se mandan, para que el examinador juzgue cuánto se habló
 * para el tiempo que había: los grabados al micro; si no hubo micro, lo que
 * llevaba el cronómetro; y si no se usó, null.
 */
function iaOralSegundos() {
  const o = iaOral;
  if (!o) return null;
  if (o.grabSeg >= 1) return Math.round(o.grabSeg);
  if (!o.cronoInicio) return null;
  const s = Math.round(((o.cronoFin || Date.now()) - o.cronoInicio) / 1000);
  const total = Number(o.tarea.seconds) || 0;
  const acotado = total ? Math.min(total, s) : s;
  return acotado >= 1 ? acotado : null;
}

async function iaOralCorregir(btn) {
  const o = iaOral;
  if (!o || o.hecho || o.corrigiendo) return;
  // El botón se ocupa ANTES de cerrar la toma, que puede tardar 2,5 s: con él
  // aún activo, un segundo toque en ese rato mandaba otro POST, que se paga y
  // se guarda (dos envíos, dos intentos de examen, XP doble). Una sola llamada
  // a iaOcupar: con dos, la segunda restauración dejaría "CORRIGIENDO…".
  o.corrigiendo = true;
  const restaurar = iaOcupar(btn, 'CORRIGIENDO…');
  const soltar = () => { o.corrigiendo = false; restaurar(); };
  // CORREGIR en mitad de una grabación: se cierra la toma y se sigue.
  if (o.grab) await iaOralPararGrabacion();
  if (iaOral !== o) { soltar(); return; }
  const ta   = document.getElementById('ia-oral-txt');
  const caja = document.getElementById('ia-oral-res');
  if (!ta || !caja) { soltar(); return; }
  const texto = ta.value.trim();
  const n = iaWrPalabras(texto);
  if (n < 10) {
    soltar();
    caja.innerHTML = `<div class="field-pista" style="margin-top:10px">Hace falta algo más de respuesta para
      corregir: al menos 10 palabras${n ? ` (llevas ${n})` : ''}.</div>`;
    return;
  }
  // Un REINTENTAR del mismo texto manda el mismo cuerpo, y así el servidor lo
  // reconoce como la misma petición: sin el cronómetro corriendo entretanto,
  // `segundos` saldría distinto y contaría como otra corrección (y otro pago).
  const envio = o.envio?.texto === texto ? o.envio
    : { texto, segundos: iaOralSegundos(), via: iaViaDe(texto, o.micTexto) };
  o.envio = envio;
  const { segundos, via } = envio;
  ta.blur();
  ta.readOnly = true;   // lo que se corrige es lo que se ve
  const mic = document.getElementById('ia-oral-mic');
  if (mic) mic.disabled = true;
  caja.innerHTML = iaHtmlCargando('Claude está corrigiendo tu respuesta… puede tardar un minuto');
  try { caja.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
  try {
    const r = await iaPost('/ia/oral', { task_id: o.tarea.id, transcripcion: texto, segundos, via });
    soltar();
    // Si se salió de la tarea mientras esperaba, ya está guardado igual: no hay nada que pintar.
    if (iaOral !== o) return;
    o.hecho = true;
    o.envio = null;
    caja.innerHTML = iaOralHtml(r, o.tarea, via);
    // El servidor ya lo ha guardado: otra pulsación sería pagar y guardar dos
    // veces lo mismo. Para repetir, OTRO INTENTO.
    if (btn) { btn.disabled = true; btn.textContent = 'GUARDADO ✓'; }
    const otro = document.getElementById('ia-oral-otro');
    if (otro) otro.style.display = '';
    iaOralPintarMicro(false, 'CORREGIDO · OTRO INTENTO PARA REPETIR');
    // Repetida: el servidor no ha vuelto a sumar XP.
    if (!r?.repetida) showXpPop(20);
  } catch (e) {
    soltar();
    if (iaOral !== o) return;
    ta.readOnly = false;
    if (mic) mic.disabled = false;
    // Sin respuesta del servidor (tiempo agotado, red, el iPhone que bloquea la
    // pantalla) puede que la corrección se haya hecho y guardado igual. Se dice,
    // porque REINTENTAR la recupera sin pagarla ni guardarla dos veces.
    const cortada = !e?.status && e?.codigo !== 'sin_sesion';
    caja.innerHTML = iaHtmlError(e, "iaOralCorregir(document.getElementById('ia-oral-btn'))")
      + (cortada ? `<div class="field-pista" style="margin-top:8px">Puede que Claude lo haya corregido igualmente.
          REINTENTAR con el mismo texto lo recupera sin cobrarlo ni guardarlo otra vez.</div>` : '');
  }
}

function iaOralHtml(r, t, via) {
  const notas = r.notas || {};
  const criterios = [['gramatica', 'Gramática'], ['lexico', 'Léxico'], ['discurso', 'Discurso'], ['tarea', 'Tarea']];
  const total = Number.isFinite(Number(r.total)) ? Number(r.total)
    : criterios.reduce((a, [k]) => a + iaWrNota(notas[k]), 0);
  const nivel = iaHtmlNivel(r.nivel_estimado);
  const fuertes = iaHtmlLista(r.puntos_fuertes);
  const correcciones = iaHtmlCorrecciones(r.correcciones);
  const frases = iaHtmlLista(r.frases_utiles, { decir: t.lang });
  return `<div class="ia-caja">
    <div class="ia-cabeza">
      <span class="ia-marca">IA</span>
      <span class="ia-total">${total}/20</span>
      ${nivel ? `${nivel}<span>nivel que muestra lo que has dicho</span>` : ''}
    </div>
    <div class="ia-notas">${criterios.map(([k, nombre]) => `
      <div class="ia-nota">
        <div class="ia-nota-nombre">${nombre}</div>
        <div class="ia-nota-valor">${iaWrNota(notas[k])}/5</div>
      </div>`).join('')}
    </div>
    ${r.comentario ? `<p class="ia-resumen">${escaparHtml(r.comentario)}</p>` : ''}
    ${fuertes ? `<div class="ia-bloque-tit">Puntos fuertes</div>${fuertes}` : ''}
    ${correcciones ? `<div class="ia-bloque-tit">Correcciones</div>${correcciones}` : ''}
    ${frases ? `<div class="ia-bloque-tit">Frases útiles</div>${frases}` : ''}
    ${r.siguiente_paso ? `<div class="ia-siguiente"><b>La próxima vez:</b> ${escaparHtml(r.siguiente_paso)}</div>` : ''}
    ${via === 'voz' ? `<div class="ia-tarjetas">${ico('done', 16)}<span><b>HABLAR de hoy, hecho:</b> lo has dicho con el micro.</span></div>` : ''}
    ${r.cuenta_examen ? '' : '<div class="ia-pie">Nota de práctica: sólo las tareas C1 cuentan como intento de examen.</div>'}
    ${r.repetida ? '<div class="ia-pie">Ya estaba corregido: no se ha cobrado ni guardado otra vez.</div>' : ''}
    <div class="ia-pie">Claude no oye tu voz: corrige el texto de lo que has dicho (la pronunciación se trabaja
      en SONIDOS). Queda guardado en tu progreso.</div>
    ${iaHtmlTarjetas(r.tarjetas)}
    ${iaHtmlCoste(r.coste)}
  </div>`;
}

/** Limpia el texto y la corrección para repetir la tarea desde cero, cronómetro incluido. */
function iaOralOtro() {
  const o = iaOral;
  if (!o) return;
  Object.assign(o, { hecho: false, micTexto: null, grabSeg: 0, envio: null });
  stopSpeakingTimer(o.tarea.seconds);
  const ta = document.getElementById('ia-oral-txt');
  if (ta) { ta.value = ''; ta.readOnly = false; }
  iaOralContar();
  const caja = document.getElementById('ia-oral-res');
  if (caja) caja.innerHTML = '';
  const btn = document.getElementById('ia-oral-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'CORREGIR CON IA'; }
  const otro = document.getElementById('ia-oral-otro');
  if (otro) otro.style.display = 'none';
  iaOralPintarMicro(false);
  try { document.getElementById('sp-clock')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
}

/**
 * Para todo lo del oral abierto, sin registrar nada. Antes el VOLVER dejaba el
 * cronómetro corriendo, y al llegar a cero apuntaba en /study-sessions una
 * práctica de la que ya se había salido.
 */
function iaOralParar() {
  if (_spTimer) { clearInterval(_spTimer); _spTimer = null; }
  const o = iaOral;
  iaOral = null;
  if (!o) return;
  clearInterval(o.tic);
  o.tic = null;
  const g = o.grab;
  o.grab = null;   // así el aviso de "he terminado" del reconocedor ya no toca nada
  try { g?.parar(); } catch {}
  const ok = o.alCerrar;
  o.alCerrar = null;
  o.cierre = null;
  if (ok) ok();
}

function iaOralVolver() {
  iaOralParar();
  if (typeof vozParar === 'function') vozParar();
  initSpeak(true);
}
