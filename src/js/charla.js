// TutorIngles — charla.js
// CONVERSAR: Claude hace de la otra persona de una escena (la panadera de
// Lausana, el cliente que busca zapatillas…), tú hablas y en cada turno te
// corrige como mucho una cosa. Se entra desde TRABAJO (una situación del
// sector), desde HABLAR o desde el selector de esta misma sección; quien enlaza
// sólo llama a `charlaAbrir(...)`.
//
// Cómo está montado, y por qué:
//
//  - **El historial vive aquí, no en el servidor.** Cada envío lleva todos los
//    turnos anteriores (el servidor se queda con los 16 últimos). No hay tabla
//    de conversaciones que mantener, y salir de la sección y volver no la borra:
//    la escena sigue en `charlaEstado` mientras la app esté abierta.
//  - **Cada envío es una llamada que cuesta dinero.** Lo único que se lanza sin
//    que el alumno hable es la primera frase de la escena, y es porque acaba de
//    pulsarla. Mientras se espera, la entrada está desactivada: dos toques no
//    pagan dos veces.
//  - **HABLAR sólo se marca con el micrófono.** Lo que da el reconocedor se
//    envía tal cual con `via:'voz'` y el servidor marca la meta. Lo dictado con
//    el teclado o tecleado va como 'texto' y no marca nada. En el
//    iPhone con la app instalada no hay reconocedor: ahí todo entra por el
//    dictado del teclado, que es voz pero no se distingue de teclear.
//  - **Nada de texto dentro de un onclick.** Lo que dicen la IA y el alumno se
//    pinta con escaparHtml y los botones llevan índices: un «s'il vous plaît»
//    rompería la cadena, y un `<img onerror>` dictado se ejecutaría.

// Escenas libres por idioma. El francés va primero y está pensado para la
// primera semana en la Suiza romanda: lo que no se puede evitar al llegar.
// `escenario` y `papel` van tal cual al prompt (el servidor los corta a 300 y
// 200 caracteres: no pasarse, o la IA recibe el papel a medias).
const CHARLA_ESCENARIOS = {
  fr: [
    {
      titulo: 'La panadería', lugar: 'BOULANGERIE · LAUSANNE', quien: 'La boulangère',
      escenario: 'Una boulangerie de barrio en Lausana, a primera hora. El alumno, recién llegado a Suiza, quiere comprar pan y algo para desayunar, y pagar.',
      papel: 'La boulangère: simpática y con prisa porque hay cola. Saluda, pregunta qué le pone, ofrece algo más (croissant, pain aux raisins), dice el precio en francos y si paga con tarjeta o Twint.',
    },
    {
      titulo: 'Un billete en la estación', lugar: 'GARE CFF · GUICHET', quien: 'Guichet CFF',
      escenario: 'En la taquilla de la estación CFF de Lausana. El alumno necesita un billete (por ejemplo a Ginebra o a Vevey) y quiere saber el precio, la vía y si le compensa el demi-tarif.',
      papel: 'Empleado de la taquilla CFF, eficaz y amable: pregunta destino, ida o ida y vuelta, 1ª o 2ª clase y si tiene demi-tarif; da el precio en francos, la vía (voie) y la hora del tren.',
    },
    {
      titulo: 'En la farmacia', lugar: 'PHARMACIE', quien: 'La pharmacienne',
      escenario: 'En una farmacia de Lausana. El alumno tiene dolor de garganta y algo de fiebre desde ayer y quiere algo sin receta.',
      papel: 'Farmacéutica atenta: pregunta los síntomas, desde cuándo, si tiene alergias o toma otra medicación; recomienda algo, explica cómo tomarlo y cuándo ir al médico.',
    },
    {
      titulo: 'Una avería: llamar a la régie', lugar: 'RÉGIE · AU TÉLÉPHONE', quien: 'La régie',
      escenario: 'Llamada por teléfono a la régie, la agencia que gestiona el piso de alquiler del alumno: desde ayer no hay agua caliente en el piso.',
      papel: 'Empleada de la régie al teléfono, correcta y algo burocrática: pide nombre, dirección y piso, qué pasa y desde cuándo, y propone cuándo puede pasar el técnico o el concierge.',
    },
    {
      titulo: 'Presentarte a tu equipo', lugar: 'PREMIER JOUR', quien: 'Une collègue',
      escenario: 'Primer día en el nuevo trabajo en la Suiza romanda. En la pausa del café, el alumno se presenta a una compañera del equipo.',
      papel: 'Compañera simpática y curiosa: pregunta de dónde viene, desde cuándo está en Suiza, dónde vive y qué hacía antes; cuenta algo de ella y propone tutearse (on se tutoie ?).',
    },
    {
      titulo: 'Anunciarte y pedir el permiso B', lugar: 'CONTRÔLE DES HABITANTS', quien: 'Le guichet',
      escenario: 'En el Contrôle des habitants de la comuna, donde hay que anunciarse al llegar para pedir el permiso B. El alumno trae su documentación.',
      papel: 'Funcionario del Contrôle des habitants, formal y preciso: pide pasaporte, contrato de trabajo, contrato de alquiler y una foto; explica el precio, el plazo y qué pasa después.',
    },
    {
      titulo: '¿Dónde está…? En el súper', lugar: 'MIGROS · COOP', quien: 'Un employé',
      escenario: 'En un supermercado Migros. El alumno no encuentra algo que necesita para su piso nuevo (detergente, una bombilla, levadura…) y pregunta a un empleado.',
      papel: 'Empleado de Migros que repone estanterías: indica el pasillo (le rayon), propone otra marca si no queda y pregunta si tiene la tarjeta Cumulus.',
    },
    {
      titulo: 'Pedir cita con el médico', lugar: 'CABINET MÉDICAL · AU TÉLÉPHONE', quien: 'L’assistante médicale',
      escenario: 'Llamada a la consulta de un médico de cabecera en Lausana para pedir cita. El alumno lleva unos días encontrándose mal y es nuevo en la ciudad.',
      papel: 'Assistante médicale al teléfono: pregunta si ya es paciente, qué le pasa y desde cuándo y su caisse maladie, y propone día y hora; si no hay hueco, sugiere la permanence.',
    },
  ],
  // En inglés, el mostrador de Sprinter: el alumno es el dependiente y la IA
  // hace del cliente.
  en: [
    {
      titulo: 'Un cliente busca zapatillas', lugar: 'SHOP FLOOR · RUNNING', quien: 'Customer',
      escenario: 'Sección de zapatillas de una tienda de deportes (Sprinter). Un cliente británico busca zapatillas para correr; el alumno es el dependiente y le atiende.',
      papel: 'Cliente británico de unos 40 años: quiere zapatillas de running para asfalto; pregunta tallas (UK), precio, otros colores y si puede probárselas. Hace preguntas concretas.',
    },
    {
      titulo: 'Una devolución', lugar: 'TILL · RETURNS', quien: 'Customer',
      escenario: 'En la caja de la tienda de deportes. Un cliente quiere devolver unas zapatillas que compró hace una semana; el alumno es el dependiente.',
      papel: 'Cliente educado: quiere devolverlas porque le rozan; tiene el ticket pero las ha usado una vez; pregunta si le devuelven el dinero o le dan un vale.',
    },
    {
      titulo: 'Cambio de talla', lugar: 'EXCHANGE', quien: 'Customer',
      escenario: 'Un cliente vuelve a la tienda de deportes para cambiar unas zapatillas por otra talla; el alumno es el dependiente.',
      papel: 'Cliente amable: le quedan pequeñas y quiere media talla más; si no la hay, pregunta por un modelo parecido o si se pueden pedir y cuánto tardan.',
    },
    {
      titulo: 'Un cliente se queja', lugar: 'COMPLAINT', quien: 'Customer',
      escenario: 'Un cliente enfadado en la tienda de deportes: la suela de sus zapatillas se ha despegado al mes de comprarlas. El alumno es el dependiente: tiene que calmarle y ofrecer una solución.',
      papel: 'Cliente molesto pero razonable: se queja de la calidad y exige una solución; se calma si le escuchan, se disculpan y le ofrecen cambio, reparación o reembolso.',
    },
  ],
};

const CHARLA_VOZ_CLAVE = 'charla_voz';

let charlaEstado = null;        // la escena en curso; null = selector
let charlaSituaciones = null;   // { lang, lista } de GET /situations
let charlaUltimoMicro = '';     // lo último que dio el reconocedor (para iaViaDe)
let charlaEscuchando = false;
let charlaParando = false;      // se pidió stop() y se espera lo que oyó
let charlaVozMem = null;        // el interruptor de voz si localStorage no va
let charlaVozLista = false;     // la voz ya se desbloqueó con un toque (iOS)
let charlaVigilando = false;    // el observador de salida ya está puesto

// ── ENTRADAS ─────────────────────────────────────────────

/** app.js la llama en cada goTo('charla'): pinta lo que haya, sin gastar. */
function charlaIniciar() {
  charlaVigilarSalida();
  if (charlaEstado) {
    charlaPintarConversacion();
    charlaAlFinal(false);
  } else {
    charlaPintarSelector();
  }
}

/**
 * Abre una escena y lanza su primer turno (la IA abre la escena), o el
 * selector si no se pasa nada.
 *   { situacion_id, titulo }               una situación del sector
 *   { escenario, papel, titulo, lang }     una escena libre
 * Si hay una escena a medias, sin nada se vuelve a ella (ver charlaVolver).
 */
function charlaAbrir(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  charlaParar();
  const lang = charlaLang(o.lang);
  let escena = null;
  if (o.situacion_id) {
    escena = {
      situacion_id: /^\d+$/.test(String(o.situacion_id)) ? Number(o.situacion_id) : o.situacion_id,
      titulo: String(o.titulo || 'Situación'),
      quien: String(o.quien || (lang === 'en' ? 'Customer' : 'Interlocuteur')),
      lang,
    };
  } else if (String(o.escenario || '').trim()) {
    escena = {
      escenario: String(o.escenario).trim().slice(0, 300),
      papel: String(o.papel || '').trim().slice(0, 200),
      titulo: String(o.titulo || charlaResumen(o.escenario)),
      quien: String(o.quien || ''),
      lang,
    };
  }
  if (charlaVolver(escena)) {
    goTo('charla');          // → charlaIniciar repinta la escena y baja al final
    return;
  }
  charlaEstado = escena ? charlaNuevaEscena(escena) : null;
  if (escena) {
    charlaDesbloquearVoz();
    charlaEstado.pendiente = { mensaje: '', via: 'texto' };
  }
  charlaArriba();
  goTo('charla');            // → renderCharla → charlaIniciar pinta lo que toque
  if (escena) charlaPedir();
}

/**
 * ¿Se vuelve a la escena en curso en vez de abrir `escena`? CONVERSAR no tiene
 * pestaña: tras salir a otra (un toque en la barra, o deslizar el dedo), la
 * única puerta de vuelta es HABLAR o PROGRESO, que llaman a charlaAbrir() sin
 * nada. Si eso abriera el selector, se perderían los turnos ya pagados. Igual
 * con la misma situación desde TRABAJO: reabrirla volvería a pagar la apertura.
 * La escena tiene que ser del idioma activo (si se cambió, lo que se busca es
 * el selector del nuevo) y no estar terminada (ahí se busca otra escena, o
 * empezar ésa de nuevo). Para dejarla a medias está «← OTRA ESCENA».
 */
function charlaVolver(escena) {
  const est = charlaEstado;
  if (!est || est.terminado) return false;
  if (!escena) return est.escena.lang === charlaLang();
  return escena.situacion_id != null && String(escena.situacion_id) === String(est.escena.situacion_id ?? '');
}

function charlaNuevaEscena(escena) {
  return {
    escena: { ...escena },
    turnos: [],               // { rol:'ia'|'alumno', texto, … }
    pendiente: null,          // { mensaje, via } que está en camino o falló
    esperando: false,
    fallo: null,
    falloHtml: '',
    terminado: false,
    coste: 0,
    correcciones: [],         // { dijiste, mejor, explicacion } de toda la escena
    borrador: '',
    borradorDeChip: false,
    porTeclado: false,
    avisadoHablar: false,
  };
}

/** 'fr', 'fr-FR' → 'fr'. Lo que no sea un idioma de la app, al activo. */
function charlaLang(l) {
  if (/^fr/i.test(l || '')) return 'fr';
  if (/^en/i.test(l || '')) return 'en';
  return typeof _idioma !== 'undefined' && (_idioma === 'fr' || _idioma === 'en') ? _idioma : 'en';
}

const charlaNombreIdioma = (lang) => (typeof IDIOMA_INFO !== 'undefined' && IDIOMA_INFO[lang]?.nombre) || lang;

/** Un título corto para una escena escrita a mano. */
function charlaResumen(texto, max = 48) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  return `${corte.slice(0, corte.lastIndexOf(' ') > 20 ? corte.lastIndexOf(' ') : max).replace(/[,.;:]$/, '')}…`;
}

const charlaPlural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

// ── SELECTOR ─────────────────────────────────────────────

function charlaPintarSelector() {
  const c = document.getElementById('charla-content');
  if (!c) return;
  const lang = charlaLang();
  const nombre = charlaNombreIdioma(lang);
  const escenas = CHARLA_ESCENARIOS[lang] || [];
  const micro = iaHayMicro();

  c.innerHTML = `
    <div class="glass-card-accent charla-intro">
      <div class="charla-intro-tit">Habla con Claude en ${escaparHtml(nombre)}</div>
      <p>Claude hace de la otra persona; tú hablas; te corrige una cosa por turno.</p>
      <p class="charla-intro-pie">${micro
        ? 'Habla con el micro: así cuenta como HABLAR de hoy. También puedes escribir.'
        : `En este móvil se habla con el micro del teclado, con el teclado en ${escaparHtml(nombre)}.`}
        Cada frase tuya es una llamada a la IA: lo que lleva gastado la escena sale al pie.</p>
      <div id="charla-aviso"></div>
    </div>

    <div class="charla-grupo-tit">${lang === 'fr' ? 'Tus primeros días en Suiza' : 'En la tienda'}</div>
    <div class="charla-grupo-sub">${lang === 'fr'
      ? 'Lo que te vas a encontrar la primera semana en la Suiza romanda.'
      : 'Tú eres el dependiente; Claude, el cliente.'}</div>
    <div class="charla-lista">
      ${escenas.map((e, i) => charlaHtmlOpcion({ titulo: e.titulo, meta: e.lugar }, `charlaElegirEscenario(${i})`)).join('')}
    </div>

    <div class="charla-grupo-tit">Situaciones de tu sector</div>
    <div class="charla-grupo-sub">Las mismas de TRABAJO, pero sin guion: la otra persona improvisa.</div>
    <div class="charla-lista" id="charla-situaciones">${iaHtmlCargando('Cargando situaciones…')}</div>

    <div class="charla-grupo-tit">A tu medida</div>
    <div class="glass-card charla-medida">
      <div class="field">
        <label for="charla-m-sit">La situación</label>
        <textarea class="field-input" id="charla-m-sit" rows="2" maxlength="300" autocomplete="off"
          placeholder="${lang === 'fr'
            ? 'Ej.: en la lavandería del edificio, una vecina dice que hoy le toca a ella'
            : 'Ej.: un cliente pregunta si la tienda envía a domicilio'}"></textarea>
      </div>
      <div class="field">
        <label for="charla-m-papel">Con quién hablas</label>
        <input class="field-input" id="charla-m-papel" type="text" maxlength="200" autocomplete="off"
          placeholder="${lang === 'fr' ? 'Ej.: una vecina mayor, amable pero muy suya' : 'Ej.: un cliente con prisa'}">
      </div>
      <button class="btn btn-subtle" onclick="charlaEmpezarMedida()">EMPEZAR</button>
    </div>`;

  charlaCargarSituaciones();
  charlaAvisoIa();
}

/** Una fila del selector. `accion` es JS fijo con un índice, nunca texto. */
function charlaHtmlOpcion({ titulo, meta = '', sub = '', nivel = '', hecha = false }, accion) {
  return `<button class="topic-item charla-opcion${hecha ? ' completed' : ''}" onclick="${accion}">
    <span class="charla-opcion-ico">${ico(hecha ? 'done' : 'speak', 20)}</span>
    <span class="topic-item-info">
      <span class="topic-item-title">${escaparHtml(titulo)}</span>
      ${meta ? `<span class="topic-item-meta">${escaparHtml(meta)}</span>` : ''}
      ${sub ? `<span class="charla-opcion-sub">${escaparHtml(sub)}</span>` : ''}
    </span>
    ${nivel ? iaHtmlNivel(nivel) : ''}
    <span class="charla-opcion-ir" aria-hidden="true">›</span>
  </button>`;
}

/** Si la IA no está lista, se dice ANTES de elegir escena (GET, no gasta). */
async function charlaAvisoIa() {
  try {
    const e = await iaEstado();
    const caja = document.getElementById('charla-aviso');
    if (!caja || !e || e.disponible !== false) return;
    const motivo = e.clave_final && e.sin_token
      ? 'Hay clave de la API, pero la app no tiene clave de acceso (APP_TOKEN), así que la IA no se enciende.'
      : 'Falta la clave de la API de Claude.';
    caja.innerHTML = `<div class="ia-error">
      <div>La IA está apagada. ${motivo}</div>
      <div class="ia-acciones"><button class="btn btn-subtle btn-sm" onclick="goTo('ajustes')">AJUSTES › IA</button></div>
    </div>`;
  } catch (err) {
    console.error('[charla] estado de la IA', err);
  }
}

async function charlaCargarSituaciones() {
  const lang = charlaLang();
  if (charlaSituaciones?.lang === lang) charlaPintarSituaciones();
  try {
    const lista = await apiGet(`/situations?lang=${lang}`);
    if (!Array.isArray(lista)) return;           // null: pantalla de acceso
    charlaSituaciones = { lang, lista };
    charlaPintarSituaciones();
  } catch (e) {
    console.error('[charla] situaciones', e);
    const caja = document.getElementById('charla-situaciones');
    if (caja && charlaSituaciones?.lang !== lang) {
      caja.innerHTML = `<div class="charla-vacio">
        ${navigator.onLine === false ? 'Sin conexión.' : 'No se han podido cargar las situaciones.'}
        <div class="ia-acciones"><button class="btn btn-ghost btn-sm" onclick="charlaCargarSituaciones()">REINTENTAR</button></div>
      </div>`;
    }
  }
}

function charlaPintarSituaciones() {
  const caja = document.getElementById('charla-situaciones');
  if (!caja || !charlaSituaciones) return;
  const l = charlaSituaciones.lista;
  if (!l.length) {
    caja.innerHTML = '<div class="charla-vacio">Este idioma todavía no tiene situaciones.</div>';
    return;
  }
  caja.innerHTML = l.map((s, i) => charlaHtmlOpcion({
    titulo: s.title_es || s.title_en, sub: s.title_es ? s.title_en : '', nivel: s.level, hecha: !!s.completed,
  }, `charlaElegirSituacion(${i})`)).join('');
}

function charlaElegirEscenario(i) {
  const lang = charlaLang();
  const e = (CHARLA_ESCENARIOS[lang] || [])[i];
  if (!e) return;
  charlaAbrir({ escenario: e.escenario, papel: e.papel, titulo: e.titulo, quien: e.quien, lang });
}

function charlaElegirSituacion(i) {
  const s = charlaSituaciones?.lista?.[i];
  if (!s) return;
  charlaAbrir({ situacion_id: s.id, titulo: s.title_es || s.title_en, lang: charlaSituaciones.lang });
}

function charlaEmpezarMedida() {
  const campo = document.getElementById('charla-m-sit');
  const sit = campo?.value.trim();
  const papel = document.getElementById('charla-m-papel')?.value.trim() || '';
  if (!sit) {
    toast('Cuenta primero la situación', 'error');
    campo?.focus();
    return;
  }
  charlaAbrir({ escenario: sit, papel, titulo: charlaResumen(sit), lang: charlaLang() });
}

// ── CONVERSACIÓN: PINTADO ────────────────────────────────

function charlaPintarConversacion() {
  const c = document.getElementById('charla-content');
  const est = charlaEstado;
  if (!c || !est) return;
  const { titulo, quien, papel, lang } = est.escena;
  const deQuien = quien || (papel ? charlaResumen(papel, 60) : 'la otra persona');
  c.innerHTML = `
    <div class="charla">
      <div class="charla-cabeza">
        <button class="btn btn-ghost btn-sm" onclick="charlaOtraEscena()">← OTRA ESCENA</button>
        ${charlaHtmlBotonVoz()}
      </div>
      <div class="charla-escena">
        <div class="charla-escena-tit">${escaparHtml(titulo)}</div>
        <div class="charla-escena-sub"><span class="ia-marca">IA</span>
          <span>Claude hace de ${escaparHtml(deQuien)} · en ${escaparHtml(charlaNombreIdioma(lang))}</span></div>
      </div>
      <div class="charla-hilo" id="charla-hilo"></div>
      <div id="charla-entrada"></div>
      <div id="charla-pie"></div>
    </div>`;
  charlaPintarHilo();
  charlaPintarEntrada();
  charlaPintarPie();
}

function charlaHtmlBotonVoz() {
  const on = charlaVozActiva();
  return `<button class="charla-voz${on ? ' charla-voz-on' : ''}" id="charla-voz" aria-pressed="${on}"
    aria-label="Leer en voz alta las respuestas" onclick="charlaAlternarVoz()">${ico('listen', 16)}<span>${on ? 'VOZ' : 'SIN VOZ'}</span></button>`;
}

function charlaPintarHilo() {
  const el = document.getElementById('charla-hilo');
  const est = charlaEstado;
  if (!el || !est) return;
  let ultIa = -1;
  est.turnos.forEach((t, i) => { if (t.rol === 'ia') ultIa = i; });
  const conSugerencias = !est.terminado && !est.esperando;
  let html = est.turnos.map((t, i) => (t.rol === 'ia'
    ? charlaHtmlTurnoIa(t, i, conSugerencias && i === ultIa)
    : charlaHtmlTurnoAlumno(t, i))).join('');
  if (est.esperando) {
    html += `<div class="charla-turno charla-ia">
      <div class="charla-burbuja charla-escribiendo" role="status" aria-label="Escribiendo">
        <i></i><i></i><i></i><span>escribiendo…</span>
      </div>
    </div>`;
  }
  if (est.fallo) html += `<div class="charla-fallo">${est.falloHtml}</div>`;
  el.innerHTML = html;
}

function charlaHtmlTurnoIa(t, i, conSugerencias) {
  const { lang, quien } = charlaEstado.escena;
  const sug = conSugerencias && t.sugerencias?.length ? `
    <div class="charla-sugerencias">
      <div class="charla-sug-tit">${iaHayMicro()
        ? '¿En blanco? Toca una para tenerla en el campo y dila tú:'
        : '¿En blanco? Toca una para verla encima del campo y díctala tú:'}</div>
      ${t.sugerencias.map((s, j) => `<button class="charla-chip" lang="${lang}" onclick="charlaUsarSugerencia(${j})">${escaparHtml(s)}</button>`).join('')}
    </div>` : '';
  // La traducción va escondida: primero se intenta entender de oído.
  return `<div class="charla-turno charla-ia">
    <div class="charla-burbuja">
      <div class="charla-quien">${escaparHtml(quien || 'Claude')}</div>
      <div class="charla-texto" lang="${lang}">${escaparHtml(t.texto)}</div>
      <div class="charla-herr">
        ${iaHtmlBotonDecir(t.texto, lang)}
        ${t.traduccion ? `<button class="charla-trad-btn" id="charla-trad-btn-${i}" aria-expanded="${!!t.verTrad}"
          onclick="charlaVerTraduccion(${i})">${t.verTrad ? 'OCULTAR' : '¿QUÉ DICE?'}</button>` : ''}
      </div>
      ${t.traduccion ? `<div class="charla-trad" id="charla-trad-${i}"${t.verTrad ? '' : ' hidden'}>${escaparHtml(t.traduccion)}</div>` : ''}
    </div>
    ${iaHtmlTarjetas(t.tarjetas)}
    ${sug}
  </div>`;
}

function charlaHtmlTurnoAlumno(t, i) {
  const est = charlaEstado;
  const { lang } = est.escena;
  const sinEnviar = !!est.fallo && !!est.pendiente?.mensaje && i === est.turnos.length - 1;
  const c = t.correccion;
  let nota = '';
  if (c?.hay_error && c.mejor) {
    nota = `<div class="charla-correccion">
      <div class="charla-corr-tit">Mejor así</div>
      <div class="charla-corr-fila">
        <div class="ia-par">
          <span class="ia-mal">${escaparHtml(c.dijiste || t.texto)}</span>
          <span class="ia-flecha">→</span>
          <span class="ia-bien" lang="${lang}">${escaparHtml(c.mejor)}</span>
        </div>
        ${iaHtmlBotonDecir(c.mejor, lang)}
      </div>
      ${c.explicacion ? `<div class="ia-expl">${escaparHtml(c.explicacion)}</div>` : ''}
    </div>`;
  } else if (c) {
    nota = `<div class="charla-bien">${ico('done', 13)}<span>Bien dicho</span></div>`;
  }
  const meta = [
    t.via === 'voz' ? `${ico('mic', 12)}<span>con el micro</span>` : '',
    sinEnviar ? '<span class="charla-sin-enviar">sin enviar</span>' : '',
  ].filter(Boolean).join('<span>·</span>');
  return `<div class="charla-turno charla-alumno">
    <div class="charla-burbuja"><div class="charla-texto" lang="${lang}">${escaparHtml(t.texto)}</div></div>
    ${meta ? `<div class="charla-meta">${meta}</div>` : ''}
    ${nota}
  </div>`;
}

function charlaPintarEntrada() {
  const el = document.getElementById('charla-entrada');
  const est = charlaEstado;
  if (!el || !est) return;
  if (est.terminado) { el.innerHTML = charlaHtmlCierre(); return; }
  const { lang } = est.escena;
  const nombre = escaparHtml(charlaNombreIdioma(lang));
  const micro = iaHayMicro();
  el.innerHTML = `<div class="charla-entrada">
    ${micro ? `<div class="charla-micro">
      <button class="speak-record-btn" id="charla-micro" aria-label="Hablar en ${nombre}" onclick="charlaMicro()">${ico('mic', 30)}</button>
      <div class="charla-micro-pista" id="charla-micro-pista">${charlaPistaMicro()}</div>
    </div>` : '<div class="charla-chuleta" id="charla-chuleta" aria-live="polite" hidden></div>'}
    <div class="charla-escribir">
      <textarea class="field-input" id="charla-txt" rows="1" enterkeyhint="send" lang="${lang}" maxlength="500"
        autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="false"
        aria-label="Lo que dices"
        placeholder="${micro ? 'O escríbelo aquí' : `Díctalo en ${nombre} con el micro del teclado`}"
        oninput="charlaAlEscribir(this)" onkeydown="charlaTecla(event)">${escaparHtml(est.borrador)}</textarea>
      <button class="btn btn-subtle btn-sm" id="charla-enviar" onclick="charlaEnviarTexto()">ENVIAR</button>
    </div>
    ${micro ? '' : iaHtmlPistaDictado(lang)}
  </div>`;
  charlaAutoAlto(document.getElementById('charla-txt'));
  charlaBloquear(est.esperando);
}

function charlaHtmlCierre() {
  const est = charlaEstado;
  const mias = est.turnos.filter((t) => t.rol === 'alumno');
  const conMicro = mias.filter((t) => t.via === 'voz').length;
  const n = est.correcciones.length;
  const datos = [
    charlaPlural(mias.length, 'frase tuya', 'frases tuyas'),
    conMicro ? `${conMicro} con el micro` : '',
    n ? charlaPlural(n, 'corrección', 'correcciones') : 'ninguna corrección',
  ].filter(Boolean).join(' · ');
  return `<div class="glass-card charla-cierre">
    <div class="card-title">Escena terminada</div>
    <div class="charla-cierre-datos">${datos}</div>
    ${n
      ? `<div class="ia-bloque-tit">Lo que te ha corregido</div>${iaHtmlCorrecciones(est.correcciones)}`
      : `<p class="charla-cierre-ok">${mias.length
        ? 'Todo lo que dijiste se entendió y sonaba natural. Repite la escena diciéndolo de otra forma, o prueba una más difícil.'
        : 'La escena se cerró antes de que dijeras nada. Vuelve a empezarla.'}</p>`}
    <div class="ia-acciones">
      <button class="btn btn-primary btn-sm" onclick="charlaOtraVez()">OTRA VEZ</button>
      <button class="btn btn-ghost btn-sm" onclick="charlaOtraEscena()">OTRA ESCENA</button>
    </div>
  </div>`;
}

function charlaPintarPie() {
  const el = document.getElementById('charla-pie');
  if (!el || !charlaEstado) return;
  const coste = iaHtmlCoste(charlaEstado.coste);
  el.innerHTML = coste ? `<div class="charla-pie"><span>Esta escena</span>${coste}</div>` : '';
}

/** Mientras se espera a la IA no se puede enviar otra cosa (ni pagar dos veces). */
function charlaBloquear(si) {
  for (const id of ['charla-txt', 'charla-enviar', 'charla-micro']) {
    const el = document.getElementById(id);
    if (el) el.disabled = !!si;
  }
  const env = document.getElementById('charla-enviar');
  if (env) env.textContent = si ? '…' : 'ENVIAR';
}

function charlaAutoAlto(ta) {
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = `${Math.min(ta.scrollHeight + 2, 140)}px`;
}

function charlaVisible() {
  return !!document.getElementById('sec-charla')?.classList.contains('active');
}

/**
 * Lleva el scroll al final, pero sin que lo último que dijiste se salga por
 * arriba: con una respuesta larga, corrección y sugerencias, el final de la
 * página deja fuera justo lo que hay que leer.
 */
function charlaAlFinal(suave = true) {
  if (!charlaVisible()) return;
  const cnt = document.getElementById('cnt');
  if (!cnt) return;
  requestAnimationFrame(() => {
    let top = cnt.scrollHeight - cnt.clientHeight;
    const mios = document.querySelectorAll('#charla-hilo .charla-alumno');
    const ancla = mios[mios.length - 1];
    if (ancla) {
      const y = ancla.getBoundingClientRect().top - cnt.getBoundingClientRect().top + cnt.scrollTop - 12;
      top = Math.min(top, y);
    }
    cnt.scrollTo({ top: Math.max(0, top), behavior: suave ? 'smooth' : 'auto' });
  });
}

function charlaArriba() {
  const cnt = document.getElementById('cnt');
  if (cnt) cnt.scrollTop = 0;
}

// ── CONVERSACIÓN: ACCIONES ───────────────────────────────

function charlaAlEscribir(ta) {
  if (charlaEstado) {
    charlaEstado.borrador = ta.value;
    charlaEstado.borradorDeChip = false;
  }
  charlaAutoAlto(ta);
}

/** Intro envía (el teclado del móvil enseña «Enviar»); Mayús+Intro, salto de línea. */
function charlaTecla(ev) {
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing || ev.keyCode === 229) return;
  ev.preventDefault();
  charlaEnviarTexto(true);
}

function charlaEnviarTexto(porTeclado = false) {
  const est = charlaEstado;
  const ta = document.getElementById('charla-txt');
  if (!est || !ta || est.esperando || est.terminado) return;
  const texto = ta.value.trim();
  if (!texto) {
    toast(iaHayMicro() ? 'Pulsa el micro o escribe algo' : 'Dicta o escribe algo primero', 'error');
    ta.focus();
    return;
  }
  charlaDesbloquearVoz();
  // Lo que sale del campo es SIEMPRE 'texto' y no marca HABLAR: el reconocedor
  // nunca escribe en él (charlaMicro envía lo que oye sin pasar por aquí). Si
  // coincide con lo último que oyó, es que se ha tecleado o dictado igual, y
  // con respuestas cortas («Oui», «Merci») eso pasa a menudo.
  const via = 'texto';
  est.porTeclado = porTeclado;
  if (charlaEnviar(texto, via)) {
    ta.value = '';
    est.borrador = '';
    est.borradorDeChip = false;
    charlaAutoAlto(ta);
  }
}

/** El micro grande: escucha UNA frase y la envía sola, tal cual, como voz. */
async function charlaMicro() {
  const est = charlaEstado;
  if (!est || est.esperando || est.terminado) return;
  if (charlaEscuchando) {
    // Segundo toque: «ya he terminado». stop(), no abort(): stop hace que el
    // reconocedor entregue lo que ha oído y la promesa de abajo lo envía (o
    // rechaza con 'no-speech' y se dice); abort lo tiraría sin avisar. En Safari
    // el reconocimiento no siempre corta solo tras el silencio, así que tocar
    // para terminar es lo normal. Si aun así el navegador no contesta, un
    // tercer toque corta del todo y deja el micro como estaba.
    if (charlaParando) { iaPararMicro(); charlaMicroReposo(); return; }
    charlaParando = true;
    try { iaRecActual?.stop(); } catch { /* ya parado */ }
    charlaPista('Procesando…');
    return;
  }
  vozParar();                        // que el micro no se oiga a sí mismo
  charlaEscuchando = true;
  const btn = document.getElementById('charla-micro');
  if (btn) { btn.classList.add('recording'); btn.innerHTML = ico('stop', 30); }
  charlaPista('Escuchando… di tu frase. Se envía sola al terminar.');
  try {
    const r = await iaEscucharFrase({ lang: est.escena.lang });
    charlaMicroReposo();
    if (charlaEstado !== est) return;
    charlaUltimoMicro = r.texto;
    est.porTeclado = false;
    charlaEnviar(r.texto, iaViaDe(r.texto, charlaUltimoMicro));
  } catch (e) {
    charlaMicroReposo();
    if (e?.codigo === 'aborted' || charlaEstado !== est) return;
    charlaPista(e?.message || 'El micrófono ha fallado. Prueba otra vez o escríbelo.', true);
  }
}

function charlaPistaMicro() {
  return `Pulsa y habla en ${escaparHtml(charlaNombreIdioma(charlaEstado?.escena.lang))}: se envía solo`;
}

function charlaPista(texto, mal = false) {
  const el = document.getElementById('charla-micro-pista');
  if (!el) return;
  el.textContent = texto;
  el.classList.toggle('charla-pista-mal', mal);
}

function charlaMicroReposo() {
  charlaEscuchando = false;
  charlaParando = false;
  const btn = document.getElementById('charla-micro');
  if (btn) { btn.classList.remove('recording'); btn.innerHTML = ico('mic', 30); }
  const el = document.getElementById('charla-micro-pista');
  if (el) { el.innerHTML = charlaPistaMicro(); el.classList.remove('charla-pista-mal'); }
}

/** Mete la frase del alumno en el hilo y la manda. */
function charlaEnviar(mensaje, via) {
  const est = charlaEstado;
  const texto = String(mensaje ?? '').replace(/\s+/g, ' ').trim();
  if (!est || est.esperando || est.terminado || !texto) return false;
  // Si la anterior no llegó y se dice otra cosa, la que falló se descarta: la
  // IA nunca la vio, y dejarla haría dos frases seguidas del alumno.
  const ultimo = est.turnos[est.turnos.length - 1];
  if (est.fallo && est.pendiente?.mensaje && ultimo?.rol === 'alumno' && !ultimo.correccion) est.turnos.pop();
  est.turnos.push({ rol: 'alumno', texto, via: via === 'voz' ? 'voz' : 'texto', correccion: null });
  est.pendiente = { mensaje: texto, via: via === 'voz' ? 'voz' : 'texto' };
  est.fallo = null;
  est.falloHtml = '';
  charlaQuitarChuleta();
  charlaPedir();
  return true;
}

/** La sugerencia de chuleta (sin reconocedor) ya se ha dicho: fuera. */
function charlaQuitarChuleta() {
  const el = document.getElementById('charla-chuleta');
  if (el) { el.hidden = true; el.innerHTML = ''; }
}

/**
 * La llamada de un turno. Lo pendiente se queda en `est.pendiente` hasta que
 * llega la respuesta: si falla, REINTENTAR lo vuelve a mandar igual y el
 * mensaje del alumno no se pierde. «Igual» importa: si el móvil se rindió por
 * tiempo pero el servidor sí contestó, éste recuerda la respuesta unos minutos
 * y a la MISMA petición le devuelve la misma (`repetida`, coste 0), sin volver
 * a cobrarla ni a contar dos veces el error en el repaso. Por eso el cuerpo se
 * rehace del estado, que no cambia entre el fallo y el reintento. (La apertura,
 * sin mensaje, no se recuerda: OTRA VEZ tiene que poder empezar distinto.)
 */
async function charlaPedir() {
  const est = charlaEstado;
  if (!est || est.esperando || !est.pendiente) return;
  const { mensaje, via } = est.pendiente;
  // El historial son los turnos ANTERIORES: el mensaje de ahora va aparte.
  const previos = mensaje ? est.turnos.slice(0, -1) : est.turnos;
  const cuerpo = {
    ...(est.escena.situacion_id
      ? { situacion_id: est.escena.situacion_id }
      : { escenario: est.escena.escenario, papel: est.escena.papel }),
    mensaje,
    historial: previos.map((t) => ({ rol: t.rol === 'alumno' ? 'alumno' : 'ia', texto: t.texto })),
    via,
    lang: est.escena.lang,
  };

  est.esperando = true;
  est.fallo = null;
  est.falloHtml = '';
  charlaPintarHilo();
  charlaBloquear(true);
  charlaAlFinal();

  let r;
  try {
    r = await iaPost('/ia/conversacion', cuerpo, { tiempo: IA_TIEMPO_CORTO });
  } catch (e) {
    if (charlaEstado !== est) return;       // se cambió de escena mientras tanto
    est.esperando = false;
    est.fallo = e;
    est.falloHtml = iaHtmlError(e, 'charlaReintentar()');
    charlaPintarHilo();
    charlaBloquear(false);
    charlaAlFinal();
    return;
  }
  if (charlaEstado !== est || !r) return;

  est.esperando = false;
  est.pendiente = null;
  // En una situación del sector el idioma lo decide la situación.
  if (r.lang === 'en' || r.lang === 'fr') est.escena.lang = r.lang;

  if (mensaje) {
    const yo = est.turnos[est.turnos.length - 1];
    const c = r.correccion || {};
    yo.correccion = {
      hay_error: !!c.hay_error,
      dijiste: String(c.dijiste || ''), mejor: String(c.mejor || ''), explicacion: String(c.explicacion || ''),
    };
    if (yo.correccion.hay_error && yo.correccion.mejor) {
      est.correcciones.push({ dijiste: yo.correccion.dijiste || mensaje, mejor: yo.correccion.mejor, explicacion: yo.correccion.explicacion });
    }
    // El servidor ya ha marcado HABLAR (sólo con mensaje y via 'voz').
    if (via === 'voz' && !est.avisadoHablar) {
      est.avisadoHablar = true;
      toast('Con el micro: HABLAR de hoy, hecho', 'success');
    }
    if (via === 'voz') {
      charlaUltimoMicro = '';
      // La sugerencia que se dejó en el campo como chuleta ya se ha dicho.
      if (est.borradorDeChip) {
        est.borrador = '';
        est.borradorDeChip = false;
        const ta = document.getElementById('charla-txt');
        if (ta) { ta.value = ''; charlaAutoAlto(ta); }
      }
    }
  }

  const respuesta = String(r.respuesta || '').trim();
  est.turnos.push({
    rol: 'ia',
    texto: respuesta || '…',
    traduccion: String(r.traduccion || '').trim(),
    sugerencias: (Array.isArray(r.sugerencias) ? r.sugerencias : [])
      .filter((s) => typeof s === 'string' && s.trim()).slice(0, 3),
    tarjetas: Array.isArray(r.tarjetas) ? r.tarjetas : [],
    verTrad: false,
  });
  est.coste += Number(r.coste) || 0;
  est.terminado = !!r.terminado;

  charlaPintarHilo();
  charlaPintarPie();
  if (est.terminado) charlaPintarEntrada();
  else charlaBloquear(false);
  charlaAlFinal();

  // Con teclado físico (escritorio) el foco vuelve al campo para seguir
  // escribiendo; en el móvil no, que el teclado taparía la respuesta.
  if (!est.terminado && est.porTeclado && charlaVisible() && window.matchMedia?.('(pointer: fine)')?.matches) {
    document.getElementById('charla-txt')?.focus();
  }
  if (respuesta && charlaVozActiva() && charlaVisible() && typeof vozDecir === 'function') {
    vozDecir(respuesta, { lang: iaVozDe(est.escena.lang) });
  }
}

function charlaReintentar() {
  const est = charlaEstado;
  if (!est || est.esperando || !est.pendiente) return;
  charlaDesbloquearVoz();
  charlaPedir();
}

function charlaVerTraduccion(i) {
  const t = charlaEstado?.turnos?.[i];
  if (!t || t.rol !== 'ia') return;
  t.verTrad = !t.verTrad;
  const caja = document.getElementById(`charla-trad-${i}`);
  const btn = document.getElementById(`charla-trad-btn-${i}`);
  if (caja) caja.hidden = !t.verTrad;
  if (btn) {
    btn.textContent = t.verTrad ? 'OCULTAR' : '¿QUÉ DICE?';
    btn.setAttribute('aria-expanded', String(t.verTrad));
  }
}

/**
 * Una sugerencia no se envía: la gracia es que la digas tú. Con reconocedor va
 * al campo y se dice con el micro grande. Sin él (el iPhone con la app
 * instalada) se dicta con el micro del teclado, y el dictado de iOS AÑADE lo
 * dictado a lo que ya hay en el campo: con la sugerencia dentro, se enviaría la
 * frase dos veces. Ahí se enseña encima del campo, como chuleta, el campo no se
 * toca, y se le da el foco en el mismo toque para que el teclado (y su micro)
 * se abran. La chuleta se va al enviar o al repintar la entrada.
 */
function charlaUsarSugerencia(j) {
  const est = charlaEstado;
  if (!est || est.esperando || est.terminado) return;
  const ultIa = [...est.turnos].reverse().find((t) => t.rol === 'ia');
  const s = ultIa?.sugerencias?.[j];
  const ta = document.getElementById('charla-txt');
  if (!s || !ta) return;
  if (!iaHayMicro()) {
    const chuleta = document.getElementById('charla-chuleta');
    if (chuleta) {
      chuleta.innerHTML = `<div class="charla-chuleta-tit">Díctala con el micro del teclado</div>
        <div class="charla-chuleta-txt" lang="${est.escena.lang}">${escaparHtml(s)}</div>`;
      chuleta.hidden = false;
    }
    ta.focus();
    return;
  }
  ta.value = s;
  est.borrador = s;
  est.borradorDeChip = true;
  charlaAutoAlto(ta);
  if (iaHayMicro()) charlaPista('Ahora dila tú con el micro (o envíala tal cual).');
}

function charlaOtraVez() {
  const est = charlaEstado;
  if (!est) return;
  charlaParar();
  charlaEstado = charlaNuevaEscena(est.escena);
  charlaEstado.pendiente = { mensaje: '', via: 'texto' };
  charlaDesbloquearVoz();
  charlaPintarConversacion();
  charlaArriba();
  charlaPedir();
}

function charlaOtraEscena() {
  charlaParar();
  charlaEstado = null;
  charlaPintarSelector();
  charlaArriba();
}

/** Corta el micro y la voz: al salir de la sección o al cambiar de escena. */
function charlaParar() {
  if (typeof iaPararMicro === 'function') iaPararMicro();
  if (typeof vozParar === 'function') vozParar();
  charlaMicroReposo();
  charlaUltimoMicro = '';
}

/**
 * app.js no avisa cuando se sale de una sección, así que se mira la clase
 * `active` de #sec-charla. goTo quita y vuelve a poner la clase en el mismo
 * tic cuando se repinta la misma sección; el observador lo ve como un solo
 * cambio y no corta nada.
 */
function charlaVigilarSalida() {
  if (charlaVigilando || typeof MutationObserver === 'undefined') return;
  const sec = document.getElementById('sec-charla');
  if (!sec) return;
  charlaVigilando = true;
  let estaba = sec.classList.contains('active');
  new MutationObserver(() => {
    const esta = sec.classList.contains('active');
    if (estaba && !esta) charlaParar();
    estaba = esta;
  }).observe(sec, { attributes: true, attributeFilter: ['class'] });
}

// ── VOZ DE LAS RESPUESTAS ────────────────────────────────

function charlaVozActiva() {
  if (charlaVozMem !== null) return charlaVozMem;
  try { return localStorage.getItem(CHARLA_VOZ_CLAVE) !== '0'; } catch { return true; }
}

function charlaAlternarVoz() {
  const on = !charlaVozActiva();
  charlaVozMem = on;
  try { localStorage.setItem(CHARLA_VOZ_CLAVE, on ? '1' : '0'); } catch {}
  if (on) charlaDesbloquearVoz();
  else if (typeof vozParar === 'function') vozParar();
  const b = document.getElementById('charla-voz');
  if (b) b.outerHTML = charlaHtmlBotonVoz();
}

/**
 * Safari de iOS no deja hablar a speechSynthesis si la primera locución no
 * sale de un toque, y la respuesta llega después de un fetch, ya fuera del
 * toque. Una locución muda dentro del toque (enviar, abrir una escena) deja la
 * voz desbloqueada para lo que venga. Es el mismo truco que usa vozDecir para
 * calentar el motor; fuera de iOS no hace falta.
 */
function charlaDesbloquearVoz() {
  if (charlaVozLista || !charlaVozActiva()) return;
  if (typeof vozEsIOS !== 'function' || !vozEsIOS()) { charlaVozLista = true; return; }
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance('.');
    u.volume = 0;
    window.speechSynthesis.speak(u);
    charlaVozLista = true;
  } catch {}
}
