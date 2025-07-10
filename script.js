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
  const percent = Math.round(value * 100);
  volPercentage.textContent = `${percent}%`;
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
  player.volume = volumeSlider.value;
  updateVolumeDisplay(volumeSlider.value);
  if (player.volume === 0) {
    player.muted = true;
    muteKnob.classList.add('off');
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
  } else {
    player.muted = false;
    volumeSlider.value = previousVolume;
  }
  player.volume = volumeSlider.value;
  updateVolumeDisplay(volumeSlider.value);
  muteKnob.classList.toggle('off', player.muted);
});

powerKnob.addEventListener('click', () => {
  if (powerKnob.classList.contains('off')) {
    powerOn();
  } else {
    powerKnob.classList.add('off');
    powerOff();
  }
});

// Estado inicial: apagado
powerKnob.classList.add('off');
powerOff();
updateVolumeDisplay(volumeSlider.value);
