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

// --- 2. BLOG POST COUNTER ---
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
    updatePostCount();
});