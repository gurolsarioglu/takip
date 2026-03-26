const API_URL = 'http://localhost:3000/api/bankroll';
const tbody = document.getElementById('bankroll-body');
const initialCapitalInput = document.getElementById('initial-capital');
let bankrollData = [];

// Helper to fix old "12 Mart 2026 Perşembe" format to "YYYY-MM-DD"
function ensureDateFormat(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (dateStr.includes('-')) return dateStr;
    const months = {
        'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04', 'Mayıs': '05', 'Haziran': '06',
        'Temmuz': '07', 'Ağustos': '08', 'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12'
    };
    const parts = dateStr.split(' ');
    if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return new Date().toISOString().split('T')[0];
}

// Fetch initial data
async function loadData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.success && data.data) {
            let loadedTrades = data.data.trades || (Array.isArray(data.data) ? data.data : []);
            
            // Migrate legacy dates and times
            bankrollData = loadedTrades.map(t => {
                t.date = ensureDateFormat(t.date);
                if (t.time !== undefined && t.timeIn === undefined) {
                    t.timeIn = t.time;
                    t.timeOut = '';
                    delete t.time;
                }
                return t;
            });

            if (data.data.trades && initialCapitalInput) {
                initialCapitalInput.value = data.data.initialCapital;
            }
            renderTable();
        }
    } catch (e) {
        console.error('Failed to load bankroll data', e);
    }
}

// Generate UUID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Create new row structure
function createEmptyRow() {
    const now = new Date();
    return {
        id: generateId(),
        coin: '',
        date: now.toISOString().split('T')[0],
        timeIn: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        timeOut: '',
        position: 'Long',
        profit: null,
        cumulativeBankroll: 0,
        percentageChange: 0
    };
}

// Add signal from WS
window.addToTable = function (signal) {
    const now = new Date();
    const newRow = {
        id: generateId(),
        coin: signal.coin || '',
        date: signal.date ? ensureDateFormat(signal.date) : now.toISOString().split('T')[0],
        timeIn: signal.time || now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        timeOut: '',
        position: signal.position || '',
        profit: null,
        cumulativeBankroll: 0,
        percentageChange: 0
    };
    bankrollData.push(newRow);
    renderTable();
    saveData();
};

// Add manual row
const addManualBtn = document.getElementById('add-manual-btn');
if (addManualBtn) {
    addManualBtn.addEventListener('click', () => {
        bankrollData.push(createEmptyRow());
        renderTable();
        saveData();
    });
}

// Calculate cumulative bankroll and percentage
function calculateBankroll() {
    let currentCapital = initialCapitalInput ? (parseFloat(initialCapitalInput.value) || 0) : 0;
    const initialCapital = currentCapital;

    let totalTrades = 0;
    let winTrades = 0;

    bankrollData.forEach(row => {
        if (row.profit !== null && row.profit !== "") {
            const rowProfit = parseFloat(row.profit);
            currentCapital += rowProfit;
            totalTrades++;
            if (rowProfit > 0) winTrades++;
        }
        row.cumulativeBankroll = currentCapital;
        row.percentageChange = initialCapital > 0 ? ((currentCapital - initialCapital) / initialCapital) * 100 : 0;
    });

    updateGlobalStats(currentCapital, initialCapital, winTrades, totalTrades);
}

function updateGlobalStats(current, initial, winTrades, totalTrades) {
    const profit = current - initial;
    const pct = initial > 0 ? (profit / initial) * 100 : 0;
    const isPositive = profit > 0;
    const isNegative = profit < 0;

    // Update Modal
    const modalCurrent = document.getElementById('modal-current-capital');
    if (modalCurrent) modalCurrent.innerText = `$${current.toFixed(2)}`;

    const modalProfitVal = document.getElementById('modal-net-profit-val');
    if (modalProfitVal) modalProfitVal.innerText = `${isPositive ? '+' : ''}$${profit.toFixed(2)}`;

    const modalPct = document.getElementById('modal-net-profit-pct');
    if (modalPct) {
        modalPct.innerText = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`;
        modalPct.className = `stat-pct ${isPositive ? 'positive' : (isNegative ? 'negative' : '')}`;
    }

    // --- Target Stats (%30 Daily) ---
    const targetProfit = initial * 0.30;
    const remainingToTarget = targetProfit - profit;
    
    const modalTargetVal = document.getElementById('modal-target-val');
    if (modalTargetVal) modalTargetVal.innerText = `$${targetProfit.toFixed(2)}`;
    
    const modalTargetRemaining = document.getElementById('modal-target-remaining');
    if (modalTargetRemaining) {
        if (remainingToTarget <= 0 && initial > 0) {
            modalTargetRemaining.innerText = `Hedef Tamamlandı! 🎉`;
            modalTargetRemaining.style.color = '#10b981';
        } else {
            modalTargetRemaining.innerText = `Kalan: $${remainingToTarget.toFixed(2)}`;
            modalTargetRemaining.style.color = '#ddd';
        }
    }

    // --- Win Rate & Trade Counts ---
    const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    const elWinRate = document.getElementById('modal-win-rate');
    if (elWinRate) {
        elWinRate.innerText = `%${winRate.toFixed(2)}`;
        elWinRate.style.color = winRate >= 50 ? '#10b981' : '#ef4444';
    }
    
    const elTradeCounts = document.getElementById('modal-trade-counts');
    if (elTradeCounts) elTradeCounts.innerText = `${winTrades} / ${totalTrades}`;

    // Update Top Bar (Dashboard)
    const elCurrent = document.getElementById('top-current-capital');
    if (elCurrent) elCurrent.innerText = `$${current.toFixed(2)}`;

    const elProfitVal = document.getElementById('top-net-profit-val');
    if (elProfitVal) elProfitVal.innerText = `${isPositive ? '+' : ''}$${profit.toFixed(2)}`;

    const pctEl = document.getElementById('top-net-profit-pct');
    if (pctEl) {
        pctEl.innerText = `${isPositive ? '+' : ''}${pct.toFixed(2)}%`;
        pctEl.className = `stat-pct ${isPositive ? 'positive' : (isNegative ? 'negative' : '')} text-green`; // just keep span color logic, actually in the top bar we haven't styled it much
        if(isNegative) pctEl.className = 'text-red';
        else if(isPositive) pctEl.className = 'text-green';
    }
}

// Render table HTML
function renderTable() {
    calculateBankroll();
    if (!tbody) return; // Kasa tablosu sayfada yoksa (Dashboard'daysak) render etme
    tbody.innerHTML = '';

    bankrollData.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (row.profit !== null && row.profit !== "") {
            tr.className = parseFloat(row.profit) >= 0 ? 'positive' : 'negative';
        }

        tr.innerHTML = `
            <td><input type="text" class="editable" value="${row.coin}" onchange="updateRow('${row.id}', 'coin', this.value)" style="text-transform: uppercase;"></td>
            <td><input type="date" class="editable" value="${row.date}" onchange="updateRow('${row.id}', 'date', this.value)" style="font-family: inherit;"></td>
            <td><input type="time" class="editable" value="${row.timeIn}" onchange="updateRow('${row.id}', 'timeIn', this.value)" style="font-family: inherit;"></td>
            <td><input type="time" class="editable" value="${row.timeOut || ''}" onchange="updateRow('${row.id}', 'timeOut', this.value)" style="font-family: inherit;"></td>
            <td>
                <select class="editable" onchange="updateRow('${row.id}', 'position', this.value)">
                    <option value="Long" ${row.position === 'Long' ? 'selected' : ''}>Long</option>
                    <option value="Short" ${row.position === 'Short' ? 'selected' : ''}>Short</option>
                </select>
            </td>
            <td>
                <input type="number" class="profit-input" placeholder="0.00" step="0.01" 
                    value="${row.profit !== null ? row.profit : ''}" 
                    onchange="updateRow('${row.id}', 'profit', this.value)">
            </td>
            <td style="font-family: 'JetBrains Mono', monospace;">$${row.cumulativeBankroll.toFixed(2)}</td>
            <td style="font-family: 'JetBrains Mono', monospace;" class="${row.percentageChange > 0 ? 'text-green' : (row.percentageChange < 0 ? 'text-red' : '')}">
                ${row.percentageChange > 0 ? '+' : ''}${row.percentageChange.toFixed(2)}%
            </td>
            <td>
                <button class="btn-icon" onclick="deleteRow('${row.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.updateRow = function (id, field, value) {
    const row = bankrollData.find(r => r.id === id);
    if (row) {
        if (field === 'profit') {
            row.profit = value === '' ? null : parseFloat(value);
        } else {
            row[field] = value;
        }
        renderTable();
        saveData();
    }
};

window.deleteRow = function (id) {
    bankrollData = bankrollData.filter(r => r.id !== id);
    renderTable();
    saveData();
};

if (initialCapitalInput) {
    initialCapitalInput.addEventListener('change', () => {
        renderTable();
        saveData();
    });
}

async function saveData() {
    try {
        const payload = {
            initialCapital: parseFloat(initialCapitalInput.value) || 0,
            trades: bankrollData
        };
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('Failed to save data', e);
    }
}

// Init
loadData();

// ─── Excel Export ───
const btnExportExcel = document.getElementById('btn-export-excel');
if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
    const initialCapital = parseFloat(initialCapitalInput.value) || 0;

    const rows = bankrollData.map(row => ({
        'Coin': row.coin,
        'Tarih': row.date,
        'Giriş Saati': row.timeIn,
        'Çıkış Saati': row.timeOut || '-',
        'Pozisyon': row.position,
        'Kazanç ($)': row.profit !== null ? row.profit : '',
        'Kasa ($)': row.cumulativeBankroll?.toFixed(2) ?? '',
        'Yüzde (%)': row.percentageChange !== undefined
            ? (row.percentageChange > 0 ? '+' : '') + row.percentageChange.toFixed(2) + '%'
            : ''
    }));

    // Summary row at bottom
    rows.push({});
    rows.push({ 'Coin': 'Başlangıç Sermayesi', 'Kazanç ($)': initialCapital });
    const lastRow = bankrollData[bankrollData.length - 1];
    if (lastRow) {
        const netProfit = lastRow.cumulativeBankroll - initialCapital;
        rows.push({ 'Coin': 'Güncel Kasa', 'Kazanç ($)': lastRow.cumulativeBankroll?.toFixed(2) });
        rows.push({ 'Coin': 'Net Kazanç', 'Kazanç ($)': (netProfit >= 0 ? '+' : '') + netProfit.toFixed(2) });
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws['!cols'] = [
        { wch: 16 }, { wch: 28 }, { wch: 10 }, { wch: 10 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kasa Defteri');

    const filename = `Kasa_Defteri_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
    });
}

// ─── PDF Export ───
const btnExportPdf = document.getElementById('btn-export-pdf');
if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const initialCapital = parseFloat(initialCapitalInput.value) || 0;
    const lastRow = bankrollData[bankrollData.length - 1];
    const currentCapital = lastRow ? lastRow.cumulativeBankroll : initialCapital;
    const netProfit = currentCapital - initialCapital;
    const dateStr = new Date().toLocaleDateString('tr-TR');

    // Header
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text('B-5 Kasa Defteri', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rapor Tarihi: ${dateStr}`, 14, 23);
    doc.text(`Başlangıç: $${initialCapital.toFixed(2)}  |  Güncel Kasa: $${currentCapital.toFixed(2)}  |  Net Kazanç: ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}`, 14, 29);

    // Table
    const headers = [['Coin', 'Tarih', 'Giriş', 'Çıkış', 'Pozisyon', 'Kazanç ($)', 'Kasa ($)', 'Yüzde (%)']];
    const rows = bankrollData.map(row => [
        row.coin,
        row.date,
        row.timeIn,
        row.timeOut || '-',
        row.position,
        row.profit !== null ? (row.profit >= 0 ? '+' : '') + parseFloat(row.profit).toFixed(2) : '-',
        '$' + (row.cumulativeBankroll?.toFixed(2) ?? '0.00'),
        (row.percentageChange > 0 ? '+' : '') + (row.percentageChange?.toFixed(2) ?? '0') + '%'
    ]);

    doc.autoTable({
        head: headers,
        body: rows,
        startY: 34,
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        didParseCell: (data) => {
            // Color the profit / percentage columns
            if (data.section === 'body') {
                const cellText = String(data.cell.text);
                if ((data.column.index === 4 || data.column.index === 6) && cellText.startsWith('+')) {
                    data.cell.styles.textColor = [22, 163, 74]; // green
                } else if ((data.column.index === 4 || data.column.index === 6) && cellText.startsWith('-')) {
                    data.cell.styles.textColor = [220, 38, 38]; // red
                }
            }
        }
    });

    const filename = `Kasa_Defteri_${dateStr.replace(/\./g, '-')}.pdf`;
    doc.save(filename);
    });
}

// ─── Modal Integration ───
const btnOpenBankroll = document.getElementById('btn-open-bankroll');
const btnCloseModal = document.getElementById('btn-close-modal');
const bankrollModal = document.getElementById('bankroll-modal');

if (btnOpenBankroll && bankrollModal) {
    btnOpenBankroll.addEventListener('click', (e) => {
        e.preventDefault();
        bankrollModal.classList.add('active');
    });
}

if (btnCloseModal && bankrollModal) {
    btnCloseModal.addEventListener('click', () => {
        bankrollModal.classList.remove('active');
    });
}

// Close on overlay click
if (bankrollModal) {
    bankrollModal.addEventListener('mousedown', (e) => {
        if (e.target === bankrollModal) {
            bankrollModal.classList.remove('active');
        }
    });
}

