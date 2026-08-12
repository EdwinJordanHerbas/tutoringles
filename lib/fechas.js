// TutorIngles — lib/fechas.js
// Qué día es y qué hora es PARA EL USUARIO, no para el servidor.
//
// El contenedor corre en UTC y sin variable TZ. Mientras todo se calculó con
// `new Date().getHours()` y `toISOString()`, la app vivía dos horas por detrás
// de quien la usa, y eso salía por dos sitios:
//
//   1. El aviso diario. Con `push_hora = 20:30` el planificador comparaba
//      contra la hora de Greenwich, así que el aviso salía a las **22:30** de
//      España. Verificado en las 13 filas de push_log: todas a las 22:30. Un
//      recordatorio de "cinco minutos de inglés" a esa hora llega cuando ya
//      estás en la cama.
//   2. Qué día es hoy. Entre las 00:00 y las 02:00 de España el servidor
//      seguía creyendo que era el día anterior, así que estudiar de madrugada
//      contaba para ayer: rompía la racha y las metas del día.
//
// Se arregla aquí y no con `TZ=Europe/Madrid` en el contenedor a propósito.
// El contenedor se levantó con `docker run` sin compose, así que recrearlo
// para añadir una variable tiene más riesgo que arreglarlo en código — y de
// paso la zona deja de depender de dónde esté alojada la app.

// Zona del usuario. Se puede cambiar por entorno, pero el valor por defecto es
// el correcto: la app es de una persona y esa persona vive en España.
const ZONA = process.env.ZONA_HORARIA || 'Europe/Madrid';

// Los formateadores se construyen una vez: crear un Intl.DateTimeFormat es
// caro y el planificador pregunta la hora cada minuto.
//
// 'en-CA' se usa porque su formato de fecha es exactamente YYYY-MM-DD, que es
// el que espera Postgres y el resto de la app. No es un idioma, es el formato.
const cacheFecha = new Map();
const cacheHora  = new Map();

// Una zona que no existe hace que `Intl.DateTimeFormat` lance al CONSTRUIRSE,
// no al formatear. Si eso escapara, el planificador moriría cada minuto y la
// app se quedaría sin fecha: se cae a la zona del proceso y sigue funcionando.
function construir(zona, opciones, locale) {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: zona, ...opciones });
  } catch {
    return new Intl.DateTimeFormat(locale, opciones);
  }
}

function fmtFecha(zona) {
  if (!cacheFecha.has(zona)) {
    cacheFecha.set(zona, construir(zona, {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }, 'en-CA'));
  }
  return cacheFecha.get(zona);
}

function fmtHora(zona) {
  if (!cacheHora.has(zona)) {
    // hourCycle 'h23' explícito: con hour12:false algunos entornos devuelven
    // "24" para la medianoche, y entonces las 00:10 se leerían como las 24:10.
    cacheHora.set(zona, construir(zona, {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }, 'en-GB'));
  }
  return cacheHora.get(zona);
}

/** El día en curso para el usuario, como 'YYYY-MM-DD'. */
function fechaEnZona(cuando = new Date(), zona = ZONA) {
  return fmtFecha(zona).format(cuando);
}

/** Minutos desde medianoche en la zona del usuario. */
function minutosEnZona(cuando = new Date(), zona = ZONA) {
  const partes = fmtHora(zona).formatToParts(cuando);
  const h = Number(partes.find((p) => p.type === 'hour')?.value);
  const m = Number(partes.find((p) => p.type === 'minute')?.value);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    // Una zona inválida no puede dejar la app sin fecha: se cae a la del proceso.
    return cuando.getHours() * 60 + cuando.getMinutes();
  }
  return (h % 24) * 60 + m;
}

/** El día de ayer para el usuario. Lo usa el cálculo de la racha. */
function ayerEnZona(cuando = new Date(), zona = ZONA) {
  const hoy = fechaEnZona(cuando, zona);
  const d = new Date(`${hoy}T12:00:00Z`);      // mediodía: inmune al horario de verano
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
}

module.exports = { ZONA, fechaEnZona, minutosEnZona, ayerEnZona };
