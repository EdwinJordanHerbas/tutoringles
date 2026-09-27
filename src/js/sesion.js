// TutorIngles — sesion.js
// La sesión diaria de cinco minutos.
//
// El problema que resuelve: la app tenía cinco secciones y un plan de 30 días
// que era una tarjeta informativa, no un camino. Al abrirla había que DECIDIR
// por dónde empezar, y con 209 palabras pendientes la decisión que se tomaba
// era cerrarla. Resultado real: diez días en producción, 0 sesiones de estudio.
//
// Aquí no se decide nada. Un botón, tres tramos cortos y un final:
//   palabras del SRS → una frase de tu sector → un par mínimo de oído
//
// Lo importante es que se ACABE. Una sesión sin final se convierte en deuda.

let _sesData     = null;
let _sesPaso     = 0;      // índice dentro de las palabras
let _sesTramo    = 'carga';// 'palabras' | 'frase' | 'oido' | 'fin'
let _sesAciertos = 0;
let _sesFrase    = false;
let _sesRevelada = false;

/** Abre la sesión a pantalla completa dentro de HOY. */
async function empezarSesion() {
  const caja = document.getElementById('sesion-caja');
  if (!caja) return;
  caja.style.display = 'block';
  caja.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  // El resto de HOY se esconde: mientras dura la sesión no hay nada que decidir.
  document.getElementById('sec-hoy')?.classList.add('en-sesion');
  document.getElementById('cnt')?.scrollTo({ top: 0, behavior: 'smooth' });

  try {
    _sesData     = await apiGet('/sesion-diaria');
    _sesPaso     = 0;
    _sesAciertos = 0;
    _sesFrase    = false;
    _sesTramo    = _sesData.palabras?.length ? 'palabras'
                 : _sesData.frase            ? 'frase'
                 : _sesData.contraste        ? 'oido' : 'fin';
    renderSesion();
  } catch (e) {
    caja.innerHTML = cajaError(e);
  }
}

function cerrarSesion() {
  window.speechSynthesis?.cancel();
  const caja = document.getElementById('sesion-caja');
  if (caja) { caja.style.display = 'none'; caja.innerHTML = ''; }
  document.getElementById('sec-hoy')?.classList.remove('en-sesion');
  if (typeof loadHoyData === 'function') loadHoyData();
}

/** Cuántos tramos quedan, para la barra de arriba. */
function progresoSesion() {
  const nPal  = _sesData?.palabras?.length || 0;
  const total = nPal + (_sesData?.frase ? 1 : 0) + (_sesData?.contraste ? 1 : 0);
  let hechos  = 0;
  if (_sesTramo === 'palabras') hechos = _sesPaso;
  else if (_sesTramo === 'frase') hechos = nPal;
  else if (_sesTramo === 'oido')  hechos = nPal + (_sesData?.frase ? 1 : 0);
  else hechos = total;
  return { hechos, total, pct: total ? Math.round((hechos / total) * 100) : 100 };
}

function renderSesion() {
  const caja = document.getElementById('sesion-caja');
  if (!caja || !_sesData) return;
  const p = progresoSesion();

  const cuerpo =
    _sesTramo === 'palabras' ? tramoPalabra() :
    _sesTramo === 'frase'    ? tramoFrase()   :
    _sesTramo === 'oido'     ? tramoOido()    : tramoFin();

  caja.innerHTML = `
    <div class="ses">
      <div class="ses-cab">
        <span class="ses-cuenta">${_sesTramo === 'fin' ? 'Hecho' : `${p.hechos + 1} de ${p.total}`}</span>
        <button class="ses-cerrar" onclick="cerrarSesion()" aria-label="Cerrar">✕</button>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%"></div></div>
      <div class="ses-cuerpo anim-slide-up">${cuerpo}</div>
    </div>`;
}

// ── TRAMO 1: palabras ────────────────────────────────────
function tramoPalabra() {
  const w = _sesData.palabras[_sesPaso];
  if (!w) return tramoFin();
  const fig = (w.pron && typeof pronFrase === 'function') ? pronFrase(w.pron) : '';
  // La sesión es por donde se entra a la app desde el aviso diario, así que es
  // donde más se ve la figurada. Sin leyenda aquí, la ə y la æ aparecían sin
  // que nada dijera cómo se leen.
  const ley = (w.pron && typeof pronLeyenda === 'function')
    ? pronLeyenda(w.pron.leyenda, 'ley-ses-pal') : '';

  return `
    <div class="ses-et">PALABRA ${_sesPaso + 1} DE ${_sesData.palabras.length}${w.repetida ? ' · LA FALLASTE ANTES' : ''}</div>
    <div class="ses-palabra">${escaparHtml(w.word)}</div>
    ${fig}
    ${ley}
    <button class="btn-icon ses-oir" onclick="pronDecir(${JSON.stringify(w.word).replace(/"/g, '&quot;')}, 1, this)" aria-label="Escuchar">
      <img src="src/img/icons/listen.png" alt="" class="ico">
    </button>

    ${_sesRevelada ? `
      <div class="ses-tras anim-scale-in">
        <div class="ses-trad">${escaparHtml(w.translation)}</div>
        ${w.example_sentence ? `<div class="ses-ej">"${escaparHtml(w.example_sentence)}"</div>` : ''}
      </div>
      <div class="ses-grados">
        <button class="rev-btn rev-again" onclick="calificarSesion(1)"><span class="rev-label">Otra vez</span></button>
        <button class="rev-btn rev-hard"  onclick="calificarSesion(2)"><span class="rev-label">Difícil</span></button>
        <button class="rev-btn rev-good"  onclick="calificarSesion(3)"><span class="rev-label">Bien</span></button>
        <button class="rev-btn rev-easy"  onclick="calificarSesion(4)"><span class="rev-label">Fácil</span></button>
      </div>`
    : `<button class="btn btn-primary ses-accion" onclick="revelarSesion()">VER LA TRADUCCIÓN</button>`}
  `;
}

function revelarSesion() {
  _sesRevelada = true;
  renderSesion();
}

async function calificarSesion(grado) {
  const w = _sesData.palabras[_sesPaso];
  if (!w) return;
  if (grado > 1) _sesAciertos++;

  apiPost(`/user-words/${w.id}/review`, { rating: grado }).catch(() => {});

  _sesRevelada = false;
  _sesPaso++;
  if (_sesPaso >= _sesData.palabras.length) {
    _sesTramo = _sesData.frase ? 'frase' : _sesData.contraste ? 'oido' : 'fin';
    if (_sesTramo === 'fin') return cerrarConResultado();
  }
  renderSesion();
}

// ── TRAMO 2: una frase de tu sector ──────────────────────
function tramoFrase() {
  const f = _sesData.frase;
  if (!f) return tramoFin();
  const fig = (f.pron && typeof pronFrase === 'function') ? pronFrase(f.pron) : '';
  const avisos = (f.pron && typeof pronAvisosFrase === 'function') ? pronAvisosFrase(f.pron) : '';
  const ley = (f.pron && typeof pronLeyenda === 'function')
    ? pronLeyenda(f.pron.leyenda, 'ley-ses-frase') : '';

  return `
    <div class="ses-et">TU SECTOR · ${escaparHtml((f.situacion?.title_es || '').toUpperCase())}</div>
    <div class="ses-frase-en">${escaparHtml(f.en)}</div>
    ${fig}
    <div class="ses-frase-es">${escaparHtml(f.es)}</div>
    ${avisos ? `<div>${avisos}</div>` : ''}
    ${ley}
    ${f.note ? `<div class="ses-nota"><img src="src/img/icons/idea.png" alt="" class="ico"> ${escaparHtml(f.note)}</div>` : ''}

    <div class="ses-frase-btns">
      <button class="btn btn-subtle" onclick="pronDecir(${JSON.stringify(f.en).replace(/"/g, '&quot;')}, 1, this)">
        <img src="src/img/icons/listen.png" alt="" class="ico"> ESCUCHAR
      </button>
      <button class="btn btn-primary" onclick="dichaEnAlto()">YA LA HE DICHO</button>
    </div>
    <div class="ses-pista">Dila en alto. Aunque estés en el sofá: la boca también se entrena.</div>
  `;
}

function dichaEnAlto() {
  _sesFrase = true;
  _sesTramo = _sesData.contraste ? 'oido' : 'fin';
  if (_sesTramo === 'fin') return cerrarConResultado();
  renderSesion();
}

// ── TRAMO 3: el oído ─────────────────────────────────────
function tramoOido() {
  const c = _sesData.contraste;
  if (!c) return tramoFin();
  return `
    <div class="ses-et">EL OÍDO</div>
    <div class="ses-par">
      <span class="ph ph-ajeno">${escaparHtml(c.figurada_a)}</span>
      <span class="pron-vs">/</span>
      <span class="ph ph-ajeno">${escaparHtml(c.figurada_b)}</span>
    </div>
    <div class="ses-par-tit">${escaparHtml(c.titulo_es)}</div>
    <div class="ses-pista">Una ronda corta: oyes una palabra y eliges cuál era.</div>
    <div class="ses-frase-btns">
      <button class="btn btn-subtle" onclick="saltarOido()">HOY NO</button>
      <button class="btn btn-primary" onclick="irAlOido('${escaparAttr(c.slug)}')">ENTRENAR</button>
    </div>`;
}

function saltarOido() { cerrarConResultado(); }

async function irAlOido(slug) {
  // Se cierra la sesión primero: lo hecho hasta aquí ya cuenta.
  await cerrarConResultado(true);
  goTo('pron');
  setTimeout(() => { if (typeof abrirContraste === 'function') abrirContraste(slug); }, 350);
}

// ── FINAL ────────────────────────────────────────────────
async function cerrarConResultado(silencioso) {
  try {
    const r = await apiPost('/sesion-diaria/fin', {
      aciertos: _sesAciertos,
      frase_hecha: _sesFrase,
      // Para que la frase cuente en SU situación. Antes la sesión marcaba la
      // meta de HABLAR y no dejaba rastro en la situación de la que salía la
      // frase, así que TRABAJO parecía intacto mientras se avanzaba por él.
      situation_id: _sesData?.frase?.situacion?.id ?? null,
    });
    _sesData.racha = r?.racha;
    // En el modo Tetris cada sesión es una ronda: el final dice cuál era.
    _sesData.rondas = r?.rondas;
  } catch { /* el resultado en pantalla ya está: no se molesta al usuario */ }

  const xp = _sesAciertos * 5 + (_sesFrase ? 10 : 0);
  if (xp) { showXpPop(xp); updateXpBar(_xpTotal + xp); }

  if (silencioso) return;
  _sesTramo = 'fin';
  renderSesion();
}

function tramoFin() {
  const racha = _sesData?.racha;
  const quedan = Math.max(0, (_sesData?.pendientes_totales || 0) - _sesAciertos);
  const frances = _sesData?.idioma === 'fr';
  // Con el modo Tetris la sesión no es "lo de hoy": es una ronda de varias, y
  // el final lo dice y ofrece la siguiente. El botón de otra ronda no obliga a
  // nada, pero quitar el paso de volver a HOY y buscarla es lo que hace que se
  // encadenen dos rondas en vez de una.
  const tetris = typeof _tetrisActivo !== 'undefined' && _tetrisActivo && _sesData?.rondas;
  const meta   = (typeof _tt !== 'undefined' && _tt?.meta_rondas) || 6;
  if (tetris) {
    return `
    <div class="ses-fin">
      <div class="ses-fin-ico"><img src="src/img/icons/done.png" alt="" class="ico"></div>
      <div class="ses-fin-tit">Ronda ${_sesData.rondas} ${_sesData.rondas <= meta ? `de ${meta}` : 'extra'}</div>
      <div class="ses-fin-sub">
        ${_sesAciertos} ${_sesAciertos === 1 ? 'palabra' : 'palabras'}${_sesFrase ? ' y una frase' : ''}.
        Lo que has fallado vuelve en la siguiente.
      </div>
      <div class="tt-puntos tt-puntos-fin">${Array.from({ length: Math.max(meta, _sesData.rondas) }, (_, i) =>
        `<span class="tt-punto${i < _sesData.rondas ? ' on' : ''}"></span>`).join('')}</div>
      <button class="btn btn-primary" onclick="empezarSesion()" style="width:100%;margin-top:14px">OTRA RONDA</button>
      <button class="btn btn-subtle" onclick="cerrarSesion()" style="width:100%;margin-top:8px">CERRAR</button>
    </div>`;
  }
  return `
    <div class="ses-fin">
      <div class="ses-fin-ico"><img src="src/img/icons/done.png" alt="" class="ico"></div>
      <div class="ses-fin-tit">Hecho por hoy</div>
      <div class="ses-fin-sub">
        ${_sesAciertos} ${_sesAciertos === 1 ? 'palabra' : 'palabras'}${_sesFrase ? (frances ? ' y una frase para Suiza' : ' y una frase de mostrador') : ''}.
      </div>
      ${racha ? `<div class="ses-fin-racha"><img src="src/img/icons/streak.png" alt="" class="ico"> Racha de ${racha} ${racha === 1 ? 'día' : 'días'}</div>` : ''}
      <div class="ses-fin-pie">
        ${quedan ? `Quedan ${quedan} palabras en la cola, pero no hacen falta hoy.` : 'No queda nada pendiente.'}
      </div>
      <button class="btn btn-primary" onclick="cerrarSesion()" style="width:100%;margin-top:14px">CERRAR</button>
    </div>`;
}

// Si se entra desde la notificación (/?sesion=1), la sesión se abre sola.
//
// El parámetro se quita al abrir, no antes: si el service worker nuevo recarga
// la página en medio (pasa en la primera visita tras cada despliegue), la
// recarga tiene que seguir llevando el ?sesion=1 o el aviso no abre nada.
function autoAbrirSesion() {
  const params = new URLSearchParams(location.search);
  if (params.get('sesion') !== '1') return;
  setTimeout(() => {
    history.replaceState(null, '', location.pathname);
    goTo('hoy');
    empezarSesion();
  }, 600);
}
