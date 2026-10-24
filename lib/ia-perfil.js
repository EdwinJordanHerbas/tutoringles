// TutorIngles — lib/ia-perfil.js
// El perfil del alumno: los errores que la IA va encontrando, contados.
//
// Es lo que hace que la corrección "se adapte": cada respuesta de Claude trae
// los errores que ha visto con una `clave` corta ("género de los sustantivos");
// aquí se normalizan y se cuentan, y los más repetidos vuelven en el siguiente
// prompt para que Claude los vigile y reutilice la misma clave.
//
// Y lo que se repite se convierte en tarjeta del SRS: un error que aparece por
// SEGUNDA vez entra en el repaso con la forma correcta (la primera vez puede ser
// un despiste o un fallo del reconocedor; la segunda ya es un patrón). Así la
// IA no sólo corrige: lo corregido vuelve en la sesión de 5 minutos, en la
// almohada y por la noche, como cualquier otra palabra.

const TIPOS = ['pronunciacion', 'gramatica', 'vocabulario', 'ortografia', 'registro'];

// Los errores de pronunciación no se convierten en tarjeta: la forma correcta
// es la misma palabra que ya estaba en la frase, y lo que hay que practicar es
// el sonido (SONIDOS), no recordar una palabra nueva.
const TIPOS_CON_TARJETA = new Set(['gramatica', 'vocabulario', 'registro', 'ortografia']);

const VECES_PARA_TARJETA = 2;
const MAX_ERRORES_POR_RESPUESTA = 5;
const MAX_TARJETAS_DIA = 10;

/** "  Género de los sustantivos. " → "género de los sustantivos" */
function normalizarClave(s) {
  return String(s ?? '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;:,]+$/, '')
    .toLowerCase()
    .slice(0, 120);
}

const corto = (s, n) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/**
 * Limpia lo que devolvió Claude: tipo válido, clave normalizada, sin
 * duplicados (mismo tipo + clave) y como mucho cinco.
 */
function prepararErrores(errores) {
  const vistos = new Set();
  const out = [];
  for (const e of Array.isArray(errores) ? errores : []) {
    if (!e || !TIPOS.includes(e.tipo)) continue;
    const clave = normalizarClave(e.clave);
    if (clave.length < 3) continue;
    const id = `${e.tipo}|${clave}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    out.push({
      tipo: e.tipo,
      clave,
      mal: corto(e.mal, 300),
      bien: corto(e.bien, 300),
      traduccion: corto(e.traduccion, 200),
      explicacion: corto(e.explicacion, 500),
    });
    if (out.length >= MAX_ERRORES_POR_RESPUESTA) break;
  }
  return out;
}

/**
 * ¿Este error merece tarjeta? Repetido, de un tipo que se aprende recordando,
 * con una forma correcta corta (lo que se lee en voz alta de noche tiene que
 * ser una frase, no un párrafo) y distinta de lo que dijo el alumno.
 */
function mereceTarjeta(e, veces) {
  if (veces < VECES_PARA_TARJETA) return false;
  if (!TIPOS_CON_TARJETA.has(e.tipo)) return false;
  const bien = (e.bien || '').trim();
  if (bien.length < 2 || bien.length > 80) return false;
  if (bien.toLowerCase() === (e.mal || '').trim().toLowerCase()) return false;
  return true;
}

/**
 * La tarjeta: `word` es sólo lo que se dice en voz alta (la convención de la
 * tabla, porque el modo noche lo lee tal cual) y la traducción lleva el matiz
 * detrás de " — ", como el resto del vocabulario.
 */
function tarjetaDeError(e) {
  const sentido = e.traduccion || e.explicacion || e.clave;
  const matiz = e.mal ? `no «${e.mal}»` : e.clave;
  return {
    word: e.bien.trim().slice(0, 200),
    translation: `${sentido} — ${matiz}`.slice(0, 400),
    example_sentence: e.explicacion ? e.explicacion.slice(0, 500) : null,
  };
}

module.exports = {
  TIPOS, TIPOS_CON_TARJETA, VECES_PARA_TARJETA, MAX_ERRORES_POR_RESPUESTA, MAX_TARJETAS_DIA,
  normalizarClave, prepararErrores, mereceTarjeta, tarjetaDeError,
};
