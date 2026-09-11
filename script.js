// --- script.js ---

// Google Cast invoca esta función cuando termina de cargar su API.
window.__onGCastApiAvailable = function(isAvailable) {
    window.__googleCastApiAvailable = isAvailable;
    window.dispatchEvent(new CustomEvent('google-cast-api-available', {
        detail: { isAvailable }
    }));
};

document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos DOM ---
    const radio = document.getElementById('radio');
    const display = document.getElementById('display');
    const displayText = document.getElementById('display-text');
    const knobPower = document.getElementById('knob-power');
    const knobMute = document.getElementById('knob-mute');
    const knobInfo = document.getElementById('knob-info'); 
    const castControl = document.getElementById('cast-control');
    const presetsContainer = document.getElementById('presets-container');
    const btnAdd = document.getElementById('btn-add');
    const volumeSlider = document.getElementById('volume');
    const volPercentage = document.getElementById('vol-percentage');
    const player = document.getElementById('player');

    // Modal AGREGAR
    const modal = document.getElementById('modal-add');
    const btnModalSave = document.getElementById('btn-modal-save');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const inputName = document.getElementById('modal-name');
    const inputUrl = document.getElementById('modal-url');
    const inputInfoHidden = document.getElementById('modal-info-hidden'); 
    const searchResults = document.getElementById('search-results');

    // Modal ELIMINAR (NUEVO)
    const modalDelete = document.getElementById('modal-delete');
    const btnDeleteConfirm = document.getElementById('btn-delete-confirm');
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');
    const deleteMsg = document.getElementById('delete-msg');

    // Variables Estado
    let isOn = false;
    let isMuted = false;
    let isInfoActive = false;
    let currentStation = null;
    let currentName = "";     
    let currentInfo = "";     
    let currentStreamUrl = "";
    let savedVolume = 0.5; 
    let castInitialized = false;
    let castVolumeSession = null;
    let castVolumeHandler = null;
    
    // Variable temporal para saber qué borrar
    let itemToDelete = null; 

    let hls = null;
    let marquee = { running: false, rafId: null, lastTs: null, x: 0, speed: 65, width: 0 }; 

    // --- 1. Inicialización ---

    function setCastControlVisible(isVisible) {
      if (!castControl) return;
      castControl.classList.toggle('cast-available', isVisible);
      castControl.setAttribute('aria-hidden', String(!isVisible));
    }

    function getCastSession() {
      if (!castInitialized || !window.cast || !cast.framework) return null;
      return cast.framework.CastContext.getInstance().getCurrentSession();
    }

    function syncVolumeFromCast(session, event = null) {
      if (!session) return;

      const eventVolume = event && typeof event.volume === 'number' ? event.volume : null;
      const sessionVolume = typeof session.getVolume === 'function' ? session.getVolume() : null;
      const volume = eventVolume ?? sessionVolume;
      const eventMuted = event && typeof event.isMute === 'boolean' ? event.isMute : null;
      const sessionMuted = typeof session.isMute === 'function' ? session.isMute() : false;
      const muted = eventMuted ?? sessionMuted;

      if (typeof volume === 'number' && Number.isFinite(volume)) {
        volumeSlider.value = Math.max(0, Math.min(1, volume));
        syncVolume(volumeSlider.value, { sendToCast: false });
      }

      isMuted = Boolean(muted) || Number(volume) <= 0.001;
      knobMute.classList.toggle('off', isMuted);
    }

    function detachCastVolumeSync() {
      if (castVolumeSession && castVolumeHandler) {
        castVolumeSession.removeEventListener(
          cast.framework.SessionEventType.VOLUME_CHANGED,
          castVolumeHandler
        );
      }
      castVolumeSession = null;
      castVolumeHandler = null;
    }

    function attachCastVolumeSync(session) {
      if (!session || castVolumeSession === session) return;
      detachCastVolumeSync();

      castVolumeSession = session;
      castVolumeHandler = (event) => syncVolumeFromCast(session, event);
      session.addEventListener(
        cast.framework.SessionEventType.VOLUME_CHANGED,
        castVolumeHandler
      );
      syncVolumeFromCast(session);
    }

    function getCastContentType(src) {
      const cleanSrc = src.toLowerCase().split('?')[0];
      if (cleanSrc.endsWith('.m3u8')) return 'application/x-mpegURL';
      if (cleanSrc.endsWith('.ogg') || cleanSrc.endsWith('.oga')) return 'audio/ogg';
      if (cleanSrc.endsWith('.wav')) return 'audio/wav';
      if (cleanSrc.endsWith('.aac')) return 'audio/aac';
      return 'audio/mpeg';
    }

    function pauseLocalPlayback() {
      if (hls) {
        hls.destroy();
        hls = null;
      }
      try { player.pause(); } catch {}
      player.removeAttribute('src');
      try { player.load(); } catch {}
      updateSpeakerAnimation();
    }

    function loadCurrentStationOnCast() {
      const session = getCastSession();
      if (!session || !currentStreamUrl) return Promise.resolve(false);

      const mediaInfo = new chrome.cast.media.MediaInfo(
        currentStreamUrl,
        getCastContentType(currentStreamUrl)
      );
      mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
      mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
      mediaInfo.metadata.title = currentName;
      mediaInfo.metadata.subtitle = currentInfo || 'Radios de Villa Regina';

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;

      return session.loadMedia(request).then(() => {
        pauseLocalPlayback();
        currentStation = 'playing';
        if (isInfoActive) {
          setDisplay(currentInfo, { blink: false, off: false, marquee: true });
        } else {
          setDisplay(currentName, { blink: false, off: false, marquee: true });
        }
        return true;
      }).catch((error) => {
        console.error('No se pudo enviar la radio al televisor:', error);
        setDisplay('Error al enviar a TV', { blink: false, off: false, marquee: false });
        return false;
      });
    }

    function initializeCastApi() {
      if (castInitialized || !window.cast || !window.chrome || !chrome.cast) return;

      const castContext = cast.framework.CastContext.getInstance();
      castContext.setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      });

      castInitialized = true;

      const updateCastVisibility = () => {
        const hasDevices = castContext.getCastState() !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
        setCastControlVisible(hasDevices);
      };

      castContext.addEventListener(
        cast.framework.CastContextEventType.CAST_STATE_CHANGED,
        updateCastVisibility
      );

      castContext.addEventListener(
        cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        (event) => {
          if (
            event.sessionState === cast.framework.SessionState.SESSION_STARTED ||
            event.sessionState === cast.framework.SessionState.SESSION_RESUMED
          ) {
            attachCastVolumeSync(event.session || getCastSession());
            loadCurrentStationOnCast();
          } else if (
            event.sessionState === cast.framework.SessionState.SESSION_ENDED ||
            event.sessionState === cast.framework.SessionState.SESSION_START_FAILED
          ) {
            detachCastVolumeSync();
          }
        }
      );

      updateCastVisibility();
    }

    setCastControlVisible(false);
    window.addEventListener('google-cast-api-available', (event) => {
      if (event.detail.isAvailable) initializeCastApi();
    });
    if (window.__googleCastApiAvailable) initializeCastApi();

    function loadCustomPresets() {
      const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
      stored.forEach(radioData => {
        createPresetButton(radioData.name, radioData.url, radioData.info || "Radio Personalizada", false);
      });
      document.querySelectorAll('.preset:not(.add-btn)').forEach(btn => fitButtonText(btn));
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

    function createPresetButton(name, url, info, saveToStorage = true) {
      const btn = document.createElement('button');
      btn.className = 'preset custom-preset'; 
      btn.textContent = name;
      btn.dataset.freq = name; 
      btn.dataset.src = url;
      btn.dataset.info = info; 
      btn.title = "Clic derecho para eliminar";

      btn.addEventListener('click', () => playStation(btn));

      // --- CAMBIO: ABRIR MODAL EN LUGAR DE CONFIRM NATIVO ---
      btn.addEventListener('contextmenu', (e) => {
        e.preventDefault(); 
        // Guardamos los datos de la radio que se quiere borrar
        itemToDelete = { name, url, element: btn };
        openDeleteModal(name);
      });

      if(btnAdd) {
          presetsContainer.insertBefore(btn, btnAdd);
      } else {
          presetsContainer.appendChild(btn);
      }
      
      requestAnimationFrame(() => fitButtonText(btn));

      if (saveToStorage) {
        const stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
        stored.push({ name, url, info });
        localStorage.setItem('myCustomRadios', JSON.stringify(stored));
      }
    }

    function deleteCustomRadio(nameToDelete, urlToDelete) {
        let stored = JSON.parse(localStorage.getItem('myCustomRadios') || '[]');
        stored = stored.filter(r => r.name !== nameToDelete || r.url !== urlToDelete);
        localStorage.setItem('myCustomRadios', JSON.stringify(stored));
    }

    // --- LÓGICA MODAL ELIMINAR ---
    function openDeleteModal(radioName) {
        deleteMsg.textContent = `¿Deseas eliminar "${radioName}" de tus favoritos?`;
        modalDelete.classList.remove('hidden');
    }

    function closeDeleteModal() {
        modalDelete.classList.add('hidden');
        itemToDelete = null; // Limpiar memoria
    }

    // Confirmar Borrado
    btnDeleteConfirm.addEventListener('click', () => {
        if (itemToDelete) {
            deleteCustomRadio(itemToDelete.name, itemToDelete.url);
            itemToDelete.element.remove(); // Borrar del DOM
            closeDeleteModal();
        }
    });

    // Cancelar Borrado
    btnDeleteCancel.addEventListener('click', closeDeleteModal);
    
    // Cerrar al hacer clic afuera
    modalDelete.addEventListener('click', (e) => {
        if (e.target === modalDelete) closeDeleteModal();
    });

    // --- 2. Marquee ---
    const marqA = document.createElement('span');
    marqA.className = 'marq'; marqA.style.position = 'absolute'; marqA.style.whiteSpace = 'nowrap';
    marqA.style.top = '0'; marqA.style.color = '#0f0'; marqA.style.textShadow = '0 0 8px #0f0';
    marqA.style.display = 'none'; marqA.style.left = '0';
    display.appendChild(marqA);

    function hideMarquee() {
      if (marquee.rafId) cancelAnimationFrame(marquee.rafId);
      marquee.running = false; marquee.lastTs = null;
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
        marquee.x = containerW; marquee.width = textW; marquee.lastTs = null;

        function step(ts) {
          if (!marquee.running) return;
          if (!marquee.lastTs) marquee.lastTs = ts;
          const dt = (ts - marquee.lastTs) / 1000;
          marquee.lastTs = ts;
          marquee.x -= marquee.speed * dt;
          if (marquee.x < -marquee.width) marquee.x = containerW; 
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

    function syncVolume(v, { sendToCast = true } = {}) {
      const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
      player.volume = vol;

      const castSession = getCastSession();
      if (sendToCast && castSession && typeof castSession.setVolume === 'function') {
        const requests = [castSession.setVolume(vol)];
        if (vol > 0.001 && typeof castSession.isMute === 'function' && castSession.isMute()) {
          requests.push(castSession.setMute(false));
        }
        Promise.all(requests).catch((error) => {
          console.error('No se pudo cambiar el volumen del televisor:', error);
        });
      }

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

      if (vol <= 0.001) {
        if (!isMuted) { isMuted = true; knobMute.classList.add('off'); }
      } else {
        if (isMuted) { isMuted = false; knobMute.classList.remove('off'); }
        savedVolume = vol;
      }
      updateSpeakerAnimation();
    }

    // --- 4. Reproducción ---
    function playStation(presetBtn) {
      if (!isOn) return;
      
      const freq = presetBtn.dataset.freq; 
      const src = presetBtn.dataset.src;
      const info = presetBtn.dataset.info || "Información no disponible";
      
      if (!src) return;

      currentName = freq;
      currentInfo = info;
      currentStreamUrl = src;

      document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
      presetBtn.classList.add('active');
      
      setDisplay('Conectando...', { blink: true, off: false, marquee: false });

      if (getCastSession()) {
          loadCurrentStationOnCast();
          return;
      }

      if (hls) {
          hls.destroy();
          hls = null;
      }

      if (src.includes('.m3u8')) {
          if (Hls.isSupported()) {
              hls = new Hls();
              hls.loadSource(src);
              hls.attachMedia(player);
              hls.on(Hls.Events.MANIFEST_PARSED, function() {
                  player.volume = parseFloat(volumeSlider.value);
                  player.play().then(onPlaySuccess).catch(onPlayError);
              });
              hls.on(Hls.Events.ERROR, function (event, data) {
                  if (data.fatal) onPlayError(data);
              });
          }
          else if (player.canPlayType('application/vnd.apple.mpegurl')) {
              player.src = src;
              player.volume = parseFloat(volumeSlider.value);
              player.play().then(onPlaySuccess).catch(onPlayError);
          }
      } else {
          player.src = src;
          player.volume = parseFloat(volumeSlider.value);
          player.play().then(onPlaySuccess).catch(onPlayError);
      }
    }

    function onPlaySuccess() {
        updateSpeakerAnimation();
        if (isInfoActive) {
            setDisplay(currentInfo, { blink: false, off: false, marquee: true });
        } else {
            setDisplay(currentName, { blink: false, off: false, marquee: true });
        }
        currentStation = "playing"; 
    }

    function onPlayError(err) {
        if (err && err.name === 'AbortError') return;
        if (!isOn) return;
        console.error(err);
        radio.classList.remove('playing');
        setDisplay('Error conexión', { blink: false, off: false, marquee: false });
        document.querySelectorAll('.preset.active').forEach(p => p.classList.remove('active'));
        currentStation = null;
    }

    // --- 5. Modal AGREGAR ---
    function openModal() {
        if (!isOn) return; 
        modal.classList.remove('hidden');
        inputName.value = '';
        inputUrl.value = '';
        inputInfoHidden.value = ''; 
        searchResults.classList.add('hidden');
        inputName.focus();
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    inputName.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        searchResults.innerHTML = ''; 

        if (term.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        const matches = stationDirectory.filter(station => 
            station.name.toLowerCase().includes(term) || 
            station.info.toLowerCase().includes(term)
        );

        if (matches.length > 0) {
            searchResults.classList.remove('hidden');
            matches.forEach(station => {
                const div = document.createElement('div');
                div.className = 'result-item';
                div.innerHTML = `
                    <div class="result-name" style="font-size: 1rem; padding: 5px;">${station.name}</div>
                `;
                div.addEventListener('click', () => {
                    inputName.value = station.name;
                    inputUrl.value = station.url;
                    inputInfoHidden.value = station.info;
                    searchResults.classList.add('hidden');
                });
                searchResults.appendChild(div);
            });
        } else {
            searchResults.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!inputName.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });

    function saveStation() {
        const name = inputName.value.trim();
        const url = inputUrl.value.trim();
        const info = inputInfoHidden.value || "Radio Agregada Manualmente";
        
        if (!name || !url) {
            alert("Por favor completa ambos campos.");
            return;
        }
        
        if (location.protocol === 'https:' && url.startsWith('http:')) {
             if(!confirm("Advertencia: HTTPS vs HTTP. ¿Continuar?")) return;
        }

        createPresetButton(name, url, info, true);
        closeModal();
    }

    // --- 6. Event Listeners ---
    
    radio.classList.add('off');
    display.classList.add('off');
    setDisplay('Off', { blink: false, off: true, marquee: false });
    
    loadCustomPresets();
    
    document.querySelectorAll('.preset:not(.add-btn):not(.custom-preset)').forEach(p => {
        p.addEventListener('click', () => playStation(p));
    });

    setTimeout(() => syncVolume(volumeSlider.value, { sendToCast: false }), 100);

    // Power
    knobPower.addEventListener('click', () => {
      isOn = !isOn;
      if (isOn) {
        radio.classList.remove('off');
        display.classList.remove('off');
        knobPower.classList.remove('off');
        setDisplay('Seleccione una emisora', { blink: true, off: false, marquee: false });
        const castSession = getCastSession();
        if (castSession) {
          syncVolumeFromCast(castSession);
        } else {
          syncVolume(volumeSlider.value);
        }
        document.querySelectorAll('.preset:not(.add-btn)').forEach(btn => fitButtonText(btn));
      } else {
        radio.classList.add('off');
        display.classList.add('off');
        knobPower.classList.add('off');
        
        if (hls) {
            hls.destroy();
            hls = null;
        }
        try { player.pause(); } catch {}
        player.src = ''; 
        
        updateSpeakerAnimation();
        document.querySelectorAll('.preset').forEach(p => p.classList.remove('active'));
        currentStation = null;
        currentStreamUrl = '';
        if (getCastSession()) {
            cast.framework.CastContext.getInstance().endCurrentSession(true);
        }
        if(isMuted) { isMuted = false; knobMute.classList.remove('off'); }
        isInfoActive = false; knobInfo.classList.remove('active'); 
        setDisplay('Off', { blink: false, off: true, marquee: false });
      }
    });

    // Mute
    knobMute.addEventListener('click', () => {
      if (!isOn) return;

      const castSession = getCastSession();
      if (castSession && typeof castSession.setMute === 'function') {
          const targetMuted = !(typeof castSession.isMute === 'function' && castSession.isMute());
          castSession.setMute(targetMuted).then(() => {
              syncVolumeFromCast(castSession, {
                  volume: castSession.getVolume(),
                  isMute: targetMuted
              });
          }).catch((error) => {
              console.error('No se pudo cambiar el mute del televisor:', error);
          });
          return;
      }

      if (isMuted) {
          let target = savedVolume > 0.01 ? savedVolume : 0.5;
          volumeSlider.value = target;
          syncVolume(target);
      } else {
          savedVolume = parseFloat(volumeSlider.value);
          volumeSlider.value = 0;
          syncVolume(0); 
      }
    });

    // Info
    knobInfo.addEventListener('click', () => {
        if (!isOn) return;
        isInfoActive = !isInfoActive;
        knobInfo.classList.toggle('active', isInfoActive);

        if (currentStation === "playing") {
            if (isInfoActive) {
                setDisplay(currentInfo, { blink: false, off: false, marquee: true });
            } else {
                setDisplay(currentName, { blink: false, off: false, marquee: true });
            }
        }
    });

    if (btnAdd) btnAdd.addEventListener('click', openModal);
    btnModalCancel.addEventListener('click', closeModal);
    btnModalSave.addEventListener('click', saveStation);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    volumeSlider.addEventListener('input', e => syncVolume(e.target.value));
    window.addEventListener('resize', () => {
      if(isOn) syncVolume(volumeSlider.value, { sendToCast: false });
    });
    radio.addEventListener('wheel', (e) => {
      if (!isOn) return; e.preventDefault();
      let v = parseFloat(volumeSlider.value) || 0;
      v += (e.deltaY < 0 ? 1 : -1) * 0.05;
      v = Math.max(0, Math.min(1, v));
      volumeSlider.value = v.toFixed(2);
      syncVolume(v);
    }, { passive: false });

    player.addEventListener('playing', () => updateSpeakerAnimation());
    player.addEventListener('pause', () => updateSpeakerAnimation());
    player.addEventListener('error', (e) => {
      if (!isOn) return;
      if (!hls) { 
          updateSpeakerAnimation();
          if (player.src.startsWith('http:') && location.protocol === 'https:') {
              setDisplay('Error: Usar HTTPS', { blink: false, off: false, marquee: false });
          } else {
              setDisplay('Error', { blink: false, off: false, marquee: false });
          }
      }
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js?ver=33').catch(() => {});
    }

});
