/**
 * Formats trading volume into a human-readable string (e.g., 238.13M, 45.2K)
 * @param {number|string} value - The raw volume value in USD/USDT
 * @returns {string} Formatted volume string or '---'
 */
function formatVolume(value) {
    if (value === undefined || value === null || value === '-' || value === 0 || value === '0') {
        return '---';
    }

    const val = parseFloat(value);
    if (isNaN(val)) return '---';
    
    if (val === 0) return '---';

    if (val >= 1000000000) {
        return (val / 1000000000).toFixed(2) + 'B';
    }
    if (val >= 1000000) {
        return (val / 1000000).toFixed(3) + 'M';
    }
    if (val >= 1000) {
        return (val / 1000).toFixed(2) + 'K';
    }
    
    return val.toFixed(1);
}

function formatPrice(value) {
    if (value === undefined || value === null || value === '-' || value === 0 || value === '0') {
        return '---';
    }

    const val = parseFloat(value);
    if (isNaN(val)) return '---';

    // 🚀 Smart Precision Logic
    if (val >= 1) {
        return val.toFixed(4); // e.g. 70942.2900 or 1.2340
    }
    
    // Very small coins (e.g. 0.089409)
    return val.toFixed(6);
}

module.exports = {
    formatVolume,
    formatPrice
};
