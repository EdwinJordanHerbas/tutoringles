// TutorIngles — pron-intro.js
// El recorrido que enseña a leer la figurada, paso a paso.
//
// Se abre solo la primera vez que entras en PRONUNCIACIÓN y luego no vuelve a
// molestar: queda un botón para repetirlo. La marca de "ya vista" va en la
// tabla `config` del servidor, no en localStorage, para que no reaparezca cada
// vez que cambies de móvil o se limpie el navegador.

let _introPasos  = [];
let _introIdx    = 0;
let _introVista  = null;
let _introVolver = null;   // a dónde volver al terminar

const INTRO_KEY = 'pron_intro_vista';

/** Carga los pasos. Devuelve true si el usuario nunca la ha visto. */
async function cargarIntro() {
  try {
    const r = await apiGet('/pronunciation/intro');
    _introPasos = r?.pasos || [];
    _introVista = r?.vista || null;
    return !_introVista && _introPasos.length > 0;
  } catch {
    return false;   // si falla, no se bloquea la sección por esto
  }
}

function abrirIntro(volverA) {
  if (!_introPasos.length) return;
  _introVolver = volverA || 'cargarPronInicio';
  _introIdx = 0;
  renderIntroPaso();
}

function renderIntroPaso() {
  const c = document.getElementById('pron-content');
  const p = _introPasos[_introIdx];
  if (!c || !p) return;

  const total  = _introPasos.length;
  const pct    = Math.round(((_introIdx + 1) / total) * 100);
  const ultimo = _introIdx === total - 1;

  c.innerHTML = `
    <div class="intro">
      <div class="intro-cab">
        <span class="intro-cuenta">${_introIdx + 1} de ${total}</span>
        <button class="intro-saltar" onclick="terminarIntro()">Saltar</button>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>

      <div class="intro-cuerpo anim-slide-up" id="intro-cuerpo">
        <h2 class="intro-titulo">${escaparHtml(p.titulo)}</h2>
        <p class="intro-texto">${escaparHtml(p.texto)}</p>

        ${p.compara ? bloqueCompara(p.compara) : ''}
        ${p.demo    ? bloqueDemo(p.demo)       : ''}
        ${p.lista   ? bloqueLista(p.lista)     : ''}
        ${p.nota    ? `<div class="intro-nota">${escaparHtml(p.nota)}</div>` : ''}
        ${p.prueba  ? bloquePrueba(p.prueba)   : ''}
      </div>

      <div class="intro-pie">
        ${_introIdx > 0 ? '<button class="btn btn-ghost" onclick="introAtras()">← Atrás</button>' : '<span></span>'}
        <button class="btn btn-primary" id="intro-seguir" onclick="${ultimo ? 'terminarIntro()' : 'introSiguiente()'}">
          ${ultimo ? 'EMPEZAR' : 'SIGUIENTE →'}
        </button>
      </div>
    </div>`;

  // El ejemplo se oye solo al llegar: es la mitad de la explicación.
  if (p.demo?.en) setTimeout(() => pronDecir(p.demo.en, 1), 450);
}

function bloqueCompara(c) {
  const lado = (l, clase) => `
    <div class="intro-lado ${clase}${l.mal ? ' es-mal' : ''}">
      <div class="intro-lado-et">${escaparHtml(l.et)}</div>
      <div class="intro-lado-v">${escaparHtml(l.v)}</div>
      ${l.pie ? `<div class="intro-lado-pie">${escaparHtml(l.pie)}</div>` : ''}
    </div>`;
  return `<div class="intro-compara">${lado(c.izq, 'izq')}${lado(c.der, 'der')}</div>`;
}

function bloqueDemo(d) {
  return `
    <button class="intro-demo" onclick="pronDecir(${JSON.stringify(d.en).replace(/"/g, '&quot;')}, 1, this)">
      <div class="intro-demo-en">${escaparHtml(d.en)}</div>
      <div class="intro-demo-fig">${escaparHtml(d.fig)}</div>
      <div class="intro-demo-pie"><img src="src/img/icons/listen.png" alt="" class="ico"> tócalo para oírlo</div>
    </button>`;
}

function bloqueLista(lista) {
  return `<div class="intro-lista">${lista.map(([sim, nota]) => `
    <div class="intro-lista-fila">
      <span class="ph ph-ajeno intro-lista-sim">${escaparHtml(sim)}</span>
      <span class="intro-lista-nota">${escaparHtml(nota)}</span>
    </div>`).join('')}</div>`;
}

function bloquePrueba(pr) {
  return `
    <div class="intro-prueba" id="intro-prueba">
      <div class="intro-prueba-tit">${escaparHtml(pr.pregunta)}</div>
      <div class="intro-prueba-ops">
        ${pr.opciones.map((o, i) => `
          <button class="intro-op" id="intro-op-${i}" onclick="responderIntro(${i})">${escaparHtml(o)}</button>
        `).join('')}
      </div>
      <div id="intro-prueba-fb"></div>
    </div>`;
}

function responderIntro(i) {
  const p  = _introPasos[_introIdx];
  const pr = p?.prueba;
  if (!pr || pr.respondida) return;
  pr.respondida = true;

  document.getElementById(`intro-op-${pr.correcta}`)?.classList.add('bien');
  if (i !== pr.correcta) document.getElementById(`intro-op-${i}`)?.classList.add('mal');

  const fb = document.getElementById('intro-prueba-fb');
  if (fb) {
    fb.innerHTML = `
      <div class="intro-fb ${i === pr.correcta ? 'bien' : 'mal'}">
        <b>${i === pr.correcta ? 'Eso es.' : 'Casi.'}</b> ${escaparHtml(pr.porque)}
      </div>`;
  }
  if (pr.escuchar) setTimeout(() => pronDecir(pr.escuchar, 1), 250);
}

function introSiguiente() {
  if (_introIdx < _introPasos.length - 1) {
    _introIdx++;
    renderIntroPaso();
    document.getElementById('cnt')?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function introAtras() {
  if (_introIdx > 0) {
    _introIdx--;
    renderIntroPaso();
    document.getElementById('cnt')?.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function terminarIntro() {
  window.speechSynthesis?.cancel();
  _introVista = new Date().toISOString();
  // Se marca como vista aunque se salte: quien la salta no quiere volver a verla.
  apiPut(`/config/${INTRO_KEY}`, { value: _introVista }).catch(() => {});
  cargarPronInicio();
}

/** ¿Se ha visto ya? Lo usa la sección para decidir si ofrecerla o abrirla. */
const introVista = () => !!_introVista;
