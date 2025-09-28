
import { defaultWords, contextPairs } from './data.js';
/* =========================
   State & Constants
   ========================= */
const PER_SET = 50;                 // words per set for pagination
let wordPairs = [];                 // full list: {dutch, english}
let currentSet = [];                // currently visible slice for Study / Practice
let currentPage = 1;                // 1-based integer or 'all'
let totalSets = 1;
let shuffleMode = false;
let bookmarks = new Set();          // store keys like "English|||Dutch"

/* Elements */
const fileInput = document.getElementById('fileInput');
const setSelect = document.getElementById('setSelect');
const pairsTable = document.getElementById('pairsTable');
const quizForm = document.getElementById('quizForm');
const quizFormBookmarked = document.getElementById('quizFormBookmarked');
const scoreBadge = document.getElementById('scoreBadge');
const scoreBadgeBookmarked = document.getElementById('scoreBadgeBookmarked');
const searchBox = document.getElementById('searchBox');
const searchTable = document.getElementById('searchTable');
const setInfo = document.getElementById('setInfo');
const setSizeInfo = document.getElementById('setSizeInfo');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const shuffleToggle = document.getElementById('shuffleToggle');
const shufflePill = document.getElementById('shufflePill');
const exportPdfBtn = document.getElementById('exportPdf');
const resetProgressBtn = document.getElementById('resetProgress');
const themeToggle = document.getElementById('themeToggle');
const bookmarkTable = document.getElementById('bookmarkTable');
const bookmarkIndicator = document.getElementById('bookmarkIndicator');
const clearBookmarksBtn = document.getElementById('clearBookmarks');

const submitBtn = document.getElementById('submitBtn');
const resetInputsBtn = document.getElementById('resetInputsBtn');
const prevPractice = document.getElementById('prevPractice');
const nextPractice = document.getElementById('nextPractice');

const submitBtnBookmarked = document.getElementById('submitBtnBookmarked');
const resetInputsBtnBookmarked = document.getElementById('resetInputsBtnBookmarked');
const prevPracticeB = document.getElementById('prevPracticeB');
const nextPracticeB = document.getElementById('nextPracticeB');

const prevStudy = document.getElementById('prevStudy');
const nextStudy = document.getElementById('nextStudy');

/* Utilities */
function escapeHTML(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function normalize(s) { if (s === undefined || s === null) return ''; try { return String(s).trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''); } catch (e) { return String(s).trim().toLowerCase(); } }
function bookmarkKey(p) { return `${p.english}|||${p.dutch}`; }

/* Persisted storage keys */
const PROG_KEY = 'dvt_progress';       // object: { "English": { answer: "...", isCorrect: true, timestamp } }
const THEME_KEY = 'dvt_theme';
const SHUFFLE_KEY = 'dvt_shuffle';
const BOOKMARKS_KEY = 'dvt_bookmarks';
const ACTIVE_TAB_KEY = 'dvt_active_tab';


let setMode = "file"; // default: "file" = By Set

// Toggle mode
document.querySelectorAll('input[name="setMode"]').forEach(radio => {
    radio.addEventListener("change", e => {
        setMode = e.target.value;

        const fileControls = document.getElementById("fileModeControls");
        const contextControls = document.getElementById("contextModeControls");
        const progress = document.getElementById("progress");

        // Grab tab buttons
        const tabTiles = document.getElementById("tabTiles");
        const tabPractice = document.getElementById("tabPractice");
        const tabPracticeBookmarked = document.getElementById("tabPracticeBookmarked");
        const tabStudy = document.getElementById("tabStudy"); // << study tab button


        // Grab Next/Prev/Shuffle buttons
        const shuffleToggle = document.getElementById("shuffleToggle");
        const nextBtn = document.getElementById("nextStudy");
        const prevBtn = document.getElementById("prevStudy");
        const shufflePill = document.getElementById("shufflePill");
        const exportProgress = document.getElementById("exportProgress");

        if (setMode === "file") {
            fileControls.style.display = "block";
            contextControls.style.display = "none";
            progress.style.display = "flex";

            // Enable tabs and buttons
            [tabTiles, tabPractice, tabPracticeBookmarked, shuffleToggle, nextBtn, prevBtn, shufflePill, exportProgress].forEach(el => {
                if (el) el.style.display = "inline-block";
            });

            // Load first set by default
            if (setSelect && setSelect.options.length > 0) {
                setSelect.selectedIndex = 0;
                loadSet(setSelect.value);
            }

        } else {
            fileControls.style.display = "none";
            contextControls.style.display = "block";
            progress.style.display = "none";

            // Hide tabs and buttons not relevant in context mode
            [tabTiles, tabPractice, tabPracticeBookmarked, shuffleToggle, nextBtn, prevBtn, shufflePill, exportProgress].forEach(el => {
                if (el) el.style.display = "none";
            });

            // Auto load first context
            const ctxSelect = document.getElementById("contextSelect");
            if (ctxSelect && ctxSelect.options.length > 0) {
                ctxSelect.selectedIndex = 0;
                loadContextSet(ctxSelect.value);
            }
        }

        // Always switch to Study tab after mode change
        if (tabStudy) {
            tabStudy.click(); // triggers your existing tab switching logic
        }
    });
});

// ---- Initialization ----
document.addEventListener("DOMContentLoaded", () => {
    const fileRadio = document.querySelector('input[name="setMode"][value="file"]');
    if (fileRadio) fileRadio.checked = true; // ensure UI reflects default
    setMode = "file";

    // Populate sets and load first one
    if (setSelect && setSelect.options.length > 0) {
        setSelect.selectedIndex = 0;
        loadSet(setSelect.value);
    }

    // Default tab is Study
    const tabStudy = document.getElementById("tabStudy");
    if (tabStudy) tabStudy.click();
});



function populateContextDropdown() {
    const contextSelect = document.getElementById('contextSelect');
    contextSelect.innerHTML = '';

    // Get unique contexts
    const contexts = [...new Set(contextPairs.map(p => p.context))];

    // Natural sort (numbers sorted numerically, text alphabetically)
    contexts.sort((a, b) => {
        const ax = a.match(/(\d+)|(\D+)/g);
        const bx = b.match(/(\d+)|(\D+)/g);

        for (let i = 0; i < Math.min(ax.length, bx.length); i++) {
            if (ax[i] !== bx[i]) {
                const an = parseInt(ax[i], 10);
                const bn = parseInt(bx[i], 10);
                if (!isNaN(an) && !isNaN(bn)) {
                    return an - bn; // numeric compare
                }
                return ax[i].localeCompare(bx[i]); // text compare
            }
        }
        return ax.length - bx.length;
    });

    // Populate dropdown
    contexts.forEach(ctx => {
        const opt = document.createElement('option');
        opt.value = ctx;
        opt.textContent = ctx;
        contextSelect.appendChild(opt);
    });

    // Load first context immediately
    if (contexts.length > 0) {
        contextSelect.value = contexts[0];
        loadContextSet(contexts[0]);
    }
}


populateContextDropdown();

// Load a context set
function loadContextSet(ctx) {
    // setMode must be 'context' when this is used
    currentPage = ctx; // store current view name (so updateSetInfo can use it if desired)
    currentSet = contextPairs.filter(p => p.context === ctx).slice(); // shallow copy
    renderTable(currentSet);
    renderTiles();             // if tiles are allowed in this mode
    renderPractice();          // only if practice allowed (you said earlier some features disabled for context)
    updateSetInfo();
}


// Context dropdown listener
document.getElementById("contextSelect").addEventListener("change", () => {
    const ctx = document.getElementById("contextSelect").value;
    loadContextSet(ctx);
});

/* Initialization */
(function init() {
    // load bookmarks
    const savedBookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
    bookmarks = new Set(savedBookmarks);

    // load theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') { document.body.classList.add('light'); themeToggle.checked = true; }

    // load shuffle
    shuffleMode = localStorage.getItem(SHUFFLE_KEY) === '1';
    updateShuffleUI();

    // load default words initially (so UI isn't empty)
    wordPairs = defaultWords.slice();
    setupSets();
    loadSet(1);

    // wire events
    bindEvents();

    // update progress & bookmarks UI
    updateProgress();
    renderBookmarks();

    // restore active tab
    const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
    if (savedTab) {
        const btn = document.querySelector(`.tab-buttons button[data-tab="${savedTab}"]`);
        if (btn) btn.click();
    } else {
        // ensure study tab highlighted by default
        const studyBtn = document.querySelector('[data-tab="study"]'); if (studyBtn) studyBtn.classList.add('active');
        document.getElementById('study').classList.add('active');
    }
})();

/* Event binding */
function bindEvents() {
    // Tabs behavior (also highlight on click & persist)
    document.querySelectorAll('.tab-buttons button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-buttons button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.dataset.tab;
            localStorage.setItem(ACTIVE_TAB_KEY, tab);
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(tab);
            if (panel) panel.classList.add('active');

            // When clicking specific tabs, update relevant content
            if (tab === 'bookmarked') { renderBookmarks(); }
            if (tab === 'search') { renderSearch(searchBox.value || ''); }
            if (tab === 'study') { renderTable(); }
            if (tab === 'practice') { renderPractice(); }
            if (tab === 'practice_bookmarked') { renderPracticeBookmarked(); }
        });
    });

    // File upload (XLS/XLSX)
    fileInput.addEventListener('change', handleFile, false);

    // Set dropdown change
    setSelect.addEventListener('change', () => loadSet(setSelect.value));

    // Theme toggle
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('light', themeToggle.checked);
        localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
    });

    // Shuffle
    shuffleToggle.addEventListener('click', () => {
        shuffleMode = !shuffleMode;
        localStorage.setItem(SHUFFLE_KEY, shuffleMode ? '1' : '0');
        updateShuffleUI();
        loadSet(currentPage);
    });

    // Export PDF
    exportPdfBtn.addEventListener('click', exportPdf);

    // Reset progress
    resetProgressBtn.addEventListener('click', () => {
        if (!confirm('Clear all saved progress? This will remove saved answers.')) return;

        // clear storage
        localStorage.removeItem(PROG_KEY);

        // clear UI
        updateProgress();

        // clear all practice inputs explicitly
        currentSet.forEach((_, idx) => {
            const input = document.getElementById(`p_word_${idx}`);
            if (input) {
                input.value = '';
                input.parentElement.classList.remove('correct', 'incorrect');
                const corrInline = input.parentElement.parentElement.querySelector('.correction');
                const corrMobile = input.parentElement.parentElement.querySelector('.mobile-correction');
                if (corrInline) corrInline.textContent = '';
                if (corrMobile) corrMobile.textContent = '';
            }
        });

        // clear all bookmarked inputs explicitly
        const bList = [...bookmarks].map(k => {
            const [english, dutch] = k.split('|||');
            return { english, dutch };
        });
        bList.forEach((_, idx) => {
            const input = document.getElementById(`pb_word_${idx}`);
            if (input) {
                input.value = '';
                input.parentElement.classList.remove('correct', 'incorrect');
                const corrInline = input.parentElement.parentElement.querySelector('.correction');
                const corrMobile = input.parentElement.parentElement.querySelector('.mobile-correction');
                if (corrInline) corrInline.textContent = '';
                if (corrMobile) corrMobile.textContent = '';
            }
        });

        // finally refresh visuals
        restoreProgress();
    });


    // Search
    searchBox.addEventListener('input', () => renderSearch(searchBox.value));

    // Study Prev/Next
    nextStudy.addEventListener('click', () => goNext());
    prevStudy.addEventListener('click', () => goPrev());

    // Practice Prev/Next
    nextPractice.addEventListener('click', () => { goNext(); renderPractice(); });
    prevPractice.addEventListener('click', () => { goPrev(); renderPractice(); });

    // Practice Bookmarked Prev/Next
    nextPracticeB.addEventListener('click', () => { goNextBookmarked(); renderPracticeBookmarked(); });
    prevPracticeB.addEventListener('click', () => { goPrevBookmarked(); renderPracticeBookmarked(); });

    // Practice submit/reset
    submitBtn.addEventListener('click', handleSubmit);
    resetInputsBtn.addEventListener('click', resetInputs);

    // Bookmarked practice submit/reset
    submitBtnBookmarked.addEventListener('click', handleSubmitBookmarked);
    resetInputsBtnBookmarked.addEventListener('click', resetInputsBookmarked);

    // Clear bookmarks button
    clearBookmarksBtn.addEventListener('click', () => {
        if (!confirm('Clear all bookmarks?')) return;
        bookmarks.clear();
        persistBookmarks();
        renderBookmarks();
        renderTable();
        renderSearch(searchBox.value || '');
        renderPracticeBookmarked();
    });

    // Keyboard shortcuts: left/right for prev/next
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { goPrev(); renderPractice(); }
        if (e.key === 'ArrowRight') { goNext(); renderPractice(); }
    });
}

/* File/Excel handling */
function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = new Uint8Array(ev.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
            // detect header row if first row contains 'dutch' or 'english'
            const fromRow = (rows[0] && ((String(rows[0][0] || '').toLowerCase().includes('dutch')) || (String(rows[0][1] || '').toLowerCase().includes('english')))) ? 1 : 0;
            const pairs = rows.slice(fromRow).filter(r => r && r[0] !== undefined && r[1] !== undefined)
                .map(r => ({ dutch: String(r[0]).trim(), english: String(r[1]).trim() }));
            if (pairs.length === 0) {
                alert('No valid pairs found. Ensure Column A = Dutch and Column B = English.');
                return;
            }
            wordPairs = pairs;
            setupSets();
            loadSet(1);
            // persist a flag
            localStorage.setItem('dvt_has_uploaded_once', '1');
            alert(`Loaded ${wordPairs.length} word pairs.`);
        } catch (err) {
            console.error('Error reading file', err);
            alert('Failed to read the file. Make sure it is a valid Excel file (.xls/.xlsx).');
        }
    };
    reader.readAsArrayBuffer(file);
}

/* Sets / Pagination */
function setupSets() {
    totalSets = Math.max(1, Math.ceil(wordPairs.length / PER_SET));
    setSelect.innerHTML = '';
    for (let i = 1; i <= totalSets; i++) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `Set ${i}`;
        setSelect.appendChild(opt);
    }
    // "All Words" option
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All Words';
    setSelect.appendChild(allOpt);
}

/* Load a set by page number or 'all' */
function loadSet(val) {
    if (val === undefined) val = setSelect.value || '1';
    if (val === 'all') {
        currentSet = wordPairs.slice();
        currentPage = 'all';
    } else {
        const page = parseInt(val, 10) || 1;
        currentPage = page;
        const start = (page - 1) * PER_SET;
        currentSet = wordPairs.slice(start, start + PER_SET);
    }
    if (shuffleMode) {
        currentSet = shuffleArray(currentSet);
    }
    // render UIs
    renderPractice();
    renderTiles();
    renderTable();
    renderSearch(searchBox.value || '');
    renderBookmarks();
    renderPracticeBookmarked();
    updateSetInfo();
    restoreProgress();
    updateProgress();
}

/* prev/next across sets */
function goNext() {
    if (currentPage === 'all') {
        if (totalSets >= 1) loadSet(1);
    } else {
        const next = currentPage + 1;
        if (next <= totalSets) loadSet(next);
    }
}
function goPrev() {
    if (currentPage === 'all') {
        if (totalSets >= 1) loadSet(totalSets);
    } else {
        const prev = currentPage - 1;
        if (prev >= 1) loadSet(prev);
    }
}
function goNextBookmarked() { /* no pagination for bookmarked practice in this simple implementation */ }
function goPrevBookmarked() { /* no pagination */ }

/* Render Study Table with Blur Support */
function renderTable(list) {
    const use = list || currentSet;
    pairsTable.innerHTML = '';

    // check blur toggles
    const hideEng = document.getElementById('blurEnglish')?.checked;
    const hideDutch = document.getElementById('blurDutch')?.checked;

    use.forEach((p, idx) => {
        const tr = document.createElement('tr');
        if (bookmarks.has(bookmarkKey(p))) tr.classList.add('bookmarked');

        // Dutch column
        const tdDutch = document.createElement('td');
        tdDutch.innerHTML = escapeHTML(p.dutch);
        if (hideDutch) tdDutch.classList.add('blur');

        // English column
        const tdEng = document.createElement('td');
        tdEng.innerHTML = escapeHTML(p.english);
        if (hideEng) tdEng.classList.add('blur');

        // audio column
        const tdAudio = document.createElement('td');
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn btn-ghost';
        audioBtn.textContent = '🔊';
        audioBtn.title = 'Play word (Dutch then English)';
        audioBtn.addEventListener('click', () => speakPair(p, true));
        tdAudio.appendChild(audioBtn);

        // bookmark column
        const tdStar = document.createElement('td');
        tdStar.className = 'star-cell';
        tdStar.textContent = bookmarks.has(bookmarkKey(p)) ? '★' : '☆';
        tdStar.title = 'Toggle bookmark';
        tdStar.addEventListener('click', (ev) => {
            toggleBookmark(p);
            tdStar.textContent = bookmarks.has(bookmarkKey(p)) ? '★' : '☆';
            if (bookmarks.has(bookmarkKey(p))) tr.classList.add('bookmarked');
            else tr.classList.remove('bookmarked');
            renderBookmarks();
            renderPracticeBookmarked();
        });

        // build row
        tr.appendChild(tdDutch);
        tr.appendChild(tdEng);
        tr.appendChild(tdAudio);
        tr.appendChild(tdStar);
        pairsTable.appendChild(tr);
    });

    // update set size info
    setSizeInfo.textContent = `${use.length} words`;
}


/* Render Bookmarked Table */
function renderBookmarks() {
    bookmarkTable.innerHTML = '';
    const list = [...bookmarks].map(k => {
        const [english, dutch] = k.split('|||');
        return { dutch, english };
    });
    list.forEach(p => {
        const tr = document.createElement('tr');
        tr.classList.add('bookmarked'); // all rows here are bookmarked
        const tdDutch = document.createElement('td'); tdDutch.textContent = p.dutch;
        const tdEng = document.createElement('td'); tdEng.textContent = p.english;
        const tdAudio = document.createElement('td');
        const audioBtn = document.createElement('button'); audioBtn.className = 'audio-btn btn-ghost'; audioBtn.textContent = '🔊';
        audioBtn.addEventListener('click', () => speakPair(p, true));
        tdAudio.appendChild(audioBtn);
        const tdStar = document.createElement('td'); tdStar.className = 'star-cell'; tdStar.textContent = '★';
        tdStar.addEventListener('click', () => {
            toggleBookmark(p);
            renderBookmarks();
            renderTable();
            renderPracticeBookmarked();
        });
        tr.appendChild(tdDutch); tr.appendChild(tdEng); tr.appendChild(tdAudio); tr.appendChild(tdStar);
        bookmarkTable.appendChild(tr);
    });

    bookmarkIndicator.textContent = `Bookmarks: ${bookmarks.size}`;
}

/* Toggle bookmark */
function toggleBookmark(p) {
    const key = bookmarkKey(p);
    if (bookmarks.has(key)) { bookmarks.delete(key); }
    else { bookmarks.add(key); }
    persistBookmarks();
    updateBookmarkIndicator();
}

/* persist bookmarks */
function persistBookmarks() {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
}

function updateBookmarkIndicator() {
    bookmarkIndicator.textContent = `Bookmarks: ${bookmarks.size}`;
}

/* Practice Rendering */
function renderPractice() {
    quizForm.innerHTML = '';
    if (!currentSet || currentSet.length === 0) {
        quizForm.innerHTML = '<div style="color:var(--muted)">No words in this set.</div>';
        scoreBadge.textContent = 'Score: 0 / 0';
        return;
    }
    currentSet.forEach((pair, idx) => {
        const row = document.createElement('div'); row.className = 'row';
        const label = document.createElement('label');
        label.textContent = pair.english;
        label.setAttribute('for', `p_word_${idx}`);
        const wrap = document.createElement('div'); wrap.className = 'input-wrap';
        const input = document.createElement('input'); input.type = 'text'; input.id = `p_word_${idx}`;
        input.setAttribute('data-eng', pair.english);
        input.setAttribute('data-dutch', pair.dutch);

        // inline correction (desktop)
        const corrInline = document.createElement('span'); corrInline.className = 'correction';
        // mobile correction below
        const corrMobile = document.createElement('div'); corrMobile.className = 'mobile-correction';

        wrap.appendChild(input);
        row.appendChild(label);
        row.appendChild(wrap);
        row.appendChild(corrInline);
        row.appendChild(corrMobile);

        // save partial on blur
        input.addEventListener('blur', () => {
            savePartial(pair.english, input.value);
        });

        // Enter key submits
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
        });

        quizForm.appendChild(row);
    });

    // restore progress to fill inputs if previously saved
    restoreProgress();
    // update score badge
    updateScoreBadge();
}

/* Submit for practice */
function handleSubmit() {
    let correctCount = 0;

    currentSet.forEach((pair, idx) => {
        const input = document.getElementById(`p_word_${idx}`);
        if (!input) return;

        const wrap = input.parentElement;
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');

        // clear previous
        wrap.classList.remove('correct', 'incorrect');
        corrInline.textContent = '';
        corrMobile.textContent = '';

        const user = normalize(input.value);

        // Split Dutch answers by pipe and normalize each
        const possibleAnswers = pair.dutch
            .split('/')
            .map(ans => normalize(ans));

        if (user !== '' && possibleAnswers.includes(user)) {
            // Correct answer
            wrap.classList.add('correct');
            saveProgress(pair.english, input.value, true);
            correctCount++;
        } else {
            if (user !== '') {
                // Incorrect answer
                wrap.classList.add('incorrect');
                corrInline.textContent = pair.dutch;
                corrMobile.textContent = pair.dutch;
                saveProgress(pair.english, input.value, false);
            } else {
                // Empty input → reset stored answer only
                savePartial(pair.english, '');
            }
        }
    });

    scoreBadge.textContent = `Score: ${correctCount} / ${currentSet.length}`;
    updateProgress();
}


/* Reset inputs only (not progress) */
function resetInputs() {
    if (!confirm('Reset current inputs? This will clear typed answers but not saved progress.')) return;
    quizForm.querySelectorAll('input').forEach(inp => {
        inp.value = '';
        const wrap = inp.parentElement; wrap.classList.remove('correct', 'incorrect');
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');
        if (corrInline) corrInline.textContent = '';
        if (corrMobile) corrMobile.textContent = '';
    });
    scoreBadge.textContent = `Score: 0 / ${currentSet.length}`;
}

/* Practice Bookmarked */
function renderPracticeBookmarked() {
    const list = [...bookmarks].map(k => {
        const [english, dutch] = k.split('|||');
        return { english, dutch };
    });

    quizFormBookmarked.innerHTML = '';

    if (list.length === 0) {
        quizFormBookmarked.innerHTML = '<div style="color:var(--muted)">No bookmarked words. Add bookmarks from the Study Table.</div>';
        scoreBadgeBookmarked.textContent = 'Score: 0 / 0';
        return;
    }

    list.forEach((pair, idx) => {
        const row = document.createElement('div');
        row.className = 'row';

        const label = document.createElement('label');
        label.textContent = pair.english;
        label.setAttribute('for', `pb_word_${idx}`);

        const wrap = document.createElement('div');
        wrap.className = 'input-wrap';

        const input = document.createElement('input');
        input.type = 'text';
        input.id = `pb_word_${idx}`;
        input.autocomplete = 'off';
        input.setAttribute('data-eng', pair.english);
        input.setAttribute('data-dutch', pair.dutch);
        input.setAttribute("aria-label", `Dutch translation of ${pair.english}`);

        const corrInline = document.createElement('span');
        corrInline.className = 'correction';

        const corrMobile = document.createElement('div');
        corrMobile.className = 'mobile-correction';

        wrap.appendChild(input);
        row.appendChild(label);
        row.appendChild(wrap);
        row.appendChild(corrInline);
        row.appendChild(corrMobile);

        // blur: save partial
        input.addEventListener('blur', () => savePartial(pair.english, input.value));

        quizFormBookmarked.appendChild(row);
    });

    // restore & score badge
    restoreProgress();
    updateScoreBadgeBookmarked();
}

/* Submit Bookmarked practice */
function handleSubmitBookmarked() {
    const list = [...bookmarks].map(k => {
        const [english, dutch] = k.split('|||');
        return { english, dutch };
    });

    let correctCount = 0;

    list.forEach((pair, idx) => {
        const input = document.getElementById(`pb_word_${idx}`);
        if (!input) return;

        const wrap = input.parentElement;
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');

        // reset old state
        wrap.classList.remove('correct', 'incorrect');
        if (corrInline) corrInline.textContent = '';
        if (corrMobile) corrMobile.textContent = '';

        const user = normalize(input.value);

        // support multiple Dutch answers with |
        const possibleAnswers = pair.dutch
            .split('/')
            .map(ans => normalize(ans));

        if (user && possibleAnswers.includes(user)) {
            // correct
            wrap.classList.add('correct');
            correctCount++;
            saveProgress(pair.english, input.value, true);
        } else {
            if (user) {
                // incorrect
                wrap.classList.add('incorrect');
                if (corrInline) corrInline.textContent = pair.dutch;
                if (corrMobile) corrMobile.textContent = pair.dutch;
                saveProgress(pair.english, input.value || '', false);
            } else {
                // empty input
                savePartial(pair.english, '');
            }
        }
    });

    scoreBadgeBookmarked.textContent = `Score: ${correctCount} / ${list.length}`;
    updateProgress();
}


/* Reset inputs for bookmarked practice */
function resetInputsBookmarked() {
    if (!confirm('Reset bookmarked inputs?')) return;
    quizFormBookmarked.querySelectorAll('input').forEach(inp => {
        inp.value = ''; const wrap = inp.parentElement; wrap.classList.remove('correct', 'incorrect');
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');
        if (corrInline) corrInline.textContent = ''; if (corrMobile) corrMobile.textContent = '';
    });
    scoreBadgeBookmarked.textContent = 'Score: 0 / 0';
}

/* Save / Restore Progress (localStorage) */
function savePartial(english, answer) {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    prog[english] = prog[english] || {};
    prog[english].answer = answer;
    localStorage.setItem(PROG_KEY, JSON.stringify(prog));
}

function saveProgress(english, answer, isCorrect) {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    prog[english] = { answer: answer || '', isCorrect: !!isCorrect, timestamp: Date.now() };
    localStorage.setItem(PROG_KEY, JSON.stringify(prog));
    updateProgress();
}

/* Restore answers & colors when rendering practice and bookmarked practice */
function restoreProgress() {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');

    // helper to check if a saved answer matches any dutch variant
    function isCorrectAnswer(answer, dutchStr) {
        const variants = dutchStr
            .split(/[/|]/)     // split on "/" or "|"
            .map(v => normalize(v.trim()))
            .filter(Boolean);
        return variants.includes(normalize(answer));
    }

    // ---- normal practice ----
    currentSet.forEach((pair, idx) => {
        const input = document.getElementById(`p_word_${idx}`);
        if (!input) return;

        const wrap = input.parentElement;
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');

        wrap.classList.remove('correct', 'incorrect');
        if (corrInline) corrInline.textContent = '';
        if (corrMobile) corrMobile.textContent = '';

        const rec = prog[pair.english];
        if (rec) {
            input.value = rec.answer || '';
            if (rec.answer && isCorrectAnswer(rec.answer, pair.dutch)) {
                wrap.classList.add('correct');
            } else if (rec.answer) {
                wrap.classList.add('incorrect');
                if (corrInline) corrInline.textContent = pair.dutch;
                if (corrMobile) corrMobile.textContent = pair.dutch;
            }
        } else {
            // if no saved progress, clear input
            input.value = '';
        }
    });

    // ---- bookmarked practice ----
    const bList = [...bookmarks].map(k => {
        const [english, dutch] = k.split('|||');
        return { english, dutch };
    });
    bList.forEach((pair, idx) => {
        const input = document.getElementById(`pb_word_${idx}`);
        if (!input) return;

        const wrap = input.parentElement;
        const corrInline = wrap.parentElement.querySelector('.correction');
        const corrMobile = wrap.parentElement.querySelector('.mobile-correction');

        wrap.classList.remove('correct', 'incorrect');
        if (corrInline) corrInline.textContent = '';
        if (corrMobile) corrMobile.textContent = '';

        const rec = prog[pair.english];
        if (rec) {
            input.value = rec.answer || '';
            if (rec.answer && isCorrectAnswer(rec.answer, pair.dutch)) {
                wrap.classList.add('correct');
            } else if (rec.answer) {
                wrap.classList.add('incorrect');
                if (corrInline) corrInline.textContent = pair.dutch;
                if (corrMobile) corrMobile.textContent = pair.dutch;
            }
        } else {
            input.value = '';
        }
    });

    // update score displays
    updateScoreBadge();
    updateScoreBadgeBookmarked();
}


/* ===== Progress UI (global across all sets) ===== */
function updateProgress() {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    let correctTotal = 0;
    for (const k in prog) { if (prog[k].isCorrect) correctTotal++; }

    let totalWords = 1;
    if (setMode === "file") {
        totalWords = Math.max(1, wordPairs.length);
    } else if (setMode === "context") {
        totalWords = Math.max(1, contextPairs.length);  // ✅ all context words, not just currentSet
    }

    const pct = Math.round((correctTotal / totalWords) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = `Progress: ${pct}% (${correctTotal}/${totalWords})`;
}

/* Update score badge (current practice set) */
function updateScoreBadge() {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    let cnt = 0; currentSet.forEach(p => { if (prog[p.english] && prog[p.english].isCorrect) cnt++; });
    scoreBadge.textContent = `Score: ${cnt} / ${currentSet.length}`;
}
function updateScoreBadgeBookmarked() {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || '{}');
    const list = [...bookmarks].map(k => { const [english, dutch] = k.split('|||'); return { english, dutch }; });
    let cnt = 0; list.forEach(p => { if (prog[p.english] && prog[p.english].isCorrect) cnt++; });
    scoreBadgeBookmarked.textContent = `Score: ${cnt} / ${list.length}`;
}

/* Search (search across whole wordPairs + contextPairs) */
function renderSearch(q) {
    const qn = normalize(q || '');
    const combinedList = [...wordPairs, ...contextPairs]; // merge both sources

    if (!qn) {
        searchTable.innerHTML = '';
        return;
    }

    // Calculate match score (percentage)
    function matchScore(word, query) {
        if (!word || !query) return 0;
        const idx = word.indexOf(query);
        if (idx === -1) return 0;
        // Score based on how much of the word is matched + prefix bonus
        let score = (query.length / word.length) * 100;
        if (idx === 0) score += 20; // prefix match bonus
        return Math.min(100, score);
    }

    // Filter and calculate scores
    let list = combinedList
        .map(p => {
            const d = normalize(p.dutch);
            const e = normalize(p.english);
            const score = Math.max(matchScore(d, qn), matchScore(e, qn));
            return { ...p, score };
        })
        .filter(p => p.score > 0);

    // Deduplicate by Dutch+English combo
    const seen = new Set();
    list = list.filter(p => {
        const key = `${p.dutch.toLowerCase()}|${p.english.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // Sort by score DESC
    list.sort((a, b) => b.score - a.score);

    // Render table
    searchTable.innerHTML = '';
    list.forEach(p => {
        const tr = document.createElement('tr');
        if (bookmarks.has(bookmarkKey(p))) tr.classList.add('bookmarked');

        const tdDutch = document.createElement('td');
        tdDutch.textContent = p.dutch;

        const tdEng = document.createElement('td');
        tdEng.textContent = p.english;

        // audio column
        const tdAudio = document.createElement('td');
        const audioBtn = document.createElement('button');
        audioBtn.className = 'audio-btn btn-ghost';
        audioBtn.textContent = '🔊';
        audioBtn.addEventListener('click', () => speakPair(p));
        tdAudio.appendChild(audioBtn);

        // bookmark column
        const tdStar = document.createElement('td');
        tdStar.className = 'star-cell';
        tdStar.textContent = bookmarks.has(bookmarkKey(p)) ? '★' : '☆';
        tdStar.addEventListener('click', () => {
            toggleBookmark(p);
            tdStar.textContent = bookmarks.has(bookmarkKey(p)) ? '★' : '☆';
            renderBookmarks();
            renderTable();
        });

        tr.appendChild(tdDutch);
        tr.appendChild(tdEng);
        tr.appendChild(tdAudio);
        tr.appendChild(tdStar);
        searchTable.appendChild(tr);
    });
}


/* ===== Tile Rendering with flip + highlight ===== */
function renderTiles() {
    const wrap = document.getElementById('tilesWrap');
    wrap.innerHTML = '';

    currentSet.forEach((p) => {
        const div = document.createElement('div');
        div.className = 'tile';
        div.innerHTML = `
		  <div class="tile-inner">
			<div class="tile-front">${escapeHTML(p.dutch)}</div>
			<div class="tile-back">${escapeHTML(p.english)}</div>
		  </div>`;

        // Handle flipping
        div.addEventListener('click', (ev) => {
            // If clicking the English side, flip back to Dutch
            if (div.classList.contains('flipped')) {
                div.classList.remove('flipped', 'active');
                return;
            }

            // Reset all other tiles first
            document.querySelectorAll('.tile').forEach(el => {
                el.classList.remove('flipped', 'active');
            });

            // Flip this tile
            div.classList.add('flipped', 'active');
            ev.stopPropagation();
        });

        wrap.appendChild(div);
    });

    // Reset all tiles back to dutch when clicking outside
    document.addEventListener('click', (ev) => {
        if (!wrap.contains(ev.target)) {
            document.querySelectorAll('.tile').forEach(el => {
                el.classList.remove('flipped', 'active');
            });
        }
    });
}


/* ===== Global Audio Control ===== */
let stopAudioFlag = false;
let currentAudioPromise = null;

/* Stop audio immediately */
function stopAudio() {
    stopAudioFlag = true;
    currentAudioPromise = null;  // invalidate current session
    window.speechSynthesis.cancel();
}

/* Play audio list sequentially */
async function playListAudio(list) {
    if (!list || !list.length) return;

    // Stop any ongoing playback before starting new
    stopAudio();
    await new Promise(r => setTimeout(r, 50)); // ensure cancel took effect

    stopAudioFlag = false;

    // Track this playback session
    const mySession = {};
    currentAudioPromise = mySession;

    for (const p of list) {
        if (stopAudioFlag || currentAudioPromise !== mySession) break;
        await speakPair(p, false);   // list mode → don’t stop session
        await new Promise(r => setTimeout(r, 200));
    }
}

/* Pair playback: Dutch → pause → "means" → English */
async function speakPair(p, singlePlay = true) {
    try {
        if (singlePlay) {
            // manual button click: stop current session before starting fresh
            stopAudio();
            await new Promise(r => setTimeout(r, 20)); // allow cancel flush
            stopAudioFlag = false;
            currentAudioPromise = {}; // new isolated session
        }

        const dutchSpoken = p.dutch.split('/').map(x => x.trim()).join(', ');
        const englishSpoken = p.english.split('/').map(x => x.trim()).join(' or ');

        await speakUtter(dutchSpoken, 'nl-NL');
        if (stopAudioFlag) return;

        await new Promise(r => setTimeout(r, 50));
        await speakUtter('means', 'en-US');
        if (stopAudioFlag) return;

        await new Promise(r => setTimeout(r, 50));
        await speakUtter(englishSpoken, 'en-US');
    } catch (e) {
        console.warn('Speech error', e);
    }
}


/* Wrapper: speak single utterance */
function speakUtter(text, lang) {
    return new Promise((resolve) => {
        if (stopAudioFlag) return resolve();

        try {
            window.speechSynthesis.cancel(); // cancel immediately before speaking
            const u = new SpeechSynthesisUtterance(text);
            u.lang = lang;
            u.onend = () => resolve();
            u.onerror = () => resolve();

            window.speechSynthesis.speak(u);
        } catch (e) {
            console.warn('speakUtter error', e);
            resolve();
        }
    });
}


/* PDF Export (study table) */
function exportPdf() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    doc.setFontSize(16);
    doc.text('Dutch Vocabulary — Study Table', margin, 48);
    doc.setFontSize(11);
    let y = 72;
    const lineH = 16;
    const pageHeight = doc.internal.pageSize.height - margin;
    doc.text('Dutch', margin, y);
    doc.text('English', margin + 300, y);
    y += lineH;
    currentSet.forEach(pair => {
        if (y > pageHeight) { doc.addPage(); y = margin; }
        doc.text(String(pair.dutch), margin, y);
        doc.text(String(pair.english), margin + 300, y);
        y += lineH;
    });
    doc.save('DutchVocabulary.pdf');
}

/* Shuffle util & UI */
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function updateShuffleUI() {
    shuffleToggle.textContent = `Shuffle: ${shuffleMode ? 'On' : 'Off'}`;
    shufflePill.textContent = `Shuffle: ${shuffleMode ? 'On' : 'Off'}`;
}

/* Misc helpers: show correct header info for both modes */
function updateSetInfo() {
    if (!setInfo || !setSizeInfo) return;

    // Ensure setMode exists (default to 'file')
    setMode = (typeof setMode === 'undefined') ? 'file' : setMode;

    if (setMode === 'context') {
        // Context mode -> read selected context label
        const ctxSelect = document.getElementById('contextSelect');
        const ctxLabel = (ctxSelect && ctxSelect.value) ? ctxSelect.value : 'Context';
        setInfo.textContent = `Viewing Context: ${ctxLabel}`;
        setSizeInfo.textContent = `${currentSet ? currentSet.length : 0} words`;

        // Optional: reflect in setSelect if you want to disable/hide it
        const setSelect = document.getElementById('setSelect');
        if (setSelect) {
            setSelect.disabled = true;
            setSelect.classList.add('disabled');
        }
    } else {
        // File / Set mode
        const setSelect = document.getElementById('setSelect');
        if (currentPage === 'all') {
            setInfo.textContent = `Viewing All (${wordPairs.length} words)`;
            if (setSelect) setSelect.value = 'all';
            setSizeInfo.textContent = `${wordPairs.length} words`;
        } else {
            // currentPage should be numeric or set id for file mode
            setInfo.textContent = `Viewing Set ${currentPage}`;
            if (setSelect) setSelect.value = String(currentPage);
            setSizeInfo.textContent = `${currentSet ? currentSet.length : 0} words`;
        }

        // Ensure setSelect is enabled in file mode
        if (setSelect) {
            setSelect.disabled = false;
            setSelect.classList.remove('disabled');
        }
    }
}

/* ===== Export Progress + Bookmarks ===== */
document.getElementById("exportProgress").addEventListener("click", () => {
    const prog = JSON.parse(localStorage.getItem(PROG_KEY) || "{}");
    const savedBookmarks = Array.from(bookmarks || []);

    const exportData = {
        version: 1,
        progress: prog,
        bookmarks: savedBookmarks,
        exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "vocab_progress.json";
    a.click();

    URL.revokeObjectURL(url);
});


/* ===== Import Progress + Bookmarks ===== */
document.getElementById("importProgress").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Accept only JSON
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
        alert("❌ Invalid file type. Please upload a JSON file.");
        e.target.value = ""; // reset input
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            // Validation: must contain expected keys
            if (!data || typeof data !== "object" || !data.progress || !data.bookmarks) {
                throw new Error("Invalid structure");
            }

            // Save progress
            localStorage.setItem(PROG_KEY, JSON.stringify(data.progress));

            // Save bookmarks
            if (Array.isArray(data.bookmarks)) {
                bookmarks = new Set(data.bookmarks);
                persistBookmarks();
            }

            restoreProgress();
            updateProgress();
            renderBookmarks();
            renderPracticeBookmarked();

            alert("✅ Progress and bookmarks restored successfully!");
        } catch (err) {
            console.error("Import error:", err);
            alert("❌ Invalid progress file.");
        } finally {
            e.target.value = ""; // reset input so same file can be chosen again later
        }
    };
    reader.readAsText(file);
});


document.getElementById('blurEnglish').addEventListener('change', () => {
    renderTable();
});

document.getElementById('blurDutch').addEventListener('change', () => {
    renderTable();
});

/* Hook Study tab audio buttons */
document.getElementById('playAllStudy').addEventListener('click', () => {
    playListAudio(currentSet);
});
document.getElementById('stopAudio').addEventListener('click', stopAudio);

/* Hook Bookmarked tab audio buttons */
document.getElementById('playAllBookmarks').addEventListener('click', () => {
    const list = [...bookmarks].map(k => {
        const [english, dutch] = k.split('|||');
        return { english, dutch };
    });
    playListAudio(list);
});
document.getElementById('stopAudioBookmarks').addEventListener('click', stopAudio);
document.getElementById('stopAudioSearch').addEventListener('click', stopAudio);

/* Final initial rendering updates */
(function postInit() {
    populateContextDropdown();
    renderTable();
    renderTiles();
    renderBookmarks();
    renderSearch('');
    updateProgress();
})();

/* ===== GAME LOGIC (Random/Sequential + Reset Only on Start) ===== */
let gameScore = 0;
let gameTimer = 0;
let timerInterval = null;
let firstTile = null;
let lockBoard = false;
let currentLevel = 3;
let sequentialMode = true;
let seqIndex = 0;

const board = document.getElementById("gameBoard");
const scoreEl = document.getElementById("gameScore");
const timerEl = document.getElementById("gameTimer");

// Sounds
const wrongSound = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
// Reference to instruction paragraph
const gameInstruction = document.getElementById("gameInstruction");

// Update instruction text based on mode
function updateInstruction(mode) {
    if (mode === "sequential") {
        gameInstruction.textContent = "Match Dutch and English word tiles — correct pairs disappear, wrong ones briefly highlight red. You're playing in Sequential mode.";
    } else {
        gameInstruction.textContent = "Match Dutch and English word tiles — correct pairs disappear, wrong ones briefly highlight red. You're playing in Random mode.";
    }
}

updateInstruction("sequential");

// Listen for mode changes
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener("change", e => {
        sequentialMode = (e.target.value === "sequential");
        seqIndex = 0; // reset index if sequential
        updateInstruction(e.target.value);
    });
});


// Start game
document.getElementById("startGameBtn").addEventListener("click", () => {
    const pairsCount = parseInt(document.getElementById("levelSelect").value, 10);
    resetGame();   // reset only on button click
    startTimer();
    startGame(pairsCount);
});

/* Start Game */
function startGame(pairsCount) {
    currentLevel = pairsCount;

    let chosenPairs;
    if (sequentialMode) {
        chosenPairs = currentSet.slice(seqIndex, seqIndex + pairsCount);
        seqIndex += pairsCount;
        if (seqIndex >= currentSet.length) seqIndex = 0;
    } else {
        chosenPairs = shuffle([...currentSet]).slice(0, pairsCount);
    }

    let tiles = [];
    chosenPairs.forEach(p => {
        const id = p.dutch + "|" + p.english;
        tiles.push({ word: p.dutch, matchId: id });
        tiles.push({ word: p.english, matchId: id });
    });
    tiles = shuffle(tiles).sort((a, b) => a.word.length - b.word.length);

    board.innerHTML = "";
    tiles.forEach(tile => {
        const div = document.createElement("div");
        div.className = "game-tile";
        div.textContent = tile.word;
        div.dataset.matchId = tile.matchId;
        div.addEventListener("click", () => handleTileClick(div));
        board.appendChild(div);
    });
}

/* Handle tile click */
function handleTileClick(tile) {
    if (lockBoard || tile.classList.contains("matched") || tile === firstTile) return;

    tile.classList.add("revealed");

    if (!firstTile) {
        firstTile = tile;
        return;
    }

    const a = firstTile;
    const b = tile;

    if (a.dataset.matchId === b.dataset.matchId) {
        gameScore += 10;
        a.classList.add("border-correct");
        b.classList.add("border-correct");
        removePair(a, b);
    } else {
        wrongSound.play();
        gameScore -= 5;
        lockBoard = true;
        a.classList.add("border-wrong");
        b.classList.add("border-wrong");
        setTimeout(() => {
            a.classList.remove("revealed", "border-wrong");
            b.classList.remove("revealed", "border-wrong");
            lockBoard = false;
        }, 800);
    }

    scoreEl.textContent = `Score: ${gameScore}`;
    firstTile = null;

    if (board.querySelectorAll(".game-tile").length === 0) {
        setTimeout(() => startGame(currentLevel), 1000);
    }
}

/* Remove matched pair */
function removePair(tile1, tile2) {
    tile1.classList.add("matched");
    tile2.classList.add("matched");
    setTimeout(() => {
        tile1.remove();
        tile2.remove();
        if (board.querySelectorAll(".game-tile").length === 0) {
            setTimeout(() => startGame(currentLevel), 1000);
        }
    }, 400);
}

/* Reset */
function resetGame() {
    board.innerHTML = "";
    gameScore = 0;
    gameTimer = 0;
    firstTile = null;
    scoreEl.textContent = "Score: 0";
    timerEl.textContent = "Time: 0s";
    clearInterval(timerInterval);
}

/* Timer */
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameTimer++;
        timerEl.textContent = `Time: ${gameTimer}s`;
    }, 1000);
}

/* Shuffle helper */
function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}


