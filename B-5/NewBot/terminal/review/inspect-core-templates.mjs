import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('review/visivero_templates.json', 'utf8'));

for (const t of data.templates) {
  if (['visivero-wt-cross', 'visivero-5in1', 'visivero-tc-buy-sell', 'visivero-srsi', 'visivero-pivot'].includes(t.id)) {
    console.log(`\n======================================================`);
    console.log(`TEMPLATE: ${t.name} (${t.id})`);
    console.log(`======================================================`);
    console.log(t.code);
  }
}
