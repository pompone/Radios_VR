const radio = document.getElementById('radio');
const display = document.getElementById('display');
const displayText = document.getElementById('display-text');
const knobPower = document.getElementById('knob-power');
const knobMute = document.getElementById('knob-mute');
const presets = document.querySelectorAll('.preset');
const volumeSlider = document.getElementById('volume');
const volPercentage = document.getElementById('vol-percentage');
const player = document.getElementById('player');

let isOn = false;
let isMuted = false;
let currentStation = null;

function setDisplay(text, { blink = false, off = false } = {}) {
  displayText.textContent = text;
  displayText.classList.toggle('blink', blink);
  display.classList.toggle('off', off);
}

// ===== Estado inicial: OFF en display =====
radio.classList.add('off');
display.classList.add('off');
setDisplay('Off', { blink: false, off: true });

// Power on/off
knobPower.addEventListener('click', () => {
  isOn = !isOn;

  if (isOn) {
    radio.classList.remove('off');
    display.classList.remove('off');
    knobPower.classList.remove('off');
    setDisplay('Selecciona una emisora', { blink: true, off: false });
  } else {
    radio.classList.add('off');
    display.classList.add('off');
    knobPower.classList.add('off');
    setDisplay('Off', { blink: false, off: true });
    player.pause();
    player.src = '';
    radio.classList.remove('playing');
    presets.forEach(p => p.classList.remove('active'));
    currentStation = null;
  }
});

// Mute
knobMute.addEventListener('click', () => {
  if (!isOn) return;
  isMuted = !isMuted;
  player.muted = isMuted;
  knobMute.classList.toggle('off', isMuted);
});

// Presets
presets.forEach(preset => {
  preset.addEventListener('click', () => {
    if (!isOn) return;

    const freq = preset.dataset.freq || preset.textContent.trim();
    const src = preset.dataset.src || (preset.dataset.sources ? preset.dataset.sources.split('|')[0].trim() : null);
    if (!src) return;

    // Si ya está sonando, pausar
    if (currentStation === src && !player.paused) {
      player.pause();
      radio.classList.remove('playing');
      preset.classList.remove('active');
      setDisplay('En pausa', { blink: false, off: false });
      currentStation = null;
      return;
    }

    // Mostrar "Conectando..." mientras intenta reproducir
    presets.forEach(p => p.classList.remove('active'));
    preset.classList.add('active');
    setDisplay('Conectando…', { blink: true, off: false });

    player.src = src;
    player.volume = parseFloat(volumeSlider.value);

    player.play()
      .then(() => {
        radio.classList.add('playing');
        setDisplay(freq, { blink: false, off: false });
        currentStation = src;
      })
      .catch(err => {
        console.error('Error al reproducir:', err);
        radio.classList.remove('playing');
        setDisplay('Error de conexión', { blink: false, off: false });
        preset.classList.remove('active');
        currentStation = null;
      });
  });
});

// Volume control (slider)
function syncVolume(v) {
  player.volume = v;
  volPercentage.textContent = Math.round(v * 100) + '%';
}
volumeSlider.addEventListener('input', e => syncVolume(parseFloat(e.target.value)));

// ===== Rueda del mouse en TODO el recuadro de la radio =====
radio.addEventListener('wheel', (e) => {
  // permitir rueda solo si la radio está encendida
  if (!isOn) return;
  e.preventDefault();

  let v = parseFloat(volumeSlider.value);
  v += (e.deltaY < 0 ? 1 : -1) * 0.05;     // paso de 5%
  v = Math.max(0, Math.min(1, v));
  volumeSlider.value = v.toFixed(2);
  syncVolume(v);
}, { passive: false });

// Audio events
player.addEventListener('error', () => {
  radio.classList.remove('playing');
  setDisplay('Error al cargar', { blink: false, off: false });
});
player.addEventListener('playing', () => radio.classList.add('playing'));
player.addEventListener('pause', () => radio.classList.remove('playing'));


if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => console.log("SW registrado:", reg.scope))
      .catch((err) => console.error("SW error:", err));
  });
}






