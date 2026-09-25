/**
 * terminal-server.js — Alpha Terminal Node.js Sunucusu
 */

const express = require('express');
const https   = require('https');
const path    = require('path');

const app  = express();
const PORT = process.env.TERMINAL_PORT || 3000;

// ─── Static Files ────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Binance CORS Proxy ──────────────────────────────────────
function proxyRequest(targetUrl, res) {
  const options = { headers: { 'User-Agent': 'AlphaTerminal/1.0', 'Accept': 'application/json' } };
  https.get(targetUrl, options, (apiRes) => {
    res.status(apiRes.statusCode).set('Content-Type', 'application/json');
    apiRes.pipe(res);
  }).on('error', (err) => {
    console.error('[Proxy] Hata:', err.message);
    res.status(502).json({ error: 'Upstream baglanti hatasi' });
  });
}

// /api/fapi/** -> https://fapi.binance.com/fapi/**
app.use('/api/fapi', (req, res) => {
  const parts = req.url.split('?');
  const ep    = parts[0];
  const qs    = parts[1] || '';
  const url   = `https://fapi.binance.com/fapi${ep}${qs ? '?' + qs : ''}`;
  proxyRequest(url, res);
});

// /api/data/** -> https://fapi.binance.com/**
app.use('/api/data', (req, res) => {
  const parts = req.url.split('?');
  const ep    = parts[0];
  const qs    = parts[1] || '';
  const url   = `https://fapi.binance.com${ep}${qs ? '?' + qs : ''}`;
  proxyRequest(url, res);
});

// ─── Baslat ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ALPHA TERMINAL');
  console.log('  ----------------------------------');
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Binance Futures Proxy aktif`);
  console.log('  ----------------------------------');
  console.log('  Cikmak icin Ctrl+C');
  console.log('');
});
