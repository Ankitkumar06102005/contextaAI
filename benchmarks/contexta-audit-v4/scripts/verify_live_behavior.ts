import { DATASET_100 } from './dataset_100.js';

async function verifyLive() {
  const sampleRes = await fetch('http://localhost:3000/sample-doc');
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  // Test PV08 (was false abstention)
  const pv08 = DATASET_100.find(i => i.id === 'PV08')!;
  const res1 = await fetch('http://localhost:3000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: pv08.question }),
  });
  const data1 = await res1.json();
  console.log('PV08 result:');
  console.log('  Status:', res1.status);
  console.log('  Sources:', data1.sources?.map((s: any) => `Page ${s.page} (Score: ${s.score})`));
  console.log('  Answer Preview:', data1.answer?.slice(0, 100));

  // Test OOD01 (was unanswerable hallucination)
  const ood01 = DATASET_100.find(i => i.id === 'OOD01')!;
  const res2 = await fetch('http://localhost:3000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: ood01.question }),
  });
  const data2 = await res2.json();
  console.log('\nOOD01 result:');
  console.log('  Status:', res2.status);
  console.log('  Sources Count:', data2.sources?.length);
  console.log('  Answer:', data2.answer);

  // Test DF01 (Direct factual)
  const df01 = DATASET_100.find(i => i.id === 'DF01')!;
  const res3 = await fetch('http://localhost:3000/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: df01.question }),
  });
  const data3 = await res3.json();
  console.log('\nDF01 result:');
  console.log('  Sources:', data3.sources?.map((s: any) => `Page ${s.page} (Score: ${s.score})`));
  console.log('  Latency:', data3.latency_ms);
}

verifyLive().catch(console.error);
