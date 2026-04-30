// script1.js
window.addEventListener('DOMContentLoaded', () => {
    const audioUrl = "sounds/fantasyloop.mp3"; 
    let audio = document.getElementById('bg-music');
    
    // 1. Initialize or find the Audio Element
    if (!audio) {
        audio = document.createElement('audio');
        audio.id = 'bg-music';
        audio.loop = true; // This handles the actual looping
        audio.src = audioUrl;
        
        // Check for a saved volume preference from a previous page
        const savedVolume = localStorage.getItem('globalVolume');
        audio.volume = (savedVolume !== null) ? parseFloat(savedVolume) : 0.08; 
        
        document.body.appendChild(audio);
    }

    // 2. Sync playback time across pages
    const savedTime = localStorage.getItem('musicTime');
    if (savedTime) {
        audio.currentTime = parseFloat(savedTime);
    }

    // 3. Handle Autoplay via user interaction
    const playAudio = () => {
        audio.play().catch(() => {
            console.log("Autoplay blocked. Waiting for user interaction.");
        });
        document.removeEventListener('click', playAudio);
    };
    document.addEventListener('click', playAudio);

    // 4. Volume Slider Logic
    const slider = document.getElementById('volume-slider');
    if (slider) {
        slider.value = audio.volume;

        slider.addEventListener('input', (e) => {
            const val = e.target.value;
            audio.volume = val;
            localStorage.setItem('globalVolume', val);
        });
    }

    // 5. Looping Reset Logic
    // When the song loops, reset the stored time so it starts fresh on the next page
    audio.addEventListener('ended', () => {
        localStorage.setItem('musicTime', 0);
    });

    // 6. Save state every second
    setInterval(() => {
        if (!audio.paused) {
            localStorage.setItem('musicTime', audio.currentTime);
        }
    }, 1000);
});