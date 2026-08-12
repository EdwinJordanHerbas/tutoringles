// TutorIngles — avisos.js
// Activar las notificaciones diarias desde Ajustes.
//
// Es la pieza de la que depende que la app se abra. Sin aviso, hay que
// acordarse de entrar; y compitiendo con el móvil en un descanso de turno, eso
// no pasa: diez días en producción dieron 0 sesiones de estudio.
//
// Aviso de plataforma: en iPhone las notificaciones web SOLO funcionan si la
// app está instalada en la pantalla de inicio (iOS 16.4+). Desde Safari no
// llegan, y el navegador no avisa de ello — hay que decirlo en pantalla.

let _pushCfg = null;

const soportaPush = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** ¿Está corriendo como app instalada y no como pestaña del navegador? */
const esAppInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** La clave pública viene en base64url y el navegador la quiere en bytes. */
function claveABytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function cargarPushCfg() {
  try { _pushCfg = await apiGet('/push/config'); } catch { _pushCfg = null; }
  return _pushCfg;
}

/** Bloque de ajustes de notificaciones. Lo pinta settings.js. */
function renderAvisos() {
  const c = _pushCfg;
  if (!c) return '';

  // Casos en los que no se puede activar: se dice por qué, no se esconde.
  if (!c.disponible) {
    return bloqueAviso('El servidor no tiene configuradas las claves de notificación (VAPID). Sin ellas no se pueden enviar avisos.');
  }
  if (!soportaPush()) {
    return bloqueAviso('Este navegador no admite notificaciones web.');
  }
  if (esIOS() && !esAppInstalada()) {
    return bloqueAviso('En iPhone los avisos solo funcionan con la app instalada en la pantalla de inicio. Ábrela en Safari, pulsa Compartir y elige “Añadir a pantalla de inicio”; después vuelve aquí.');
  }
  if (Notification.permission === 'denied') {
    return bloqueAviso('Has bloqueado las notificaciones para esta app. Hay que volver a permitirlas desde los ajustes del navegador.');
  }

  const activo = c.activo && c.dispositivos > 0;
  return `
    <div class="glass-card">
      <div class="card-title">AVISO DIARIO</div>
      <div class="av-texto">
        Un recordatorio al día con lo que toca: cuántas palabras y qué situación
        de tu sector. Sin esto hay que acordarse de entrar.
      </div>

      <div class="av-fila">
        <div>
          <div class="av-et">Estado</div>
          <div class="av-val ${activo ? 'on' : ''}">${activo ? `Activado · ${c.dispositivos} ${c.dispositivos === 1 ? 'dispositivo' : 'dispositivos'}` : 'Desactivado'}</div>
        </div>
        <button class="btn ${activo ? 'btn-ghost' : 'btn-primary'} btn-sm" id="av-toggle"
                onclick="${activo ? 'desactivarAvisos()' : 'activarAvisos()'}">
          ${activo ? 'DESACTIVAR' : 'ACTIVAR'}
        </button>
      </div>

      <div class="av-fila">
        <div>
          <div class="av-et">Hora del aviso</div>
          <div class="av-val">${escaparHtml(c.hora)}</div>
        </div>
        <input type="time" class="field-input av-hora" id="av-hora" value="${escaparHtml(c.hora)}"
               onchange="guardarHoraAviso(this.value)">
      </div>

      ${activo ? `
        <button class="btn btn-subtle" onclick="probarAviso(this)" style="width:100%;margin-top:8px">
          ENVIARME UNO DE PRUEBA AHORA
        </button>` : ''}
      <div id="av-resultado"></div>
    </div>`;
}

function bloqueAviso(texto) {
  return `
    <div class="glass-card">
      <div class="card-title">AVISO DIARIO</div>
      <div class="av-aviso">${escaparHtml(texto)}</div>
    </div>`;
}

// ── LLAMADA DESDE HOY ────────────────────────────────────
// El aviso vivía sólo en Ajustes, detrás de un icono sin etiqueta en la esquina
// de la cabecera. Para activarlo había que saber que existía, entrar, bajar y
// pulsar: cinco pasos que nadie da. El resultado medido a los once días fue
// `push_activo = 0` y CERO suscripciones — el planificador escribía en push_log
// cada noche y enviaba a nadie.
//
// Así que se pide donde se ve: lo primero de HOY, y sólo mientras haga falta.
// En cuanto está activado, la tarjeta desaparece y no vuelve a estorbar.

/** Pinta (o quita) la tarjeta de activación en HOY. */
async function pintarAvisoHoy() {
  const caja = document.getElementById('aviso-hoy');
  if (!caja) return;

  if (!_pushCfg) await cargarPushCfg();
  const c = _pushCfg;

  // Sin claves en el servidor o sin soporte del navegador no se puede hacer
  // nada: no se enseña un botón que va a fallar.
  if (!c || !c.disponible || !soportaPush()) return caja.replaceChildren();

  // Ya activado: fuera. Es el estado normal y no debe ocupar sitio.
  if (c.activo && c.dispositivos > 0) return caja.replaceChildren();

  // Permiso denegado a mano: el botón no serviría, hay que ir a los ajustes
  // del navegador. Se dice, pero sin botón que engañe.
  if (Notification.permission === 'denied') {
    caja.innerHTML = tarjetaAviso(
      'Los avisos están bloqueados',
      'Los bloqueaste para esta app. Para volver a recibirlos hay que permitirlos en los ajustes del navegador.',
      null);
    return;
  }

  // iPhone sin instalar: el permiso ni siquiera se puede pedir (iOS 16.4+ sólo
  // deja notificaciones a las apps de la pantalla de inicio). Se explica cómo
  // se instala en vez de dejar que el botón falle sin decir por qué.
  if (esIOS() && !esAppInstalada()) {
    caja.innerHTML = tarjetaAviso(
      'Instala la app para recibir el aviso',
      'En iPhone los avisos solo llegan si la app está en la pantalla de inicio. Pulsa Compartir abajo, elige «Añadir a pantalla de inicio», y ábrela desde ahí.',
      null);
    return;
  }

  caja.innerHTML = tarjetaAviso(
    'Que la app te avise',
    'Un recordatorio al día con lo que toca.',
    'ACTIVAR');
}

// El botón va pequeño y al lado del texto, no ancho y debajo. Con un primario a
// toda anchura quedaban dos botones azules seguidos peleándose por la mirada, y
// el que tiene que ganar siempre es EMPEZAR: activar el aviso se hace una vez,
// estudiar es lo de todos los días.
function tarjetaAviso(titulo, texto, boton) {
  return `
    <div class="glass-card-accent aviso-hoy anim-slide-up">
      <div class="aviso-hoy-fila">
        <div>
          <div class="aviso-hoy-tit">${escaparHtml(titulo)}</div>
          <div class="aviso-hoy-txt">${escaparHtml(texto)}</div>
        </div>
        ${boton ? `<button class="btn btn-subtle aviso-hoy-btn"
                     onclick="activarAvisosDesdeHoy(this)">${escaparHtml(boton)}</button>` : ''}
      </div>
    </div>`;
}

/** Igual que activarAvisos(), pero devolviendo a HOY en vez de a Ajustes. */
async function activarAvisosDesdeHoy(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'PIDIENDO PERMISO…'; }
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      toast('Sin permiso no se pueden enviar avisos', 'error');
    } else {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: claveABytes(_pushCfg.clave_publica),
        });
      }
      await apiPost('/push/subscribe', { subscription: sub.toJSON() });
      toast('Listo: te avisaré cada día', 'success');
    }
  } catch (e) {
    toastError(e);
  }
  _pushCfg = null;            // obliga a releer el estado del servidor
  await pintarAvisoHoy();
}

async function activarAvisos() {
  const btn = document.getElementById('av-toggle');
  if (btn) { btn.disabled = true; btn.textContent = 'PIDIENDO PERMISO…'; }
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') {
      toast('Sin permiso no se pueden enviar avisos', 'error');
      return recargarAjustes();
    }

    const reg = await navigator.serviceWorker.ready;
    // Si ya había una suscripción de antes, se reutiliza: pedir otra con una
    // clave distinta falla en Chrome con InvalidStateError.
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveABytes(_pushCfg.clave_publica),
      });
    }

    await apiPost('/push/subscribe', { subscription: sub.toJSON() });
    toast('Avisos activados', 'success');
  } catch (e) {
    toastError(e);
  }
  recargarAjustes();
}

async function desactivarAvisos() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await apiFetch('/push/subscribe', {
        method: 'DELETE',
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    } else {
      await apiFetch('/push/subscribe', { method: 'DELETE', body: JSON.stringify({}) });
    }
    toast('Avisos desactivados');
  } catch (e) {
    toastError(e);
  }
  recargarAjustes();
}

async function guardarHoraAviso(hora) {
  try {
    await apiPut('/push/hora', { hora });
    if (_pushCfg) _pushCfg.hora = hora;
    toast(`Aviso a las ${hora}`, 'success');
  } catch (e) { toastError(e); }
}

async function probarAviso(btn) {
  const out = document.getElementById('av-resultado');
  if (btn) { btn.disabled = true; btn.textContent = 'ENVIANDO…'; }
  try {
    const r = await apiPost('/push/test', {});
    if (out) {
      out.innerHTML = `<div class="av-ok">Enviado a ${r.enviados} ${r.enviados === 1 ? 'dispositivo' : 'dispositivos'}. Si no lo ves en unos segundos, revisa los permisos del sistema.</div>`;
    }
  } catch (e) {
    if (out) out.innerHTML = `<div class="av-err">${escaparHtml(e?.message || 'No se pudo enviar')}</div>`;
  }
  if (btn) { btn.disabled = false; btn.textContent = 'ENVIARME UNO DE PRUEBA AHORA'; }
}

async function recargarAjustes() {
  await cargarPushCfg();
  if (typeof initSettings === 'function') {
    const c = document.getElementById('settings-content');
    if (c) c.innerHTML = '';
    initSettings();
  }
}
