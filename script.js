// 1. THE TIME (Only the first colon blinks)
function startClock() {
    const timeElement = document.getElementById('current-time');
    
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours() % 12 || 12;
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

        // Only the first colon gets the "blink" class
        timeElement.innerHTML = `${hours}<span class="blink">:</span>${minutes}:${seconds} ${ampm}`;
    }, 1000);
}

// 2. THE WEATHER (Keep as is)
async function fetchWeather() {
    const weatherElement = document.getElementById('current-weather');
    const iconElement = document.getElementById('weather-icon');
    
    try {
        // Updated URL: added 'u' before format to ensure Fahrenheit conversion
        const response = await fetch('https://wttr.in/Orlando?u&format=%C+%t');
        const data = await response.text();
        const displayData = data.toLowerCase();
        
        weatherElement.textContent = displayData;

        const icons = {
            sun: "☀️",
            clear: "☀️",
            cloud: "☁️",
            overcast: "☁️",
            rain: "🌧️",
            drizzle: "🌧️",
            thunder: "⛈️",
            fog: "🌫️",
            mist: "🌫️",
            snow: "❄️"
        };

        const match = Object.keys(icons).find(key => displayData.includes(key));
        iconElement.textContent = icons[match] || "✨";

    } catch (error) {
        weatherElement.textContent = "weather offline";
        iconElement.textContent = "📡";
    }
}

// --- 3. BLOG POST COUNTER ---
function updatePostCount() {
    // We target the blog entries
    const posts = document.querySelectorAll('.blog-entry');
    const counterElement = document.getElementById('post-count');
    
    if (counterElement) {
        // We use .length to count the number of <div> elements found
        counterElement.textContent = `entries: ${posts.length}`;
    }
}

// Ensure the functions run AFTER the page has fully loaded
window.addEventListener('load', () => {
    startClock();
    fetchWeather();
    updatePostCount();
});