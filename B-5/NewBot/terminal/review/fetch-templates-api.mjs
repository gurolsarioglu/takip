const res = await fetch('https://terminal.visivero.com/api/script-runtime/templates', {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json'
  }
});

console.log('Status:', res.status);
const text = await res.text();
console.log('Body:', text.slice(0, 1500));
