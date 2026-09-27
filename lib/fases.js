// TutorIngles — lib/fases.js
// El plan del francés: por fases, no por días.
//
// El inglés tiene un plan de 30 días con fecha de examen. El francés no puede
// tenerlo: la marcha a Suiza es "más o menos en un mes" y el objetivo final
// (DALF C1) está lejos de un A2. Poner un calendario sería inventarse un ritmo.
//
// Así que el plan son tres fases con objetivos MEDIBLES, y se pasa de una a
// otra cuando los datos lo dicen, vaya rápido o despacio:
//
//   1. Sobrevivir en Suiza    A2 → B1 oral. Explicarse aunque falte la palabra.
//   2. Trabajar en francés    B1 → B2. El vocabulario y las situaciones del día.
//   3. DALF C1                argumentar, matizar y el formato del examen.
//
// Una palabra cuenta como CONSOLIDADA cuando FSRS le da una estabilidad de 7
// días o más: haberla acertado una vez no es saberla. Es más lento de llenar,
// y precisamente por eso no miente.

const UMBRAL_PALABRAS = 0.8;     // 80 % de una categoría consolidada

/**
 * @param {object} d
 * @param {Object<string,{total:number, consolidadas:number}>} d.palabras  por categoría
 * @param {Object<string,{total:number, hechas:number}>} d.situaciones    por nivel
 * @param {Object<string,{total:number, hechas:number}>} d.gramatica      por nivel
 */
function fasesFrances(d = {}) {
  const pal = (cats) => {
    let total = 0, hechas = 0;
    for (const c of cats) {
      total  += d.palabras?.[c]?.total || 0;
      hechas += d.palabras?.[c]?.consolidadas || 0;
    }
    return { total, hechas, meta: Math.ceil(total * UMBRAL_PALABRAS) };
  };
  const por = (tabla, niveles) => {
    let total = 0, hechas = 0;
    for (const n of niveles) {
      total  += tabla?.[n]?.total || 0;
      hechas += tabla?.[n]?.hechas || 0;
    }
    return { total, hechas, meta: total };
  };

  const objetivo = (texto, { total, hechas, meta }, pendienteApp = false) => ({
    texto,
    hechas,
    meta,
    total,
    pendienteApp,          // el objetivo existe pero la app aún no tiene con qué cumplirlo
    // Un objetivo sin contenido no puede darse por cumplido: meta 0 NO es 100 %.
    pct: meta > 0 ? Math.min(100, Math.round((hechas / meta) * 100)) : 0,
  });

  const fases = [
    {
      id: 1, titulo: 'Sobrevivir en Suiza', nivel: 'A2 → B1',
      idea: 'Explicarte aunque no te salga la palabra exacta, y entender lo que es de allí.',
      objetivos: [
        objetivo('Frases de rescate consolidadas', pal(['chunk'])),
        objetivo('Palabras de la Suiza romanda consolidadas', pal(['suisse'])),
        objetivo('Situaciones A2 practicadas enteras', por(d.situaciones, ['A2'])),
      ],
    },
    {
      id: 2, titulo: 'Trabajar en francés', nivel: 'B1 → B2',
      idea: 'El vocabulario del trabajo y del día a día, y las conversaciones que ya no son de supervivencia.',
      objetivos: [
        objetivo('Vocabulario de trabajo y día a día consolidado', pal(['work', 'general'])),
        objetivo('Situaciones B1 y B2 practicadas enteras', por(d.situaciones, ['B1', 'B2'])),
        objetivo('Gramática B1 leída y marcada', por(d.gramatica, ['B1'])),
      ],
    },
    {
      id: 3, titulo: 'DALF C1', nivel: 'B2 → C1',
      idea: 'Argumentar y matizar por escrito y en voz alta, con el formato del examen.',
      objetivos: [
        objetivo('Conectores y léxico de argumentación consolidados', pal(['academic'])),
        objetivo('Gramática B2 y C1 leída y marcada', por(d.gramatica, ['B2', 'C1'])),
        // Todavía no hay simulacros del DALF en la app. Se enseña el objetivo
        // igualmente —es parte del camino— pero marcado como tal, en vez de
        // esconderlo o de darlo por hecho.
        objetivo('Simulacros del DALF C1', { total: 0, hechas: 0, meta: 0 }, true),
      ],
    },
  ];

  let actualMarcada = false;
  for (const f of fases) {
    const medibles = f.objetivos.filter((o) => !o.pendienteApp);
    f.pct = medibles.length
      ? Math.round(medibles.reduce((a, o) => a + o.pct, 0) / medibles.length) : 0;
    const completa = medibles.length > 0 && medibles.every((o) => o.pct >= 100);
    if (completa) f.estado = 'hecha';
    else if (!actualMarcada) { f.estado = 'actual'; actualMarcada = true; }
    else f.estado = 'siguiente';
  }
  return fases;
}

module.exports = { fasesFrances, UMBRAL_PALABRAS };
