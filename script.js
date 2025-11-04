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

// ====== Marquee continuo (JS) ======
// Creamos dos spans para un loop sin cortes: [A][gap][B] → se reciclan
const marqueeA = document.createElement('span');
const marqueeB = document.createElement('span');
[marqueeA, marqueeB].forEach(s => {
  s.style.position = 'absolute';
  s.style.whiteSpace = 'nowrap';
  s.style.left = '0';
  s.style.top = '0';
  // anulamos cualquier animación CSS previa que tengas en .display span
  s.style.animation = 'none';
  s.style.textShadow = '0 0 8px #0f0';
  s.style.color = '#0f0';
});
display.appendChild(marqueeA);
display.appendChild(marqueeB);

let marquee = {
  running: false,
  rafId: null,
  lastTs: null,
  x: 0,
  speed: 60,   // px/s
  gap: 40,     // px entre A y B
  width: 0
};

function hideMarquee() {
  if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
  marquee.running = false;
  marquee.lastTs = null;
  marqueeA.style.display = 'none';
  marqueeB.style.display = 'none';
  // reactivamos el span original
  displayText.style.display = 'inline-block';
}

function startMarquee(text) {
  // si el display está en OFF, no corremos marquee
  if (display.classList.contains('off')) return;

  // usamos dos copias del texto
  marqueeA.textContent = text;
  marqueeB.textContent = text;

  // medimos al próximo frame (con el span ya en el DOM)
  marqueeA.style.display = 'inline-block';
  marqueeB.style.display = 'inline-block';

  // ocultamos el span "estático" original
  displayText.style.display = 'none';

  requestAnimationFrame(() => {
    const containerW = display.clientWidth;
    const textW = marqueeA.offsetWidth; // ancho del texto
    marquee.width = textW;

    // Si el texto entra en el display, no hace falta desplazar: mostramos centrado con el span original
    if (textW <= containerW) {
      hideMarquee();
      displayText.textContent = text;
      displayText.classList.remove('blink');
      display.classList.remove('off');
      return;
    }

    marquee.x = 0; // arranca pegado a la derecha del contenedor (ver transform abajo)
    marquee.lastTs = null;

    function step(ts) {
      if (!marquee.running) return;
      if (!marquee.lastTs) marquee.lastTs = ts;
      const dt = (ts - marquee.lastTs) / 1000;
      marquee.lastTs = ts;

      marquee.x -= marquee.speed * dt;
      const total = marquee.width + marquee.gap;

      // reciclamos cuando A sale completamente por la izquierda
      if (marquee.x <= -total) {
        marquee.x += total;
      }

      // Posicionamos A y B
      // A arranca en x; B lo sigue detrás a distancia total
      marqueeA.style.transform = `translateX(${marquee.x}px)`;
      marqueeB.style.transform = `translateX(${marquee.x + total}px)`;

      marquee.rafId = requestAnimationFrame(step);
    }

    marquee.running = true;
    marquee.rafId = requestAnimationFrame(step);
  });
}

function setDisplay(text, { blink = false, off = false, marquee: useMarquee = false } = {}) {
  // Cuando no queremos marquee, nos aseguramos de apagarlo
  if (!useMarquee) hideMarquee();

  displayText.textContent = text;
  displayText.classList.toggle('blink', blink);
  display.classList.toggle('off', off);

  if (useMarquee) {
    // Mostramos un instante el contenido con el span original (por si tarda la medición),
    // y arrancamos el marquee JS.
    displayText.style.display = 'inline-block';
    startMarquee(text);
  }
}

function setMuted(state) {
  isMuted = state;
  player.muted = state;
  knobMute.classList.toggle('off', state); // tu CSS pinta el botón
}

function syncVolume(v) {
  const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
  player.volume = vol;
  volPercentage.textContent = Math.round(vol * 100) + '%';

  if (vol <= 0.0001) {
    setMuted(true);     // Volumen 0 => Mute encendido
  } else if (isMuted) {
    setMuted(false);    // Subir volumen => desmutea
  }
}

// ===== Estado inicial: OFF (verde titilando suave ya lo maneja tu CSS para .off) =====
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
    setDisplay('Seleccionar radio', { blink: true, off: false, marquee: false });
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

    if (currentStation === src && !player.paused) {
      player.pause();
      radio.classList.remove('playing');
      preset.classList.remove('active');
      setDisplay('En pausa', { blink: false, off: false, marquee: false });
      currentStation = null;
      return;
    }

    presets.forEach(p => p.classList.remove('active'));
    preset.classList.add('active');
    setDisplay('Conectando…', { blink: true, off: false, marquee: false });

    player.src = src;
    player.volume = parseFloat(volumeSlider.value);

    player.play()
      .then(() => {
        radio.classList.add('playing');
        // Al sonar, activamos marquee continuo para el nombre de la emisora
        setDisplay(freq, { blink: false, off: false, marquee: true });
        currentStation = src;
      })
      .catch(err => {
        console.error('Error al reproducir:', err);
        radio.classList.remove('playing');
        setDisplay('Error de conexión', { blink: false, off: false, marquee: false });
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
  setDisplay('Error al cargar', { blink: false, off: false, marquee: false });
});
player.addEventListener('playing', () => radio.classList.add('playing'));
player.addEventListener('pause', () => radio.classList.remove('playing'));

// --- PWA: registrar service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js?ver=5')  // subí el número si cambiás sw.js
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.error('SW error:', err));
  });
}








