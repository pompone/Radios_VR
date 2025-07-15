// -----------------------------------------------------------------------------
// script.js  –  Radio Web con soporte Chromecast (v2)
// -----------------------------------------------------------------------------
const radio            = document.getElementById('radio');
const displayContainer = document.getElementById('display');
const displayText      = document.getElementById('display-text');
const presets          = document.querySelectorAll('.preset');
const player           = document.getElementById('player');
const volumeSlider     = document.getElementById('volume');
const muteKnob         = document.getElementById('knob-mute');
const powerKnob        = document.getElementById('knob-power');
const volPercentage    = document.getElementById('vol-percentage');
const castControl      = document.getElementById('cast-control');
let   previousVolume   = parseFloat(volumeSlider.value);
let   currentTitle     = '';   // ← nombre de la emisora para el Cast

/* ---------------------------------------------------------------------------
 * Chromecast helpers
 * --------------------------------------------------------------------------- */
function updateCastVisibility(state) {
  if (state === cast.framework.CastState.NO_DEVICES_AVAILABLE) {
    castControl.classList.add('cast-hidden');
  } else {
    castControl.classList.remove('cast-hidden');
  }
}

function sendToCast(sourceUrl, title = 'Radio VR') {
  const ctx     = cast && cast.framework ? cast.framework.CastContext.getInstance() : null;
  const session = ctx && ctx.getCurrentSession();
  if (!session) return;         // No hay sesión activa

  // MIME según extensión
  const mime = sourceUrl.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg';

  const mediaInfo = new chrome.cast.media.MediaInfo(sourceUrl, mime);
  mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;           // es radio en vivo :contentReference[oaicite:0]{index=0}

  // Metadatos: título + carátula
  const metadata  = new chrome.cast.media.GenericMediaMetadata();     // :contentReference[oaicite:1]{index=1}
  metadata.title  = title;
  metadata.images = [ new chrome.cast.Image(window.location.origin + '/icon-512.png') ];
  mediaInfo.metadata = metadata;

  const request   = new chrome.cast.media.LoadRequest(mediaInfo);
  session.loadMedia(request)
    .then(() => player.pause())   // silencia el dispositivo local
    .catch(err => console.warn('Error al enviar al Cast:', err));
}

window.__onGCastApiAvailable = function (isAvailable) {
  if (!isAvailable) return;

  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: 'CC1AD845',   // Default Media Receiver
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  updateCastVisibility(context.getCastState());

  context.addEventListener(
    cast.framework.CastContextEventType.CAST_STATE_CHANGED,
    ev => updateCastVisibility(ev.castState)
  );

  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    ev => {
      switch (ev.sessionState) {
        case cast.framework.SessionState.SESSION_STARTED:
        case cast.framework.SessionState.SESSION_RESUMED:
          sendToCast(player.src, currentTitle);   // manda la emisora actual
          player.pause();                         // y detiene el audio local
          break;
        case cast.framework.SessionState.SESSION_ENDED:
          // Si la radio sigue encendida, retomamos audio local
          if (!powerKnob.classList.contains('off')) {
            player.play().catch(() => {});
          }
          break;
      }
    }
  );
};

/* ---------------------------------------------------------------------------
 * Utilidades de UI
 * --------------------------------------------------------------------------- */
function updateVolumeDisplay(value) {
  volPercentage.textContent = `${Math.round(value * 100)}%`;
}

function powerOff() {
  player.pause();
  radio.classList.remove('playing');
  displayText.textContent = 'Off';
  displayContainer.classList.add('off');
  radio.classList.add('off');
}

function powerOn() {
  displayContainer.classList.remove('off');
  radio.classList.remove('off');
  powerKnob.classList.remove('off');
  presets[3].click(); // Slogan 94.7 MHz por defecto
}

/* ---------------------------------------------------------------------------
 * Presets
 * --------------------------------------------------------------------------- */
presets.forEach(btn => btn.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;

  const sources = btn.dataset.sources
        ? btn.dataset.sources.split('|')
        : [btn.dataset.src];
  let attempt = 0;

  currentTitle            = btn.dataset.freq;          // ← guardamos título
  displayText.textContent = currentTitle;
  presets.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  function tryPlay() {
    if (attempt >= sources.length) {
      displayText.textContent = 'Sin señal';
      radio.classList.remove('playing');
      return;
    }
    player.src = sources[attempt++];
    player.load();

    // ¿Estamos casteando? → no reproducir localmente
    const ctx = cast && cast.framework ? cast.framework.CastContext.getInstance() : null;
    const casting = ctx && ctx.getCastState() === cast.framework.CastState.CONNECTED;

    const playPromise = casting ? Promise.resolve() : player.play();

    playPromise
      .then(() => {
        radio.classList.add('playing');
        sendToCast(player.src, currentTitle);     // actualiza Chromecast (o lo inicia)
      })
      .catch(tryPlay);
  }
  tryPlay();
}));

/* ---------------------------------------------------------------------------
 * Player & volumen
 * --------------------------------------------------------------------------- */
player.addEventListener('pause', () => radio.classList.remove('playing'));
player.addEventListener('ended', () => radio.classList.remove('playing'));

volumeSlider.addEventListener('input', () => {
  if (powerKnob.classList.contains('off')) return;
  previousVolume = parseFloat(volumeSlider.value);
  player.volume  = previousVolume;
  updateVolumeDisplay(previousVolume);
  if (player.volume === 0) {
    player.muted = true;
    muteKnob.classList.add('off');
    radio.classList.remove('playing');
  } else {
    player.muted = false;
    muteKnob.classList.remove('off');
  }
});

/* Rueda del mouse (desktop) */
radio.addEventListener('wheel', e => {
  if (powerKnob.classList.contains('off')) return;
  e.preventDefault();
  const delta  = e.deltaY < 0 ? 0.05 : -0.05;
  let newVol   = player.volume + delta;
  newVol       = Math.min(1, Math.max(0, newVol));
  player.volume      = newVol;
  volumeSlider.value = newVol;
  updateVolumeDisplay(newVol);

  if (newVol === 0) {
    player.muted = true;
    muteKnob.classList.add('off');
    radio.classList.remove('playing');
  } else {
    if (player.muted) {
      player.muted = false;
      muteKnob.classList.remove('off');
    }
    radio.classList.add('playing');
  }
});

/* Mute */
muteKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  if (!player.muted) {
    previousVolume     = parseFloat(volumeSlider.value);
    player.muted       = true;
    volumeSlider.value = 0;
    radio.classList.remove('playing');
  } else {
    player.muted       = false;
    volumeSlider.value = previousVolume;
    radio.classList.add('playing');
  }
  player.volume = parseFloat(volumeSlider.value);
  updateVolumeDisplay(player.volume);
  muteKnob.classList.toggle('off', player.muted);
});

/* Power */
powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

/* ---------------------------------------------------------------------------
 * Service Worker & arranque
 * --------------------------------------------------------------------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .catch(err => console.warn('Error registrando SW:', err));
}

powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(parseFloat(volumeSlider.value));
