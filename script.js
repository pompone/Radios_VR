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

// ===== Marquee JS (Texto desplazable) =====
const marqA = document.createElement('span');
const marqB = document.createElement('span');
[marqA, marqB].forEach(s => {
  s.className = 'marq';
  s.style.position = 'absolute';
  s.style.whiteSpace = 'nowrap';
  s.style.top = '0';
  s.style.color = '#0f0';
  s.style.textShadow = '0 0 8px #0f0';
  s.style.display = 'none';
  // Importante: reseteamos cualquier centrado heredado
  s.style.left = '0'; 
  s.style.transform = 'none';
});
display.appendChild(marqA);
display.appendChild(marqB);

let marquee = {
  running: false,
  rafId: null,
  lastTs: null,
  x: 0,
  speed: 80,      // Pixels por segundo
  gap: 60,        // Espacio entre repeticiones (un poco más aireado)
  width: 0
};

function hideMarquee() {
  if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
  marquee.running = false;
  marquee.lastTs = null;
  marqA.style.display = 'none';
  marqB.style.display = 'none';
  // Volvemos a mostrar el texto original estático
  displayText.style.display = 'inline-block';
}

function startMarquee(text) {
  if (display.classList.contains('off')) return;

  // Configuramos el texto en los elementos móviles
  marqA.textContent = text;
  marqB.textContent = text;
  marqA.style.display = 'inline-block';
  marqB.style.display = 'inline-block';
  
  // Ocultamos el texto estático original
  displayText.style.display = 'none';

  // Medir en el siguiente frame para asegurar renderizado
  requestAnimationFrame(() => {
    const containerW = display.clientWidth;
    const textW = marqA.offsetWidth;
    marquee.width = textW;

    // --- MODIFICACIÓN: Eliminado el chequeo de ancho ---
    // Antes verificábamos si el texto cabía para frenarlo. 
    // Ahora forzamos el movimiento siempre para dar efecto de radio activa.
    
    // CONFIGURACIÓN DE MOVIMIENTO (Derecha a Izquierda)
    // Iniciamos justo fuera de la derecha
    marquee.x = containerW + 20; 
    marquee.lastTs = null;

    function step(ts) {
      if (!marquee.running) return;
      if (!marquee.lastTs) marquee.lastTs = ts;
      const dt = (ts - marquee.lastTs) / 1000;
      marquee.lastTs = ts;

      // Mover hacia la izquierda
      marquee.x -= marquee.speed * dt;

      // Bucle infinito: 
      // Si el primer bloque (A) sale por la izquierda, lo reposicionamos al final.
      if (marquee.x < -(textW + marquee.gap)) {
        marquee.x += (textW + marquee.gap);
      }

      marqA.style.transform = `translateX(${marquee.x}px)`;
      marqB.style.transform = `translateX(${marquee.x + textW + marquee.gap}px)`;

      marquee.rafId = requestAnimationFrame(step);
    }

    marquee.running = true;
    marquee.rafId = requestAnimationFrame(step);
  });
}

function setDisplay(text, { blink = false, off = false, marquee: useMarquee = false } = {}) {
  // Apagamos el marquee anterior siempre al cambiar texto
  hideMarquee();

  displayText.textContent = text;
  display.classList.toggle('off', off);

  // Control de parpadeo (Blink)
  if (blink) {
    displayText.classList.add('blink');
    // Quitamos transformaciones manuales para que la clase CSS .blink mande (centrado)
    displayText.style.transform = '';
    displayText.style.left = '';
  } else {
    displayText.classList.remove('blink');
  }

  // Si requiere marquesina (es una emisora sonando), iniciamos la animación siempre
  if (useMarquee) {
    startMarquee(text);
  }
}

// ===== Volumen / Mute =====
function setMuted(state) {
  isMuted = state;
  player.muted = state;
  knobMute.classList.toggle('off', state);
}

function syncVolume(v) {
  const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
  player.volume = vol;
  volPercentage.textContent = Math.round(vol * 100) + '%';
  if (vol <= 0.0001) setMuted(true);
  else if (isMuted) setMuted(false);
}

// ===== Inicialización =====
radio.classList.add('off');
display.classList.add('off');
setDisplay('Off', { blink: false, off: true, marquee: false });
syncVolume(volumeSlider.value);

// Power on/off
knobPower.addEventListener('click', () => {
  isOn = !isOn;

  if (isOn) {
    radio.classList.remove('off');
    display.classList.remove('off');
    knobPower.classList.remove('off');
    // Texto centrado y parpadeando
    setDisplay('Seleccione una emisora', { blink: true, off: false, marquee: false });
  } else {
    radio.classList.add('off');
    display.classList.add('off');
    knobPower.classList.add('off');

    try { player.pause(); } catch {}
    player.src = '';
    radio.classList.remove('playing');
    presets.forEach(p => p.classList.remove('active'));
    currentStation = null;
    setMuted(false);

    setDisplay('Off', { blink: false, off: true, marquee: false });
  }
});

// Mute
knobMute.addEventListener('click', () => {
  if (!isOn) return;
  setMuted(!isMuted);
});

// Presets
presets.forEach(preset => {
  preset.addEventListener('click', () => {
    if (!isOn) return;

    const freq = preset.dataset.freq || preset.textContent.trim();
    const src = preset.dataset.src;
    if (!src) return;

    // Si ya está sonando esta misma, pausamos
    if (currentStation === src && !player.paused) {
      player.pause();
      radio.classList.remove('playing');
      preset.classList.remove('active');
      setDisplay('En pausa', { blink: false, off: false, marquee: false });
      currentStation = null;
      return;
    }

    // Cambiar emisora
    presets.forEach(p => p.classList.remove('active'));
    preset.classList.add('active');
    
    // Mostrar "Conectando..." centrado y parpadeando (sin moverse)
    setDisplay('Conectando...', { blink: true, off: false, marquee: false });

    player.src = src;
    player.volume = parseFloat(volumeSlider.value);

    player.play()
      .then(() => {
        radio.classList.add('playing'); // Activa animación parlante CSS
        // Al reproducir, mostramos la frecuencia CON marquee siempre
        setDisplay(freq, { blink: false, off: false, marquee: true });
        currentStation = src;
      })
      .catch(err => {
        console.error('Error al reproducir:', err);
        radio.classList.remove('playing');
        setDisplay('Error conexión', { blink: false, off: false, marquee: false });
        preset.classList.remove('active');
        currentStation = null;
      });
  });
});

// Slider Volumen
volumeSlider.addEventListener('input', e => syncVolume(e.target.value));

// Rueda del mouse
radio.addEventListener('wheel', (e) => {
  if (!isOn) return;
  e.preventDefault();
  let v = parseFloat(volumeSlider.value) || 0;
  v += (e.deltaY < 0 ? 1 : -1) * 0.05;
  v = Math.max(0, Math.min(1, v));
  volumeSlider.value = v.toFixed(2);
  syncVolume(v);
}, { passive: false });

// Eventos Audio (backup visual)
player.addEventListener('playing', () => radio.classList.add('playing'));
player.addEventListener('pause', () => radio.classList.remove('playing'));
player.addEventListener('error', () => {
  radio.classList.remove('playing');
  setDisplay('Error', { blink: false, off: false, marquee: false });
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js?ver=13')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.error('SW error:', err));
  });
}









