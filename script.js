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

function updateVolumeDisplay(v) {
  volPercentage.textContent = `${Math.round(v * 100)}%`;
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
  presets[3].click(); // inicia en Slogan 94.7 MHz
}

presets.forEach(btn => btn.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) return;
  presets.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  displayText.textContent = btn.dataset.freq;
  player.src = btn.dataset.src;
  player.play().then(() => radio.classList.add('playing')).catch(() => {});
}));

player.addEventListener('pause', () => radio.classList.remove('playing'));
player.addEventListener('ended', () => radio.classList.remove('playing'));

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

// Volumen con rueda del mouse
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

powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

// Registrar service worker (PWA)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .catch(err => console.warn('SW error:', err));
}

// Estado inicial: apagado
powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(parseFloat(volumeSlider.value));

