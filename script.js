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

    // Variables Estado
    let isOn = false;
    let isMuted = false;
    let currentStation = null;
    // Marquee: Solo necesitamos un objeto simple ahora
    let marquee = { running: false, rafId: null, lastTs: null, x: 0, speed: 65, width: 0 }; 

    // --- 1. Gestión de Presets y Texto Adaptable ---

    function loadCustomPresets() {
      const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
      stored.forEach(radioData => {
        createPresetButton(radioData.name, radioData.url, false);
      });
      
      // Ajustar botones originales
      document.querySelectorAll('.preset:not(.add-btn)').forEach(btn => {
        fitButtonText(btn);
      });

      if(btnAdd) presetsContainer.appendChild(btnAdd);
    }

    // Función de ajuste de texto mejorada
    function fitButtonText(btn) {
      btn.classList.remove('small-text', 'multiline');
      
      // 1. Check overflow normal
      if (isOverflowing(btn)) {
        btn.classList.add('small-text');
        
        // 2. Si sigue desbordando, pasamos a multilinea
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
      btn.className = 'preset';
      btn.textContent = name;
      btn.dataset.freq = name; 
      btn.dataset.src = url;

      btn.addEventListener('click', () => playStation(btn));

      if(btnAdd) {
          presetsContainer.insertBefore(btn, btnAdd);
      } else {
          presetsContainer.appendChild(btn);
      }
      
      // Esperamos un frame para que el navegador renderice y podamos medir
      requestAnimationFrame(() => fitButtonText(btn));

      if (saveToStorage) {
        const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
        stored.push({ name, url });
        localStorage.setItem('myCustomRadios', JSON.stringify(stored));
      }
    }

    // --- 2. Marquee (Texto desplazable tipo Letrero) ---
    // Usamos SOLO UN span, ya no necesitamos el B para el bucle infinito
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

      // Esperamos a que se renderice para medir anchos
      requestAnimationFrame(() => {
        const containerW = display.clientWidth;
        const textW = marqA.offsetWidth;
        
        // CORRECCIÓN: Posición inicial = Ancho del contenedor (totalmente a la derecha fuera de vista)
        marquee.x = containerW; 
        marquee.width = textW;
        marquee.lastTs = null;

        function step(ts) {
          if (!marquee.running) return;
          if (!marquee.lastTs) marquee.lastTs = ts;
          const dt = (ts - marquee.lastTs) / 1000;
          marquee.lastTs = ts;

          // Mover a la izquierda
          marquee.x -= marquee.speed * dt;

          // CORRECCIÓN: Si la posición X es menor que el ancho negativo del texto
          // (significa que el texto ya salió completamente por la izquierda)
          // entonces reseteamos a la derecha.
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

    function setMuted(state) {
      isMuted = state;
      player.muted = state;
      knobMute.classList.toggle('off', state);
      updateSpeakerAnimation();
    }

    function syncVolume(v) {
      const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
      player.volume = vol;
      const percentageDisplay = Math.round(vol * 100);
      volPercentage.textContent = percentageDisplay + '%';

      const sliderWidth = volumeSlider.offsetWidth || 300; 
      const thumbWidth = 20; 
      const centerPos = (vol * (sliderWidth - thumbWidth)) + (thumbWidth / 2);
      let p = (centerPos / sliderWidth) * 100;
      if (!isFinite(p)) p = 50;

      volumeSlider.style.background = `
        linear-gradient(to right, #ddd, #ddd) no-repeat right / ${100 - p}% 100%,
        linear-gradient(to right, #4CAF50 0%, #FFEB3B 50%, #F44336 100%) no-repeat left / 100% 100%
      `;

      if (vol <= 0.0001) updateSpeakerAnimation();
      else {
        if (isMuted) setMuted(false);
        updateSpeakerAnimation();
      }
    }

    // --- 4. Reproducción ---
    function playStation(presetBtn) {
      if (!isOn) return;
      const freq = presetBtn.dataset.freq;
      const src = presetBtn.dataset.src;
      if (!src) return;

      if (currentStation === src && !player.paused) {
        player.pause();
        updateSpeakerAnimation();
        presetBtn.classList.remove('active');
        setDisplay('En pausa', { blink: false, off: false, marquee: false });
        currentStation = null;
        return;
      }

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
          if (!isOn) return;
          console.error(err);
          radio.classList.remove('playing');
          setDisplay('Error conexión', { blink: false, off: false, marquee: false });
          presetBtn.classList.remove('active');
          currentStation = null;
        });
    }

    // --- 5. Eventos ---
    
    radio.classList.add('off');
    display.classList.add('off');
    setDisplay('Off', { blink: false, off: true, marquee: false });
    
    loadCustomPresets();
    
    document.querySelectorAll('.preset:not(.add-btn)').forEach(p => {
        p.addEventListener('click', () => playStation(p));
    });

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
        // Re-chequear textos al encender
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
        setMuted(false);
        setDisplay('Off', { blink: false, off: true, marquee: false });
      }
    });

    // Mute
    knobMute.addEventListener('click', () => {
      if (!isOn) return;
      setMuted(!isMuted);
    });

    // Botón +
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const name = prompt("Ingrese el nombre de la radio:");
        if (!name) return;
        const url = prompt("Ingrese la URL del streaming (.mp3/aac):");
        if (!url) return;

        if (url.startsWith('http')) {
            createPresetButton(name, url, true);
        } else {
            alert('URL inválida. Debe comenzar con http o https.');
        }
      });
    }

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

    player.addEventListener('playing', () => updateSpeakerAnimation());
    player.addEventListener('pause', () => updateSpeakerAnimation());
    
    player.addEventListener('error', () => {
      if (!isOn) return;
      updateSpeakerAnimation();
      setDisplay('Error', { blink: false, off: false, marquee: false });
    });

    // SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js?ver=21').catch(() => {});
    }

});
