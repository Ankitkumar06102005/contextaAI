import { DATASET_100 } from './dataset_100.js';

const BASE_URL = 'http://localhost:3000';

async function testQuery(id: string) {
  const item = DATASET_100.find(i => i.id === id)!;
  const sampleRes = await fetch(BASE_URL + '/sample-doc');
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  const res = await fetch(BASE_URL + '/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: item.question }),
  });
  const data = await res.json();
  console.log(`[${id}] Q: "${item.question}"`);
  console.log(`Answer:\n${data.answer}`);
  console.log(`Sources:\n${JSON.stringify(data.sources, null, 2)}`);
  console.log(`Latencies:\n${JSON.stringify(data.latency_ms, null, 2)}`);
}

testQuery('PV08').catch(console.error);
