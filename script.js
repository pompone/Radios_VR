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

// ===== Blink por JS (no depende del CSS) =====
let blinkTimer = null;
function startBlink() {
  stopBlink();
  displayText.style.visibility = 'visible';
  blinkTimer = setInterval(() => {
    displayText.style.visibility =
      displayText.style.visibility === 'hidden' ? 'visible' : 'hidden';
  }, 550);
}
function stopBlink() {
  if (blinkTimer) clearInterval(blinkTimer);
  blinkTimer = null;
  displayText.style.visibility = 'visible';
}

// ===== Marquee continuo con 2 copias (sin cortes) =====
const marqA = document.createElement('span');
const marqB = document.createElement('span');
[marqA, marqB].forEach(s => {
  s.className = 'marq';
  s.style.position = 'absolute';
  s.style.whiteSpace = 'nowrap';
  // anular reglas .display span del CSS
  s.style.setProperty('animation', 'none', 'important');
  s.style.setProperty('left', '0', 'important');
  s.style.top = '0';
  s.style.color = '#0f0';
  s.style.textShadow = '0 0 8px #0f0';
  s.style.display = 'none';
});
display.appendChild(marqA);
display.appendChild(marqB);

let marquee = {
  running: false,
  rafId: null,
  lastTs: null,
  x: 0,
  speed: 70,     // px/s
  gap: 40,       // separación entre las copias
  width: 0,
  overshoot: 12, // para asegurarnos de que sale totalmente por la izquierda
};

function hideMarquee() {
  if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
  marquee.running = false;
  marquee.lastTs = null;
  marqA.style.display = 'none';
  marqB.style.display = 'none';
  displayText.style.display = 'inline-block';
}

function startMarquee(text) {
  if (display.classList.contains('off')) return;

  marqA.textContent = text;
  marqB.textContent = text;
  marqA.style.display = 'inline-block';
  marqB.style.display = 'inline-block';
  displayText.style.display = 'none'; // ocultamos el span original

  // medir en el próximo frame
  requestAnimationFrame(() => {
    const containerW = display.clientWidth;  // ancho visible del display (sin borde)
    const textW = marqA.offsetWidth;
    marquee.width = textW;

    // Si entra, no usamos marquee
    if (textW <= containerW) {
      hideMarquee();
      displayText.textContent = text;
      stopBlink();
      display.classList.remove('off');
      return;
    }

    // Arrancamos justo fuera de la derecha (con overshoot para que entre “limpio”)
    marquee.x = containerW + marquee.overshoot;
    marquee.lastTs = null;

    function step(ts) {
      if (!marquee.running) return;
      if (!marquee.lastTs) marquee.lastTs = ts;
      const dt = (ts - marquee.lastTs) / 1000;
      marquee.lastTs = ts;

      marquee.x -= marquee.speed * dt;

      // cuando A salió completamente por la izquierda (con overshoot)
      if (marquee.x <= -(textW + marquee.overshoot)) {
        marquee.x += textW + marquee.gap;
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
  // Si no hay marquee, lo apagamos sí o sí
  if (!useMarquee) hideMarquee();

  displayText.textContent = text;
  display.classList.toggle('off', off);

  if (blink) startBlink(); else stopBlink();

  if (useMarquee) startMarquee(text);
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

// ===== Estado inicial: OFF (verde) =====
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

// --- PWA: registrar service worker (usa tu nombre: service-worker.js) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js?ver=7')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.error('SW error:', err));
  });
}








