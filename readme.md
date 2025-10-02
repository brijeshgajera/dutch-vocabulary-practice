# Dutch Vocabulary Trainer

A modern, interactive web app for practicing and mastering Dutch vocabulary. Upload your own Excel files, study, practice, bookmark, and track your progress with ease.

## Features

- **Excel Upload**: Import your own vocabulary lists (Dutch in column A, English in column B) via Excel (.xls/.xlsx) files.
- **Set & Context Modes**: Practice by set (pagination) or by context (grouped by topic or lesson).
- **Study Table**: View all words in a table, with optional blur for Dutch or English columns for self-testing.
- **Practice Mode**: Type in answers and get instant feedback. Supports multiple correct answers (separated by `/`).
- **Bookmarked Practice**: Practice only your starred (bookmarked) words.
- **Tiles Mode**: Flip cards to test your recall of Dutch and English words.
- **Game Mode**: Match Dutch and English tiles in a memory game with multiple levels and modes (random/sequential).
- **Search**: Instantly search all words (Dutch or English) across all sets and contexts.
- **Audio Playback**: Listen to Dutch and English pronunciations using your browser's speech synthesis.
- **Bookmarks**: Star words for focused review. View and practice only your bookmarks.
- **Progress Tracking**: Visual progress bar and score badges for each mode. Progress and bookmarks are saved in your browser.
- **Export/Import Progress**: Download or restore your progress and bookmarks as a JSON file.
- **PDF Export**: Export the current set or all bookmarked words to a PDF for offline study.
- **Theme Toggle**: Switch between light and dark modes.
- **Responsive Design**: Works on desktop and mobile browsers.

## How to Use

1. **Upload Vocabulary**: Click "Upload Excel" and select your file. Column A should be Dutch, Column B English.
2. **Choose Mode**: Select "By Set" for paginated sets, or "By Context" for topic-based practice.
3. **Study**: Use the Study tab to review words. Blur columns for self-testing.
4. **Practice**: Use Practice tabs to type answers and get feedback. Use Bookmarked Practice for starred words.
5. **Tiles & Game**: Flip tiles or play the matching game for more interactive learning.
6. **Bookmark**: Click the star next to any word to bookmark it.
7. **Track Progress**: View your progress bar and scores. Export or import your progress as needed.
8. **Audio**: Use the play buttons to hear Dutch and English pronunciations.
9. **Export to PDF**: Download your current set or bookmarks as a PDF.

## File Structure

- `index.html` — Main HTML file
- `app.js` — Main application logic (ES6 modules)
- `data.js` — Default vocabulary and context data
- `styles.css` — App styling
- `favicon.png` — App icon

## Requirements

- Modern web browser (Chrome, Firefox, Edge, Safari)
- No installation required; works offline after first load

## Libraries Used

- [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) — Excel file parsing
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) — Table export to PDF

## Accessibility

- All form labels are properly associated with inputs
- Keyboard navigation supported
- Responsive and mobile-friendly

---

Enjoy learning Dutch! 🇳🇱