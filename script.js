function syncVolume(v) {
  // Asegurar rango 0-1
  const vol = Math.max(0, Math.min(1, parseFloat(v) || 0));
  player.volume = vol;
  
  const percentageDisplay = Math.round(vol * 100);
  volPercentage.textContent = percentageDisplay + '%';
  
  // --- LÓGICA DE BARRA VISUAL (CORREGIDA) ---
  // 1. Calculamos la posición del CENTRO del botón (thumb) en porcentaje relativo
  // Esto corrige el desfasaje geométrico del botón de 20px
  const sliderWidth = volumeSlider.offsetWidth || 300;
  const thumbWidth = 20; 
  // Posición en píxeles del centro del botón
  const centerPos = (vol * (sliderWidth - thumbWidth)) + (thumbWidth / 2);
  // Convertimos a porcentaje (0 - 100)
  const p = (centerPos / sliderWidth) * 100;

  // 2. Aplicamos el truco de la doble capa (Cortina Gris sobre Gradiente Fijo)
  // Capa 1 (Arriba): Gris (#ddd). Ancho = Lo que falta para llegar a 100% (100 - p). Alineado a la derecha.
  // Capa 2 (Abajo): Gradiente Tricolor. Ancho = 100%. Fijo.
  volumeSlider.style.background = `
    linear-gradient(to right, #ddd, #ddd) no-repeat right / ${100 - p}% 100%,
    linear-gradient(to right, #4CAF50 0%, #FFEB3B 50%, #F44336 100%) no-repeat left / 100% 100%
  `;

  // Lógica de Mute / Animación
  if (vol <= 0.0001) {
    updateSpeakerAnimation();
  } else {
    if (isMuted) setMuted(false);
    updateSpeakerAnimation();
  }
}
