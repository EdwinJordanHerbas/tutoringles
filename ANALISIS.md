# TutorInglés — Análisis de estado y trabajo pendiente

> Documento de briefing. Fecha del análisis: **27 de julio de 2026**.
> Escrito para que un agente pueda ejecutar el trabajo restante sin contexto previo.

---

## ⚑ Actualización — 27 de julio de 2026, misma jornada

Casi todo lo que este documento señalaba **ya está hecho y desplegado**. Se deja
el diagnóstico original íntegro más abajo porque explica el porqué de cada
decisión, pero el estado real es este:

| § | Problema | Estado |
|---|---|---|
| 2.1 | La pronunciación no se mide | **Pendiente** — bloqueado por la clave de Azure |
| 2.2 | Datos del examen incorrectos | Corregido |
| 2.3 | Límite del Writing mal (240-280 → 220-260) | Corregido |
| 2.4 | Icono de la PWA de un diseño abandonado | Rehecho, con manifest nuevo |
| 2.5 | Niveles por destreza inventados | Corregido: se calculan o salen en blanco |
| 2.6 | Nivel estimado derivado del XP | Corregido: sale de las destrezas medidas |
| 2.7 | El plan de 30 días ignoraba el carril diario | Integrado (migración 09) |
| 2.8 | Emojis como sistema de iconos | 75 sustituidos por un set propio |
| A | Pronunciación real | **Pendiente** (ver §2.1) |
| B | Completar el C1 | Hecho: Reading, Listening, Writing y Speaking |
| C | Diseño visual | Hecho: 24 iconos + icono de app |
| D | Audio nativo de las 148 frases | **Pendiente** |
| E | FSRS, tests, deuda | FSRS y tests hechos |

**Bugs encontrados y arreglados que no estaban en el diagnóstico inicial:**

- La pantalla de acceso **aceptaba cualquier clave**: `/auth/check` devolvía
  `ok:true` sin validar nada, así que `unlock()` guardaba lo que fuese y solo
  fallaba después, al pedir datos. Ahora valida en tiempo constante.
- La migración 07 habría **roto tres endpoints** al cambiar los índices únicos
  a compuestos (`ON CONFLICT (date)` deja de existir). Uno de ellos era el que
  guarda las metas del día.
- Las tablas nuevas daban `permission denied`: creadas como `postgres`, usadas
  como `tutoringles`. Resuelto con `GRANT` y `ALTER DEFAULT PRIVILEGES`.

**Lo que queda, en orden:**

1. **Pronunciación** (§A). Necesita que el usuario cree la cuenta de Azure
   Speech capa F0 (gratuita, 5 h de audio al mes) y facilite la clave.
   Ningún agente puede hacerlo: el registro pide tarjeta.
2. **Audio grabado** (§D). El Listening se locuta hoy con la voz del navegador
   y se avisa en pantalla. Las 148 frases de retail, igual.
3. Minimal pairs y shadowing (dependen del punto 1).
4. Más sectores además de retail.

---

## 0. Contexto imprescindible

| Dato | Valor |
|---|---|
| Repo local | `C:\Users\ejord\tutoringles` (rama `main`) |
| Producción | https://tutoringles.tinafusion.com |
| Servidor | Droplet DigitalOcean, alias SSH ya configurado: `ssh droplet` |
| Ruta en servidor | `/opt/tutoringles` (montado dentro del contenedor en `/app`) |
| Backend | Contenedor Docker `tutoringles` (node:20-alpine), `127.0.0.1:3401` |
| Base de datos | Contenedor `postgres` (postgres:16), base `tutoringles` |
| Recursos | 1 vCPU / 2 GB RAM, **~1 GB libre** — no cabe nada pesado |

**Desplegar:**
```bash
scp <archivos> droplet:/opt/tutoringles/...
ssh droplet 'docker restart tutoringles'
```

**Aplicar una migración:**
```bash
ssh droplet 'docker exec -i postgres psql -U postgres -d tutoringles -v ON_ERROR_STOP=1 < /opt/tutoringles/migration_XX.sql'
```

**Backup antes de tocar la base (obligatorio):**
```bash
ssh droplet 'docker exec postgres pg_dump -U postgres tutoringles > /root/tutoringles_backup_$(date +%Y%m%d_%H%M%S).sql'
```

### Trampas conocidas del entorno

1. **Permisos de Postgres.** Las tablas se crean como `postgres` pero la app se conecta como `tutoringles`. Toda tabla nueva necesita:
   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "tutoringles";
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "tutoringles";
   ```
   Ya están puestos los `ALTER DEFAULT PRIVILEGES`, así que las tablas futuras heredan permisos. Si aparece `permission denied for table X`, es esto.

2. **`profile_id` en todo.** La migración 07 pasó el progreso a colgar de `profile_id` y cambió los índices únicos. Cualquier `ON CONFLICT` nuevo debe nombrar las dos columnas: `ON CONFLICT (profile_id, date)`, nunca `ON CONFLICT (date)`.

3. **Reglas de Higgsfield.** Se genera **siempre en higgsfield.ai (web)**, nunca por MCP: los modelos ilimitados solo son gratis en la web, por MCP cobra créditos igualmente. Herramienta de apoyo: `C:\Users\ejord\higgsfield\higgsfield.cmd`.

---

## 1. Qué funciona hoy

| Módulo | Estado | Detalle |
|---|---|---|
| Infraestructura | **Completo** | Desplegado, HTTPS con Certbot, UFW cerrado salvo 22/80/443 |
| Auth | **Funcional** | Clave única `APP_TOKEN`. Suficiente para un usuario |
| Vocabulario + SRS | **Funcional** | 209 palabras, flashcards, SM-2 |
| Carril diario (retail) | **Completo** | 12 situaciones, 76 frases clave, 72 turnos de role-play, 55 palabras |
| Gramática | **Funcional** | 8 temas con contenido HTML real |
| Use of English | **Funcional** | 48 preguntas, 4 partes, corrección automática |
| Plan de 30 días | **Funcional** | 30 días con foco, meta de vocabulario y tarea de speaking |
| Progreso / XP | **Funcional con mentiras** | Ver §2.5 y §2.6 |
| Speaking | **Falso** | Ver §2.1 |
| PWA / offline | **Funcional** | Service worker v3, precache |

Contenido real en base de datos (verificado en producción):

```
words total       209      exam questions      48
words retail       55      curriculum dias     30
grammar topics      8      situations          12
grammar con HTML    8      situation lines    148
```

---

## 2. Errores confirmados

Ordenados por gravedad. Todos verificados leyendo el código y contrastados con
la fuente oficial (cambridgeenglish.org) donde aplica.

### 2.1 La puntuación de pronunciación no mide pronunciación
**Archivos:** `src/js/speak.js:~100` (`scoreSpeech`), `src/js/work.js:~60` (`wkCompare`)

Ambas comparan el **texto transcrito** con el texto esperado. El reconocedor de voz
autocorrige hacia lo que espera oír, así que se puede sacar 100 % con un acento pésimo.
Es el fallo central: la app se vende como herramienta de pronunciación y no la mide.

En `work.js` está etiquetado honestamente como «reconocimiento». En `speak.js` no:
ahí pone «Precisión», lo cual induce a error.

**Arreglo:** Azure Speech capa **F0** (gratuita permanente, 5 h de audio/mes,
Pronunciation Assessment incluido). Da precisión, fluidez y prosodia por fonema.
Falta que el usuario cree la cuenta y facilite la clave.

### 2.2 Datos del examen incorrectos
**Archivo:** `src/js/exam.js:10-13`

```js
{ id: 'reading', desc: '4 parts · 36 questions · 75 min' }   // ← MAL
```

El formato oficial del C1 Advanced es:

| Paper | Partes | Preguntas | Tiempo |
|---|---|---|---|
| Reading **and** Use of English | 8 | 56 | 90 min |
| — de las cuales Use of English | 1–4 | 30 | — |
| — de las cuales Reading | 5–8 | 26 | — |
| Writing | 2 | — | 90 min |
| Listening | 4 | 30 | ~40 min |
| Speaking | 4 | — | 15 min |

Reading y Use of English son **un solo paper**, no dos. Ni «36 questions» ni «75 min»
son correctos.

### 2.3 El límite de palabras del Writing está mal
**Archivo:** `src/js/exam.js:~176` (`getExamTips`)

Dice «240-280 palabras por tarea — ni más, ni menos». El oficial es **220–260**.
Es un error que perjudica directamente en el examen real. En el mismo bloque,
«Administra 75 minutos» debería ser 90.

### 2.4 El icono de la app es de un diseño abandonado
**Archivo:** `manifest.json`

`background_color: #0A0A0F` (negro) y `theme_color: #00E5CC` (turquesa neón), más un
SVG con el texto «EN». Pero el CSS actual es NeumorphGlass claro: `--bg: #d4e8f5`,
`--accent: #007aff`, y el `<meta name="theme-color">` de `index.html` dice `#d4e8f5`.
El icono que queda en la pantalla del móvil no pega con la app.

### 2.5 Los niveles por destreza están inventados
**Archivo:** `src/js/progress.js:47-51`

```js
{ key: 'reading', pct: stats.exam_scores?.reading || 0, estLvl: 'B2' },  // ← fijo
{ key: 'writing', ..., estLvl: 'B1' },
{ key: 'speaking', ..., estLvl: 'A2' },
```

`estLvl` está **escrito a mano** y nunca se calcula. La app te dice que tu Reading es
B2 aunque no hayas hecho un solo ejercicio de Reading. Contradice el valor declarado
de «honestidad con el progreso» del README.

### 2.6 El nivel estimado sale del XP
**Archivo:** `server.js`, endpoint `/stats`

```js
if (xp >= 5000) estimated_level = 'C1';
```

El XP se gana por constancia (10 por sesión), no por competencia. Con esta fórmula,
repetir la misma situación fácil 500 veces te «sube» a C1. Debería derivarse de los
resultados reales por destreza.

### 2.7 El plan de 30 días ignora el carril diario
**Tabla:** `curriculum`

Las 30 filas solo contemplan vocabulario, gramática y una tarea de speaking genérica.
El carril retail que se acaba de construir no aparece en ningún día del plan, así que
la sección DÍA A DÍA queda huérfana: hay que acordarse de entrar a mano.

### 2.8 Emojis como sistema de iconos
75 apariciones, 25 distintos, repartidos por `index.html` y 9 módulos JS. Se renderizan
distinto en cada sistema operativo y no son un lenguaje visual propio.

---

## 3. Lo que falta para estar acabado

### Bloque A — Pronunciación real *(el objetivo declarado del usuario)*
**Bloqueado por:** clave de Azure Speech F0.

1. Endpoint `POST /pronunciation/assess` que reciba el audio y lo mande a Azure.
2. Sustituir `scoreSpeech` y `wkCompare` por el score real (precisión, fluidez, prosodia).
3. Mostrar los fonemas fallados, no solo un porcentaje.
4. **Minimal pairs para hispanohablantes**: `/ɪ/-/iː/` (ship/sheep), `/b/-/v/` (berry/very),
   `/s/-/z/`, `/dʒ/-/j/`, la *e* fantasma delante de *s* líquida (school, Spain).
   Respaldo: 14 h de entrenamiento → +35 % de precisión perceptiva, efecto sostenido
   a los 6 meses (UBC).
5. **Shadowing**: repetir en tiempo real sobre audio nativo. Mejora fluidez y prosodia,
   que es lo que más delata a un hispanohablante.

> Nota: el navegador **no** sirve para esto. Y en iOS, Safari bloquea
> `SpeechRecognition` cuando la PWA está instalada en la pantalla de inicio.

### Bloque B — Completar el C1
Hoy solo está Use of English: **1 de las 5 destrezas evaluadas, un 20 % del examen**.

| Falta | Trabajo |
|---|---|
| **Reading** partes 5–8 | Textos + preguntas de: multiple choice (6), cross-text multiple matching (4), gapped text (6), multiple matching (10) |
| **Listening** 4 partes, 30 preguntas | Necesita audio. Aquí encaja el TTS de Higgsfield |
| **Writing** 2 tareas | Enunciados + rúbrica. La corrección necesita un LLM |
| **Speaking** 4 partes | Part 2 son **3 fotos** en C1 (no 2 como en B2); Part 3 es colaborativa |

Ampliar el `CHECK` de `exam_questions.part`, que hoy solo admite los cuatro tipos de
Use of English.

### Bloque C — Diseño visual
1. Sustituir los 25 emojis por iconos propios generados con Higgsfield.
   Estilo decidido: **línea fina** para los pequeños (nav, botones) y **relieve
   neumórfico** para los grandes (logros, icono de app).
2. Rehacer el icono de la PWA con la paleta real.
3. Estrategia eficiente: generar **hojas de iconos en rejilla** (2–3 generaciones)
   en vez de 25 sueltas, y recortar. Modelo: Nano Banana Pro a 2K.

### Bloque D — Audio nativo de las 148 frases
Sustituir la voz sintética del navegador por voz británica real en las 76 frases clave
y los 72 turnos de role-play.

**Aviso de viabilidad:** son 148 generaciones. Una a una por navegador es inviable.
Hay que agrupar (por ejemplo, un audio por situación y cortar por silencios con ffmpeg)
o asumir gasto de créditos por MCP.

### Bloque E — Correcciones y deuda
1. Arreglar §2.2, §2.3, §2.4, §2.5, §2.6, §2.7.
2. Migrar SM-2 → **FSRS** (20–30 % menos repasos para la misma retención, validado
   sobre 500 M de repasos reales).
3. Unificar la lógica duplicada de TTS/STT entre `speak.js` y `work.js`.
4. No hay **ni un solo test**. Mínimo: los endpoints y el motor de repaso.
5. `server.js` pasa de 700 líneas en un archivo.
6. Sin backups automáticos de la base (solo manuales).

---

## 4. Orden recomendado

1. **E1** — Correcciones de contenido del examen (§2.2, §2.3). Rápido y son datos falsos.
2. **C** — Iconos y manifest. Ventana de Higgsfield ilimitado limitada.
3. **D** — Audio, si la ventana sigue abierta.
4. **A** — Pronunciación, en cuanto haya clave de Azure.
5. **B** — Completar el C1. Es el bloque más grande de contenido.
6. **E2** — FSRS, tests y deuda.

---

## 5. Reglas del proyecto

- **Español** en toda la interfaz y los comentarios. El contenido a aprender, en
  **inglés británico** (es el del Cambridge): *till*, *trousers*, *lift*, *queue*.
- **Sin emojis** en la interfaz una vez estén los iconos.
- **Producir antes que reconocer**: nada de elegir la respuesta de una lista.
- **Honestidad con el progreso**: si un dato no se puede calcular, no se inventa.
  Se dice que no hay datos.
- Las migraciones son **idempotentes** y reejecutables. Mantenerlo así.
- Validar el SQL antes de aplicarlo: los bloques `VALUES` largos son propensos a
  filas con un campo de menos.
