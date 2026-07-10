let dictionary = [];
let editIndex = null; 
let isAdminSession = false; 

function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
    isAdminSession = !panel.classList.contains('hidden');
    displayDictionary();
}

async function loadDictionary() {
    try {
        const response = await fetch('words.json');
        if (!response.ok) throw new Error('Could not load words.json');
        dictionary = await response.json();
    } catch (error) {
        dictionary = JSON.parse(localStorage.getItem('valyrianDict')) || [];
    }
    displayDictionary();
}

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
    const containerElement = document.getElementById('dictionaryContainer');
    containerElement.innerHTML = ''; 

    if (dictionary.length === 0) {
        containerElement.innerHTML = `<div class="empty-state">The lexicon is currently empty.</div>`;
        return;
    }

    // Grouping structural matrix logic
    const groups = {};
    dictionary.forEach((item) => {
        const section = item.sectionGroup || "Unit 1, Section 1";
        if (!groups[section]) {
            groups[section] = [];
        }
        groups[section].push(item);
    });

    const sectionOrder = ["Unit 1, Section 1", "Unit 1, Section 2", "Unit 1, Section 3"];
    Object.keys(groups).forEach(key => {
        if (!sectionOrder.includes(key)) sectionOrder.push(key);
    });

    // --- NEW: Map your raw section keys to descriptive custom display titles ---
    const sectionTitlesMap = {
        "Unit 1, Section 1": "Unit 1, Section 1 — Forming Basic Sentences",
        "Unit 1, Section 2": "Unit 1, Section 2 — Use Basic Phrases",
        "Unit 1, Section 3": "Unit 1, Section 3 — Form Sentences",
    };

    sectionOrder.forEach(sectionTitle => {
        if (!groups[sectionTitle] || groups[sectionTitle].length === 0) return;

        // Parent Collapsible Main Section Container
        const mainDetails = document.createElement('details');
        mainDetails.className = 'unit-collapse';
        mainDetails.open = true; 

        const mainSummary = document.createElement('summary');
        mainSummary.className = 'unit-header';
        
        // Use the mapped title if it exists, otherwise fall back to the raw name
        mainSummary.innerText = sectionTitlesMap[sectionTitle] || sectionTitle;
        mainDetails.appendChild(mainSummary);

        // Separate vocabulary components vs sentences dynamically
        const wordsArray = groups[sectionTitle].filter(item => item.pos && item.pos.length > 0);
        const sentencesArray = groups[sectionTitle].filter(item => !item.pos || item.pos.length === 0);

        // Sort subsets alphabetically
        wordsArray.sort((a, b) => a.word.localeCompare(b.word));
        sentencesArray.sort((a, b) => a.word.localeCompare(b.word));

        // SUBSECTION A: Vocabulary Words
        if (wordsArray.length > 0) {
            const subSectionDiv = document.createElement('div');
            subSectionDiv.className = 'subsection-container';
            subSectionDiv.innerHTML = `<div class="subsection-title">Vocabulary</div>`;
            
            const ul = document.createElement('ul');
            ul.className = 'dictionary-list';

            wordsArray.forEach(item => {
                ul.appendChild(createCardItem(item));
            });

            subSectionDiv.appendChild(ul);
            mainDetails.appendChild(subSectionDiv);
        }

        // SUBSECTION B: Sentences Block
        if (sentencesArray.length > 0) {
            const subSectionDiv = document.createElement('div');
            subSectionDiv.className = 'subsection-container';
            subSectionDiv.innerHTML = `<div class="subsection-title">Basic Sentences</div>`;
            
            const ul = document.createElement('ul');
            ul.className = 'dictionary-list';

            sentencesArray.forEach(item => {
                ul.appendChild(createCardItem(item));
            });

            subSectionDiv.appendChild(ul);
            mainDetails.appendChild(subSectionDiv);
        }

        containerElement.appendChild(mainDetails);
    });
}

// Extracted Card Element Component Generator to stop repetitive injection architecture
function createCardItem(item) {
    const globalIndex = dictionary.indexOf(item);
    const li = document.createElement('li');
    li.className = 'word-card';

    let adminActionsHTML = '';
    if (isAdminSession) {
        adminActionsHTML = `
            <div class="admin-actions">
                <button class="edit-btn" onclick="startEdit(${globalIndex})">Edit</button>
                <button class="delete-btn" onclick="deleteWord(${globalIndex})">×</button>
            </div>
        `;
    }

    if (!item.pos || item.pos.length === 0) {
        li.innerHTML = `
            <div class="word-content sentence-layout">
                <div class="sentence-text">${item.word}</div>
                <div class="sentence-meaning">${item.definition}</div>
            </div>
            ${adminActionsHTML}
        `;
    } else {
        let tagsHTML = '';
        item.pos.forEach(tag => {
            const labelText = tag.replace('-', ' ');
            tagsHTML += `<span class="pos-tag ${tag}">${labelText}</span>`;
        });

        li.innerHTML = `
            <div class="word-content">
                <div class="word-header-row">
                    <span class="word-title">${item.word}</span>
                    <div class="tags-container">${tagsHTML}</div>
                </div>
                <div class="word-definition">${item.definition}</div>
            </div>
            ${adminActionsHTML}
        `;
    }
    return li;
}

function submitWord() {
    const wordInput = document.getElementById('wordInput');
    const definitionInput = document.getElementById('definitionInput');
    const sectionGroup = document.getElementById('sectionGroup').value;
    const submitBtn = document.getElementById('submitBtn');

    const word = wordInput.value.trim();
    const definition = definitionInput.value.trim();
    
    const selectedPOS = [];
    document.querySelectorAll('.pos-checkbox:checked').forEach(cb => {
        selectedPOS.push(cb.value);
    });

    if (word === '' || definition === '') return;

    const entryData = { word, definition, pos: selectedPOS, sectionGroup };

    if (editIndex !== null) {
        dictionary[editIndex] = entryData;
        editIndex = null; 
        submitBtn.innerText = 'Commit to Lexicon';
    } else {
        dictionary.push(entryData);
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
    document.getElementById('sectionGroup').value = item.sectionGroup || "Unit 1, Section 1";
    
    document.querySelectorAll('.pos-checkbox').forEach(cb => {
        cb.checked = Array.isArray(item.pos) && item.pos.includes(cb.value);
    });
    
    editIndex = index;
    document.getElementById('submitBtn').innerText = 'Update Entry';
    
    const panel = document.getElementById('adminPanel');
    panel.classList.remove('hidden');
    isAdminSession = true;
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

function exportJSON() {
    const dataStr = JSON.stringify(dictionary, null, 4);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "words.json";
    link.click();
}

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        toggleAdminPanel();
    }
});

loadDictionary();