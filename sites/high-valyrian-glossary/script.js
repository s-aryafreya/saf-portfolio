let dictionary = []; // Initialized as empty to allow words.json to load
let editIndex = null; 

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
}

// FIX 1: Load the static JSON file on page load, fallback to localStorage if needed
async function loadDictionary() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('Could not load words.json');
        dictionary = await response.json();
    } catch (error) {
        console.log("No words.json detected or file is empty. Falling back to local cache.");
        dictionary = JSON.parse(localStorage.getItem('valyrianDict')) || [];
    }
    displayDictionary();
}

// MULTI-TAG AUTO-DETECT LOGIC (Kept exactly as you wrote it!)
function autoDetectPOS() {
    const definition = document.getElementById('definitionInput').value.trim().toLowerCase();
    const checkboxes = document.querySelectorAll('.pos-checkbox');

    // Uncheck everything first before parsing fresh text
    checkboxes.forEach(cb => cb.checked = false);

    if (definition === '') return;

    // Break down entry text into safe word matching segments
    const words = definition.split(/[\s,./?!\(\)]+/);

    checkboxes.forEach(cb => {
        const type = cb.value;

        // 1. Possessive Adjective matching ("my")
        if (type === 'possessive-adjective' && words.includes('my')) {
            cb.checked = true;
        }
        // 2. Possessive Pronoun matching ("mine")
        else if (type === 'possessive-pronoun' && words.includes('mine')) {
            cb.checked = true;
        }
        // 3. Verb structural tests
        else if (type === 'verb' && (
            definition.startsWith('to ') || definition.startsWith('is ') || 
            definition.startsWith('are ') || 
            definition.startsWith('am') || 
            definition.startsWith('is') || 
            definition.startsWith('are')|| definition.endsWith('are') || definition.endsWith('ing') 
        )) {
            cb.checked = true;
        } 
        // 4. Noun structural tests
        else if (type === 'noun' && (
            definition.startsWith('a ') || definition.startsWith('an ') || definition.startsWith('the ')
        )) {
            cb.checked = true;
        } 
        // 5. Adjective structural tests
        else if (type === 'adjective' && (
            definition.startsWith('describing') || definition.startsWith('having') || definition.startsWith('is') || definition.endsWith('ful')
        )) {
            cb.checked = true;
        }
        // 6. Adverb structural tests
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
        listElement.innerHTML = `<li class="empty-state">The lexicon is currently empty. Press '~' to open the workspace.</li>`;
        return;
    }

    dictionary.sort((a, b) => a.word.localeCompare(b.word));

    dictionary.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'word-card';
        
        // Loop through array elements and print individual label badges
        let tagsHTML = '';
        if (Array.isArray(item.pos)) {
            item.pos.forEach(tag => {
                // Formatting clean UI text labels from code tokens
                const labelText = tag.replace('-', ' ');
                tagsHTML += `<span class="pos-tag ${tag}">${labelText}</span>`;
            });
        }

        li.innerHTML = `
            <div class="word-content">
                <div class="word-header-row">
                    <span class="word-title">${item.word}</span>
                    <div class="tags-container">${tagsHTML}</div>
                </div>
                <div class="word-definition">${item.definition}</div>
            </div>
            <div class="admin-actions">
                <button class="edit-btn" onclick="startEdit(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteWord(${index})">×</button>
            </div>
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
    
    // Gather all checked parts of speech into an array list
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
    
    // Reset checkboxes and map stored array strings back into check states
    document.querySelectorAll('.pos-checkbox').forEach(cb => {
        cb.checked = Array.isArray(item.pos) && item.pos.includes(cb.value);
    });
    
    editIndex = index;
    document.getElementById('submitBtn').innerText = 'Update Entry';
    
    const panel = document.getElementById('adminPanel');
    panel.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

// FIX 2: Added the export utility function so you can generate your data file seamlessly
function exportJSON() {
    const dataStr = JSON.stringify(dictionary, null, 4);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "words.json";
    link.click();
}

// FIX 3: Replaced raw call with loadDictionary setup trigger
loadDictionary();

// Hidden Admin Key Trigger: Press the `~` key to toggle your workspace
window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
        toggleAdminPanel();
    }
});