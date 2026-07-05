let dictionary = [];
let editIndex = null; 
// Tracks if you have unlocked the admin panel session using your secret key
let isAdminSession = false; 

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
    
    // Toggle admin session state and refresh the UI to reveal/hide actions
    isAdminSession = !panel.classList.contains('hidden');
    displayDictionary();
}

// FIX 1: Securely fetch from your public JSON data first, fallback to draft cache if empty
async function loadDictionary() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('Could not load words.json');
        dictionary = await response.json();
    } catch (error) {
        console.log("Reading from local database storage instead.");
        dictionary = JSON.parse(localStorage.getItem('valyrianDict')) || [];
    }
    displayDictionary();
}

// MULTI-TAG AUTO-DETECT LOGIC (Preserved exactly)
function autoDetectPOS() {
    const definition = document.getElementById('definitionInput').value.trim().toLowerCase();
    const checkboxes = document.querySelectorAll('.pos-checkbox');

    checkboxes.forEach(cb => cb.checked = false);
    if (definition === '') return;

    const words = definition.split(/[\s,./?!\(\)]+/);

    checkboxes.forEach(cb => {
        const type = cb.value;
        if (type === 'possessive-adjective' && words.includes('my')) {
            cb.checked = true;
        }
        else if (type === 'possessive-pronoun' && words.includes('mine')) {
            cb.checked = true;
        }
        else if (type === 'verb' && (
            definition.startsWith('to ') || definition.startsWith('is ') || 
            definition.startsWith('are ') || 
            definition.startsWith('am') || 
            definition.startsWith('is') || 
            definition.startsWith('are')|| definition.endsWith('are') || definition.endsWith('ing') 
        )) {
            cb.checked = true;
        } 
        else if (type === 'noun' && (
            definition.startsWith('a ') || definition.startsWith('an ') || definition.startsWith('the ')
        )) {
            cb.checked = true;
        } 
        else if (type === 'adjective' && (
            definition.startsWith('describing') || definition.startsWith('having') || definition.startsWith('is') || definition.endsWith('ful')
        )) {
            cb.checked = true;
        }
        else if (type === 'adverb' && (
            definition.endsWith('ly') || definition.startsWith('in a')
        )) {
            cb.checked = true;
        }
    });
}

function displayDictionary() {
    const listElement = document.getElementById('dictionaryList');
    listElement.innerHTML = ''; 

    if (dictionary.length === 0) {
        listElement.innerHTML = `<li class="empty-state">The lexicon is currently empty.</li>`;
        return;
    }

    dictionary.sort((a, b) => a.word.localeCompare(b.word));

    dictionary.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'word-card';
        
        let tagsHTML = '';
        if (Array.isArray(item.pos)) {
            item.pos.forEach(tag => {
                const labelText = tag.replace('-', ' ');
                tagsHTML += `<span class="pos-tag ${tag}">${labelText}</span>`;
            });
        }

        // FIX 2: Only compile and show edit/delete actions if your admin session is unlocked
        let actionsHTML = '';
        if (isAdminSession) {
            actionsHTML = `
                <div class="admin-actions">
                    <button class="edit-btn" onclick="startEdit(${index})">Edit</button>
                    <button class="delete-btn" onclick="deleteWord(${index})">×</button>
                </div>
            `;
        }

        li.innerHTML = `
            <div class="word-content">
                <div class="word-header-row">
                    <span class="word-title">${item.word}</span>
                    <div class="tags-container">${tagsHTML}</div>
                </div>
                <div class="word-definition">${item.definition}</div>
            </div>
            ${actionsHTML}
        `;
        listElement.appendChild(li);
    });
}

function submitWord() {
    const wordInput = document.getElementById('wordInput');
    const definitionInput = document.getElementById('definitionInput');
    const submitBtn = document.getElementById('submitBtn');

    const word = wordInput.value.trim();
    const definition = definitionInput.value.trim();
    
    const selectedPOS = [];
    document.querySelectorAll('.pos-checkbox:checked').forEach(cb => {
        selectedPOS.push(cb.value);
    });

    if (word === '' || definition === '') return;

    if (editIndex !== null) {
        dictionary[editIndex] = { word, definition, pos: selectedPOS };
        editIndex = null; 
        submitBtn.innerText = 'Commit to Lexicon';
    } else {
        dictionary.push({ word, definition, pos: selectedPOS });
    }

    localStorage.setItem('valyrianDict', JSON.stringify(dictionary));
    displayDictionary();
    
    wordInput.value = '';
    definitionInput.value = '';
    document.querySelectorAll('.pos-checkbox').forEach(cb => cb.checked = false);
}

function startEdit(index) {
    const item = dictionary[index];
    
    document.getElementById('wordInput').value = item.word;
    document.getElementById('definitionInput').value = item.definition;
    
    document.querySelectorAll('.pos-checkbox').forEach(cb => {
        cb.checked = Array.isArray(item.pos) && item.pos.includes(cb.value);
    });
    
    editIndex = index;
    document.getElementById('submitBtn').innerText = 'Update Entry';
}

function deleteWord(index) {
    if(confirm("Remove this entry permanently?")) {
        if (editIndex === index) {
            editIndex = null;
            document.getElementById('submitBtn').innerText = 'Commit to Lexicon';
        }
        dictionary.splice(index, 1); 
        localStorage.setItem('valyrianDict', JSON.stringify(dictionary)); 
        displayDictionary(); 
    }
}

// FIX 3: Export tool generates a ready-to-replace words.json payload file
function exportJSON() {
    const dataStr = JSON.stringify(dictionary, null, 4);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "words.json";
    link.click();
}

// FIX 4: Securely listen globally across all elements for the '~' key trigger
window.addEventListener('keydown', (e) => {
    // If you are typing inside a form input field, ignore shortcut execution
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        toggleAdminPanel();
    }
});

loadDictionary();