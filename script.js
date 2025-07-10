// script.js
const radio = document.getElementById('radio');
const displayContainer = document.getElementById('display');
const displayText = document.getElementById('display-text');
const presets = document.querySelectorAll('.preset');
const player = document.getElementById('player');
const volumeSlider = document.getElementById('volume');
const muteKnob = document.getElementById('knob-mute');
const powerKnob = document.getElementById('knob-power');
const volPercentage = document.getElementById('vol-percentage');
let previousVolume = parseFloat(volumeSlider.value);

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
  // Inicia la emisora por defecto (Slogan 94.7 MHz)
  presets[3].click();
}

presets.forEach(btn => btn.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  // Determinar fuentes (OGG/MP3 fallback)
  const sources = btn.dataset.sources
    ? btn.dataset.sources.split('|')
    : [btn.dataset.src];
  let attempt = 0;

  // Actualizar etiqueta del display antes de reproducir
  displayText.textContent = btn.dataset.freq;
  presets.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  function tryPlay() {
    if (attempt >= sources.length) return;
    player.src = sources[attempt++];
    player.load();
    player.play()
      .then(() => {
        radio.classList.add('playing');
      })
      .catch(() => {
        tryPlay(); // Intentar siguiente fuente
      });
  }

  tryPlay();
}));

// Eventos del audio para animación
player.addEventListener('pause', () => radio.classList.remove('playing'));
player.addEventListener('ended', () => radio.classList.remove('playing'));

// Control de volumen con slider
volumeSlider.addEventListener('input', () => {
  if (powerKnob.classList.contains('off')) return;
  previousVolume = parseFloat(volumeSlider.value);
  player.volume = previousVolume;
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

// Ajustar volumen con rueda del ratón
radio.addEventListener('wheel', e => {
  if (powerKnob.classList.contains('off')) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? 0.05 : -0.05;
  let newVol = player.volume + delta;
  newVol = Math.min(1, Math.max(0, newVol));
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

// Botón Mute
muteKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  if (!player.muted) {
    previousVolume = parseFloat(volumeSlider.value);
    player.muted = true;
    volumeSlider.value = 0;
    radio.classList.remove('playing');
  } else {
    player.muted = false;
    volumeSlider.value = previousVolume;
    radio.classList.add('playing');
  }
  player.volume = parseFloat(volumeSlider.value);
  updateVolumeDisplay(player.volume);
  muteKnob.classList.toggle('off', player.muted);
});

// Botón Power
powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

// Registrar Service Worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .catch(err => console.warn('Error registrando SW:', err));
}

// Estado inicial: apagado
powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(parseFloat(volumeSlider.value));

