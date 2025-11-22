// --- script.js ---

document.addEventListener('DOMContentLoaded', () => {

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

    // Modal DOM
    const modal = document.getElementById('modal-add');
    const btnModalSave = document.getElementById('btn-modal-save');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const inputName = document.getElementById('modal-name');
    const inputUrl = document.getElementById('modal-url');

    // Variables Estado
    let isOn = false;
    let isMuted = false;
    let currentStation = null;
    let savedVolume = 0.5; 
    
    // Marquee (Variables de animación)
    let marquee = { running: false, rafId: null, lastTs: null, x: 0, speed: 65, width: 0 }; 

    // --- 1. Inicialización de Presets ---

    function loadCustomPresets() {
      const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
      stored.forEach(radioData => {
        // false = no guardar de nuevo en storage (ya están ahí)
        createPresetButton(radioData.name, radioData.url, false);
      });
      
      // Ajustar texto de los botones originales (HTML)
      document.querySelectorAll('.preset:not(.add-btn)').forEach(btn => {
        fitButtonText(btn);
      });

      // Mover botón (+) al final
      if(btnAdd) presetsContainer.appendChild(btnAdd);
    }

    function fitButtonText(btn) {
      btn.classList.remove('small-text', 'multiline');
      if (isOverflowing(btn)) {
        btn.classList.add('small-text');
        if (isOverflowing(btn)) {
            btn.classList.add('multiline');
        }
      }
    }

    function isOverflowing(el) {
       return el.scrollWidth > el.clientWidth;
    }

    function createPresetButton(name, url, saveToStorage = true) {
      const btn = document.createElement('button');
      btn.className = 'preset custom-preset'; // Agregamos clase para identificarlo
      btn.textContent = name;
      btn.dataset.freq = name; 
      btn.dataset.src = url;

      // Evento Click: Aquí asignamos la función de reproducir
      btn.addEventListener('click', () => playStation(btn));

      if(btnAdd) {
          presetsContainer.insertBefore(btn, btnAdd);
      } else {
          presetsContainer.appendChild(btn);
      }
      
      requestAnimationFrame(() => fitButtonText(btn));

      if (saveToStorage) {
        const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
        stored.push({ name, url });
        localStorage.setItem('myCustomRadios', JSON.stringify(stored));
      }
    }

    // --- 2. Marquee (Efecto Letrero LED) ---
    const marqA = document.createElement('span');
    marqA.className = 'marq'; 
    marqA.style.position = 'absolute'; 
    marqA.style.whiteSpace = 'nowrap';
    marqA.style.top = '0'; 
    marqA.style.color = '#0f0'; 
    marqA.style.textShadow = '0 0 8px #0f0';
    marqA.style.display = 'none'; 
    marqA.style.left = '0';
    display.appendChild(marqA);

    function hideMarquee() {
      if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
      marquee.running = false; 
      marquee.lastTs = null;
      marqA.style.display = 'none';
      displayText.style.display = 'inline-block';
    }

    function startMarquee(text) {
      if (display.classList.contains('off')) return;
      
      marqA.textContent = text;
      marqA.style.display = 'inline-block';
      displayText.style.display = 'none';

      requestAnimationFrame(() => {
        const containerW = display.clientWidth;
        const textW = marqA.offsetWidth;
        
        // CORRECCIÓN: Inicia escondido a la derecha
        marquee.x = containerW; 
        marquee.width = textW;
        marquee.lastTs = null;

        function step(ts) {
          if (!marquee.running) return;
          if (!marquee.lastTs) marquee.lastTs = ts;
          const dt = (ts - marquee.lastTs) / 1000;
          marquee.lastTs = ts;

          marquee.x -= marquee.speed * dt;

          // CORRECCIÓN: Resetea solo cuando TODO el texto salió por la izquierda
          if (marquee.x < -marquee.width) {
             marquee.x = containerW; 
          }

          marqA.style.transform = `translateX(${marquee.x}px)`;
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

    // --- 3. Audio / Volumen ---
    function updateSpeakerAnimation() {
      if (!player.paused && !player.muted && player.volume > 0.01 && isOn) {
        radio.classList.add('playing');
      } else {
        radio.classList.remove('playing');
      }
    }

    function syncVolume(v) {
      const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
      player.volume = vol;
      const percentageDisplay = Math.round(vol * 100);
      volPercentage.textContent = percentageDisplay + '%';

      // Barra visual
      const sliderWidth = volumeSlider.offsetWidth || 300; 
      const thumbWidth = 20; 
      const centerPos = (vol * (sliderWidth - thumbWidth)) + (thumbWidth / 2);
      let p = (centerPos / sliderWidth) * 100;
      if (!isFinite(p)) p = 50;

      volumeSlider.style.background = `
        linear-gradient(to right, #ddd, #ddd) no-repeat right / ${100 - p}% 100%,
        linear-gradient(to right, #4CAF50 0%, #FFEB3B 50%, #F44336 100%) no-repeat left / 100% 100%
      `;

      // Lógica Mute
      if (vol <= 0.001) {
        if (!isMuted) {
             isMuted = true;
             knobMute.classList.add('off'); // Verde
        }
      } else {
        if (isMuted) {
             isMuted = false;
             knobMute.classList.remove('off');
        }
        savedVolume = vol;
      }
      
      updateSpeakerAnimation();
    }

    // --- 4. Reproducción ---
    function playStation(presetBtn) {
      if (!isOn) return;
      const freq = presetBtn.dataset.freq;
      const src = presetBtn.dataset.src;
      if (!src) return;

      // Reseteamos visualmente los botones
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
          // Ignoramos errores de interrupción (AbortError) por clicks rápidos
          if (err.name === 'AbortError') return;

          if (!isOn) return;
          console.error(err);
          radio.classList.remove('playing');
          setDisplay('Error conexión', { blink: false, off: false, marquee: false });
          presetBtn.classList.remove('active');
          currentStation = null;
        });
    }

    // --- 5. Lógica del Modal (Agregar Radio) ---
    function openModal() {
        if (!isOn) return; 
        modal.classList.remove('hidden');
        inputName.value = '';
        inputUrl.value = '';
        inputName.focus();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function saveStation() {
        const name = inputName.value.trim();
        const url = inputUrl.value.trim();
        
        if (!name || !url) {
            alert("Por favor completa ambos campos.");
            return;
        }
        
        // Advertencia de Protocolo Mixto
        if (location.protocol === 'https:' && url.startsWith('http:')) {
             if(!confirm("ADVERTENCIA: Estás en una página segura (HTTPS) e intentas agregar una radio insegura (HTTP). Es muy probable que no se escuche. ¿Deseas agregarla de todas formas?")) {
                 return;
             }
        }

        createPresetButton(name, url, true);
        closeModal();
    }

    // --- 6. Event Listeners ---
    
    // Init
    radio.classList.add('off');
    display.classList.add('off');
    setDisplay('Off', { blink: false, off: true, marquee: false });
    
    loadCustomPresets();
    
    // CORRECCIÓN IMPORTANTE:
    // Solo agregamos listeners globales a los botones ORIGINALES del HTML.
    // Los botones "custom" ya tienen su listener asignado en createPresetButton.
    document.querySelectorAll('.preset:not(.add-btn):not(.custom-preset)').forEach(p => {
        p.addEventListener('click', () => playStation(p));
    });

    // Ajuste inicial de volumen
    setTimeout(() => syncVolume(volumeSlider.value), 100);

    // Power
    knobPower.addEventListener('click', () => {
      isOn = !isOn;
      if (isOn) {
        radio.classList.remove('off');
        display.classList.remove('off');
        knobPower.classList.remove('off');
        setDisplay('Seleccione una emisora', { blink: true, off: false, marquee: false });
        syncVolume(volumeSlider.value); 
        document.querySelectorAll('.preset:not(.add-btn)').forEach(btn => fitButtonText(btn));
      } else {
        radio.classList.add('off');
        display.classList.add('off');
        knobPower.classList.add('off');
        try { player.pause(); } catch {}
        player.src = ''; 
        updateSpeakerAnimation();
        document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
        currentStation = null;
        if(isMuted) {
           isMuted = false;
           knobMute.classList.remove('off');
        }
        setDisplay('Off', { blink: false, off: true, marquee: false });
      }
    });

    // Mute (Con memoria)
    knobMute.addEventListener('click', () => {
      if (!isOn) return;
      
      if (isMuted) {
          // Restaurar volumen
          let target = savedVolume > 0.01 ? savedVolume : 0.5;
          volumeSlider.value = target;
          syncVolume(target);
      } else {
          // Mutear
          savedVolume = parseFloat(volumeSlider.value);
          volumeSlider.value = 0;
          syncVolume(0); 
      }
    });

    // Modal Events
    if (btnAdd) btnAdd.addEventListener('click', openModal);
    btnModalCancel.addEventListener('click', closeModal);
    btnModalSave.addEventListener('click', saveStation);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Inputs
    volumeSlider.addEventListener('input', e => syncVolume(e.target.value));
    
    window.addEventListener('resize', () => {
        if(isOn) syncVolume(volumeSlider.value);
    });

    radio.addEventListener('wheel', (e) => {
      if (!isOn) return;
      e.preventDefault();
      let v = parseFloat(volumeSlider.value) || 0;
      v += (e.deltaY < 0 ? 1 : -1) * 0.05;
      v = Math.max(0, Math.min(1, v));
      volumeSlider.value = v.toFixed(2);
      syncVolume(v);
    }, { passive: false });

    // Player Events
    player.addEventListener('playing', () => updateSpeakerAnimation());
    player.addEventListener('pause', () => updateSpeakerAnimation());
    
    player.addEventListener('error', () => {
      if (!isOn) return;
      updateSpeakerAnimation();
      
      // Diagnóstico de error HTTPS vs HTTP
      if (player.src.startsWith('http:') && location.protocol === 'https:') {
          setDisplay('Error: Usar HTTPS', { blink: false, off: false, marquee: false });
      } else {
          setDisplay('Error', { blink: false, off: false, marquee: false });
      }
    });

    // SW Register
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js?ver=23').catch(() => {});
    }

});
