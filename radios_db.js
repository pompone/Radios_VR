// --- radios_db.js ---
// Base de datos de emisoras para el buscador
// Estructura: { name: "Nombre", url: "Link", info: "Información para el display" }

const stationDirectory = [
    { 
        name: "Mega 98.3", 
        url: "https://mega.stweb.tv/mega983/live/playlist.m3u8", 
        info: "Puro Rock Nacional" 
    },
    { 
        name: "La 100", 
        url: "https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3?dist=la100_webplayer", 
        info: "La radio más escuchada" 
    },
    { 
        name: "Aspen 102.3 Mhz", 
        url: "https://26653.live.streamtheworld.com/ASPEN.mp3", 
        info: "Clásicos Pop & Rock. Dorrego 1782, Capital Federal , Argentina" 
    },
    { 
        name: "Radio Disney", 
        url: "https://26563.live.streamtheworld.com/DISNEY_ARG_BA_SC", 
        info: "Solo éxitos. Es una emisora de Argentina para niños y adolescentes que transmite desde la ciudad de Buenos Aires en una frecuencia de 94.3 FM" 
    },
    { 
        name: "Los 40 Argentina", 
        url: "https://frontend.radiohdvivo.com/los40/live?dist=los40-web-live_streaming_play", 
        info: "Todos los éxitos. Transmite desde la Ciudad de Buenos Aires en una frecuencia de 105.5" 
    },
    { 
        name: "Radio Continental", 
        url: "https://frontend.radiohdvivo.com/continental/live", 
        info: "Noticias y Fútbol. AM 590 es una emisora nacional e internacional de noticias en español que transmite en toda Argentina." 
    },
    { 
        name: "Rivadavia 630", 
        url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RIVADAVIAAAC.aac", 
        info: "La radio de la gente, transmitiendo desde la ciudad de Buenos Aires" 
    },
    { 
        name: "Cadena 3", 
        url: "https://liveradio.mediainbox.net/radio3.mp3", 
        info: "Cadena 3 es una emisora de radio argentina que transmite en la ciudad de Córdoba en AM 700 y FM 100.5" 
    },
    { 
        name: "Vale 97.5 Mhz", 
        url: "https://vale.stweb.tv/vale/live/playlist.m3u8", 
        info: "Música Latina" 
    },
    { 
        name: "Pop Radio 101.5 Mhz", 
        url: "https://popradio.stweb.tv/popradio/live/playlist.m3u8", 
        info: "La vida al aire. Es una emisora de música que transmite entretenimiento y noticias de última hora de la ciudad de Buenos Aires" 
    },
    { 
        name: "Rock & Pop", 
        url: "https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKANDPOPAAC.aac", 
        info: "Rock & Pop 95.9 MHz" 
    },
    { 
        name: "Blue 100.7", 
        url: "https://playerservices.streamtheworld.com/api/livestream-redirect/BLUE_FM_100_7AAC.aac", 
        info: "Blue FM es la emisora de radio de música Argentina que transmite desde la Ciudad Autónoma de Buenos Aires en 100.7 FM" 
    },
    { 
        name: "Latina", 
        url: "https://stream-gtlc.telecentro.net.ar/hls/radiolatinahls/main.m3u8", 
        info: "La radio de los clásicos. FM Latina 101.1 es una emisora de radio musical que emite desde la Ciudad Autónoma de Buenos Aires, Argentina. Comenzó a transmitir el 1 de junio de 2002" 
    }
];

