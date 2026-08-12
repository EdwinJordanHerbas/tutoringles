// TutorIngles — diagnostico.js
// De dónde se parte, medido y no supuesto.
//
// Hasta el 12-ago-2026 el nivel de la app era `user_level = 'B1'`, un valor
// escrito a mano en la migración base, con `exam_attempts` a cero: nunca se
// había medido nada. Daba igual mientras el examen estaba en diciembre. Con la
// fecha movida a finales de octubre deja de dar igual, porque la diferencia
// entre estar en B1 o en B2 alto son dos meses de trabajo distinto y el plan se
// construye encima de ese dato.
//
// Son 24 preguntas de las cuatro partes de Use of English. Se eligen ésas
// porque separan bien con pocas preguntas: no dependen de haber leído un texto
// largo ni de oír bien un audio, y se corrigen solas.

let _dgPreguntas = [];
let _dgRespuestas = {};
let _dgEstado = null;      // lo que devuelve GET /diagnostico

// ── LA TARJETA DE HOY ────────────────────────────────────

/**
 * Se pinta arriba del todo en HOY mientras no haya medición, y desaparece sola
 * en cuanto la hay. Misma idea que la tarjeta de los avisos: lo que hace falta
 * una vez no puede vivir escondido en un menú.
 */
async function pintarDiagnosticoHoy() {
  const caja = document.getElementById('diag-hoy');
  if (!caja) return;
  try {
    _dgEstado = await apiGet('/diagnostico');
  } catch { return; }
  if (!_dgEstado) return;

  const dias = diasHastaExamen(_dgEstado.examen);

  if (_dgEstado.ya_hecho) {
    // Ya medido: se queda un recordatorio pequeño, no una tarjeta grande.
    caja.innerHTML = `
      <div class="diag-mini">
        <span>Tu nivel medido: <b>${escaparDg(_dgEstado.nivel_medido)}</b> · ${_dgEstado.pct}%</span>
        <button class="btn btn-ghost btn-sm" onclick="abrirDiagnostico()">Repetir</button>
      </div>`;
    return;
  }

  caja.innerHTML = `
    <div class="glass-card-accent anim-slide-up diag-card">
      <div class="card-title">ANTES DE NADA: ¿DE DÓNDE PARTES?</div>
      <div class="diag-texto">
        La app dice que estás en <b>B1</b>, pero ese dato lo escribimos nosotros:
        <b>no se ha medido nunca</b>. Con el examen ${dias != null ? `a <b>${dias} días</b>` : 'a la vuelta'},
        el plan entero depende de saberlo.
      </div>
      <div class="diag-texto" style="margin-top:8px">
        Son <b>24 preguntas</b> de Use of English, unos 20 minutos. No hay nota que
        aprobar: sirve para saber por dónde empezar.
      </div>
      <button class="btn btn-primary" onclick="abrirDiagnostico()" style="margin-top:12px;width:100%">
        HACER EL TEST DE NIVEL
      </button>
    </div>`;
}

function diasHastaExamen(fecha) {
  if (!fecha) return null;
  const hoy = new Date(`${hoyLocal()}T12:00:00Z`);
  const dia = new Date(`${fecha}T12:00:00Z`);
  const d = Math.round((dia - hoy) / 86400000);
  return Number.isFinite(d) ? d : null;
}

const escaparDg = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── EL TEST ──────────────────────────────────────────────

async function abrirDiagnostico() {
  goTo('exam');
  const c = document.getElementById('exam-content');
  if (!c) return;
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const r = await apiGet('/diagnostico');
    _dgPreguntas  = r.preguntas || [];
    _dgRespuestas = {};
    if (!_dgPreguntas.length) {
      c.innerHTML = '<div class="empty-state">No hay preguntas cargadas para el test.</div>';
      return;
    }
    renderDiagnostico();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

function renderDiagnostico() {
  const c = document.getElementById('exam-content');
  const NOMBRES = {
    open_cloze: 'Hueco libre',
    mc_cloze: 'Hueco con opciones',
    word_formation: 'Formar la palabra',
    key_word_transformation: 'Transformación',
  };

  c.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="goTo('hoy')" style="margin-bottom:10px">← HOY</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">TEST DE NIVEL</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6">
        24 preguntas de nivel C1. <b>Se responde a lo que se sepa</b>: dejar en blanco
        lo que no sale es parte de la medida, y adivinar la estropea.
      </div>
    </div>

    <div id="diag-preguntas">
      ${_dgPreguntas.map((q, i) => `
        <div class="glass-card" style="margin-bottom:10px">
          <div class="diag-num">${i + 1} de ${_dgPreguntas.length} · ${NOMBRES[q.part] || q.part}</div>
          <div class="diag-prompt">${escaparDg(q.prompt)}</div>
          ${q.given_word ? `<div class="diag-dada">palabra dada: <b>${escaparDg(q.given_word)}</b></div>` : ''}
          ${Array.isArray(q.options) && q.options.length
            ? `<div class="diag-ops">
                 ${q.options.map((op) => `
                   <button class="diag-op" id="diag-${q.id}-${escaparDg(op)}"
                           onclick="responderDiag(${q.id}, ${JSON.stringify(op).replace(/"/g, '&quot;')})">
                     ${escaparDg(op)}
                   </button>`).join('')}
               </div>`
            : `<input class="diag-input" type="text" autocomplete="off" autocapitalize="off"
                      placeholder="Escribe tu respuesta"
                      oninput="responderDiag(${q.id}, this.value)">`}
        </div>`).join('')}
    </div>

    <button class="btn btn-primary" onclick="corregirDiagnostico()" style="width:100%;margin-top:6px">
      VER MI NIVEL
    </button>
    <div id="diag-resultado"></div>`;
}

function responderDiag(id, valor) {
  _dgRespuestas[id] = valor;
  // En las de opciones, marcar la elegida.
  const q = _dgPreguntas.find((x) => x.id === id);
  if (!Array.isArray(q?.options)) return;
  for (const op of q.options) {
    document.getElementById(`diag-${id}-${op}`)?.classList.toggle('elegida', op === valor);
  }
}

async function corregirDiagnostico() {
  const answers = _dgPreguntas.map((q) => ({ id: q.id, response: _dgRespuestas[q.id] ?? '' }));
  const caja = document.getElementById('diag-resultado');
  if (caja) caja.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

  try {
    const r = await apiPost('/diagnostico', { answers });
    const NOMBRES = {
      open_cloze: 'Hueco libre',
      mc_cloze: 'Hueco con opciones',
      word_formation: 'Formar la palabra',
      key_word_transformation: 'Transformación',
    };

    // Lo que peor sale es lo que dice por dónde empezar: no es lo mismo fallar
    // las transformaciones que no tener léxico.
    const partes = Object.entries(r.porParte || {})
      .map(([k, v]) => ({ k, pct: Math.round((v.aciertos / v.total) * 100), ...v }))
      .sort((a, b) => a.pct - b.pct);

    caja.innerHTML = `
      <div class="glass-card-accent anim-slide-up" style="margin-top:12px">
        <div class="card-title">TU NIVEL ESTIMADO</div>
        <div class="diag-nivel">${escaparDg(r.nivel)}</div>
        <div class="diag-pct">${r.aciertos} de ${r.total} · ${r.pct}%</div>
        <div class="diag-texto" style="margin-top:10px">${escaparDg(r.texto)}</div>

        <div class="diag-partes">
          ${partes.map((p) => `
            <div class="diag-parte">
              <span>${NOMBRES[p.k] || p.k}</span>
              <span class="diag-parte-pct ${p.pct < 50 ? 'flojo' : ''}">${p.aciertos}/${p.total}</span>
            </div>`).join('')}
        </div>

        <div class="diag-aviso">
          Es una <b>estimación</b> para decidir por dónde atacar, no una nota oficial.
          Mide Use of English: dice poco de tu listening y nada de tu writing.
        </div>
      </div>

      <div class="glass-card" style="margin-top:10px">
        <div class="card-title">LO QUE PEOR SALE</div>
        <div style="font-size:0.8rem;color:var(--text-2);line-height:1.6">
          <b>${NOMBRES[partes[0]?.k] || '—'}</b>, con ${partes[0]?.aciertos}/${partes[0]?.total}.
          Por ahí es por donde más se gana.
        </div>
      </div>

      <button class="btn btn-primary" onclick="goTo('hoy')" style="width:100%;margin-top:12px">
        VOLVER A HOY
      </button>`;

    caja.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showXpPop(30);
    pintarDiagnosticoHoy();
  } catch (e) {
    if (caja) caja.innerHTML = cajaError(e);
  }
}
