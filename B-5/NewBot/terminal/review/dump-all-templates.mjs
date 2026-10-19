import fs from 'node:fs';

const res = await fetch('https://terminal.visivero.com/api/script-runtime/templates');
const data = await res.json();

console.log(`Found ${data.templates?.length || 0} templates!`);

fs.writeFileSync('review/visivero_templates.json', JSON.stringify(data, null, 2), 'utf8');

for (const t of data.templates || []) {
  console.log(`- [${t.id}] ${t.name}: ${t.description} (sourceKind: ${t.sourceKind})`);
}
