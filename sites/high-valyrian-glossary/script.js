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
        const fetchDict = await response.json();

        // Ensure every item has a sectionGroup (defaulting to Section 1 if missing)
        dictionary = fetchDict.map(item => ({
            ...item,
            sectionGroup: item.sectionGroup || "Unit 1, Section 1"
        }));

        // Store active state locally
        localStorage.setItem('valyrianDict', JSON.stringify(dictionary));
    } catch (error) {
        const localData = localStorage.getItem('valyrianDict');
        if (localData) {
            dictionary = JSON.parse(localData);
        } else {
            dictionary = [];
        }
    }
    buildNavigationMenu();
    displayDictionary();
}

// Updated autoDetectPOS: Sentence vs single word check
function autoDetectPOS() {
    const input = document.getElementById('wordInput').value.trim();
    const checkboxes = document.querySelectorAll('.pos-checkbox');

    checkboxes.forEach(cb => cb.checked = false);

    if (!input || input.includes(' ')) {
        return;
    }
}

// Build Navigation Trees dynamically based on known arrays and captured custom items
function buildNavigationMenu() {
    const navMenu = document.getElementById('dynamicNavMenu');
    navMenu.innerHTML = '';

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
    
    const mainTitle = document.getElementById('pageMainTitle');
    if (type === 'all') {
        mainTitle.innerText = "High Valyrian Lexicon Dashboard";
    } else {
        const shortName = section ? (sectionTitlesMap[section] || section) : "Unit";
        mainTitle.innerText = type === 'vocab' ? `${shortName} (Vocabulary)` : `${shortName} (Sentences)`;
    }

    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');

    displayDictionary();
}

function displayDictionary() {
    const containerElement = document.getElementById('dictionaryContainer');
    
    // --- PERSISTENCE LOGIC: Capture current open/close states before wiping DOM ---
    const collapseStates = {};
    const existingDetails = containerElement.querySelectorAll('.dashboard-section-panel');
    existingDetails.forEach(details => {
        const sectionKey = details.getAttribute('data-section');
        if (sectionKey) {
            collapseStates[sectionKey] = details.open;
        }
    });

    containerElement.innerHTML = ''; 

    // Initialize tracking buckets
    const groups = {};
    sectionOrder.forEach(sec => {
        groups[sec] = [];
    });

    // Bucket items accurately
    dictionary.forEach((item) => {
        const section = item.sectionGroup || "Unit 1, Section 1";
        if (!groups[section]) groups[section] = [];
        groups[section].push(item);
    });

    const trackedGroups = new Set(sectionOrder);
    Object.keys(groups).forEach(key => trackedGroups.add(key));
    const fullOrder = Array.from(trackedGroups);

    let itemsRendered = 0;

    fullOrder.forEach(sectionTitle => {
        const sectionItems = groups[sectionTitle] || [];

        // Route matching filters
        if (currentView.type !== 'all' && currentView.section !== sectionTitle) return;

        // Separate Words vs Sentences based on presence of POS tags
        const wordsArray = sectionItems.filter(item => Array.isArray(item.pos) && item.pos.length > 0);
        const sentencesArray = sectionItems.filter(item => !item.pos || item.pos.length === 0);

        wordsArray.sort((a, b) => a.word.localeCompare(b.word));
        sentencesArray.sort((a, b) => a.word.localeCompare(b.word));

        let sectionBlock;

        if (currentView.type === 'all') {
            sectionBlock = document.createElement('details');
            sectionBlock.className = 'dashboard-section-panel unit-collapse';
            sectionBlock.setAttribute('data-section', sectionTitle); 

            if (collapseStates[sectionTitle] !== undefined) {
                sectionBlock.open = collapseStates[sectionTitle];
            } else {
                sectionBlock.open = true; 
            }

            const mainSummary = document.createElement('summary');
            mainSummary.className = 'dashboard-grid-header';
            mainSummary.style.cursor = 'pointer'; 
            mainSummary.innerText = sectionTitlesMap[sectionTitle] || sectionTitle;
            sectionBlock.appendChild(mainSummary);

        } else {
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

        // Display empty placeholder state if section has no entries for current view filter
        const isVocabEmpty = currentView.type === 'vocab' && wordsArray.length === 0;
        const isSentencesEmpty = currentView.type === 'sentences' && sentencesArray.length === 0;
        const isAllEmpty = currentView.type === 'all' && wordsArray.length === 0 && sentencesArray.length === 0;

        if (isVocabEmpty || isSentencesEmpty || isAllEmpty) {
            const emptyNotice = document.createElement('div');
            emptyNotice.className = 'empty-state';
            emptyNotice.style.padding = '15px 0';
            emptyNotice.innerText = 'No entries found in this category.';
            sectionBlock.appendChild(emptyNotice);
        }

        containerElement.appendChild(sectionBlock);
        itemsRendered++;
    });

    if (itemsRendered === 0) {
        containerElement.innerHTML = `<div class="empty-state">The lexicon is currently empty.</div>`;
    }
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
    const sortedDict = [...dictionary].sort((a, b) => {
        const orderA = sectionOrder.indexOf(a.sectionGroup || "Unit 1, Section 1");
        const orderB = sectionOrder.indexOf(b.sectionGroup || "Unit 1, Section 1");
        return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    });

    const dataStr = JSON.stringify(sortedDict, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = "words.json";
    link.click();
    
    URL.revokeObjectURL(url);
}

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    
    if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        toggleAdminPanel();
    }
});

loadDictionary();