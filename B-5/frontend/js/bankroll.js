const API_URL = 'http://localhost:3000/api/bankroll';
const tbody = document.getElementById('bankroll-body');
const initialCapitalInput = document.getElementById('initial-capital');
let bankrollData = [];

// Fetch initial data
async function loadData() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        if (data.success && data.data) {
            if (data.data.trades) {
                bankrollData = data.data.trades;
                initialCapitalInput.value = data.data.initialCapital;
            } else if (Array.isArray(data.data)) { // Legacy array structure
                bankrollData = data.data;
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
        date: now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
        time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        position: 'Long',
        profit: null,
        cumulativeBankroll: 0,
        percentageChange: 0
    };
}

// Add signal from WS
window.addToTable = function (signal) {
    const newRow = {
        id: generateId(),
        coin: signal.coin || '',
        date: signal.date || new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }),
        time: signal.time || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
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
document.getElementById('add-manual-btn').addEventListener('click', () => {
    bankrollData.push(createEmptyRow());
    renderTable();
    saveData();
});

// Calculate cumulative bankroll and percentage
function calculateBankroll() {
    let currentCapital = parseFloat(initialCapitalInput.value) || 0;
    const initialCapital = currentCapital;

    bankrollData.forEach(row => {
        if (row.profit !== null && row.profit !== "") {
            currentCapital += parseFloat(row.profit);
        }
        row.cumulativeBankroll = currentCapital;
        row.percentageChange = initialCapital > 0 ? ((currentCapital - initialCapital) / initialCapital) * 100 : 0;
    });

    updateGlobalStats(currentCapital, initialCapital);
}

function updateGlobalStats(current, initial) {
    document.getElementById('current-capital').innerText = `$${current.toFixed(2)}`;

    const profit = current - initial;
    const pct = initial > 0 ? (profit / initial) * 100 : 0;

    document.getElementById('net-profit-val').innerText = `${profit > 0 ? '+' : ''}$${profit.toFixed(2)}`;

    const pctEl = document.getElementById('net-profit-pct');
    pctEl.innerText = `${profit > 0 ? '+' : ''}${pct.toFixed(2)}%`;
    pctEl.className = `stat-pct ${profit > 0 ? 'positive' : (profit < 0 ? 'negative' : '')}`;
}

// Render table HTML
function renderTable() {
    calculateBankroll();
    tbody.innerHTML = '';

    bankrollData.forEach((row, index) => {
        const tr = document.createElement('tr');
        if (row.profit !== null && row.profit !== "") {
            tr.className = parseFloat(row.profit) >= 0 ? 'positive' : 'negative';
        }

        tr.innerHTML = `
            <td><input type="text" class="editable" value="${row.coin}" onchange="updateRow('${row.id}', 'coin', this.value)"></td>
            <td><input type="text" class="editable" value="${row.date}" onchange="updateRow('${row.id}', 'date', this.value)"></td>
            <td><input type="text" class="editable" value="${row.time}" onchange="updateRow('${row.id}', 'time', this.value)"></td>
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

initialCapitalInput.addEventListener('change', () => {
    renderTable();
    saveData();
});

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
document.getElementById('btn-export-excel').addEventListener('click', () => {
    const initialCapital = parseFloat(initialCapitalInput.value) || 0;

    const rows = bankrollData.map(row => ({
        'Coin': row.coin,
        'Tarih': row.date,
        'Saat': row.time,
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

// ─── PDF Export ───
document.getElementById('btn-export-pdf').addEventListener('click', () => {
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
    const headers = [['Coin', 'Tarih', 'Saat', 'Pozisyon', 'Kazanç ($)', 'Kasa ($)', 'Yüzde (%)']];
    const rows = bankrollData.map(row => [
        row.coin,
        row.date,
        row.time,
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

