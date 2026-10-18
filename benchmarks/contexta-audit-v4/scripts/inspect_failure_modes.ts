import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DATASET_100, BenchmarkItem } from './dataset_100.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';

async function inspectFailures() {
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  const falseAbsIds = ['PV01', 'PV03', 'PV04', 'PV07', 'PV08', 'PV11', 'PV13', 'PV14', 'PV15', 'PV16', 'PV18', 'MP12', 'AM03', 'AM04', 'AM06', 'AM08', 'AM10'];
  const unansHallucIds = ['AB01', 'AB03', 'AB04', 'AB05', 'AB14', 'OOD01', 'OOD04', 'OOD05', 'OOD06', 'OOD10', 'ADV01', 'ADV02', 'ADV03', 'ADV05', 'ADV07', 'ADV08', 'ADV09', 'ADV10'];

  console.log('================================================================');
  console.log('   INVESTIGATING 17 FALSE ABSTENTIONS');
  console.log('================================================================');
  for (const id of falseAbsIds) {
    const item = DATASET_100.find(i => i.id === id)!;
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: item.question }),
    });
    const data = await res.json();
    console.log(`[${id}] Q: "${item.question}"`);
    console.log(`   Expected Pages: [${item.expected_pages.join(', ')}]`);
    console.log(`   Answer Preview: "${(data.answer || '').slice(0, 100)}"`);
    console.log(`   Sources Count: ${data.sources?.length || 0}`);
    console.log('----------------------------------------------------------------');
  }

  console.log('\n================================================================');
  console.log('   INVESTIGATING 18 UNANSWERABLE HALLUCINATIONS');
  console.log('================================================================');
  for (const id of unansHallucIds) {
    const item = DATASET_100.find(i => i.id === id)!;
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: item.question }),
    });
    const data = await res.json();
    console.log(`[${id}] (${item.category}) Q: "${item.question}"`);
    console.log(`   Answer Preview: "${(data.answer || '').slice(0, 120)}"`);
    console.log(`   Sources: ${data.sources?.map((s: any) => `Page ${s.page} (chunk: ${s.chunk_id}, score: ${s.score})`).join(', ')}`);
    console.log('----------------------------------------------------------------');
  }
}

inspectFailures().catch(console.error);
