// --- Radio de Villa Regina - script.js ---

// Elementos
const radio = document.getElementById('radio');
const display = document.getElementById('display');
const displayText = document.getElementById('display-text');
const knobPower = document.getElementById('knob-power');
const knobMute = document.getElementById('knob-mute');
const presets = document.querySelectorAll('.preset');
const volumeSlider = document.getElementById('volume');
const volPercentage = document.getElementById('vol-percentage');
const player = document.getElementById('player');

// Estado
let isOn = false;
let isMuted = false;
let currentStation = null;

// Utilidades
function setDisplay(text, { blink = false, off = false } = {}) {
  displayText.textContent = text;
  displayText.classList.toggle('blink', blink);
  display.classList.toggle('off', off);
}

function setMuted(state) {
  isMuted = state;
  player.muted = state;
  knobMute.classList.toggle('off', state); // en tu CSS, #knob-mute.off muestra el "mute" activo
}

function syncVolume(v) {
  const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
  player.volume = vol;
  volPercentage.textContent = Math.round(vol * 100) + '%';

  if (vol <= 0.0001) {
    setMuted(true);     // Volumen 0 => Mute encendido visual y funcional
  } else if (isMuted) {
    setMuted(false);    // Si subís volumen, desmutea
  }
}

// ===== Estado inicial: OFF (verde) =====
radio.classList.add('off');
display.classList.add('off');
setDisplay('Off', { blink: false, off: true });
syncVolume(volumeSlider.value);

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

    // Limpiar reproducción
    try { player.pause(); } catch {}
    player.src = '';
    radio.classList.remove('playing');
    presets.forEach(p => p.classList.remove('active'));
    currentStation = null;

    // Reset de mute para el próximo encendido
    setMuted(false);

    // Volver a OFF verde
    setDisplay('Off', { blink: false, off: true });
  }
});

// Mute manual
knobMute.addEventListener('click', () => {
  if (!isOn) return;
  setMuted(!isMuted);
});

// Presets
presets.forEach(preset => {
  preset.addEventListener('click', () => {
    if (!isOn) return;

    const freq = preset.dataset.freq || preset.textContent.trim();
    const src = preset.dataset.src || (preset.dataset.sources ? preset.dataset.sources.split('|')[0].trim() : null);
    if (!src) return;

    // Si ya está sonando esta misma y no está pausado, pausar
    if (currentStation === src && !player.paused) {
      player.pause();
      radio.classList.remove('playing');
      preset.classList.remove('active');
      setDisplay('En pausa', { blink: false, off: false });
      currentStation = null;
      return;
    }

    // Estado "Conectando…" mientras intenta reproducir
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

// Volumen (slider)
volumeSlider.addEventListener('input', e => syncVolume(e.target.value));

// Volumen con rueda del mouse en TODO el recuadro de la radio
radio.addEventListener('wheel', (e) => {
  if (!isOn) return;
  e.preventDefault();
  let v = parseFloat(volumeSlider.value) || 0;
  v += (e.deltaY < 0 ? 1 : -1) * 0.05; // paso 5%
  v = Math.max(0, Math.min(1, v));
  volumeSlider.value = v.toFixed(2);
  syncVolume(v);
}, { passive: false });

// Eventos de audio
player.addEventListener('error', () => {
  radio.classList.remove('playing');
  setDisplay('Error al cargar', { blink: false, off: false });
});
player.addEventListener('playing', () => radio.classList.add('playing'));
player.addEventListener('pause', () => radio.classList.remove('playing'));


if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js?ver=3')  // ?ver=3 para evitar cache viejo del SW
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.error('SW error:', err));
  });
}






