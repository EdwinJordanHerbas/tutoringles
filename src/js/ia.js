// TutorIngles — ia.js
// Lo común a todo lo que usa la IA (la API de Claude; ver "IA con la API de
// Claude" en CLAUDE.md): la llamada con tiempo máximo, el estado y el gasto,
// Ajustes › IA, el micrófono con su alternativa de texto y las piezas que pintan
// una corrección. Las pantallas (charla.js, TRABAJO, HABLAR, SONIDOS, ESCRIBIR,
// el oral y PROGRESO) sólo llaman a esto.
//
// Tres reglas que se hacen cumplir aquí para todas:
//
//  - **Todo texto que llega de la IA pasa por escaparHtml.** Claude cita lo que
//    el alumno dijo o escribió ("mal", "dijiste", "original"), así que un
//    `<img onerror>` dictado o tecleado se ejecutaría al pintarlo. Y nunca se
//    mete un texto dentro de un `onclick="…('${texto}')"`: un apóstrofo
//    francés ("s'il vous plaît") rompe la cadena. Va en `data-*` y lo lee el
//    manejador (`iaDecirBoton`).
//  - **En el iPhone con la app instalada no hay SpeechRecognition.** Toda
//    entrada de voz tiene al lado un campo de texto: con el micro del teclado
//    (dictado) es voz igualmente, sólo que no se distingue de teclear.
//  - **HABLAR sólo se marca con el micrófono.** `via: 'voz'` únicamente cuando
//    el texto sale del reconocedor sin tocar (`iaViaDe`); si se ha editado o
//    dictado con el teclado, es 'texto' y el servidor no marca nada.

// El móvil tiene que esperar MÁS que el peor caso del servidor (server.js,
// TIEMPOS_IA: un intento y un reintento). Si se rinde antes, el servidor sigue,
// cobra y —en el oral— guarda, y el alumno ve un error que le invita a pagar
// otra vez. Aun así, si llega a pasar, el reintento sale gratis: el servidor
// guarda la respuesta unos minutos y devuelve la misma (`unaVezIA`).
const IA_TIEMPO_MAX = 220_000;    // escritura, oral y consejo (2 × 100 s + margen)
const IA_TIEMPO_CORTO = 90_000;   // pronunciación y conversación (2 × 40 s + margen)

const IA_TIPOS = {
  pronunciacion: 'pronunciación', gramatica: 'gramática', vocabulario: 'vocabulario',
  ortografia: 'ortografía', registro: 'registro',
};
const IA_NIVELES = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Errores que se arreglan en Ajustes › IA: la caja de error lleva el botón.
const IA_CODIGOS_AJUSTES = new Set(['sin_clave', 'sin_token', 'clave_mala', 'tope', 'sin_credito']);

let iaEstadoCache = null;
let iaEstadoHora  = 0;

// ── LLAMADAS ─────────────────────────────────────────────

/** GET /ia/estado, guardado un minuto: lo piden varias pantallas a la vez. */
async function iaEstado(forzar = false) {
  if (!forzar && iaEstadoCache && Date.now() - iaEstadoHora < 60_000) return iaEstadoCache;
  const e = await apiGet('/ia/estado');
  if (e) { iaEstadoCache = e; iaEstadoHora = Date.now(); }
  return iaEstadoCache;
}

/**
 * POST a una ruta /ia/* con tiempo máximo. Los fallos llegan como Error con
 * `codigo` (el del servidor: sin_clave, tope, rechazo…, o 'tiempo') y un
 * mensaje que ya se puede enseñar tal cual (`iaTextoError`).
 */
async function iaPost(ruta, cuerpo = {}, { tiempo = IA_TIEMPO_MAX } = {}) {
  const ctl = new AbortController();
  const reloj = setTimeout(() => ctl.abort(), tiempo);
  try {
    const r = await apiFetch(ruta, { method: 'POST', body: JSON.stringify(cuerpo), signal: ctl.signal });
    // apiFetch devuelve null con un 401 después de enseñar la pantalla de acceso.
    if (r === null) throw Object.assign(new Error('Vuelve a entrar con tu clave de acceso.'), { codigo: 'sin_sesion' });
    return r;
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw Object.assign(new Error('La IA ha tardado demasiado en responder. Vuelve a intentarlo.'), { codigo: 'tiempo' });
    }
    throw e;
  } finally {
    clearTimeout(reloj);
    iaEstadoHora = 0;   // ha podido gastar: el próximo estado se pide de nuevo
  }
}

/** Lo que se le dice a quien estudia cuando algo falla. */
function iaTextoError(e) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'Sin conexión: la IA necesita internet.';
  // Los mensajes de las rutas de IA (y los 4xx, como "escribe al menos 15
  // palabras") están escritos para leerse. Un "HTTP 502" o un "Failed to
  // fetch" no, y ésos se cambian por una frase.
  const msg = String(e?.message || '');
  if (e?.codigo || (e?.status && msg && !/^HTTP \d+$/.test(msg))) return msg;
  return 'No se ha podido hablar con la IA. Vuelve a intentarlo.';
}

/** Caja de error para meter donde iba a ir la respuesta. `reintento`: JS del botón. */
function iaHtmlError(e, reintento = '') {
  console.error('[ia]', e);
  const ajustes = IA_CODIGOS_AJUSTES.has(e?.codigo);
  return `<div class="ia-error">
    <div>${escaparHtml(iaTextoError(e))}</div>
    ${ajustes || reintento ? `<div class="ia-acciones">
      ${ajustes ? `<button class="btn btn-subtle btn-sm" onclick="goTo('ajustes')">AJUSTES › IA</button>` : ''}
      ${reintento ? `<button class="btn btn-ghost btn-sm" onclick="${reintento}">REINTENTAR</button>` : ''}
    </div>` : ''}
  </div>`;
}

function iaHtmlCargando(texto = 'Pensando…') {
  return `<div class="ia-cargando"><div class="spinner"></div><span>${escaparHtml(texto)}</span></div>`;
}

/** Desactiva un botón mientras dura la llamada; devuelve con qué restaurarlo. */
function iaOcupar(btn, texto = '…') {
  if (!btn) return () => {};
  const antes = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('ia-ocupado');
  btn.textContent = texto;
  return () => { btn.disabled = false; btn.classList.remove('ia-ocupado'); btn.innerHTML = antes; };
}

// ── PIEZAS DE PINTADO ────────────────────────────────────
// Todas escapan lo que pintan. Devuelven '' si no hay nada que enseñar.

/** "≈ 0,014 $": lo que ha costado la llamada, para tener el gasto a la vista. */
function iaHtmlCoste(coste) {
  const c = Number(coste);
  if (!Number.isFinite(c) || c <= 0) return '';
  const txt = c < 0.001 ? '< 0,001 $' : `≈ ${c.toLocaleString('es-ES', { maximumFractionDigits: 3 })} $`;
  return `<div class="ia-coste">${txt}</div>`;
}

/** Los errores repetidos que acaban de entrar en el repaso (lib/ia-perfil.js). */
function iaHtmlTarjetas(tarjetas) {
  if (!Array.isArray(tarjetas) || !tarjetas.length) return '';
  return `<div class="ia-tarjetas">${ico('vocab', 16)}
    <span>Ya lo habías fallado antes, así que entra en tu repaso:
    ${tarjetas.map((t) => `<b>${escaparHtml(t.word)}</b>`).join(', ')}</span>
  </div>`;
}

function iaHtmlNivel(nivel) {
  const n = IA_NIVELES.includes(nivel) ? nivel : null;
  if (!n) return '';
  const conColor = ['A2', 'B1', 'B2', 'C1'].includes(n);
  return `<span class="${conColor ? `badge-${n.toLowerCase()}` : 'badge'}">${n}</span>`;
}

/** Lista de correcciones: original tachado → forma buena, y el porqué. */
function iaHtmlCorrecciones(lista) {
  if (!Array.isArray(lista) || !lista.length) return '';
  return `<div class="ia-correcciones">${lista.map((c) => `
    <div class="ia-correccion">
      ${IA_TIPOS[c.tipo] ? `<span class="ia-tipo ia-tipo-flota">${IA_TIPOS[c.tipo]}</span>` : ''}
      <div class="ia-par">
        <span class="ia-mal">${escaparHtml(c.original ?? c.mal ?? c.dijiste)}</span>
        <span class="ia-flecha">→</span>
        <span class="ia-bien">${escaparHtml(c.corregido ?? c.bien ?? c.mejor)}</span>
      </div>
      ${c.explicacion ? `<div class="ia-expl">${escaparHtml(c.explicacion)}</div>` : ''}
    </div>`).join('')}
  </div>`;
}

/** Lista simple (puntos fuertes, frases útiles). Con `decir`, cada una se puede oír. */
function iaHtmlLista(items, { decir = null, clase = '' } = {}) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<ul class="ia-lista ${clase}">${items.map((t) => `
    <li><span>${escaparHtml(t)}</span>${decir ? iaHtmlBotonDecir(t, decir) : ''}</li>`).join('')}
  </ul>`;
}

/**
 * Botón de altavoz para un texto de la IA. El texto va en un data-* y no dentro
 * del onclick (ver la cabecera). `lang`: 'en' | 'fr' o una etiqueta de voz.
 */
function iaHtmlBotonDecir(texto, lang) {
  return `<button class="btn-icon ia-decir" aria-label="Escuchar" data-ia-decir="${escaparAttr(texto)}"
    data-ia-lang="${escaparAttr(lang || '')}" onclick="iaDecirBoton(this)">${ico('listen', 16)}</button>`;
}

function iaDecirBoton(btn) {
  const texto = btn?.dataset?.iaDecir;
  if (!texto || typeof vozDecir !== 'function') return;
  vozDecir(texto, { btn, lang: iaVozDe(btn.dataset.iaLang) });
}

/** 'fr' → 'fr-FR'. Lo que no sea un idioma de la app va al idioma activo. */
function iaVozDe(lang) {
  if (typeof IDIOMA_INFO !== 'undefined' && IDIOMA_INFO[lang]) return IDIOMA_INFO[lang].voz;
  if (/^(en|fr)-/i.test(lang || '')) return lang;
  return typeof idiomaVoz === 'function' ? idiomaVoz() : 'en-GB';
}

/** Bloque plegable (la versión mejorada de un escrito, por ejemplo). */
function iaHtmlPlegable(titulo, html) {
  if (!html) return '';
  return `<details class="ia-plegable"><summary>${escaparHtml(titulo)}</summary><div>${html}</div></details>`;
}

/** Texto de varias líneas, escapado y con los saltos respetados. */
function iaHtmlParrafos(texto) {
  return String(texto ?? '').split(/\n{2,}/).filter((p) => p.trim())
    .map((p) => `<p>${escaparHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
}

/**
 * El diagnóstico de pronunciación (POST /ia/pronunciacion): puntuación,
 * resumen, palabra por palabra lo que se oyó en su lugar y un ejercicio.
 */
function iaHtmlPronunciacion(r, lang) {
  if (!r) return '';
  const punt = Math.max(0, Math.min(100, Math.round(Number(r.puntuacion) || 0)));
  const palabras = Array.isArray(r.palabras) ? r.palabras : [];
  return `<div class="ia-caja ia-pron">
    <div class="ia-cabeza">
      <span class="ia-marca">IA</span>
      <span class="ia-punt ${r.entendido ? 'ia-ok' : ''}">${punt}/100</span>
    </div>
    ${r.resumen ? `<p class="ia-resumen">${escaparHtml(r.resumen)}</p>` : ''}
    ${palabras.map((p) => `
      <div class="ia-palabra">
        <div class="ia-palabra-tit">
          <b>${escaparHtml(p.palabra)}</b>
          ${p.figurada ? `<span class="ia-fig">${escaparHtml(p.figurada)}</span>` : ''}
          ${iaHtmlBotonDecir(p.palabra, lang)}
        </div>
        <div class="ia-expl">${p.oido ? `Se entendió «${escaparHtml(p.oido)}». ` : 'No se entendió. '}${escaparHtml(p.problema)}${p.consejo ? ` — ${escaparHtml(p.consejo)}` : ''}</div>
      </div>`).join('')}
    ${r.ejercicio ? `<div class="ia-ejercicio"><b>Ejercicio:</b> ${escaparHtml(r.ejercicio)}</div>` : ''}
    <div class="ia-pie">Claude no oye tu voz: lee lo que entendió el reconocedor del móvil.</div>
    ${iaHtmlTarjetas(r.tarjetas)}
    ${iaHtmlRepetida(r)}
    ${iaHtmlCoste(r.coste)}
  </div>`;
}

/** El servidor devolvió una respuesta que ya tenía (un reintento): no se cobró. */
function iaHtmlRepetida(r) {
  return r?.repetida ? '<div class="ia-pie">Es la respuesta que ya habías pedido: no se ha cobrado otra vez.</div>' : '';
}

// ── MICRÓFONO ────────────────────────────────────────────

const iaRecClase = () => (typeof window !== 'undefined'
  && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;

/** ¿Hay reconocedor de voz? En el iPhone con la app instalada, no. */
function iaHayMicro() { return !!iaRecClase(); }

let iaRecActual = null;

function iaTextoErrorMicro(codigo) {
  return ({
    'not-allowed': 'El micrófono no tiene permiso. Actívalo en los ajustes del navegador.',
    'service-not-allowed': 'El micrófono no tiene permiso. Actívalo en los ajustes del navegador.',
    'audio-capture': 'No se encuentra el micrófono.',
    'network': 'El reconocedor de voz necesita conexión.',
    'no-speech': 'No te he oído. Pulsa y habla.',
    'aborted': 'Grabación cancelada.',
  })[codigo] || 'El micrófono ha fallado. Prueba otra vez o escríbelo.';
}

/** [{transcript, confidence}] de un SpeechRecognitionResult, como mucho 5. */
function iaAlternativasDe(resultado) {
  const out = [];
  if (!resultado) return out;
  for (let i = 0; i < Math.min(resultado.length || 0, 5); i++) {
    const a = resultado[i];
    const t = String(a?.transcript || '').trim();
    if (t) out.push({ transcript: t, confidence: Number(a.confidence) || 0 });
  }
  return out;
}

/**
 * Escucha UNA frase. Resuelve con `{ texto, alternativas }` o rechaza con un
 * Error que trae `codigo` (el del reconocedor, o 'sin_micro') y un mensaje que
 * se puede enseñar. Pide 5 alternativas: la segunda y la tercera dicen qué otra
 * cosa pudo entender, que es justo lo que diagnostica la IA.
 */
function iaEscucharFrase({ lang, alternativas = 5, alEmpezar } = {}) {
  return new Promise((ok, mal) => {
    const C = iaRecClase();
    if (!C) return mal(Object.assign(new Error('Aquí no hay micrófono: díctalo con el micro del teclado.'), { codigo: 'sin_micro' }));
    iaPararMicro();
    const rec = new C();
    rec.lang = iaVozDe(lang);
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = alternativas;
    let hecho = false;
    rec.onresult = (ev) => {
      if (hecho) return;
      const res = ev.results?.[0];
      const alts = iaAlternativasDe(res);
      if (!alts.length) return;
      hecho = true;
      ok({ texto: alts[0].transcript, alternativas: alts });
    };
    rec.onerror = (ev) => {
      if (hecho) return;
      hecho = true;
      mal(Object.assign(new Error(iaTextoErrorMicro(ev.error)), { codigo: ev.error || 'micro' }));
    };
    rec.onend = () => {
      if (iaRecActual === rec) iaRecActual = null;
      if (hecho) return;
      hecho = true;
      mal(Object.assign(new Error(iaTextoErrorMicro('no-speech')), { codigo: 'no-speech' }));
    };
    iaRecActual = rec;
    try {
      rec.start();
      if (alEmpezar) alEmpezar();
    } catch (e) {
      hecho = true;
      mal(Object.assign(new Error(iaTextoErrorMicro()), { codigo: 'micro' }));
    }
  });
}

/**
 * Grabación larga (las tareas orales, de uno a cuatro minutos). Va sumando lo
 * que entiende y llama a `alTexto(textoFinal, textoProvisional)`. Chrome corta
 * el reconocimiento continuo tras un silencio, así que mientras no se pare a
 * mano se vuelve a arrancar. Devuelve `{ parar() }`.
 */
function iaGrabarLargo({ lang, alTexto, alTerminar, alError } = {}) {
  const C = iaRecClase();
  if (!C) {
    if (alError) alError(Object.assign(new Error('Aquí no hay micrófono: díctalo con el micro del teclado.'), { codigo: 'sin_micro' }));
    return { parar() {} };
  }
  iaPararMicro();
  let activo = true;
  let finales = '';
  let rec = null;

  const arrancar = () => {
    rec = new C();
    rec.lang = iaVozDe(lang);
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let provisional = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0]?.transcript || '';
        if (ev.results[i].isFinal) finales = `${finales} ${t}`.replace(/\s+/g, ' ').trim();
        else provisional += t;
      }
      if (alTexto) alTexto(finales, provisional.trim());
    };
    rec.onerror = (ev) => {
      // 'no-speech' en mitad de una pausa no es un fallo: se sigue escuchando.
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      activo = false;
      if (alError) alError(Object.assign(new Error(iaTextoErrorMicro(ev.error)), { codigo: ev.error }));
    };
    rec.onend = () => {
      if (activo) {
        try { arrancar(); return; } catch { activo = false; }
      }
      if (iaRecActual === rec) iaRecActual = null;
      if (alTerminar) alTerminar(finales);
    };
    iaRecActual = rec;
    rec.start();
  };

  try { arrancar(); } catch (e) {
    activo = false;
    if (alError) alError(Object.assign(new Error(iaTextoErrorMicro()), { codigo: 'micro' }));
  }
  return {
    parar() {
      activo = false;
      try { rec?.stop(); } catch {}
    },
  };
}

function iaPararMicro() {
  const r = iaRecActual;
  iaRecActual = null;
  try { r?.abort?.(); } catch {}
}

/**
 * ¿Cómo llegó este texto? 'voz' sólo si es exactamente lo que dio el
 * reconocedor; si se ha tocado, o se dictó con el teclado, 'texto'. Es lo que
 * decide si el servidor marca HABLAR.
 */
function iaViaDe(textoEnviado, textoDelMicro) {
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  return textoDelMicro && norm(textoEnviado) && norm(textoEnviado) === norm(textoDelMicro) ? 'voz' : 'texto';
}

// ── PRONUNCIACIÓN: el botón de las tres pantallas con micrófono ─────────

/**
 * Pide el diagnóstico a partir de lo que entendió el reconocedor y lo pinta en
 * `caja` (id o elemento). `alternativas`: [{transcript, confidence}], las del
 * reconocedor o una sola sin confianza si llega del dictado del teclado.
 */
async function iaDiagnosticarPron({ objetivo, alternativas = [], lang, caja, btn } = {}) {
  const el = typeof caja === 'string' ? document.getElementById(caja) : caja;
  if (!el || !objetivo) return;
  el.innerHTML = iaHtmlCargando('Mirando qué entendió el reconocedor…');
  const restaurar = iaOcupar(btn);
  try {
    const r = await iaPost('/ia/pronunciacion', { objetivo, alternativas, lang }, { tiempo: IA_TIEMPO_CORTO });
    el.innerHTML = iaHtmlPronunciacion(r, lang);
  } catch (e) {
    el.innerHTML = iaHtmlError(e);
  } finally {
    restaurar();
  }
}

/**
 * La pista que va bajo todo campo de dictado. El dictado del iPhone escucha en
 * el idioma del TECLADO: con el teclado en español, un «je voudrais» sale
 * «yo vudré» y la corrección no sirve de nada.
 */
function iaHtmlPistaDictado(lang) {
  const nombre = lang === 'fr' || /^fr/i.test(lang || '') ? 'francés' : 'inglés';
  // Un iPhone configurado en español suele tener sólo el teclado español: ahí
  // no hay globo, o el globo no lleva al francés. Hay que decir cómo añadirlo.
  return `<div class="field-pista">Pulsa el micro del teclado y habla. Para que te entienda, el teclado
    tiene que estar en ${nombre}: mantén pulsado el globo ${'\u{1F310}'} y elígelo.
    <details class="ia-pista-mas"><summary>¿No sale el ${nombre}?</summary>
      Añádelo una vez: Ajustes del iPhone › General › Teclado › Teclados › Añadir teclado nuevo ›
      ${nombre === 'francés' ? 'Francés (Suiza) o Francés' : 'Inglés (Reino Unido)'}. Si no ves el micro en el teclado,
      enciende «Activar dictado» en esa misma pantalla.
    </details></div>`;
}

/**
 * Sin reconocedor (iPhone con la app instalada): un campo para dictar la frase
 * con el micro del teclado y pedir el diagnóstico de lo que entendió el
 * dictado. `id` lo pone quien llama (letras, números y guiones).
 */
function iaHtmlDictadoPron(id, objetivo, lang) {
  return `<div class="ia-dictado" id="${id}" data-objetivo="${escaparAttr(objetivo)}" data-lang="${escaparAttr(lang)}">
    <div class="ia-dictado-fila">
      <input class="field-input" id="${id}-txt" type="text" autocomplete="off" autocapitalize="off"
        spellcheck="false" lang="${lang === 'fr' ? 'fr' : 'en'}" placeholder="Díctala con el micro del teclado">
      <button class="btn btn-subtle btn-sm" onclick="iaDictadoPron('${id}', this)">CORREGIR CON IA</button>
    </div>
    ${iaHtmlPistaDictado(lang)}
    <div id="${id}-res"></div>
  </div>`;
}

async function iaDictadoPron(id, btn) {
  const caja = document.getElementById(id);
  const campo = document.getElementById(`${id}-txt`);
  const txt = campo?.value.trim();
  if (!caja) return;
  if (!txt) { toast('Dicta la frase primero', 'error'); return; }
  // En Safari de iOS tocar un botón no quita el foco: el teclado se quedaba
  // abierto tapando el resultado, y parecía que no había pasado nada.
  campo.blur();
  const res = document.getElementById(`${id}-res`);
  await iaDiagnosticarPron({
    objetivo: caja.dataset.objetivo, lang: caja.dataset.lang,
    alternativas: [{ transcript: txt, confidence: 0 }],
    caja: res, btn,
  });
  if (res?.querySelector('.ia-caja')) {
    // El dictado de iOS AÑADE a lo que hay: sin vaciarlo, el segundo intento
    // se mandaba pegado al primero. Si falló, el texto se queda para reenviarlo.
    campo.value = '';
    res.insertAdjacentHTML('afterbegin', `<div class="ia-dictado-oido">Lo que entendió el dictado: «${escaparHtml(txt)}»</div>`);
  }
  try { res?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
}

// ── AJUSTES › IA ─────────────────────────────────────────
// La clave se escribe y no vuelve a salir: el campo nunca se rellena, la API la
// comprueba sin gastar antes de guardarla y sólo se enseñan los 4 últimos
// caracteres. Tampoco se guarda en el móvil.

/** El hueco de Ajustes; `iaCargarAjustes()` lo rellena sin hacer esperar al resto. */
function iaHtmlAjustesHueco() {
  return `<div class="glass-card" id="ia-ajustes" style="margin-top:8px">
    <div class="card-title">IA · CLAUDE</div>
    ${iaHtmlCargando('Cargando…')}
  </div>`;
}

async function iaCargarAjustes() {
  const caja = document.getElementById('ia-ajustes');
  if (!caja) return;
  try {
    const e = await iaEstado(true);
    caja.innerHTML = iaHtmlAjustes(e);
  } catch (err) {
    caja.innerHTML = `<div class="card-title">IA · CLAUDE</div>${iaHtmlError(err, 'iaCargarAjustes()')}`;
  }
}

const iaDolares = (n) => `${(Number(n) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;

function iaHtmlAjustes(e) {
  if (!e) return '<div class="card-title">IA · CLAUDE</div>';
  const modelo = (e.modelos || []).find((m) => m.id === e.modelo);
  const pctMes = e.tope_mes > 0 ? Math.min(100, (e.gasto_mes / e.tope_mes) * 100) : 100;
  const enRender = e.origen_clave === 'entorno';

  let estado;
  if (e.disponible) {
    estado = `<span class="ia-luz ia-luz-ok"></span> Lista · ${escaparHtml(modelo?.nombre || e.modelo)} · clave …${escaparHtml(e.clave_final || '')}
      ${enRender ? '(puesta en Render)' : '(puesta aquí)'}`;
  } else if (e.clave_final && e.sin_token) {
    estado = `<span class="ia-luz ia-luz-mal"></span> Hay clave, pero la app no tiene clave de acceso (APP_TOKEN).
      Sin ella cualquiera con la dirección podría gastar tu crédito, así que la IA no se enciende.`;
  } else {
    estado = '<span class="ia-luz"></span> Sin clave. Pega aquí tu clave de la API de Claude.';
  }

  return `
    <div class="card-title">IA · CLAUDE</div>
    <div class="ia-estado">${estado}</div>

    <div class="ia-gasto">
      <div class="ia-gasto-fila"><span>Este mes</span><b>${iaDolares(e.gasto_mes)} de ${iaDolares(e.tope_mes)}</b></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pctMes.toFixed(1)}%"></div></div>
      <div class="ia-gasto-fila ia-gasto-pie">
        <span>${Number(e.llamadas_mes) || 0} llamadas este mes</span>
        <span>Crédito del mes: quedan ${iaDolares(e.credito_restante)} de ${iaDolares(e.credito)}</span>
      </div>
    </div>

    ${enRender ? `
      <div class="field-pista">La clave está en Render (variable ANTHROPIC_API_KEY) y manda sobre la de aquí.
        Para cambiarla, cámbiala allí.</div>` : `
      <div class="field">
        <label for="ia-clave">Clave de la API</label>
        <input class="field-input" id="ia-clave" type="password" autocomplete="off" autocapitalize="off"
          spellcheck="false" placeholder="${e.clave_final ? `guardada (…${escaparAttr(e.clave_final)})` : 'sk-ant-…'}">
        <div class="field-pista">${e.clave_final ? 'Para cambiarla, pega otra encima. ' : ''}Se comprueba con la API sin gastar nada y no vuelve a salir: ni se ve aquí ni se guarda en el móvil.</div>
      </div>
      <div class="ia-acciones">
        <button class="btn btn-subtle btn-sm" onclick="iaGuardarClave(this)">GUARDAR CLAVE</button>
        ${e.origen_clave === 'ajustes' ? '<button class="btn btn-ghost btn-sm" onclick="iaQuitarClave(this)">QUITAR CLAVE</button>' : ''}
      </div>
      <div id="ia-clave-msg"></div>`}

    <div class="field" style="margin-top:14px">
      <label for="ia-modelo">Modelo</label>
      <select class="field-input" id="ia-modelo" onchange="iaGuardarAjuste({ modelo: this.value })">
        ${(e.modelos || []).map((m) => `<option value="${escaparAttr(m.id)}" ${m.id === e.modelo ? 'selected' : ''}>
          ${escaparHtml(String(m.nombre).replace(/^Claude /, ''))} · ${escaparHtml(String(m.entrada))} $ / ${escaparHtml(String(m.salida))} $</option>`).join('')}
      </select>
      <div class="field-pista">Precio por millón de tokens, entrada / salida. Opus es el que mejor corrige y el
        más caro; Sonnet cuesta la mitad; Haiku es cuarenta veces más barato, pero se le escapan más cosas.</div>
    </div>

    <div class="ia-dos">
      <div class="field">
        <label for="ia-tope">Tope al mes ($)</label>
        <input class="field-input" id="ia-tope" type="number" min="0" max="1000" step="1" inputmode="decimal" value="${Number(e.tope_mes) || 0}">
      </div>
      <div class="field">
        <label for="ia-credito">Crédito al mes ($)</label>
        <input class="field-input" id="ia-credito" type="number" min="0" max="1000" step="1" inputmode="decimal" value="${Number(e.credito) || 0}">
      </div>
    </div>
    <div class="field-pista" style="margin-top:-4px">Al llegar al tope la IA se para hasta el mes siguiente. El crédito es el que da tu plan Max cada mes (100 $): lo que no gastas caduca, así que no hay que ahorrarlo; el tope sólo evita tocar el saldo comprado.</div>
    <div class="ia-acciones">
      <button class="btn btn-subtle btn-sm" onclick="iaGuardarLimites(this)">GUARDAR TOPE</button>
    </div>

    <div class="ia-prueba">
      <button class="btn btn-subtle" onclick="iaProbar(this)" ${e.disponible ? '' : 'disabled'}>PROBAR</button>
      <div class="field-pista">Hace una llamada de verdad (menos de un céntimo). Sale en los registros de Render como «[ia] prueba».</div>
      <div id="ia-prueba-res"></div>
    </div>`;
}

async function iaGuardarClave(btn) {
  const campo = document.getElementById('ia-clave');
  const clave = campo?.value.trim();
  if (!clave) { toast('Pega la clave primero', 'error'); return; }
  const restaurar = iaOcupar(btn, 'COMPROBANDO…');
  try {
    const r = await apiPut('/ia/clave', { clave });
    if (campo) campo.value = '';   // nunca se queda escrita en pantalla
    restaurar();
    if (r) toast(`Clave guardada (…${r.clave_final})`, 'success');
    iaCargarAjustes();
  } catch (e) {
    // El error se queda en la tarjeta (el toast es de una línea y la frase no
    // cabría); la tarjeta no se repinta para no borrarlo.
    if (campo) campo.value = '';
    restaurar();
    const msg = document.getElementById('ia-clave-msg');
    if (msg) msg.innerHTML = iaHtmlError(e);
  }
}

async function iaQuitarClave(btn) {
  if (!confirm('¿Quitar la clave? La IA dejará de funcionar hasta que pongas otra.')) return;
  const restaurar = iaOcupar(btn);
  try {
    await apiDel('/ia/clave');
    toast('Clave quitada', 'success');
  } catch (e) {
    toast(iaTextoError(e), 'error');
  }
  restaurar();
  iaCargarAjustes();
}

async function iaGuardarAjuste(cambios) {
  try {
    await apiPut('/ia/ajustes', cambios);
    toast('Guardado', 'success');
  } catch (e) {
    toast(iaTextoError(e), 'error');
  }
  iaCargarAjustes();
}

function iaGuardarLimites(btn) {
  const tope = document.getElementById('ia-tope')?.value.trim();
  const credito = document.getElementById('ia-credito')?.value.trim();
  // Un campo vacío es Number('') = 0: con tope 0 la IA se apagaba entera y el
  // aviso decía "Guardado".
  if (!tope || !credito || !Number.isFinite(Number(tope)) || !Number.isFinite(Number(credito))) {
    toast('Pon un número en el tope y en el crédito', 'error');
    return;
  }
  if (Number(tope) === 0 && !confirm('Con el tope a 0 la IA no funcionará este mes. ¿Seguro?')) return;
  const restaurar = iaOcupar(btn);
  iaGuardarAjuste({ tope_mes: Number(tope), credito: Number(credito) }).finally(restaurar);
}

async function iaProbar(btn) {
  const caja = document.getElementById('ia-prueba-res');
  if (caja) caja.innerHTML = iaHtmlCargando('Llamando a Claude…');
  const restaurar = iaOcupar(btn, 'PROBANDO…');
  try {
    const r = await iaPost('/ia/prueba', {}, { tiempo: IA_TIEMPO_CORTO });
    if (caja) {
      caja.innerHTML = `<div class="ia-caja">
        <div class="ia-cabeza"><span class="ia-luz ia-luz-ok"></span> Funciona · ${escaparHtml(r.modelo)} · ${(Number(r.ms) / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s</div>
        ${r.resumen ? `<p class="ia-resumen">${escaparHtml(r.resumen)}</p>` : ''}
        ${iaHtmlCoste(r.coste)}
      </div>`;
    }
  } catch (e) {
    if (caja) caja.innerHTML = iaHtmlError(e);
  } finally {
    restaurar();
  }
}
