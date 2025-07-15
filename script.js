// --- script.js (versión con soporte Chromecast) ---
const radio           = document.getElementById('radio');
const displayContainer= document.getElementById('display');
const displayText     = document.getElementById('display-text');
const presets         = document.querySelectorAll('.preset');
const player          = document.getElementById('player');
const volumeSlider    = document.getElementById('volume');
const muteKnob        = document.getElementById('knob-mute');
const powerKnob       = document.getElementById('knob-power');
const volPercentage   = document.getElementById('vol-percentage');
let   previousVolume  = parseFloat(volumeSlider.value);

/* ---------- Google Cast ---------- */
// Se ejecuta cuando la librería cast_sender ya está disponible
window.__onGCastApiAvailable = function (isAvailable) {
  if (!isAvailable) return;
  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: 'CC1AD845',         // Default Media Receiver ID :contentReference[oaicite:1]{index=1}
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  // Si la sesión empieza después de que el usuario ya esté escuchando:
  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    (ev) => {
      if (ev.sessionState === cast.framework.SessionState.SESSION_STARTED) {
        sendToCast(player.src);               // manda la emisora actual
      }
    }
  );
};

function sendToCast(sourceUrl, mime = 'audio/mpeg') {
  const castContext = cast && cast.framework ? cast.framework.CastContext.getInstance() : null;
  const session     = castContext && castContext.getCurrentSession();
  if (!session) return;                        // no hay Chromecast conectado

  const mediaInfo   = new chrome.cast.media.MediaInfo(sourceUrl, mime);
  const request     = new chrome.cast.media.LoadRequest(mediaInfo);
  session.loadMedia(request).catch(err => console.warn('Error al enviar al Cast:', err));
}
/* --------------------------------- */

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
  presets[3].click(); // Slogan 94.7 MHz por defecto
}

/* --- Presets --- */
presets.forEach(btn => btn.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;

  const sources = btn.dataset.sources
        ? btn.dataset.sources.split('|')
        : [btn.dataset.src];
  let attempt = 0;

  displayText.textContent = btn.dataset.freq;
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
    player.play()
      .then(() => {
        radio.classList.add('playing');
        sendToCast(player.src);               // también lanza al Chromecast
      })
      .catch(tryPlay);
  }
  tryPlay();
}));

/* --- Player & volumen --- */
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

/* --- Rueda del mouse para volumen --- */
radio.addEventListener('wheel', e => {
  if (powerKnob.classList.contains('off')) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  let   newVol = player.volume + delta;
  newVol = Math.min(1, Math.max(0, newVol));
  player.volume    = newVol;
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

/* --- Mute --- */
muteKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  if (!player.muted) {
    previousVolume = parseFloat(volumeSlider.value);
    player.muted   = true;
    volumeSlider.value = 0;
    radio.classList.remove('playing');
  } else {
    player.muted   = false;
    volumeSlider.value = previousVolume;
    radio.classList.add('playing');
  }
  player.volume = parseFloat(volumeSlider.value);
  updateVolumeDisplay(player.volume);
  muteKnob.classList.toggle('off', player.muted);
});

/* --- Power --- */
powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

/* --- Service Worker & arranque --- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .catch(err => console.warn('Error registrando SW:', err));
}

powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(parseFloat(volumeSlider.value));


