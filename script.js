const radio = document.getElementById('radio');
const display = document.getElementById('display');
const displayText = document.getElementById('display-text');
const speaker = document.querySelector('.speaker');
const knobPower = document.getElementById('knob-power');
const knobMute = document.getElementById('knob-mute');
const presets = document.querySelectorAll('.preset');
const volumeSlider = document.getElementById('volume');
const volPercentage = document.getElementById('vol-percentage');
const player = document.getElementById('player');

let isOn = false;
let isMuted = false;
let currentStation = null;

// Power on/off
knobPower.addEventListener('click', () => {
  isOn = !isOn;
  
  if (isOn) {
    radio.classList.remove('off');
    display.classList.remove('off');
    knobPower.classList.remove('off');
    displayText.textContent = 'Selecciona una emisora';
  } else {
    radio.classList.add('off');
    display.classList.add('off');
    knobPower.classList.add('off');
    displayText.textContent = 'Off';
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
  
  if (isMuted) {
    knobMute.classList.add('off');
  } else {
    knobMute.classList.remove('off');
  }
});

// Presets
presets.forEach(preset => {
  preset.addEventListener('click', () => {
    if (!isOn) return;
    
    const freq = preset.getAttribute('data-freq');
    const src = preset.getAttribute('data-src');
    
    if (currentStation === src && !player.paused) {
      // Si ya está sonando, pausar
      player.pause();
      radio.classList.remove('playing');
      preset.classList.remove('active');
      displayText.textContent = 'En pausa';
      currentStation = null;
    } else {
      // Cambiar de emisora o reanudar
      player.src = src;
      player.volume = volumeSlider.value;
      player.play().catch(err => {
        console.error('Error al reproducir:', err);
        displayText.textContent = 'Error de conexión';
      });
      
      presets.forEach(p => p.classList.remove('active'));
      preset.classList.add('active');
      radio.classList.add('playing');
      displayText.textContent = freq;
      currentStation = src;
    }
  });
});

// Volume control
volumeSlider.addEventListener('input', (e) => {
  const vol = e.target.value;
  player.volume = vol;
  volPercentage.textContent = Math.round(vol * 100) + '%';
});

// Volume control con ruedita del mouse
volumeSlider.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  let currentVol = parseFloat(volumeSlider.value);
  const step = 0.05; // Incremento/decremento
  
  if (e.deltaY < 0) {
    // Scroll hacia arriba = subir volumen
    currentVol = Math.min(1, currentVol + step);
  } else {
    // Scroll hacia abajo = bajar volumen
    currentVol = Math.max(0, currentVol - step);
  }
  
  volumeSlider.value = currentVol;
  player.volume = currentVol;
  volPercentage.textContent = Math.round(currentVol * 100) + '%';
});

// Handle audio errors
player.addEventListener('error', () => {
  displayText.textContent = 'Error al cargar';
  radio.classList.remove('playing');
});

player.addEventListener('playing', () => {
  radio.classList.add('playing');
});

player.addEventListener('pause', () => {
  radio.classList.remove('playing');
});



