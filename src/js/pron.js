// TutorIngles — pron.js
// Pintado de la pronunciación figurada y sección de PRONUNCIACIÓN.
//
// La figurada la calcula el servidor (lib/respelling.js) y llega ya troceada en
// sílabas y tokens. Aquí solo se pinta, marcando con color los sonidos que el
// español no tiene: si salieran todos en negro, la figurada parecería una
// palabra española más y se leería con acento español, que es lo que se
// intenta evitar.

// ── STATE ───────────────────────────────────────────────
let _pronContrastes = [];
let _pronTrampas    = [];
let _pronActual     = null;   // contraste abierto en el entrenador
let _pronRonda      = [];     // preguntas de la ronda en curso
let _pronIdx        = 0;
let _pronAciertos   = 0;
let _pronFallos     = 0;
let _pronModo       = 'oido'; // 'oido' | 'lectura'
let _pronGuia       = null;   // guía de cómo se lee cada letra
let _pronInited     = false;

// ── PINTADO DE LA FIGURADA ───────────────────────────────

// Misma regla que `enMayusculas` en lib/respelling.js: la ə no se pone en
// mayúscula nunca. Está duplicada aquí a propósito — el pintado no usa el
// `texto` que ya viene hecho del servidor, sino que recompone token a token
// para poder colorear cada sonido. Si esta copia se olvida, la sílaba tónica
// vuelve a salir con "Ə" aunque el servidor la haya mandado bien.
const pronMayus = (s) => String(s).split('')
  .map((c) => (c === 'ə' ? c : c.toUpperCase())).join('');

/** Una sílaba con sus tokens coloreados. */
function pronSilaba(s) {
  const tokens = (s.tokens || []).map((t) =>
    `<span class="ph ph-${t.clase}"${t.nota ? ` title="${escaparAttr(t.nota)}"` : ''}>${
      s.tonica ? pronMayus(t.t) : t.t}</span>`).join('');
  return `<span class="pron-sil${s.tonica ? ' es-tonica' : ''}">${tokens}</span>`;
}

/** Figurada de una palabra suelta (objeto que devuelve /pronunciation/word). */
function pronPalabra(fig, opciones = {}) {
  if (!fig) return '';
  const { conIpa = false, clase = '' } = opciones;
  const silabas = (fig.silabas || []).map(pronSilaba).join('<span class="pron-sep">·</span>');
  return `<span class="pron ${clase}">${silabas}</span>` +
    (conIpa && fig.ipa ? `<span class="pron-ipa">${fig.ipa}</span>` : '');
}

/** Figurada de una frase entera, alineada bajo el original. */
function pronFrase(p) {
  if (!p || !p.piezas) return '';
  const cuerpo = p.piezas.map((z) => {
    if (z.tipo !== 'palabra') return `<span class="pron-lit">${escaparHtml(z.original)}</span>`;
    if (!z.fig) return `<span class="pron-sinfig" title="No está en el diccionario">${escaparHtml(z.original)}</span>`;
    const sil = (z.silabas || []).map((s) =>
      pronSilaba(z.atona ? { ...s, tonica: false } : s)
    ).join('<span class="pron-sep">·</span>');
    return `<span class="pron-pal${z.atona ? ' es-atona' : ''}">${sil}</span>`;
  }).join('');
  return `<div class="pron-frase">${cuerpo}</div>`;
}

/** Avisos de una palabra o frase: letras mudas, notas revisadas a mano. */
function pronAvisos(avisos) {
  if (!avisos || !avisos.length) return '';
  return avisos.map((a) =>
    `<span class="pron-aviso pron-aviso-${a.tipo}">${escaparHtml(a.texto)}</span>`).join('');
}

/** Todos los avisos de una frase, sin repetir. */
function pronAvisosFrase(p) {
  if (!p || !p.piezas) return '';
  const vistos = new Set(), out = [];
  for (const z of p.piezas) {
    for (const a of z.avisos || []) {
      const k = z.original + a.texto;
      if (vistos.has(k)) continue;
      vistos.add(k);
      out.push({ ...a, texto: `${z.original}: ${a.texto}` });
    }
  }
  return pronAvisos(out);
}

// Cuántas veces se abre sola la leyenda antes de empezar a salir plegada. Con
// una sola vez no basta: la figurada se lee de refilón y no se retiene a la
// primera. A partir de ahí estorba, y se pliega.
const LEY_VECES_ABIERTA = 8;

/** ¿Toca enseñar la leyenda abierta? Cuenta las veces que se ha pintado. */
function leyendaAbierta() {
  try {
    const n = Number(localStorage.getItem('pron_ley_vistas') || 0);
    if (n >= LEY_VECES_ABIERTA) return false;
    localStorage.setItem('pron_ley_vistas', String(n + 1));
    return true;
  } catch { return false; }   // modo privado: mejor plegada que romper
}

/**
 * Botón que despliega la leyenda del sistema de escritura.
 * Va donde se vea figurada, sin excepción: una ə sin explicación al lado es
 * exactamente el problema que la figurada venía a resolver.
 */
function pronLeyenda(leyenda, id, opciones = {}) {
  if (!leyenda || !leyenda.length) return '';
  const { abrir = null } = opciones;   // null = decide el contador
  const filas = leyenda.map((l) =>
    `<div class="pron-ley-fila">
       <span class="ph ph-${l.clase} pron-ley-sim">${l.simbolo}</span>
       <span class="pron-ley-nota">${escaparHtml(l.nota)}</span>
     </div>`).join('');
  const abierta = abrir === null ? leyendaAbierta() : abrir;
  return `
    <details class="pron-leyenda" id="${id}"${abierta ? ' open' : ''}>
      <summary>Cómo se leen estas letras</summary>
      <div class="pron-ley-marcas">
        <span><b>MAYÚSCULAS</b> = ahí va el golpe de voz</span>
        <span><b>ii uu aa oo ëë</b> = vocal larga, se estira</span>
        <span><b>ə</b> = boca en reposo, sin fuerza — como el "eeeh…" de dudar</span>
      </div>
      ${filas}
    </details>`;
}

const escaparHtml = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escaparAttr = (s) => escaparHtml(s).replace(/"/g, '&quot;');

// ── LEER EN VOZ ALTA ─────────────────────────────────────
// La elección de voz y el audio grabado están en voz.js. Aquí solo queda el
// nombre de siempre para no tocar los cientos de onclick que ya lo llaman.
function pronDecir(texto, veces = 1, btn) {
  vozDecir(texto, { veces, btn });
}

/**
 * Igual, pero forzando la voz del sistema aunque haya grabación.
 *
 * Sigue haciendo falta, pero ya no para todo el entrenador: ahora la decisión
 * es POR PAR y viene de la base (`pron_pairs.audio_ok`), medida fichero a
 * fichero por tools/cortar-pares.js. Ver `pronOir`.
 */
function pronDecirSinGrabar(texto, veces = 1, btn) {
  vozDecir(texto, { veces, btn, sinGrabado: true });
}

// ── ESCUCHAR UN PAR ──────────────────────────────────────
//
// Durante trece días este ejercicio sonó con la voz del móvil para TODO, y en
// un aparato configurado en español la b y la v son literalmente el mismo
// sonido: el marcador de b/v se quedó en 5 aciertos y 7 fallos, un 42 %, por
// debajo de tirar una moneda. Ahora las palabras están grabadas con la voz de
// la app y medidas una a una — b/v salió con 15-37 dB de separación, así que
// Emily sí las distingue; lo que no distinguía era el móvil.
//
// Dos cosas se deciden fuera y llegan con el par:
//   · `audio_ok` — si el audio grabado de ESE par separa los dos sonidos. En la
//     i corta y la i larga no lo hace (el modelo no alarga la vocal: `sheep`
//     sale más corta que `ship`), así que esos siguen con voz del móvil.
//   · `lento_ok` — si la cámara lenta ayuda o estorba en ese contraste.

// Pulsaciones por palabra dentro de la tarjeta actual. Se reinicia al cambiar
// de pregunta: si no, la siguiente palabra arrancaría ya en lento sin que nadie
// lo haya pedido.
let _pronEscuchas = {};
const pronResetEscuchas = () => { _pronEscuchas = {}; };

// Los onclick del HTML sólo pueden llevar valores sueltos, así que el par se
// pasa por id y se busca aquí.
const pronPar = (id) => (_pronActual?.pares || []).find((p) => p.id === id) || null;

/**
 * Escuchar una palabra del par. **A la segunda pulsación va en cámara lenta**,
 * si el contraste lo admite.
 *
 * No se implementa subiendo `veces`, que sería lo natural: hasta hace nada
 * `vozDecir` sólo miraba el audio grabado cuando `veces === 1`, así que pedir
 * una repetición te devolvía la voz del móvil a mitad de ejercicio.
 */
function pronOir(palabra, btn, par) {
  const clave  = String(palabra).toLowerCase();
  const n      = (_pronEscuchas[clave] = (_pronEscuchas[clave] || 0) + 1);
  const lento  = n >= 2 && _pronActual?.lento_ok !== false;
  vozDecir(palabra, { btn, lento, sinGrabado: !par?.audio_ok });

  // El botón se anuncia solo. Un botón que hace dos cosas distintas sin avisar
  // se lee como un fallo, no como una función.
  if (btn && n === 1 && _pronActual?.lento_ok !== false) {
    const et = btn.querySelector('.pron-play-et');
    if (et) et.textContent = 'OTRA VEZ, MÁS DESPACIO';
  }
}

/**
 * Las dos palabras del par, seguidas, con una pausa entre ellas.
 *
 * Antes esto mandaba el texto `"ban. van. ban."` de una pieza a la voz del
 * sistema, y traía dos problemas: nunca podía usar audio grabado (busca la
 * clave "ban. van. ban.", que no existe) y el sintetizador les ponía entonación
 * de lista — la última cae, la primera sube—, así que las dos apariciones de
 * `ban` ni siquiera sonaban igual entre sí. Encima del contraste que cuesta
 * oír, variación de entonación.
 */
function pronOirLasDos(a, b, btn, par) {
  const pausa = 700;
  const di = (palabra, retraso) => setTimeout(() => {
    vozDecir(palabra, { sinGrabado: !par?.audio_ok });
  }, retraso);
  if (btn) {
    btn.classList.add('anim-pulse');
    setTimeout(() => btn.classList.remove('anim-pulse'), pausa * 2 + 900);
  }
  vozDecir(a, { sinGrabado: !par?.audio_ok });
  di(b, pausa);
  di(a, pausa * 2);
}

// ── SECCIÓN PRONUNCIACIÓN ────────────────────────────────
async function initPron() {
  const c = document.getElementById('pron-content');
  if (!c || _pronInited) return;
  _pronInited = true;

  // La primera vez, la introducción va por delante: sin ella la figurada es un
  // montón de letras raras. Después no vuelve a aparecer sola.
  const esPrimeraVez = typeof cargarIntro === 'function' ? await cargarIntro() : false;
  if (esPrimeraVez) { abrirIntro(); return; }

  await cargarPronInicio();
}

async function cargarPronInicio() {
  const c = document.getElementById('pron-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const [contrastes, trampas, guia] = await Promise.all([
      apiGet('/pronunciation/contrasts'),
      apiGet('/pronunciation/traps'),
      apiGet('/pronunciation/legend'),
    ]);
    _pronContrastes = contrastes || [];
    _pronTrampas    = trampas || [];
    _pronGuia       = guia || null;
    renderPronInicio();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

// ── GUÍA: CÓMO SE LEE CADA LETRA ─────────────────────────
// Va la primera de la sección y no escondida en un desplegable. El sistema
// figurado quitó el AFI, que era ilegible, pero metió ə y æ: si esos dos no se
// explican donde se ven, se repite el mismo problema a menor escala.
function renderGuiaSonidos() {
  if (!_pronGuia) return '';
  const g = _pronGuia;

  const ejemplos = (lista) => (lista || []).map(([en, fig]) => `
    <button class="guia-ej" onclick="event.stopPropagation();pronDecir(${JSON.stringify(en).replace(/"/g, '&quot;')}, 1, this)">
      <span class="guia-ej-en">${escaparHtml(en)}</span>
      <span class="guia-ej-fig">${escaparHtml(fig)}</span>
    </button>`).join('');

  const ficha = (s) => `
    <div class="guia-ficha">
      <div class="guia-cab">
        <span class="ph ph-${s.clase} guia-sim">${escaparHtml(s.simbolo)}</span>
        <span class="guia-nombre">${escaparHtml(s.nombre)}</span>
      </div>
      <div class="guia-como">${escaparHtml(s.como)}</div>
      ${s.truco ? `<div class="guia-truco"><b>Truco:</b> ${escaparHtml(s.truco)}</div>` : ''}
      <div class="guia-ejemplos">${ejemplos(s.ejemplos)}</div>
      ${s.error ? `<div class="guia-error"><b>El fallo típico:</b> ${escaparHtml(s.error)}</div>` : ''}
      ${s.dato  ? `<div class="guia-dato">${escaparHtml(s.dato)}</div>` : ''}
    </div>`;

  const grupo = (clave, titulo, subtitulo) => {
    const items = (g.sonidos || []).filter((s) => s.grupo === clave);
    if (!items.length) return '';
    return `<div class="guia-grupo-tit">${titulo}<span>${subtitulo}</span></div>${items.map(ficha).join('')}`;
  };

  return `
    <details class="guia" id="guia-sonidos">
      <summary>
        <span class="guia-sum-tit">CÓMO SE LEE LA FIGURADA</span>
        <span class="guia-sum-sub">Qué es la <span class="ph ph-floja">ə</span>, la <span class="ph ph-ajeno">æ</span> y las demás</span>
      </summary>
      <div class="guia-cuerpo">
        <div class="guia-grupo-tit">CÓMO ESTÁ ESCRITA<span>no son sonidos, son marcas</span></div>
        ${(g.marcas || []).map((m) => `
          <div class="guia-ficha">
            <div class="guia-cab">
              <span class="guia-sim guia-sim-marca">${escaparHtml(m.simbolo)}</span>
              <span class="guia-nombre">${escaparHtml(m.nombre)}</span>
            </div>
            <div class="guia-como">${escaparHtml(m.como)}</div>
            <div class="guia-ejemplos">${ejemplos(m.ejemplos)}</div>
          </div>`).join('')}
        ${grupo('vocales',     'VOCALES',            'las que no tenemos')}
        ${grupo('consonantes', 'CONSONANTES',        'hay que aprenderlas')}
        ${grupo('gratis',      'YA LAS SABES HACER', 'ventaja del castellano')}
      </div>
    </details>`;
}

function renderPronInicio() {
  const c = document.getElementById('pron-content');
  const hechos = _pronContrastes.filter((x) => x.mejor_pct >= 80).length;

  c.innerHTML = `
    <div class="glass-card-accent anim-slide-up">
      <div class="card-title">ENTRENAR EL OÍDO</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6;margin-bottom:12px">
        No se puede decir bien un sonido que no distingues al oírlo. Aquí se
        entrena eso: dos palabras que solo cambian en un sonido, y tú eliges
        cuál has oído.
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(hechos / Math.max(1, _pronContrastes.length) * 100)}%"></div></div>
      <div class="progress-label">${hechos} de ${_pronContrastes.length} sonidos dominados</div>
    </div>

    <button class="btn btn-subtle intro-repetir" onclick="abrirIntro()">
      <img src="src/img/icons/idea.png" alt="" class="ico"> VER LA INTRODUCCIÓN (2 MIN)
    </button>

    ${renderGuiaSonidos()}

    <div class="pron-honestidad">
      Esto mide tu <b>oído</b>, no tu pronunciación. La voz es sintética y la
      corrección de cómo hablas tú sigue pendiente.
    </div>

    <div class="sec-sub">SONIDOS QUE UN ESPAÑOL CONFUNDE</div>
    ${_pronContrastes.map((x) => {
      const pct = x.mejor_pct;
      const estado = pct == null ? '' : pct >= 80 ? 'bien' : pct >= 50 ? 'medio' : 'mal';
      return `
      <div class="topic-item" onclick="abrirContraste('${x.slug}')">
        <div class="pron-par-chip">
          <span class="ph ph-ajeno">${escaparHtml(x.figurada_a)}</span>
          <span class="pron-vs">/</span>
          <span class="ph ph-ajeno">${escaparHtml(x.figurada_b)}</span>
        </div>
        <div class="topic-item-info">
          <div class="topic-item-title">${escaparHtml(x.titulo_es)}</div>
          <div class="topic-item-meta">${x.n_pares} pares${pct != null ? ` · mejor ${pct}%` : ''}</div>
        </div>
        <span class="badge badge-${(x.nivel || 'a2').toLowerCase()}">${x.nivel}</span>
        <div class="topic-check ${estado}">${pct >= 80 ? '✓' : ''}</div>
      </div>`;
    }).join('')}

    <div class="sec-sub">TRAMPAS DEL ESPAÑOL</div>
    ${_pronTrampas.map((t, i) => `
      <div class="glass-card pron-trampa" style="margin-bottom:10px">
        <div class="card-title" style="cursor:pointer" onclick="togglePronTrampa(${i})">
          ${escaparHtml(t.titulo_es)}
          <span class="pron-trampa-fl" id="pron-tr-fl-${i}">＋</span>
        </div>
        <div id="pron-tr-${i}" style="display:none">
          <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6;margin:6px 0 12px">
            ${escaparHtml(t.regla_es)}
          </div>
          ${(t.ejemplos || []).map((g) => `
            <div class="pron-regla">
              <div class="pron-regla-tit">${escaparHtml(g.regla)}</div>
              ${(g.casos || []).map(([en, fig]) => `
                <div class="pron-caso">
                  <button class="btn-icon" onclick="pronDecir(${JSON.stringify(en).replace(/"/g, '&quot;')}, 1, this)" aria-label="Escuchar ${escaparAttr(en)}"><img src="src/img/icons/listen.png" alt="" class="ico"></button>
                  <span class="pron-caso-en">${escaparHtml(en)}</span>
                  <span class="pron-caso-fig">${escaparHtml(fig)}</span>
                </div>`).join('')}
            </div>`).join('')}
        </div>
      </div>`).join('')}
  `;
}

function togglePronTrampa(i) {
  const caja = document.getElementById(`pron-tr-${i}`);
  const fl   = document.getElementById(`pron-tr-fl-${i}`);
  if (!caja) return;
  const abierto = caja.style.display !== 'none';
  caja.style.display = abierto ? 'none' : 'block';
  if (fl) fl.textContent = abierto ? '＋' : '−';
}

// ── ENTRENADOR DE PARES MÍNIMOS ──────────────────────────
async function abrirContraste(slug) {
  const c = document.getElementById('pron-content');
  c.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    _pronActual = await apiGet(`/pronunciation/contrasts/${slug}`);
    // Los contrastes de sólo producción (la e fantasma, la r inglesa) no tienen
    // ejercicio de oído posible: abrirlos en modo oído dejaba una pregunta sin
    // respuesta correcta posible.
    if (_pronActual?.modo === 'produccion') _pronModo = 'decir';
    prepararRonda();
    renderContraste();
  } catch (e) {
    c.innerHTML = cajaError(e);
  }
}

// Cada par da dos preguntas (una por palabra) y se barajan. Así no se puede
// acertar por eliminación acordándose del orden.
function prepararRonda() {
  const pares = _pronActual?.pares || [];
  _pronRonda = pares.flatMap((p) => [
    { par: p, correcta: 'a' },
    { par: p, correcta: 'b' },
  ]);
  for (let i = _pronRonda.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_pronRonda[i], _pronRonda[j]] = [_pronRonda[j], _pronRonda[i]];
  }
  _pronRonda    = _pronRonda.slice(0, 12);
  _pronIdx      = 0;
  _pronAciertos = 0;
  _pronFallos   = 0;
}

function renderContraste() {
  const x = _pronActual;
  if (!x) return;
  const c = document.getElementById('pron-content');

  c.innerHTML = `
    <button class="btn btn-ghost btn-sm" onclick="cargarPronInicio()" style="margin-bottom:10px">← Sonidos</button>

    <div class="glass-card-accent anim-slide-up">
      <div class="pron-par-grande">
        <span class="ph ph-ajeno">${escaparHtml(x.figurada_a)}</span>
        <span class="pron-vs">frente a</span>
        <span class="ph ph-ajeno">${escaparHtml(x.figurada_b)}</span>
      </div>
      <div class="card-title" style="margin-top:10px">${escaparHtml(x.titulo_es)}</div>
      <div style="font-size:0.78rem;color:var(--text-2);line-height:1.6;margin-bottom:10px">
        ${escaparHtml(x.por_que_es)}
      </div>
      <div class="pron-comohacer">
        <div class="pron-comohacer-tit">CÓMO SE HACE CON LA BOCA</div>
        ${escaparHtml(x.como_se_hace)}
      </div>
    </div>

    ${x.modo === 'produccion' ? `
      <div class="pron-solo-boca">
        Este no se entrena de oído: no hay dos palabras inglesas que se
        distingan por esto. Es un error de los nuestros al hablar, así que se
        practica diciéndolo.
      </div>
      <div class="vocab-filters" style="margin:12px 0">
        <button class="filter-chip active" onclick="setPronModo('decir')">Decirlo</button>
      </div>` : `
      <div class="vocab-filters" style="margin:12px 0">
        <button class="filter-chip ${_pronModo === 'oido' ? 'active' : ''}" onclick="setPronModo('oido')">Oído</button>
        <button class="filter-chip ${_pronModo === 'lectura' ? 'active' : ''}" onclick="setPronModo('lectura')">Lectura</button>
        <button class="filter-chip ${_pronModo === 'decir' ? 'active' : ''}" onclick="setPronModo('decir')">Decirlo</button>
      </div>`}

    <div id="pron-quiz"></div>

    <div class="glass-card" style="margin-top:10px">
      <div class="card-title">LOS PARES</div>
      ${(x.pares || []).map((p) => `
        <div class="pron-lista-par">
          <button class="btn-icon" onclick="pronOir(${JSON.stringify(p.word_a).replace(/"/g, '&quot;')}, this, pronPar(${p.id}))" aria-label="Escuchar ${escaparAttr(p.word_a)}"><img src="src/img/icons/listen.png" alt="" class="ico"></button>
          <div class="pron-lista-lado">
            <div class="pron-lista-en">${escaparHtml(p.word_a)}</div>
            ${pronPalabra(p.fig_a)}
            <div class="pron-lista-es">${escaparHtml(p.es_a)}</div>
          </div>
          <div class="pron-lista-lado">
            <div class="pron-lista-en">${escaparHtml(p.word_b)}</div>
            ${pronPalabra(p.fig_b)}
            <div class="pron-lista-es">${escaparHtml(p.es_b)}</div>
          </div>
          <button class="btn-icon" onclick="pronOir(${JSON.stringify(p.word_b).replace(/"/g, '&quot;')}, this, pronPar(${p.id}))" aria-label="Escuchar ${escaparAttr(p.word_b)}"><img src="src/img/icons/listen.png" alt="" class="ico"></button>
        </div>`).join('')}
    </div>
  `;

  renderPregunta();
}

function setPronModo(modo) {
  _pronModo = modo;
  prepararRonda();
  renderContraste();
}

function renderPregunta() {
  const caja = document.getElementById('pron-quiz');
  if (!caja) return;

  if (_pronIdx >= _pronRonda.length) return renderResultado();

  const q   = _pronRonda[_pronIdx];
  const p   = q.par;
  const pct = Math.round((_pronIdx / _pronRonda.length) * 100);
  const palabra = q.correcta === 'a' ? p.word_a : p.word_b;
  const figura  = q.correcta === 'a' ? p.fig_a  : p.fig_b;

  // En s/z y θ/ð las dos figuradas se escriben igual y solo las separa el
  // color, así que en modo lectura hay que enseñar además el AFI o la pregunta
  // no tiene solución posible.
  if (_pronModo === 'decir') return renderPreguntaDecir(q, p, pct);

  const enunciado = _pronModo === 'oido'
    ? `<div class="pron-q-tit">¿Cuál has oído?</div>
       <button class="btn btn-primary pron-q-play" onclick="pronOir(${JSON.stringify(palabra).replace(/"/g, '&quot;')}, this, pronPar(${p.id}))">
         <img src="src/img/icons/listen.png" alt="" class="ico"> <span class="pron-play-et">ESCUCHAR OTRA VEZ</span>
       </button>
       ${p.audio_ok ? '' : `
         <div class="pron-aviso-tts">
           Este par suena con <b>la voz de tu móvil</b>: la grabada no separa estos dos
           sonidos y era peor el remedio. Si no los distingues, no es cosa tuya.
         </div>`}`
    : `<div class="pron-q-tit">¿Qué palabra se lee así?</div>
       <div class="pron-q-fig">${pronPalabra(figura, { conIpa: p.ambiguo })}</div>
       ${p.ambiguo ? '<div class="pron-q-pista">Las dos se escriben igual en figurada: fíjate en el color y en el símbolo de arriba.</div>' : ''}`;

  caja.innerHTML = `
    <div class="glass-card anim-slide-up">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${_pronIdx + 1} de ${_pronRonda.length} · ${_pronAciertos} aciertos</div>
      ${enunciado}
      <div class="pron-opciones">
        <button class="pron-op" id="pron-op-a" onclick="responderPron('a')">
          <span class="pron-op-en">${escaparHtml(p.word_a)}</span>
          <span class="pron-op-es">${escaparHtml(p.es_a)}</span>
        </button>
        <button class="pron-op" id="pron-op-b" onclick="responderPron('b')">
          <span class="pron-op-en">${escaparHtml(p.word_b)}</span>
          <span class="pron-op-es">${escaparHtml(p.es_b)}</span>
        </button>
      </div>
      <div id="pron-feedback"></div>
    </div>
  `;

  // Cada pregunta empieza de cero: la cámara lenta se gana pulsando dos veces
  // ESTA palabra, no se hereda de la anterior.
  pronResetEscuchas();

  // En modo oído se reproduce solo al entrar: es el estímulo de la pregunta.
  // Cuenta como la primera escucha, así que el botón ya ofrece la lenta.
  if (_pronModo === 'oido') {
    setTimeout(() => pronOir(palabra, document.querySelector('.pron-q-play'), p), 300);
  }
}

// ── MODO DECIRLO: la única medida de pronunciación que hay sin Azure ─────
//
// Comparar tu transcripción con la frase esperada no mide nada: el reconocedor
// autocorrige hacia lo que espera oír y se saca un 100 % con acento pésimo. Eso
// es lo que hacen `scoreSpeech` y `wkCompare`, y está avisado en pantalla.
//
// Con un par mínimo la cosa cambia. Si "sheep" y "ship" solo se diferencian en
// la vocal, la palabra que el reconocedor elija DEPENDE de esa vocal. No hay
// contexto ni gramática de los que tirar para autocorregir. Que entienda "ship"
// cuando querías decir "sheep" es un fallo objetivo, y además dice cuál.
//
// Lo que NO es: una nota de tu pronunciación general. Mide un sonido concreto.

const PronRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let _decirEscuchando = false;
let _decirRec = null;

function renderPreguntaDecir(q, p, pct) {
  const caja = document.getElementById('pron-quiz');
  const objetivo = q.correcta === 'a' ? p.word_a : p.word_b;
  const otra     = q.correcta === 'a' ? p.word_b : p.word_a;
  const figura   = q.correcta === 'a' ? p.fig_a  : p.fig_b;

  if (!PronRec) {
    caja.innerHTML = `
      <div class="glass-card">
        <div class="pron-honestidad">
          Este navegador no transcribe voz, así que aquí no se puede comprobar
          nada. En iPhone, Safari lo bloquea con la app instalada en la pantalla
          de inicio. Usa los modos de oído y lectura.
        </div>
      </div>`;
    return;
  }

  caja.innerHTML = `
    <div class="glass-card anim-slide-up">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="progress-label">${_pronIdx + 1} de ${_pronRonda.length} · ${_pronAciertos} aciertos</div>

      <div class="pron-q-tit">Di esta palabra</div>
      <div class="decir-objetivo">${escaparHtml(objetivo)}</div>
      <div class="pron-q-fig">${pronPalabra(figura)}</div>

      <div class="decir-btns">
        <button class="btn btn-subtle" onclick="pronDecirSinGrabar(${JSON.stringify(objetivo).replace(/"/g, '&quot;')}, 1, this)">
          <img src="src/img/icons/listen.png" alt="" class="ico"> OÍRLA
        </button>
        <button class="speak-record-btn decir-mic" id="decir-mic" onclick="grabarParaComprobar(${JSON.stringify(objetivo).replace(/"/g, '&quot;')}, ${JSON.stringify(otra).replace(/"/g, '&quot;')})">
          <img src="src/img/icons/mic.png" alt="" class="ico">
        </button>
      </div>
      <div class="decir-estado" id="decir-estado">Toca el micro y dila</div>
      <div id="pron-feedback"></div>
    </div>`;
}

function grabarParaComprobar(objetivo, otra) {
  const btn    = document.getElementById('decir-mic');
  const estado = document.getElementById('decir-estado');
  if (_decirEscuchando) { _decirRec?.stop(); return; }

  _decirRec = new PronRec();
  _decirRec.lang = 'en-GB';
  _decirRec.interimResults = false;
  // Varias hipótesis: interesa saber si la palabra buena aparece aunque no sea
  // la primera. Que esté en el puesto tres significa "casi, pero no".
  _decirRec.maxAlternatives = 6;

  _decirRec.onstart = () => {
    _decirEscuchando = true;
    btn.classList.add('recording');
    btn.innerHTML = '<img src="src/img/icons/stop.png" alt="" class="ico">';
    estado.textContent = 'ESCUCHANDO…';
  };
  _decirRec.onerror = (e) => {
    estado.textContent = e.error === 'not-allowed'
      ? 'Permiso de micrófono denegado'
      : 'No se pudo escuchar: ' + e.error;
  };
  _decirRec.onend = () => {
    _decirEscuchando = false;
    btn.classList.remove('recording');
    btn.innerHTML = '<img src="src/img/icons/mic.png" alt="" class="ico">';
    if (estado.textContent === 'ESCUCHANDO…') estado.textContent = 'Toca el micro y dila';
  };

  _decirRec.onresult = (ev) => {
    const alts = [...ev.results[0]].map((a) => ({
      texto: (a.transcript || '').toLowerCase().replace(/[^a-z' ]/g, '').trim(),
      conf: a.confidence,
    }));
    juzgarPronunciacion(alts, objetivo, otra);
  };

  try { _decirRec.start(); }
  catch { estado.textContent = 'No se pudo abrir el micrófono'; }
}

/**
 * Decide si el sonido salió bien mirando a cuál de las dos palabras del par se
 * ha ido el reconocedor. Es la parte con valor: no dice "70 %", dice cuál has
 * dicho en realidad.
 */
function juzgarPronunciacion(alts, objetivo, otra) {
  const obj = objetivo.toLowerCase();
  const alt = otra.toLowerCase();
  const puesto = (w) => alts.findIndex((a) => a.texto === w || a.texto.split(' ').includes(w));

  const pObj = puesto(obj);
  const pAlt = puesto(alt);

  let veredicto, clase, explica;
  if (pObj === 0) {
    veredicto = 'Bien dicho';
    clase = 'bien';
    explica = `Te ha entendido «${objetivo}» a la primera. Ese sonido te sale.`;
    _pronAciertos++;
  } else if (pAlt === 0) {
    veredicto = `Te ha entendido «${otra}»`;
    clase = 'mal';
    explica = `Querías decir «${objetivo}». Se te ha ido al otro sonido del par: es justo lo que hay que separar.`;
    _pronFallos++;
  } else if (pObj > 0) {
    veredicto = 'Casi';
    clase = 'medio';
    explica = `«${objetivo}» aparece, pero no como primera opción. Ha entendido «${alts[0].texto}». Marca más el sonido.`;
    _pronFallos++;
  } else {
    veredicto = 'No te ha pillado';
    clase = 'medio';
    explica = alts[0]?.texto
      ? `Ha entendido «${alts[0].texto}», que no es ninguna de las dos. Puede ser el micro o el ruido: prueba otra vez.`
      : 'No ha entendido nada. Acércate al micro y repite.';
  }

  const q = _pronRonda[_pronIdx];
  if (q) q.respondida = true;

  const fb = document.getElementById('pron-feedback');
  if (fb) {
    fb.innerHTML = `
      <div class="pron-fb ${clase}">
        <div class="pron-fb-tit">${escaparHtml(veredicto)}</div>
        <div class="decir-explica">${escaparHtml(explica)}</div>
        <div class="decir-oidas">
          <span class="decir-oidas-et">lo que ha entendido</span>
          ${alts.slice(0, 3).map((a, i) =>
            `<span class="decir-alt${i === 0 ? ' primera' : ''}">${escaparHtml(a.texto || '—')}</span>`).join('')}
        </div>
        <button class="btn btn-subtle btn-sm" onclick="pronOirLasDos(${JSON.stringify(objetivo).replace(/"/g, '&quot;')}, ${JSON.stringify(otra).replace(/"/g, '&quot;')}, this, pronPar(${q.par.id}))">
          <img src="src/img/icons/listen.png" alt="" class="ico"> OÍR LAS DOS
        </button>
      </div>
      <div class="decir-limite">
        Esto comprueba <b>un sonido</b>, el que separa estas dos palabras. No es
        una nota de tu pronunciación entera.
      </div>
      <button class="btn btn-primary" onclick="siguientePron()" style="margin-top:10px">
        ${_pronIdx + 1 >= _pronRonda.length ? 'VER RESULTADO' : 'SIGUIENTE →'}
      </button>`;
  }
}

function responderPron(elegida) {
  const q = _pronRonda[_pronIdx];
  if (!q || q.respondida) return;
  q.respondida = true;

  const acierto = elegida === q.correcta;
  if (acierto) _pronAciertos++; else _pronFallos++;

  const p       = q.par;
  const buena   = q.correcta === 'a' ? p.word_a : p.word_b;
  const figBuena= q.correcta === 'a' ? p.fig_a  : p.fig_b;
  const otra    = q.correcta === 'a' ? p.word_b : p.word_a;
  const figOtra = q.correcta === 'a' ? p.fig_b  : p.fig_a;

  document.getElementById(`pron-op-${q.correcta}`)?.classList.add('bien');
  if (!acierto) document.getElementById(`pron-op-${elegida}`)?.classList.add('mal');

  const fb = document.getElementById('pron-feedback');
  if (fb) {
    fb.innerHTML = `
      <div class="pron-fb ${acierto ? 'bien' : 'mal'}">
        <div class="pron-fb-tit">${acierto ? 'Correcto' : `Era <b>${escaparHtml(buena)}</b>`}</div>
        <div class="pron-fb-comp">
          <div><span class="pron-fb-en">${escaparHtml(buena)}</span> ${pronPalabra(figBuena, { conIpa: true })}</div>
          <div class="pron-fb-otra"><span class="pron-fb-en">${escaparHtml(otra)}</span> ${pronPalabra(figOtra, { conIpa: true })}</div>
        </div>
        <button class="btn btn-subtle btn-sm" onclick="pronOirLasDos(${JSON.stringify(buena).replace(/"/g, '&quot;')}, ${JSON.stringify(otra).replace(/"/g, '&quot;')}, this, pronPar(${p.id}))">
          <img src="src/img/icons/listen.png" alt="" class="ico"> OÍRLAS SEGUIDAS
        </button>
      </div>
      <button class="btn btn-primary" onclick="siguientePron()" style="margin-top:10px">
        ${_pronIdx + 1 >= _pronRonda.length ? 'VER RESULTADO' : 'SIGUIENTE →'}
      </button>`;
  }
}

function siguientePron() {
  _pronIdx++;
  renderPregunta();
}

async function renderResultado() {
  const caja = document.getElementById('pron-quiz');
  const total = _pronAciertos + _pronFallos;
  const pct = total ? Math.round((_pronAciertos / total) * 100) : 0;
  const color = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';

  caja.innerHTML = `
    <div class="glass-card-accent anim-scale-in" style="text-align:center;padding:24px 16px">
      <div style="font-family:var(--font-mono);font-size:2rem;color:${color};font-weight:700">${pct}%</div>
      <div style="font-size:0.8rem;color:var(--text-2);margin:8px 0 4px">
        ${_pronAciertos} aciertos · ${_pronFallos} fallos
      </div>
      <div style="font-size:0.72rem;color:var(--text-3);margin-bottom:16px">
        ${pct >= 80
          ? 'Distingues el sonido. Ahora toca decirlo.'
          : 'Repite la ronda: el oído se afina con repeticiones cortas y seguidas.'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <button class="btn btn-primary" onclick="repetirPron()">OTRA RONDA</button>
        <button class="btn btn-ghost"   onclick="cargarPronInicio()">VOLVER</button>
      </div>
    </div>`;

  try {
    await apiPost(`/pronunciation/contrasts/${_pronActual.slug}/result`,
      { aciertos: _pronAciertos, fallos: _pronFallos });
    showXpPop(_pronAciertos * 2);
    updateXpBar(_xpTotal + _pronAciertos * 2);
  } catch { /* el resultado en pantalla ya está: no se molesta al usuario */ }
}

function repetirPron() {
  prepararRonda();
  renderPregunta();
}
