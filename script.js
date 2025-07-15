// script.js
const radio           = document.getElementById('radio');
const displayContainer= document.getElementById('display');
const displayText     = document.getElementById('display-text');
const presets         = document.querySelectorAll('.preset');
const player          = document.getElementById('player');
const volumeSlider    = document.getElementById('volume');
const muteKnob        = document.getElementById('knob-mute');
const powerKnob       = document.getElementById('knob-power');
const volPercentage   = document.getElementById('vol-percentage');

let previousVolume = parseFloat(volumeSlider.value);
const CONNECTING_MSG = 'Conectando…';

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
  // Emisora por defecto (Slogan 94.7 MHz)
  presets[3].click();
}

/* ———   MANEJO DE PRESINTONÍAS   ——— */
presets.forEach(btn => btn.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;

  const freqName = btn.dataset.freq;          // nombre que mostrará al conectar
  const sources  = btn.dataset.sources
                  ? btn.dataset.sources.split('|')
                  : [btn.dataset.src];
  let attempt = 0;

  // Estado “Conectando…”
  displayText.textContent = CONNECTING_MSG;
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
        // ¡Listo! Cambiamos el display al nombre real
        radio.classList.add('playing');
        displayText.textContent = freqName;
      })
      .catch(() => {
        // Si falla, probamos con la siguiente fuente
        tryPlay();
      });
  }

  tryPlay();
}));

/* ———   EVENTOS DEL PLAYER   ——— */
player.addEventListener('pause', ()  => radio.classList.remove('playing'));
player.addEventListener('ended', ()  => radio.classList.remove('playing'));

/* ———   VOLUMEN & MUTE   ——— */
volumeSlider.addEventListener('input', () => {
  if (powerKnob.classList.contains('off')) return;
  previousVolume   = parseFloat(volumeSlider.value);
  player.volume    = previousVolume;
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

radio.addEventListener('wheel', e => {
  if (powerKnob.classList.contains('off')) return;
  e.preventDefault();
  const delta   = e.deltaY < 0 ? 0.05 : -0.05;
  let newVol    = player.volume + delta;
  newVol        = Math.min(1, Math.max(0, newVol));
  player.volume = newVol;
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

/* ———   BOTÓN MUTE   ——— */
muteKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  if (!player.muted) {
    previousVolume   = parseFloat(volumeSlider.value);
    player.muted     = true;
    volumeSlider.value = 0;
    radio.classList.remove('playing');
  } else {
    player.muted     = false;
    volumeSlider.value = previousVolume;
    radio.classList.add('playing');
  }
  player.volume = parseFloat(volumeSlider.value);
  updateVolumeDisplay(player.volume);
  muteKnob.classList.toggle('off', player.muted);
});

/* ———   BOTÓN POWER   ——— */
powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

/* ———   SERVICE WORKER   ——— */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
           .register('service-worker.js')
           .catch(err => console.warn('Error registrando SW:', err));
}

/* ———   ESTADO INICIAL   ——— */
powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(parseFloat(volumeSlider.value));

