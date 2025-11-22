// --- script.js ---

// Elementos DOM
const radio = document.getElementById('radio');
const display = document.getElementById('display');
const displayText = document.getElementById('display-text');
const knobPower = document.getElementById('knob-power');
const knobMute = document.getElementById('knob-mute');
const presetsContainer = document.getElementById('presets-container');
const btnAdd = document.getElementById('btn-add');
const volumeSlider = document.getElementById('volume');
const volPercentage = document.getElementById('vol-percentage');
const player = document.getElementById('player');

// Variables Estado
let isOn = false;
let isMuted = false;
let currentStation = null;
// Objeto Marquee
let marquee = { running: false, rafId: null, lastTs: null, x: 0, speed: 45, gap: 60, width: 0 };

// --- 1. Inicialización de Presets Guardados ---
function loadCustomPresets() {
  const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
  stored.forEach(radioData => {
    createPresetButton(radioData.name, radioData.url, false);
  });
  // Movemos el botón "+" siempre al final
  presetsContainer.appendChild(btnAdd);
}

function createPresetButton(name, url, saveToStorage = true) {
  const btn = document.createElement('button');
  btn.className = 'preset';
  btn.textContent = name;
  btn.dataset.freq = name; // Usamos el nombre para el display
  btn.dataset.src = url;

  // Evento click (lógica de radio)
  btn.addEventListener('click', () => playStation(btn));

  // Insertar antes del botón Add
  presetsContainer.insertBefore(btn, btnAdd);

  if (saveToStorage) {
    const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
    stored.push({ name, url });
    localStorage.setItem('myCustomRadios', JSON.stringify(stored));
  }
}

// --- 2. Marquee (Texto desplazable) ---
const marqA = document.createElement('span');
const marqB = document.createElement('span');
[marqA, marqB].forEach(s => {
  s.className = 'marq';
  s.style.position = 'absolute'; s.style.whiteSpace = 'nowrap'; s.style.top = '0';
  s.style.color = '#0f0'; s.style.textShadow = '0 0 8px #0f0';
  s.style.display = 'none'; s.style.left = '0'; s.style.transform = 'none'; s.style.animation = 'none';
});
display.appendChild(marqA);
display.appendChild(marqB);

function hideMarquee() {
  if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
  marquee.running = false; marquee.lastTs = null;
  marqA.style.display = 'none'; marqB.style.display = 'none';
  displayText.style.display = 'inline-block';
}

function startMarquee(text) {
  if (display.classList.contains('off')) return;
  marqA.textContent = text; marqB.textContent = text;
  marqA.style.display = 'inline-block'; marqB.style.display = 'inline-block';
  displayText.style.display = 'none';

  requestAnimationFrame(() => {
    const containerW = display.clientWidth;
    const textW = marqA.offsetWidth;
    marquee.width = textW;
    marquee.x = containerW + 20; marquee.lastTs = null;

    function step(ts) {
      if (!marquee.running) return;
      if (!marquee.lastTs) marquee.lastTs = ts;
      const dt = (ts - marquee.lastTs) / 1000;
      marquee.lastTs = ts;
      marquee.x -= marquee.speed * dt;
      if (marquee.x < -(textW + marquee.gap)) marquee.x += (textW + marquee.gap);
      marqA.style.transform = `translateX(${marquee.x}px)`;
      marqB.style.transform = `translateX(${marquee.x + textW + marquee.gap}px)`;
      marquee.rafId = requestAnimationFrame(step);
    }
    marquee.running = true;
    marquee.rafId = requestAnimationFrame(step);
  });
}

function setDisplay(text, { blink = false, off = false, marquee: useMarquee = false } = {}) {
  hideMarquee();
  displayText.textContent = text;
  display.classList.toggle('off', off);
  
  if (blink) {
    displayText.classList.add('blink');
    displayText.style.transform = ''; displayText.style.left = '';
  } else {
    displayText.classList.remove('blink');
  }

  if (useMarquee) startMarquee(text);
}

// --- 3. Audio / Volumen / Animación Parlante ---

// Función para controlar la animación del parlante
function updateSpeakerAnimation() {
  // Solo animar si está sonando Y no está muteado Y el volumen > 0
  if (!player.paused && !player.muted && player.volume > 0.01 && isOn) {
    radio.classList.add('playing');
  } else {
    radio.classList.remove('playing');
  }
}

function setMuted(state) {
  isMuted = state;
  player.muted = state;
  knobMute.classList.toggle('off', state);
  updateSpeakerAnimation(); // Actualizar animación al mutear
}

function syncVolume(v) {
  const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
  player.volume = vol;
  
  const percentage = Math.round(vol * 100);
  volPercentage.textContent = percentage + '%';
  
  // Gradiente Barra
  volumeSlider.style.background = `linear-gradient(to right, #4CAF50 0%, #FFEB3B 50%, #F44336 ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;

  if (vol <= 0.0001) {
    // Si volumen es 0, actuamos como mute para la animación
    updateSpeakerAnimation();
  } else {
    if (isMuted) setMuted(false); // Desmutear si sube volumen
    updateSpeakerAnimation();
  }
}

// --- 4. Lógica de Reproducción ---

function playStation(presetBtn) {
  if (!isOn) return;

  const freq = presetBtn.dataset.freq;
  const src = presetBtn.dataset.src;
  if (!src) return;

  // Si ya está sonando esta, pausar
  if (currentStation === src && !player.paused) {
    player.pause();
    updateSpeakerAnimation();
    presetBtn.classList.remove('active');
    setDisplay('En pausa', { blink: false, off: false, marquee: false });
    currentStation = null;
    return;
  }

  // Resetear clases active
  document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
  presetBtn.classList.add('active');
  
  setDisplay('Conectando...', { blink: true, off: false, marquee: false });

  player.src = src;
  player.volume = parseFloat(volumeSlider.value);

  player.play()
    .then(() => {
      updateSpeakerAnimation();
      setDisplay(freq, { blink: false, off: false, marquee: true });
      currentStation = src;
    })
    .catch(err => {
      if (!isOn) return; // Ignorar error si se apagó
      console.error(err);
      radio.classList.remove('playing');
      setDisplay('Error conexión', { blink: false, off: false, marquee: false });
      presetBtn.classList.remove('active');
      currentStation = null;
    });
}

// --- 5. Event Listeners ---

// Init
radio.classList.add('off');
display.classList.add('off');
setDisplay('Off', { blink: false, off: true, marquee: false });
syncVolume(volumeSlider.value);
loadCustomPresets(); // Cargar radios guardadas

// Listeners existentes de radios predeterminadas
document.querySelectorAll('.preset:not(.add-btn)').forEach(p => {
  p.addEventListener('click', () => playStation(p));
});

// Botón Power
knobPower.addEventListener('click', () => {
  isOn = !isOn;
  if (isOn) {
    radio.classList.remove('off');
    display.classList.remove('off');
    knobPower.classList.remove('off');
    setDisplay('Seleccione una emisora', { blink: true, off: false, marquee: false });
    updateSpeakerAnimation();
  } else {
    radio.classList.add('off');
    display.classList.add('off');
    knobPower.classList.add('off');
    
    try { player.pause(); } catch {}
    player.src = ''; 
    
    updateSpeakerAnimation();
    document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
    currentStation = null;
    setMuted(false);
    setDisplay('Off', { blink: false, off: true, marquee: false });
  }
});

// Botón Mute
knobMute.addEventListener('click', () => {
  if (!isOn) return;
  setMuted(!isMuted);
});

// Botón Agregar (+)
btnAdd.addEventListener('click', () => {
  // Usamos prompt simple para no complicar el HTML. Se podría hacer un modal más lindo.
  const name = prompt("Ingrese el nombre de la radio (Ej: Mi Radio):");
  if (!name) return;
  
  const url = prompt("Ingrese la URL del streaming (.mp3/aac):");
  if (!url) return;

  if (url.startsWith('http')) {
      createPresetButton(name, url, true);
      alert('Radio agregada correctamente.');
  } else {
      alert('URL inválida. Debe comenzar con http o https.');
  }
});

// Inputs
volumeSlider.addEventListener('input', e => syncVolume(e.target.value));

radio.addEventListener('wheel', (e) => {
  if (!isOn) return;
  e.preventDefault();
  let v = parseFloat(volumeSlider.value) || 0;
  v += (e.deltaY < 0 ? 1 : -1) * 0.05;
  v = Math.max(0, Math.min(1, v));
  volumeSlider.value = v.toFixed(2);
  syncVolume(v);
}, { passive: false });

player.addEventListener('playing', () => updateSpeakerAnimation());
player.addEventListener('pause', () => updateSpeakerAnimation());

player.addEventListener('error', () => {
  if (!isOn) return;
  updateSpeakerAnimation();
  setDisplay('Error', { blink: false, off: false, marquee: false });
});

// SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js?ver=17').catch(() => {});
  });
}
