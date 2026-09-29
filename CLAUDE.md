# TutorIngles

App para aprender **inglés y francés** enfocada al día a día por sector (empieza por
**dependiente**, que es el trabajo de Edwin en Sprinter) y de ahí hacia el **C1** de cada idioma:
**Cambridge C1 Advanced** y **DALF C1**.

**Desde el 27-sep-2026 el francés va primero**: Edwin se va a trabajar a un cantón francófono de
Suiza en torno a un mes. Francés A2 (entiende mucho, no consigue explicarse), inglés B1. Ver
"Dos idiomas y modo Tetris" más abajo.

**En producción** desde el 20-jul-2026. Hasta el 29-sep-2026 vivió en un droplet
(`tutoringles.tinafusion.com`); el droplet ya no existe y ahora va en **Render + Neon, los dos
gratis** (ver "Despliegue").

## Stack

**No es Astro ni Next**: PWA en JavaScript sin framework, servida por Express.

- `index.html` + `src/js/`, `src/css/`, `src/img/`
- `server.js` — backend Express
- Dependencias: `express`, `pg`. Gestor: **npm**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | `node server.js` |
| `npm run migrate` | `tools/migrar.js`: aplica las migraciones que falten y carga el diccionario |
| `npm test` | `node --test` — tests nativos de Node (126, de los que 13 se saltan sin servidor) |
| `npm run test:fsrs` | tests del algoritmo de repetición espaciada |
| `node tools/generar-lexico.js` | regenera el diccionario de pronunciación |

No hay build. Para arrancar en local en Windows: `iniciar-local.cmd`.

**El service worker va por versión: al tocar cualquier JS hay que subir `VERSION` en `sw.js`**,
o los usuarios se quedan con la versión cacheada.

## Dos idiomas y modo Tetris (27-sep-2026)

### El francés no es otra app

Va en las **mismas tablas** con una columna `lang` (`words`, `tracks`, `grammar_topics`) y un
idioma activo en `config.idioma_activo`, que se cambia con el chip EN/FR de la cabecera. Así el
SRS, la sesión de 5 minutos, TRABAJO, PALABRAS, HABLAR y los avisos sirven para los dos sin
duplicar nada. El idioma vive en el servidor y no en el navegador porque el aviso diario sale
del servidor y tiene que saber de qué idioma hablar.

- **Toda consulta de contenido filtra por idioma.** `idiomaActivo()` / `idiomaDe(req)` en
  server.js (`?lang=` para forzar uno). Una consulta nueva sobre `words` sin `w.lang = …` mezcla
  los dos idiomas: en la sesión saldrían palabras inglesas con la voz francesa.
- **El sector va por idioma**: `sectorDe(lang)` da el del perfil si es de ese idioma y, si no, el
  primero que haya. El francés tiene el suyo, `suisse-romande` (12 situaciones). Las columnas
  `situations.title_en` y `situation_lines.en` se llaman así por herencia: guardan el texto **en
  el idioma del sector**.
- **La figurada es sólo del inglés** (`figurarSi(lang, …)`). Con una palabra francesa buscaría el
  AFI en el diccionario inglés y, si por casualidad existe ("table"), la enseñaría a leer en inglés.
- **El audio grabado (Emily) es sólo del inglés.** `voz.js` no consulta el índice si el idioma no
  es inglés: el índice se busca por texto y "table" francesa habría sonado con la grabación inglesa.
- **Voz y micrófono por idioma.** `vozDecir` lee en el idioma activo salvo que se le pida otro;
  lo que es siempre inglés (SONIDOS inglés, listening) lo pide explícitamente. La voz preferida se
  guarda una por idioma (`voz_preferida` y `voz_preferida_fr`). Para el francés se puntúa por
  encima fr-CH y fr-FR, y por debajo fr-CA: en iOS Amélie es de Quebec y no es el acento de Lausana.
- **SONIDOS en francés es otra cosa** (`src/js/sons.js`): nueve contrastes que un hispanohablante
  no oye (u/ou, s/z, b/v, le/les, nasales…), con ronda de oído. Material didáctico, sin migración.
- **El plan del francés va por fases, no por días** (`lib/fases.js`, `/plan/fases`): sobrevivir →
  trabajar → DALF C1, y se pasa de fase cuando los datos lo dicen. Una palabra cuenta cuando está
  **consolidada** (estabilidad FSRS ≥ 7 días), no por haberla acertado una vez. El plan de 30 días
  sigue siendo del inglés.
- **SIMULACROS cambia entero con el idioma**: en inglés, el Cambridge (su panel pide siempre
  `/exam-attempts?lang=en`); en francés, el panel del DALF (`renderExamDashboardFr`).

### Comprensión en francés y el Cambridge sin fecha (28-sep-2026)

- **Comprensión oral y escrita del francés en tres escalones, B1 → B2 → C1** (migración 32, en
  las mismas tablas que el Reading y el Listening del CAE, con `lang`). **Los B1 son la prueba
  inicial** de comprensión. Las preguntas van en francés, como en el DELF/DALF. Los guiones los lee
  la voz francesa del móvil (`speaker = 'fr-FR'`): no hay audio grabado del francés, porque el
  audio grabado se hacía en Higgsfield y esa cuenta ya no existe.
- **Sólo lo C1 es nota de examen**, en Reading y Listening igual que en ESCRIBIR: el cliente sólo
  manda `/exam-attempts` si `level === 'C1'`. Un 90 % en un texto de B1 no dice que leas en C1.
- **La fase 3 cuenta la comprensión**: aprobada (≥ 50 % en un C1) la oral y la escrita, por
  separado, como exige el DALF. Ya no queda ningún objetivo "aún no está en la app".
- **El Cambridge no tiene fecha.** Sigue siendo objetivo, pero la del 31-oct se quitó (migración
  31, sólo si seguía siendo ésa). Sin fecha no hay cuenta atrás en PROGRESO —antes se caía al
  1-dic "por defecto"— y en Ajustes la fecha se puede dejar vacía.

### Escribir, el oral y el nivel en francés (28-sep-2026)

- **Las notas van por idioma** (`exam_attempts.lang`, migración 29). `/stats` y `/exam-attempts`
  filtran por el idioma activo; un ensayo del DALF no entra en la media del Writing del CAE.
- **ESCRIBIR y el oral de HABLAR dan las tareas del idioma activo** (`writing_tasks.lang`,
  `speaking_tasks.lang`). En francés hay dos tipos (`nivel`): correos y cartas para el primer mes
  en Suiza (B1/B2) y la síntesis y el ensayo del DALF (C1); en el oral, hablar de ti (B1) y el
  exposé y el debate del DALF, cuyo `prompts.documents` es el dossier.
- **Sólo las tareas C1 cuentan como intento de examen.** Un 18/20 en un correo de B1 no dice que
  escribas en C1, y si contase, la cabecera se inventaría un nivel.
- **La rúbrica cambia con el idioma de la tarea**: los mismos cuatro números en las mismas
  columnas, pero con los criterios del DALF (`RUBRICA_FR` en writing.js). Es una autoevaluación
  simplificada —el DALF real puntúa sobre 25— y la pantalla lo dice.
- **El test de nivel del francés no es el del inglés** (`lib/test-frances.js`,
  `/diagnostico/fr`). El del inglés mide cuánto falta para aprobar un C1; éste UBICA: 24 preguntas
  de opciones en cuatro franjas (A2 → C1), y el nivel es la franja más alta superada con 4 de 6
  **sin saltarse ninguna**. Cada pregunta trae "No lo sé", y hay un test que simula 2.000 personas
  adivinando: casi nunca pasan de A2. **Las opciones se barajan en cada petición**: escritas a
  mano, la buena iba siempre la primera. Guarda en `config.nivel_medido_fr`, y la cabecera enseña
  ese nivel cuando no hay destrezas medidas (`stats.nivel_test`).

### El modo Tetris

Petición literal: "estudiar por el día y por la noche, durmiendo, repasar los conceptos", como el
efecto Tetris. Lo que se construyó y **lo que no se prometió**:

- **De día, rondas** de la sesión de 5 minutos (`tetris_rondas`, 6). Cada `/sesion-diaria/fin` es
  una ronda en `tetris_dias`. **Lo fallado hoy vuelve en la ronda siguiente** (hasta media ronda),
  no mañana: con una sesión al día daba igual, con seis era tirar cinco oportunidades.
- **Antes de dormir, repaso de almohada**: las palabras del día, del español al idioma (la
  dirección difícil: el hueco es producir), oyendo cada una con la voz del sistema — la misma que
  sonará de noche.
- **Dormido, pistas (TMR)**: la mitad de las palabras del día suenan bajito, sólo la palabra
  extranjera y **nunca la traducción** (oírla detrás anula el efecto en los estudios). Espera
  inicial (dormirse), un tramo de 90 min (el sueño profundo es la primera parte de la noche) y
  pausas. **Palabras nuevas durmiendo no funcionan y la app no lo intenta.**
- **Por la mañana, test a ciegas**: la otra mitad fue el grupo de **control**, y el test compara.
  `lib/tetris.js` dice el veredicto — también "no te funciona" y "te está despertando" — y no se
  pronuncia hasta 7 noches. El test cuenta como repaso FSRS.

Cuatro detalles que costaría redescubrir:

- **El día de estudio va de 05:00 a 05:00** (`diaDeEstudio`). Quien repasa a las 00:30 sigue en su
  día: la noche tiene que tirar de lo de esa tarde, no de un día nuevo vacío.
- **El sorteo es estratificado y se hace una vez por noche.** Por dificultad, de dos en dos, para
  que un grupo no se lleve todas las difíciles; y reabrir el modo noche devuelve el mismo reparto.
- **En una web, la noche necesita la pantalla encendida**: con el móvil bloqueado, iOS congela la
  página y no suena nada. Pantalla negra + Wake Lock (iOS 18.4+ en la app instalada; si no hay,
  se avisa). Las pistas **sólo cuentan si la página estaba visible al sonar**, y una noche con
  menos de 20 no entra en la comparación: contarla falsearía el dato que decide si esto sirve.
- **El test del despertar no recibe `con_pista`** (hay test de API): saber qué sonó cambia cómo
  se juzga uno mismo.

Avisos nuevos: `despertar` (08:00) y `almohada` (22:30), cada uno con su candado en `push_log`
(tipo distinto) y su `tag`, para que no se tapen entre ellos ni con el diario.

## Que la app se abra

**Medición a los 11 días del plan (2-ago-2026), que es la que manda sobre cualquier intuición:**
1 sesión de estudio, 11 palabras tocadas de 209, y **cero** situaciones, speaking, writing,
exámenes y pronunciación. No falta contenido —hay 12 situaciones, 148 frases, 104 preguntas, 71
pares mínimos—: falta llegar a él. Las tres causas encontradas y lo que se hizo:

- **El aviso estaba construido y apagado.** `push_activo = 0` y CERO filas en
  `push_subscriptions`: el planificador escribía en `push_log` cada noche y enviaba a nadie. Para
  activarlo había que pulsar un icono sin etiqueta de la cabecera, entrar en Ajustes, bajar y
  pulsar. Ahora se pide **en HOY** (`pintarAvisoHoy()` en `src/js/avisos.js`), lo primero de la
  pantalla, y la tarjeta se quita sola en cuanto hay suscripción. En iPhone sin instalar explica
  cómo se instala, porque ahí el permiso ni se puede pedir.
- **PRONUNCIACIÓN no estaba en la barra.** Se llegaba por un botón dentro de HABLAR, y por eso
  `pron_progress` tenía cero filas. Ahora es la pestaña **SONIDOS**, y **EXAMEN salió de la
  barra** (es en diciembre; el mostrador es mañana). Examen y Reglas se abren desde HOY.
- **HOY tenía dos botones primarios.** EMPEZAR competía con EMPEZAR REPASO, más cinco accesos
  rápidos que repetían la barra. Ahora hay **un solo `btn-primary` en toda la sección** —es una
  regla, no una casualidad— y los accesos son sólo los dos destinos sin pestaña.

Otra decisión de la misma medición: el contador de repaso decía **"209 pendientes"** con una meta
de 8, porque el SRS marca como vencida toda palabra no vista. Un número que sólo dice "vas fatal"
y que no corresponde a ningún trabajo real. Ahora dice **"8 para hoy · 209 en total"**.

A los diez días en producción había **0 sesiones de estudio, 0 situaciones practicadas y 3
palabras repasadas de 209**, con toda la app ya construida. El problema no era el contenido:
era que nada recordaba que la app existe y que al abrirla había que decidir por dónde empezar.

- **Aviso diario** — Web Push con VAPID. `lib/avisos.js` compone el texto (dice cuántas palabras
  y qué situación tocan, no un genérico) y el planificador de `server.js` mira cada minuto si es
  la hora. El candado contra duplicados es la clave única de `push_log (profile_id, fecha, tipo)`:
  sin él, un reinicio del contenedor dentro de la ventana horaria manda el aviso dos veces.
  **En iPhone solo funciona con la PWA instalada en la pantalla de inicio** (iOS 16.4+).
- **Sesión de 5 minutos** — `src/js/sesion.js`. Un botón en HOY que encadena palabras del SRS,
  una frase del sector y un par mínimo, y **acaba**. Mientras dura, el resto de HOY se oculta
  (`#sec-hoy.en-sesion`): cada elemento en pantalla es una decisión posible.
- La meta diaria bajó de 20 palabras a 8. La clave es `daily_vocab_target` (no crear otra).

**Las claves VAPID no van al repo.** Se buscan, por orden, en `VAPID_PUBLIC`/`VAPID_PRIVATE`,
en un `vapid.json` junto al servidor (gitignored; era el caso del droplet) y en la base
(`config.vapid_publica`/`vapid_privada`). Si no están en ningún sitio, `prepararVapid()` las
**genera una vez y las guarda en la base**: en Render el disco se borra en cada despliegue, y unas
claves nuevas en cada arranque invalidarían todas las suscripciones. Esas dos claves de `config`
están vetadas en `GET/PUT /config/:key` (`CONFIG_RESERVADA`): la privada firma los envíos.
Para regenerarlas a mano:
`node -e "console.log(JSON.stringify(require('web-push').generateVAPIDKeys()))"` — ojo, cambiarlas
invalida las suscripciones existentes.

## Pronunciación figurada

Cómo suena cada palabra, escrito con letras que un español ya sabe leer:
`receipt` → **ri-SIIT**. Mayúsculas = golpe de voz · `ii uu aa oo ëë` = vocal larga ·
`ə` = sonido neutro · `sh zh dj v ng r h` = sonidos que el español no tiene, en color.

**Tres reglas de notación que no se pueden romper** (las tres tienen test):

- **La `ə` nunca va en mayúscula**, ni dentro de una sílaba tónica. `'ə'.toUpperCase()` da `Ə`,
  que no parece una letra: `shirt` salía **SHƏƏT** e `Ə` afectaba al 10 % del diccionario, justo
  en la sílaba que hay que leer con fuerza. La regla está **duplicada a propósito** en
  `enMayusculas()` (lib/respelling.js) y `pronMayus()` (src/js/pron.js), porque el pintado no usa
  el `texto` que manda el servidor: recompone token a token para poder colorear cada sonido. Si
  se arregla solo el servidor, el navegador vuelve a pintar `Ə`.
- **`/ɜː/` se escribe `ëë`, no `əə`** (work → UËËK). Es tónica casi siempre, así que era el
  principal generador de `Ə`.
- **`/h/` se escribe `h` marcada, no `j`** (have → HÆV). Con `j`, todo el mundo la raspaba como
  la jota de "jamón", que es el error que la guía pide evitar. Excepción: detrás de `s` o `z`
  vuelve a ser `j`, porque `sh`/`zh` son otros sonidos en este sistema.

**La leyenda va donde se vea figurada, sin excepción.** Faltaba en la sesión de 5 min y en WORK
—que son los dos sitios donde más se usa la app— y era exactamente el problema: símbolos sin
nada que los explicase. `pronLeyenda()` se abre sola las primeras 8 veces (`pron_ley_vistas` en
localStorage) y después se pliega.

Tres piezas, todas con tests:

- `lib/respelling.js` — AFI → figurada. Silabifica, coloca la tónica y detecta letras mudas.
- `lib/ipa-uk.js` — pasa AFI americano a británico (r que no suena, grupo BATH, /ɒ/…).
- `lib/pronunciacion.js` — texto → figurada en frase, con **formas débiles**: en frase,
  `a` es /ə/ y no /eɪ/. Sin esto el ritmo sale de español.

**La figurada no se guarda en la base**: se calcula al vuelo, para poder afinar el motor sin
reimportar nada. Lo que sí está en la base es el AFI (tabla `lexicon`, 147.488 palabras).

Material didáctico, separado del motor y sin migración (es texto, no datos de usuario):

- `lib/intro-pronunciacion.js` — recorrido de 9 pasos que enseña a leer la figurada. Se abre
  solo la primera vez que se entra en PRONUNCIACIÓN; la marca de vista va en
  `config.pron_intro_vista`, no en localStorage, para que no reaparezca al cambiar de móvil.
  **Borrar esa clave vuelve a lanzarla.**
- `lib/guia-sonidos.js` — guía de consulta de los 16 sonidos y las 3 marcas.

Los dos están ordenados por rentabilidad, no por alfabeto: primero lo que cambia una frase
entera (golpe de voz, palabras reducidas), después los sonidos sueltos.

El diccionario se regenera con `node tools/generar-lexico.js` → `data/lexicon.tsv`
(no va al repo). Combina dos fuentes porque **ninguna basta sola**: el británico de ipa-dict no
trae las palabras más frecuentes (`put`, `get`, `public` faltan) y cubre el 90,2 %; con el
americano convertido sube al 99,8 %.

Correcciones a mano: tabla `pron_overrides` (mandan sobre el diccionario) y columnas
`pron_pairs.ipa_a/ipa_b` cuando una palabra tiene dos pronunciaciones (`live` = /lɪv/ o /laɪv/).

**Aviso de honestidad:** esto es la ENTRADA (saber cómo suena). La corrección de cómo hablas tú
sigue pendiente de la clave de Azure. Lo único medible hoy es el oído, con los pares mínimos.

## Audio

**Todo el audio pasa por `src/js/voz.js`.** Antes la lógica estaba copiada en pron.js, speak.js,
work.js y listening.js, y las cuatro copias tenían el mismo fallo: llamaban a `getVoices()` y
usaban lo que devolviera. **La primera llamada devuelve un array VACÍO** en Chrome, Android e
iOS —la lista llega aparte, con el evento `voiceschanged`—, así que la primera vez que se pulsaba
ESCUCHAR no se asignaba voz y el móvil locutaba el inglés **con la voz española**. De ahí venía
buena parte de "suena a IA".

- `vozDecir(texto, {rate, veces, btn, lang})` — voz del sistema. `rate` 0,9 por defecto: por
  debajo de 0,85 los sintetizadores de móvil estiran los fonemas y suenan peor, no mejor.
- `vozFrase(id, texto, opts)` — audio grabado si existe, voz del sistema si no.
- `vozParar()` — corta las dos cosas.
- La voz se **puntúa**, no se coge la primera en-GB: en el mismo aparato conviven voces
  neuronales y voces "compact" de hace quince años, y la lista no viene ordenada por calidad.
- **Y se puede cambiar a mano** desde Ajustes › VOZ DEL MÓVIL (`vozElegir()` guarda el `voiceURI`
  en `localStorage.voz_preferida`, y manda sobre la puntuación). La heurística acierta o falla
  según el móvil y no hay forma de oírla desde aquí, así que la última palabra la tiene quien
  escucha. Ajustes muestra además **qué voz está usando**, que es el primer dato que hace falta
  cuando alguien dice "suena raro".
- Chrome corta la síntesis a los ~15 s. En textos de más de 120 caracteres (los guiones de
  listening) va un `pause()`+`resume()` periódico que lo evita — **pero nunca en iOS**
  (`vozEsIOS()`). WebKit no tiene el fallo de los 15 s, y ahí ese mismo apaño deja la voz
  apagada y entrecortada: el guion de listening se oía "susurrado" en el iPhone y normal en el PC.
- **El `<audio>` se suelta al terminar** (`removeAttribute('src')` + `load()`), no sólo se pausa.
  Si se deja vivo, iOS mantiene abierta la sesión de audio de *media* y **atenúa la voz del
  sistema en todo lo que venga después**: bastaba con oír una frase en TRABAJO para que las
  palabras de VOCABULARIO sonaran apagadas hasta recargar la app.

**Ojo con los nombres globales.** Los scripts son clásicos y comparten ámbito: dos `const` con el
mismo nombre en dos ficheros **revientan el segundo entero** con "has already been declared", y
el síntoma no apunta al culpable (declarar `esIOS` en voz.js habría tumbado avisos.js, o sea la
tarjeta que activa los avisos). Por eso aquí es `vozEsIOS`. Para comprobarlo de golpe, recorrer
los `<script>` de index.html en orden y buscar identificadores repetidos: hoy son 236 y ninguno
choca.

### Los pares mínimos SÍ se graban, pero par por par (12-ago-2026)

**Durante trece días el entrenador de oído sonó con la voz del móvil, y en un aparato
configurado en español la b y la v son literalmente el mismo sonido.** El marcador de b/v se
quedó en **5 aciertos y 7 fallos — 42 %, por debajo de tirar una moneda**: con dos opciones,
acertar menos de la mitad significa que no había nada que oír.

**El error de método que lo causó.** La primera vez se midió la DURACIÓN de `ban`/`van` (+24 %)
y se dio por hecho que Emily contrastaba b y v. La duración no distingue b de v: las separa el
modo de articulación —la b cierra los labios y explota, la v los deja abiertos y roza los
dientes—. Ese +24 % no probaba nada sobre b/v. Medida con el criterio correcto (reparto de
energía por bandas), **Emily separa b y v entre 3,6 y 36,7 dB**: los distingue perfectamente.

Ahora cada par se mide con **el criterio que corresponde a su rasgo** (`tools/cortar-pares.js`)
y el resultado se guarda **por par** en `pron_pairs.audio_ok`:

| Contraste | Con audio | Qué se midió |
|---|---|---|
| b/v · s/z · th · dj/y · e-fantasma · h | 6/6, 6/6, 6/6, 4/4, 8/8, 6/6 | separación por bandas |
| æ/e · sh/ch · r/l | 5/6, 5/6, 4/5 | separación por bandas |
| n/ŋ | 3/5 | separación por bandas |
| **i corta/larga · u corta/larga** | **1/8 y 0/5** | duración |

**Seed Audio no alarga la vocal larga, y es sistemático:** `full`/`fool` sale ×0,50 y
`pull`/`pool` ×0,39 — la larga dura la MITAD que la corta. Esos 12 pares se quedan sin audio y
siguen con la voz del móvil, avisado en pantalla. No es un fallo del corte: es que el modelo no
tiene ese contraste.

El rechazo es **por par y no por palabra**: `sheep` no contrasta con `ship` pero sí con `cheap`,
así que su audio se conserva y lo que se apaga es el par malo. Y hay tope superior además de
mínimo (1,15–2,5): un ×2,9 no es un contraste buenísimo, es un corte mal asignado.

`pronDecirSinGrabar()` sigue existiendo, pero ya no manda sobre todo el entrenador: quien decide
es `audio_ok` de cada par.

**Trampa del cortado:** las palabras muy cortas y monosilábicas (`and`, `bad`, `bed`, `man`…) el
modelo las dice pegadas y `silencedetect` no encuentra las pausas — satura en 4 silencios para 6
palabras y no hay umbral que lo arregle. Ahí la solución no es bajar el umbral sino **generar
cada palabra por separado**: sin corte no hay forma de asignar el audio equivocado, que es el
único error que no se puede permitir. 36 de las 132 se generaron así.

**Toda la app suena con la misma voz (Emily): 148 frases + 248 palabras.** Las palabras se
buscan **por texto, no por id** (`porTexto` en `index.json`, y `audioDePalabra()` en voz.js).
Eso es lo que permite que VOCABULARIO, SONIDOS y la sesión usen la voz grabada **sin tocar una
línea de esas pantallas**: todas llaman a `pronDecir("receipt")` y ninguna conoce el id de la
tabla `words`. La clave de búsqueda se calcula igual en `tools/cortar-audio.js` y en
`src/js/voz.js` —minúsculas, sin acentos ni puntuación—; si se cambia una hay que cambiar la otra.

Las palabras se preparan con `tools/preparar-palabras.js` y **hay que generarlas separadas por
línea en blanco y con `speech_rate: -3`**. Con un simple ". " el modelo lee la lista de corrido
—12 palabras en 6,5 s con cuatro pausas— y no hay manera de cortarla; con línea en blanco son
16,8 s y una pausa limpia por palabra. Un bloque que aun así no cuadre se regenera con `-4` y
tres saltos.

**Audio grabado.** El pipeline produce `src/audio/frase-<id>.mp3`, donde `<id>` es
`situation_lines.id`, y `src/audio/word-<id>.mp3` con `words.id`:

1. `node tools/preparar-audio.js frases.txt` → `data/audio/bloques.txt` + `mapa.json` (28 bloques)
2. Generar cada bloque **en higgsfield.ai con Seed Audio, nunca por MCP** (ver la regla de costes)
3. `show_generations` del MCP (listar no gasta créditos) → guardar en `data/audio/generaciones.json`
4. `node tools/cortar-audio.js` — descarga, corta por silencios y escribe `src/audio/index.json`

**Seed Audio NO está en los modelos ilimitados** (comprobado el 2-ago-2026: los 6 activos son
todos de imagen). Generar audio cuesta créditos **aunque sea por la web**, así que aquí la regla
de generar-solo-en-la-web no ahorra nada y **se puede usar el MCP** (`generate_audio`), que
además da control de `speech_rate` y permite lanzar varias en paralelo. Es la excepción: para
imagen y vídeo la regla sigue en pie, porque ahí sí hay modelos ilimitados.

El precio escala con la longitud: ~1,5-1,6 por bloque de ~215-233 caracteres, ~2,2 por uno de
317. El total de este trabajo fueron **87,7 créditos** (2.349 → 2.261), regeneraciones incluidas.
`get_cost: true` da el precio sin generar nada — usarlo antes de tandas grandes.

La voz es el preset **Emily** (`6b3e3642-f7b7-4cb8-9688-51e233c4b92f`, voice_type `preset`).
Mantenerla si hay que regenerar, o el audio sonará a dos personas distintas.

**`src/audio/index.json` es el que manda**: la app lo lee una vez y así sabe qué frases tienen
voz real sin pedir un mp3 por frase y comerse un 404 por cada una. Lo regenera `cortar-audio.js`
leyendo el directorio, así que describe lo que hay en disco de verdad. Los mp3 y el índice van al
repo (solo `data/` está gitignored), o sea que se despliegan con el `git pull` de siempre.

### Por qué cortar por silencios es difícil (y las tres cosas que hay que saber)

1. **El umbral no puede ser fijo.** La primera versión usaba 1 s, medido sobre una generación de
   tres frases. Con seis, el modelo acelera y las pausas bajan a 0,26-0,79 s: no detectaba
   ninguna. Ahora se **busca** el umbral en dos ejes (duración 0,45→0,08 s y ruido -28→-45 dB),
   porque para algunos bloques no existe ninguna duración que funcione con un ruido fijo.
2. **Pausa ≠ frase.** El modelo hace la misma pausa en cada punto, y muchas frases de la base
   tienen dos oraciones ("No worries at all. Take your time." es UNA frase). Se cuentan las
   oraciones de cada frase y se agrupan los trozos en ese reparto. También hace pausa en comas y
   guiones largos, así que si salen trozos de más se fusionan los separados por el hueco más
   corto, que son justo esos.
3. **Hay que verificar el reparto, no fiarse.** Se comprueba la velocidad de habla resultante de
   cada frase: entre 8 y 42 letras/s. Los cortes buenos caen todos en 10-27; uno mal asignado
   delata enseguida con 103 letras/s (le ha caído el audio de una frase más corta) o con 4. Un
   audio mal asignado enseña a decir mal una frase, que es peor que no tener audio, así que el
   bloque que no pasa se deja fuera entero.
4. **Los mp3 salen a 44,1 kHz aunque la fuente sea de 24 kHz**, y no es un descuido. Un MP3 por
   debajo de 32 kHz no es MPEG-1 sino **MPEG-2 Layer III**, que iOS decodifica mal: en el PC
   sonaba perfecto y en el iPhone se oía metálico y rayado. Resamplear no añade calidad —añade
   compatibilidad—, y el fichero pasa de 2,7 a 4,3 MB en total. Barato. Va con `-ar 44100
   -b:a 96k` y un fundido de 10 ms a cada lado por si algún corte cae pegado a la voz.
5. **Cada frase se sube a -16 LUFS.** Seed Audio entrega entre -21 y -24, y en el móvil eso se
   oye como si te hablaran al oído: el aviso fue literal, *"suena como si me estuviera
   susurrando"*. Se mide el loudness de cada trozo y se aplica **una ganancia fija** (`volume`),
   no el modo dinámico de `loudnorm`: la ganancia constante sube el nivel sin achatar la
   entonación, y en frases de dos segundos la diferencia se nota. El `alimiter` sólo está de red.
   Con esto las 148 quedan entre -16,7 y -15,3 LUFS y ninguna satura.

**Cómo comprobar que el audio está bien antes de darlo por bueno** — los tres números que
importan, y ninguno se ve escuchando en el PC:
`ffmpeg -i frase-N.mp3 -af loudnorm=print_format=json -f null -` → `input_i` cerca de -16,
`input_tp` por debajo de 0, y `ffprobe` diciendo `sample_rate=44100`.

### Cómo arreglar un bloque que no cuadra

El control de velocidad rechazó 13 de los 28 bloques a la primera. Lo que funcionó, por orden —
cada escalón recupera unos cuantos y hay que ir subiendo sólo con los que sigan fallando:

| Medida | Bloques recuperados |
|---|---|
| `speech_rate: -1` | 8 de 13 |
| `speech_rate: -2` | 3 de los 5 restantes |
| `speech_rate: -3` | 1 de los 2 restantes |
| partir el bloque en dos mitades de 3 frases | el último |

**`speech_rate` tiene que ser entero** (con -0.3 el backend devuelve 422). Y no cambia apenas la
duración total —el bloque de saludos duró 12,68 s con -1 frente a 12,69 s con 0— pero **sí
reparte las pausas de otra forma**, que es lo que necesita el cortador. No sirve para hablar más
despacio; sirve para que las pausas se detecten.

El que no se arregló con nada fue el más largo (308 caracteres, 11 oraciones). Ahí la solución es
partirlo: en `mapa.json` se sustituye el bloque por dos con la mitad de frases cada uno y se
generan por separado. **Seis frases por bloque es el techo cómodo; con más de 8 oraciones el
modelo empieza a comerse pausas.**

**Estado a 2-ago-2026: las 148 frases tienen audio real** (3,1 MB en `src/audio/`), verificadas
una a una: ritmo entre 7,8 y 26,5 letras/s, sin duplicados y con `index.json` cuadrando.

## Las cinco secciones que llevaban a cero (12-ago-2026)

Situaciones, speaking, writing, exámenes y gramática seguían **sin una sola fila de progreso**
con todo el contenido construido desde julio. **No era falta de navegación**: TRABAJO y HABLAR
están en la barra, a un toque. Eran tres cosas, y la primera es la que más enseña:

- **La app marcaba el speaking como hecho sin que se hablara.** En `/sesion-diaria/fin` estaba
  `speaking_done = frase_hecha`: *ver* una frase del sector —leerla, sin micrófono— dejaba la meta
  de HABLAR en "Completado ✓" y la barra del día al 66 %. Los cuatro días de uso tenían
  `speaking_done = true` con `speaking_practice` **vacía**. La app llevaba tres semanas diciendo
  que ya habías hablado. **Ahora sólo lo marca el micrófono**, y la prueba es la presencia de
  `score` en `/situations/:id/practice`, que viene del reconocimiento de voz.
- **Writing y las 5 tareas del oral vivían dentro de SIMULACROS.** `exam.js` era lo ÚNICO que
  llamaba a `loadWritingTasks()` y `loadSpeakingTasks()`, y esa pantalla salió de la barra el
  2-ago. Quitarla se llevó por delante dos secciones que no tienen nada que ver con hacer un
  simulacro, sin que nada lo delatara. Writing tiene ahora **sección propia (ESCRIBIR)** y el oral
  está en **HABLAR**. Lección: al mover una pantalla de sitio, mirar qué se cargaba **desde
  dentro** de ella.
- **Cada situación pedía 12-13 frases con micrófono y sólo contaba entera.** Al lado de una sesión
  de 5 minutos que daba la misma marca sin sacar el móvil del bolsillo, entrar era triplicar el
  esfuerzo por el mismo resultado. Ahora van **por tandas de 4** (`config.situation_batch`) y se
  retoman por donde se dejaron (`situation_progress.lines_done`).

**Y el plan de 30 días existía sin que nada lo mirase.** El currículo asigna situación y gramática
a cada jornada, y la sesión servía la primera situación sin terminar. Ahora `/sesion-diaria` coge
la del día del plan y sólo cae a "la primera sin terminar" si ese día no tiene ninguna asignada.

**Regla que sale de todo esto:** una meta que se marca sola no es una meta, es un permiso para no
hacerla. Antes de dar por bueno cualquier ✓ automático, mirar qué tabla debería tener una fila
nueva — si no la tiene, el ✓ está mintiendo.

## La hora es la del usuario, no la del servidor

El contenedor corre en **UTC y sin variable TZ**. Mientras la app usó `getHours()` y
`toISOString()`, vivió dos horas por detrás de quien la usa, y salía por dos sitios:

- **Los avisos llegaban a las 22:30.** Con `push_hora = 20:30` el planificador comparaba contra
  Greenwich. Verificado en las 13 filas de `push_log`: todas a las 22:30 de España. En una app
  cuya única métrica es que se abra, el recordatorio de "cinco minutos de inglés" llegaba cuando
  ya estás en la cama.
- **El día cambiaba a las 2 de la madrugada.** Estudiar a la 01:00 se apuntaba al día anterior:
  rompía la racha sin motivo.

Se arregla en **`lib/fechas.js`** (`fechaEnZona`, `minutosEnZona`, `ayerEnZona`) y no con
`TZ=Europe/Madrid` en el contenedor: se levantó con `docker run` sin compose, así que recrearlo
para añadir una variable tiene más riesgo que arreglarlo en código. `todayStr()` sale de ahí y
**los `CURRENT_DATE` de las consultas se sustituyeron por esa fecha** — si no, la app y Postgres
discrepan sobre qué día es entre las 00:00 y las 02:00.

## El aviso ya no se pierde si falla el envío

El candado de `push_log` se ponía **antes** de enviar. Si el envío fallaba, el `catch` lo
registraba pero la fila ya bloqueaba el reintento: ese día se quedaba sin aviso. Ahora se
consulta antes y **se escribe después de que el envío salga**, con un flag en memoria
(`_avisoEnCurso`) para que un envío lento no se solape con el tic siguiente.

Y el motivo se guarda en `titulo` cuando no se envía: antes, "ya había estudiado" y "el envío
falló" dejaban la misma fila vacía con `enviados=0` y no había forma de distinguirlas.

## Cámara lenta

A la **segunda** pulsación de escuchar, la palabra se repite más despacio (`pronOir` en pron.js;
el contador se reinicia en cada pregunta). Tres cosas que no son obvias:

- **Los dos motores van al revés.** En el mp3 el navegador hace time-stretch y aguanta bien:
  `VOZ_LENTO_MP3 = 0.7`. En la voz del sistema el `rate` re-sintetiza y por debajo de 0,85 suena
  a robot, así que ahí lento es `0.85` y poco más.
- **`preservesPitch` se queda en `true` SIEMPRE.** Bajar el tono desplaza las formantes, y las
  formantes son lo que define qué vocal oyes: una /ɪ/ ralentizada "a lo cinta" puede percibirse
  como otra vocal. En una app de fonética eso enseña el sonido equivocado con mucho aplomo.
- **No sirve para todo, y por eso existe `pron_contrasts.lento_ok`.** Ralentizar alarga lo
  estacionario (las vocales) y **emborrona los transitorios**. Medido sobre el audio del propio
  proyecto con `atempo=0.7`: la duración total sube un 40 % en los cuatro casos, pero el ataque
  no acompaña —en `avoid` la rampa de entrada de la /v/ pasa de 23,9 ms a **0**—, o sea que la v
  ralentizada entra MÁS de golpe y se parece más a una b. Apagada en `b-v`, `sh-ch` y `dj-y`
  (las dos últimas llevan africada). Donde sí rinde: vocales largas/cortas y los guiones de
  listening, que es donde el problema es la velocidad y no un fonema.

**No se implementa subiendo `veces`.** Hasta el 12-ago `vozDecir` sólo buscaba el audio grabado
si `veces === 1`, así que pedir una repetición devolvía la voz del móvil a mitad de ejercicio.
Ya está arreglado, pero la forma correcta sigue siendo una llamada nueva con `lento`.

## Qué se entrena de oído y qué sólo con la boca

`pron_contrasts.modo`. Dos de los doce contrastes no pueden funcionar como ejercicio de
percepción y ofrecían una ronda de oído sin respuesta posible:

- **La e fantasma.** El error es que TÚ añadas una e delante ("escuul" por school). El par
  `school`/`cool` sólo entrena a oír si hay una /s/, que no es el problema.
- **La r inglesa.** Los pares eran `right`/`light`, `red`/`led`: eso es R contra L, la dificultad
  del japonés. Un español no confunde *right* con *light* — confunde la r inglesa con la rr
  española, y esas dos no forman par mínimo porque la rr no existe en inglés.

Los dos abren directamente en modo DECIRLO, con una nota que explica por qué.

**Y la h se escribe `h`, no `j`.** El contraste `h-suave` explicaba que la jota es el error y
acto seguido enseñaba la figurada como `j`. La regla está en `lib/respelling.js` con test desde
el 30-jul; la tabla venía de la migración 16 y se quedó con el criterio viejo.

## Base de datos

Postgres en **Neon** (gratis). Esquema por **migraciones acumulativas idempotentes**, en este
orden, que aplica solo `tools/migrar.js` en cada arranque (lleva la cuenta en la tabla
`migraciones`):

`migration.sql` (base) → `_02` backfill de user_words → `_03` gramática y vocabulario →
`_04` motor (exam_questions + currículo de 30 días) → `_05` banco de 120 palabras →
`_06` banco de 48 preguntas → `_07` sectores → `_08` contenido de tienda → `_09` plan retail →
`_10` FSRS → `_11` reading → `_12` iconos → `_13` writing y speaking → `_14` listening →
`_15` iconos por sector → `_16` pronunciación → `_17` AFI por par mínimo → `_18` avisos y sesión →
`_19` correcciones de los pares (la h, r/l, e-fantasma, AFI y orden) → `_20` qué pares tienen
audio fiable → `_21` situaciones por tandas → `_22`/`_23` test de nivel → `_24` idiomas y modo
Tetris → `_25` vocabulario de francés (217, **el orden de las filas es el orden de estudio**) →
`_26` situaciones de la Suiza romanda → `_27` gramática de francés → `_28` más inglés C1 (116) →
`_29` idioma y nivel en escribir, el oral y las notas → `_30` tareas de escribir y del oral en francés →
`_31` comprensión por idioma y Cambridge sin fecha → `_32` comprensión oral y escrita en francés.

**Una migración nueva se llama `migration_NN_algo.sql`** (NN = siguiente número) y trae su
propio `BEGIN`/`COMMIT`. `migrar.js` las ordena por ese número; si una falla, hace rollback,
sale con error y **la app no arranca** — mejor eso que arrancar con el esquema a medias.

**Los `GRANT … TO "tutoringles"`** son del droplet, donde las tablas eran de `postgres` y la app
entraba con otro usuario. En Neon la app entra con el dueño de la base y no hacen falta, pero un
GRANT a un rol que no existe tumba la migración entera: `migrar.js` crea ese rol sin login y, si
no tiene permiso para ello, quita esas líneas antes de aplicar.

**La `_20` la GENERA `tools/cortar-pares.js`, no se escribe a mano**: sus `audio_ok` salen de
medir los ficheros, así que hay que rehacerla cada vez que se regenere el audio.

**El diccionario no va dentro del SQL.** `tools/generar-lexico.js` lo genera en el build de
Render y `migrar.js` lo carga en `lexicon` la primera vez que la encuentra vacía (~147.000 filas,
por tandas de 5.000). En local, igual: `npm run lexico && npm run migrate`.

## Despliegue

**Render (web, gratis) + Neon (Postgres, gratis)** desde el 29-sep-2026. Todo está en
`render.yaml`: Render → New → Blueprint → este repo, y pide `DATABASE_URL` (la de Neon) y
`APP_TOKEN`. **Cada push a `main` despliega solo** (`autoDeploy`).

- **Build:** `npm install` + `generar-lexico.js`. **Arranque:** `migrar.js` y luego `server.js`.
- **Render gratis duerme la app a los 15 minutos sin tráfico**, y dormida no corre el
  planificador: no saldrían los avisos, que es lo que hace que la app se abra. Por eso existe
  `.github/workflows/despierta.yml`, que llama a `/ping` cada 10 minutos (gratis: el repo es
  público). Se activa con la variable del repo `TUTOR_URL`. GitHub apaga los cron de un repo sin
  commits en 60 días: si los avisos dejan de llegar, mirar primero ahí.
- **`/ping` no toca la base, y `/health` sí.** Si el keep-alive consultara Neon cada 10 minutos,
  Neon no se dormiría nunca y se gastarían sus horas de cómputo gratuitas. Por lo mismo el
  planificador guarda la configuración de avisos una hora en memoria (`configAvisos()`), en vez
  de leerla de la base cada minuto; cambiarla por la API invalida esa copia.
- **El disco de Render se borra en cada despliegue.** Nada que haya que conservar puede vivir en
  un fichero: por eso las claves VAPID van a la base.
- El primer arranque tras un rato dormido tarda ~1 minuto (Render) + ~1 s (Neon despertando).

`deploy.sh` es del droplet y ya no sirve.

## Límite real del servidor

Render gratis da 512 MB de RAM y 0,1 CPU. **No proponer self-hostear modelos** (ya se descartó
wav2vec2 en el droplet por falta de RAM, y aquí hay menos). Para pronunciación se usa Azure en
capa gratuita F0.
