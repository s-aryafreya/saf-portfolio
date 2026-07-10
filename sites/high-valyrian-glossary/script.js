let dictionary = [];
let editIndex = null; 
let isAdminSession = false; 

// State Engine Router Metrics
let currentView = {
    type: 'all', // 'all', 'vocab', or 'sentences'
    section: null // Specific matching section string targeted
};

const sectionTitlesMap = {
    "Unit 1, Section 1": "Unit 1, Section 1 — Forming Basic Sentences",
    "Unit 1, Section 2": "Unit 1, Section 2 — Use Basic Phrases",
    "Unit 1, Section 3": "Unit 1, Section 3 — Form Sentences"
};

const sectionOrder = ["Unit 1, Section 1", "Unit 1, Section 2", "Unit 1, Section 3"];

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

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
    buildNavigationMenu();
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
        if (type === 'possessive-adjective' && words.includes('my')) cb.checked = true;
        else if (type === 'possessive-pronoun' && words.includes('mine')) cb.checked = true;
        else if (type === 'verb' && (
            definition.startsWith('to ') || definition.startsWith('is ') || 
            definition.startsWith('are ') || definition.startsWith('am') || 
            definition.startsWith('is') || definition.startsWith('are')|| 
            definition.endsWith('are') || definition.endsWith('ing') 
        )) cb.checked = true;
        else if (type === 'noun' && (definition.startsWith('a ') || definition.startsWith('an ') || definition.startsWith('the '))) cb.checked = true;
        else if (type === 'adjective' && (definition.startsWith('describing') || definition.startsWith('having') || definition.startsWith('is') || definition.endsWith('ful'))) cb.checked = true;
        else if (type === 'adverb' && (definition.endsWith('ly') || definition.startsWith('in a'))) cb.checked = true;
    });
}

// Build Navigation Trees dynamically based on known arrays and captured custom items
function buildNavigationMenu() {
    const navMenu = document.getElementById('dynamicNavMenu');
    navMenu.innerHTML = '';

    // Find custom user added sections not indexed explicitly
    const trackedGroups = new Set(sectionOrder);
    dictionary.forEach(item => { if(item.sectionGroup) trackedGroups.add(item.sectionGroup); });
    const fullOrder = Array.from(trackedGroups);

    fullOrder.forEach(section => {
        const displayLabel = sectionTitlesMap[section] || section;

        const sectionNavBlock = document.createElement('div');
        sectionNavBlock.className = 'nav-section-block';
        sectionNavBlock.innerHTML = `
            <div class="nav-section-title">${displayLabel}</div>
            <ul class="nav-sublinks">
                <li><a href="#" onclick="navigateTo('vocab', '${section}')">📇 Vocabulary</a></li>
                <li><a href="#" onclick="navigateTo('sentences', '${section}')">💬 Basic Sentences</a></li>
            </ul>
        `;
        navMenu.appendChild(sectionNavBlock);
    });
}

function navigateTo(type, section = null) {
    currentView.type = type;
    currentView.section = section;
    
    // Update Title Banner Presentation Contextually
    const mainTitle = document.getElementById('pageMainTitle');
    if (type === 'all') {
        mainTitle.innerText = "High Valyrian Lexicon Dashboard";
    } else {
        const shortName = section ? (sectionTitlesMap[section] || section) : "Unit";
        mainTitle.innerText = type === 'vocab' ? `${shortName} (Vocabulary)` : `${shortName} (Sentences)`;
    }

    // Dismiss slider view tracking states natively if processing a mobile window breakpoint
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');

    displayDictionary();
}

function displayDictionary() {
    const containerElement = document.getElementById('dictionaryContainer');
    
    // --- PERSISTENCE LOGIC: Capture current open/close states before wiping the DOM ---
    const collapseStates = {};
    const existingDetails = containerElement.querySelectorAll('.dashboard-section-panel');
    existingDetails.forEach(details => {
        const sectionKey = details.getAttribute('data-section');
        if (sectionKey) {
            collapseStates[sectionKey] = details.open;
        }
    });

    containerElement.innerHTML = ''; 

    if (dictionary.length === 0) {
        containerElement.innerHTML = `<div class="empty-state">The lexicon is currently empty.</div>`;
        return;
    }

    // Organize items into structural arrays
    const groups = {};
    dictionary.forEach((item) => {
        const section = item.sectionGroup || "Unit 1, Section 1";
        if (!groups[section]) groups[section] = [];
        groups[section].push(item);
    });

    const trackedGroups = new Set(sectionOrder);
    Object.keys(groups).forEach(key => trackedGroups.add(key));
    const fullOrder = Array.from(trackedGroups);

    // --- VIEW ROUTER RENDERING ENGINE ---
    fullOrder.forEach(sectionTitle => {
        if (!groups[sectionTitle] || groups[sectionTitle].length === 0) return;

        // Route matching filters
        if (currentView.type !== 'all' && currentView.section !== sectionTitle) return;

        const wordsArray = groups[sectionTitle].filter(item => item.pos && item.pos.length > 0);
        const sentencesArray = groups[sectionTitle].filter(item => !item.pos || item.pos.length === 0);

        wordsArray.sort((a, b) => a.word.localeCompare(b.word));
        sentencesArray.sort((a, b) => a.word.localeCompare(b.word));

        let sectionBlock;

        // If on the Main Dashboard view, make the whole panel an interactive collapsible block
        if (currentView.type === 'all') {
            sectionBlock = document.createElement('details');
            sectionBlock.className = 'dashboard-section-panel unit-collapse';
            sectionBlock.setAttribute('data-section', sectionTitle); // Tag for tracking state

            // Check if user previously collapsed this specific group
            if (collapseStates[sectionTitle] !== undefined) {
                sectionBlock.open = collapseStates[sectionTitle];
            } else {
                sectionBlock.open = true; // Default open
            }

            // Create interactive summary header
            const mainSummary = document.createElement('summary');
            mainSummary.className = 'dashboard-grid-header';
            mainSummary.style.cursor = 'pointer'; // Visual indicator that it collapses
            mainSummary.innerText = sectionTitlesMap[sectionTitle] || sectionTitle;
            sectionBlock.appendChild(mainSummary);

        } else {
            // If on a dedicated subpage (Vocab/Sentences), display as a standard open block layout
            sectionBlock = document.createElement('div');
            sectionBlock.className = 'dashboard-section-panel';
        }

        // Render Vocabulary Sub-Blocks
        if ((currentView.type === 'all' || currentView.type === 'vocab') && wordsArray.length > 0) {
            const vocabWrapper = document.createElement('div');
            vocabWrapper.className = 'subsection-container';
            if (currentView.type === 'all') {
                vocabWrapper.innerHTML = `<div class="subsection-title">Vocabulary</div>`;
            }

            const colGrid = document.createElement('div');
            colGrid.className = 'vocabulary-three-column-grid';

            wordsArray.forEach(item => {
                colGrid.appendChild(createCardItem(item));
            });

            vocabWrapper.appendChild(colGrid);
            sectionBlock.appendChild(vocabWrapper);
        }

        // Render Sentences Sub-Blocks
        if ((currentView.type === 'all' || currentView.type === 'sentences') && sentencesArray.length > 0) {
            const sentenceWrapper = document.createElement('div');
            sentenceWrapper.className = 'subsection-container';
            if (currentView.type === 'all') {
                sentenceWrapper.innerHTML = `<div class="subsection-title">Basic Sentences</div>`;
            }

            const ul = document.createElement('ul');
            ul.className = 'dictionary-list';

            sentencesArray.forEach(item => {
                ul.appendChild(createCardItem(item));
            });

            sentenceWrapper.appendChild(ul);
            sectionBlock.appendChild(sentenceWrapper);
        }

        if (sectionBlock.children.length > 0) {
            containerElement.appendChild(sectionBlock);
        }
    });
}

function createCardItem(item) {
    const globalIndex = dictionary.indexOf(item);
    const itemContainer = document.createElement('div');
    
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
        itemContainer.className = 'word-card sentence-card-item';
        itemContainer.innerHTML = `
            <div class="word-content sentence-layout">
                <div class="sentence-text">${item.word}</div>
                <div class="sentence-meaning">${item.definition}</div>
            </div>
            ${adminActionsHTML}
        `;
    } else {
        itemContainer.className = 'word-card vocab-card-item';
        let tagsHTML = '';
        item.pos.forEach(tag => {
            const labelText = tag.replace('-', ' ');
            tagsHTML += `<span class="pos-tag ${tag}">${labelText}</span>`;
        });

        itemContainer.innerHTML = `
            <div class="word-content">
                <div class="word-header-row">
                    <span class="word-title">${item.word}</span>
                </div>
                <div class="tags-container" style="margin-bottom: 8px;">${tagsHTML}</div>
                <div class="word-definition">${item.definition}</div>
            </div>
            ${adminActionsHTML}
        `;
    }
    return itemContainer;
}

function submitWord() {
    const wordInput = document.getElementById('wordInput');
    const definitionInput = document.getElementById('definitionInput');
    const sectionGroup = document.getElementById('sectionGroup').value;
    const submitBtn = document.getElementById('submitBtn');

    const word = wordInput.value.trim();
    const definition = definitionInput.value.trim();
    
    const selectedPOS = [];
    document.querySelectorAll('.pos-checkbox:checked').forEach(cb => { selectedPOS.push(cb.value); });

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
    buildNavigationMenu();
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
        buildNavigationMenu();
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