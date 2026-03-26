/**
 * resize.js – Column resize-by-drag + layout persistence
 * Handles drag-to-resize columns and fullscreen toggle.
 * Layout (widths) is saved to localStorage and restored on reload.
 */

const STORAGE_KEY = 'b5-col-widths-v3'; // v3: Kasa kaldırıldı, flex:1 devrede


const container = document.getElementById('resize-container');
const panels = Array.from(container.querySelectorAll('.resizable-panel'));
const resizers = Array.from(container.querySelectorAll('.resizer'));

/* ─── Apply Widths ─── */
function applyWidths(widths) {
    if (!widths) return; // default olarak css flex: 1 1 0 devreye girer
    
    panels.forEach(panel => {
        const col = panel.dataset.col;
        if (widths[col]) {
            panel.style.flex = 'none';
            panel.style.width = widths[col] + 'px';
        }
    });
}

/* ─── Save current widths to localStorage ─── */
function saveWidths() {
    const widths = {};
    panels.forEach(panel => {
        widths[panel.dataset.col] = panel.getBoundingClientRect().width;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
}

/* ─── Restore saved widths ─── */
function loadWidths() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
    } catch (_) { }
    return null;
}

/* ─── Reset to default ─── */
document.getElementById('btn-reset-layout').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    panels.forEach(panel => {
        panel.style.flex = '1 1 0';
        panel.style.width = '';
    });
});

/* ─── Fullscreen Toggle ─── */
const btnFullscreen = document.getElementById('btn-fullscreen');
btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        btnFullscreen.innerHTML = '<i class="fa-solid fa-compress"></i>';
    } else {
        document.exitFullscreen();
        btnFullscreen.innerHTML = '<i class="fa-solid fa-expand"></i>';
    }
});

/* ─── Drag-to-Resize Logic ─── */
resizers.forEach((resizer, idx) => {
    let isResizing = false;
    let startX = 0;
    let panelLeft = panels[idx];  // panel to the left of resizer
    let panelRight = panels[idx + 1]; // panel to the right
    let startLeftWidth = 0;
    let startRightWidth = 0;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startLeftWidth = panelLeft.getBoundingClientRect().width;
        startRightWidth = panelRight.getBoundingClientRect().width;

        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - startX;

        const newLeftWidth  = startLeftWidth + dx;
        const newRightWidth = startRightWidth - dx;
        const MIN_WIDTH = 180;

        if (newLeftWidth < MIN_WIDTH || newRightWidth < MIN_WIDTH) return;

        // Tüm kolonlar artık boyutlandırılabilir
        panelLeft.style.flex = 'none';
        panelLeft.style.width = newLeftWidth + 'px';

        panelRight.style.flex = 'none';
        panelRight.style.width = newRightWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (!isResizing) return;
        isResizing = false;
        resizer.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveWidths();
    });
});

/* ─── Initial Load ─── */
applyWidths(loadWidths());
