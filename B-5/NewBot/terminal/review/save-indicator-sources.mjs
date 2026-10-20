import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('review/visivero_templates.json', 'utf8'));
fs.mkdirSync('review/extracted_indicators', { recursive: true });

const t5 = data.templates.find(t => t.id === 'visivero-5in1');
const tsr = data.templates.find(t => t.id === 'visivero-tc-sr');

if (t5) fs.writeFileSync('review/extracted_indicators/5in1.py', t5.code, 'utf8');
if (tsr) fs.writeFileSync('review/extracted_indicators/tc_sr.py', tsr.code, 'utf8');

console.log('Saved 5in1.py and tc_sr.py successfully!');
