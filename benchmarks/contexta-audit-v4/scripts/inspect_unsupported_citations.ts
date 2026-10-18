import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DATASET_100 } from './dataset_100.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const v3Citations = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../contexta-audit-v3/citation_evaluation.json'), 'utf-8'));
const unsupported = v3Citations.citations.filter((c: any) => !c.is_valid_grounded);

console.log(`Total unsupported citations: ${unsupported.length}`);
for (const c of unsupported) {
  const item = DATASET_100.find(i => i.id === c.question_id)!;
  console.log(`[${c.question_id}] (${c.category}) Cited: Page ${c.cited_page} | Expected: [${c.expected_pages.join(', ')}]`);
  console.log(`   Q: "${item.question}"`);
  console.log(`   Keywords: [${item.supporting_keywords.join(', ')}]`);
  console.log('----------------------------------------------------------------');
}
