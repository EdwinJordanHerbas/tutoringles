// TutorIngles — lib/tetris.js
// El modo Tetris: estudiar mucho de día, repasar justo antes de dormir y,
// ya dormido, oír pistas de lo estudiado ese día.
//
// El nombre viene del "efecto Tetris" (Stickgold, 2000): quien juega horas
// seguidas acaba viendo piezas al cerrar los ojos, porque el cerebro sigue
// repasando lo que ha tenido delante todo el día. La idea es provocar eso con
// el idioma: mucha exposición, muy seguida, y lo último antes de dormir.
//
// Lo que dice la ciencia, sin adornos, porque la app entera se apoya en no
// mentir con el progreso:
//
//  - Aprender palabras NUEVAS durmiendo no funciona. Lo que sí tiene evidencia
//    es la reactivación dirigida de la memoria (TMR): oír durante el sueño
//    profundo una pista de algo que se aprendió ese mismo día mejora su
//    recuerdo a la mañana siguiente. Se ha medido con vocabulario de un idioma
//    extranjero, poniendo sólo la palabra extranjera y no la traducción.
//  - El sueño profundo se concentra en la primera parte de la noche. Por eso
//    hay una espera (dormirse) y un tramo con pistas, no la noche entera.
//  - Si el sonido despierta, el remedio es peor que la enfermedad: dormir mal
//    estropea la consolidación de todo el día.
//
// Y como la evidencia es de laboratorio y con muestras pequeñas, la app no se
// lo cree a ciegas: cada noche sortea las palabras del día en dos grupos, uno
// suena y el otro no, y el test de la mañana compara los dos. Tras una semana
// de noches, los datos de ÉL dicen si le funciona.

const { fechaEnZona, ZONA } = require('./fechas');

// El día de estudio va de 05:00 a 05:00. Quien repasa a las 00:30 y se duerme
// a la 01:00 sigue en SU día: la noche tiene que tirar de lo que estudió esa
// tarde, no de un día nuevo que acaba de empezar y está vacío.
const CORTE_HORAS = 5;

// Mínimo de pistas que tienen que haber sonado de verdad para que una noche
// cuente en la comparación. Si se bloqueó la pantalla a los cinco minutos, esa
// noche no probó nada, y contarla como noche con pistas falsea el resultado.
const MIN_PISTAS = 20;

// Noches necesarias para decir algo. Con ~15 palabras por grupo y noche, antes
// de una semana la diferencia entre grupos es sobre todo ruido.
const MIN_NOCHES = 7;

/** El día de estudio en curso ('YYYY-MM-DD'), con el corte a las 05:00. */
function diaDeEstudio(cuando = new Date(), zona = ZONA, corte = CORTE_HORAS) {
  return fechaEnZona(new Date(cuando.getTime() - corte * 3600_000), zona);
}

/**
 * Expresión SQL que da el día de estudio de una columna timestamptz, para usar
 * en consultas: `${sqlDiaDeEstudio('rl.reviewed_at', '$2')} = $3::date`.
 * La zona va como parámetro; el corte es una constante del código.
 */
function sqlDiaDeEstudio(columna, parametroZona) {
  return `((${columna} AT TIME ZONE ${parametroZona}) - INTERVAL '${CORTE_HORAS} hours')::date`;
}

/**
 * Reparte las palabras del día entre las que sonarán esta noche y las de
 * control, que se quedan en silencio.
 *
 * El reparto es ESTRATIFICADO: se ordenan de más difícil a más fácil y se
 * sortea dentro de cada pareja. Con un sorteo a pelo, una noche podía mandar
 * las cinco palabras más difíciles al grupo de control y "demostrar" que las
 * pistas funcionan cuando sólo había comparado fáciles contra difíciles.
 *
 * @param {Array<{id:number, peso?:number}>} palabras  peso = dificultad (más alto, más difícil)
 * @param {() => number} rnd  generador en [0,1), inyectable para los tests
 */
function repartirPistas(palabras, rnd = Math.random) {
  const orden = [...(palabras || [])]
    .sort((a, b) => (Number(b.peso) || 0) - (Number(a.peso) || 0) || a.id - b.id);
  const conPista = [];
  const control = [];
  for (let i = 0; i < orden.length; i += 2) {
    const [a, b] = orden.slice(i, i + 2);
    if (!b) { (rnd() < 0.5 ? conPista : control).push(a); continue; }
    if (rnd() < 0.5) { conPista.push(a); control.push(b); }
    else             { conPista.push(b); control.push(a); }
  }
  return { conPista, control };
}

/**
 * Qué toca AHORA. Es lo que decide el botón grande de HOY: con el modo Tetris
 * no hay que elegir nada, igual que con la sesión de cinco minutos.
 *
 *   despertar → el test de las palabras de anoche (hasta las 14:00)
 *   ronda     → otra sesión de cinco minutos (`extra` si ya se cumplió la meta)
 *   almohada  → el repaso de antes de dormir (desde una hora antes de su hora)
 *   noche     → el modo noche
 *   hecho     → la noche ya está en marcha o terminada
 *
 * `minutos` son minutos desde medianoche en la hora del usuario.
 */
function faseTetris({
  minutos, despertarPendiente = false, rondas = 0, metaRondas = 6,
  almohadaHecha = false, nocheEmpezada = false, minAlmohada = 22 * 60 + 30,
  palabrasHoy = 0,
}) {
  const corte = CORTE_HORAS * 60;
  const madrugada = minutos < corte;
  // La franja de la noche va de una hora antes de la almohada hasta el corte
  // de las 05:00, y puede cruzar la medianoche. Con la almohada a las 00:30,
  // "minutos >= almohada - 60" era "minutos >= -30": noche a todas horas, y el
  // botón de HOY ofrecía el repaso de almohada a media mañana.
  const inicio = (((minAlmohada - 60) % 1440) + 1440) % 1440;
  const tarde = inicio >= corte
    ? minutos >= inicio || madrugada
    : minutos >= inicio && madrugada;

  if (despertarPendiente && !madrugada && minutos < 14 * 60) return { fase: 'despertar' };

  // De noche sin nada estudiado no hay nada que repasar ni que reactivar:
  // lo que toca es una ronda, aunque sea tarde.
  if (tarde && palabrasHoy > 0) {
    if (!almohadaHecha) return { fase: 'almohada' };
    if (!nocheEmpezada) return { fase: 'noche' };
    return { fase: 'hecho' };
  }
  return { fase: 'ronda', ronda: rondas + 1, extra: rondas >= metaRondas };
}

/** "22:30" → 1350. Una hora mal escrita cae al valor por defecto. */
function minutosDeHora(hhmm, porDefecto = 22 * 60 + 30) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return porDefecto;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Compara el grupo con pista y el de control a partir de las filas de
 * noche_palabras ya probadas.
 *
 * Cada palabra puntúa 0 (no salía), 1 (con dudas) o 2 (a la primera), y el
 * porcentaje es la media sobre 2: así "con dudas" cuenta medio acierto en vez
 * de tener que elegir si es acierto o fallo.
 *
 * @param {Array<{noche_id, pistas, con_pista, recordada}>} filas
 */
function resumenNoches(filas, { minPistas = MIN_PISTAS, minNoches = MIN_NOCHES } = {}) {
  const probadas = (filas || []).filter((f) => f.recordada !== null && f.recordada !== undefined);
  const validas = probadas.filter((f) => Number(f.pistas) >= minPistas);

  const grupo = (flag) => {
    const g = validas.filter((f) => !!f.con_pista === flag);
    const puntos = g.reduce((a, f) => a + Number(f.recordada), 0);
    return {
      n: g.length,
      primera: g.filter((f) => Number(f.recordada) === 2).length,
      pct: g.length ? Math.round((puntos / (2 * g.length)) * 100) : null,
    };
  };

  const conPista = grupo(true);
  const control = grupo(false);
  const noches = new Set(validas.map((f) => f.noche_id)).size;
  const descartadas = new Set(
    probadas.filter((f) => Number(f.pistas) < minPistas).map((f) => f.noche_id)).size;

  return {
    noches,
    descartadas,
    conPista,
    control,
    diferencia: conPista.pct !== null && control.pct !== null ? conPista.pct - control.pct : null,
    suficiente: noches >= minNoches,
    faltan: Math.max(0, minNoches - noches),
  };
}

/**
 * La frase que resume el experimento. Dice lo que hay, incluido "no sirve":
 * si con pista sale peor, lo más probable es que el sonido le esté despertando.
 */
function veredicto(r) {
  if (!r || !r.noches) {
    return 'Aún no hay ninguna noche medida. La primera cuenta a partir del test de mañana.';
  }
  if (!r.suficiente) {
    return `Faltan ${r.faltan} ${r.faltan === 1 ? 'noche' : 'noches'} para poder decir algo. Antes de eso, la diferencia es ruido.`;
  }
  if (r.diferencia >= 8) {
    return `Te está funcionando: +${r.diferencia} puntos en las palabras que sonaron de noche.`;
  }
  if (r.diferencia <= -5) {
    return 'Con pista recuerdas PEOR. Lo más probable es que el sonido te despierte: baja el volumen o deja la noche y quédate con el día.';
  }
  return 'Sin diferencia clara. La noche no está aportando: lo que te hace avanzar es el día.';
}

module.exports = {
  CORTE_HORAS, MIN_PISTAS, MIN_NOCHES,
  diaDeEstudio, sqlDiaDeEstudio, repartirPistas, faseTetris, minutosDeHora,
  resumenNoches, veredicto,
};
