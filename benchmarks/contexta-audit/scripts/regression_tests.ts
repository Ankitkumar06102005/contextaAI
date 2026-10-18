import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — AUTOMATED REGRESSION & INTEGRITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    process.stdout.write(`TEST ${total}: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message || err}`);
    }
  }

  // Load sample doc
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  // 1. Health check standard schema
  await test('GET /health returns 200 with standard schema', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (data.status !== 'ok' || !data.rag_engine) throw new Error('Invalid schema');
  });

  // 2. Retrieval correctness on indexed chunks
  await test('POST /chat retrieves valid chunks with 1-indexed pages', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: 'What is scaled dot product attention?' }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.sources) || data.sources.length === 0) throw new Error('Missing sources');
    if (!data.sources.every((s: any) => typeof s.page === 'number' && s.page >= 1)) {
      throw new Error('Sources missing valid 1-indexed page');
    }
  });

  // 3. Unanswerable question abstention
  await test('POST /chat evidence gate intercepts out-of-scope query', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: 'What is the secret recipe for strawberry cupcakes on Mars?' }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.answer.includes("couldn't find enough information") || data.sources.length !== 0) {
      throw new Error(`Did not abstain properly: ${data.answer}`);
    }
  });

  // 4. Quiz answer-key consistency & 4 options
  await test('POST /quiz generates valid MCQs with verified correct answer among options', async () => {
    const res = await fetch(`${BASE_URL}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, num_questions: 5, difficulty: 'medium' }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.questions) || data.questions.length !== 5) throw new Error('Question count mismatch');
    for (const q of data.questions) {
      if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error('Option count is not 4');
      if (!q.options.includes(q.correct_answer)) throw new Error('correct_answer not in options');
      if (!Array.isArray(q.source_pages) || q.source_pages.length === 0) throw new Error('Missing source_pages');
    }
  });

  // 5. Empty message validation
  await test('POST /chat rejects empty message with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: '   ' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 6. Missing doc_id validation
  await test('POST /chat rejects missing doc_id with 400 Bad Request', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  // 7. Nonexistent doc_id returns 404
  await test('POST /chat returns 404 for unknown document ID', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: 'doc_nonexistent_99999', message: 'Hello' }),
    });
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  });

  // 8. Path traversal attempt in DELETE is blocked
  await test('DELETE /document/.. path traversal is rejected with 400', async () => {
    const res = await fetch(`${BASE_URL}/document/..`, { method: 'DELETE' });
    if (res.status !== 400 && res.status !== 404) throw new Error(`Expected 400 or 404, got ${res.status}`);
  });

  // 9. Path traversal attempt in load is blocked
  await test('POST /chat with path traversal doc_id (../../) returns 404/400', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '../../../etc/passwd', message: 'Read file' }),
    });
    if (res.status !== 404 && res.status !== 400) throw new Error(`Expected 400 or 404, got ${res.status}`);
  });

  // 10. Summary endpoint returns structured executive takeaways
  await test('POST /summary returns structured executive summary with sources', async () => {
    const res = await fetch(`${BASE_URL}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId }),
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    if (!data.answer || !Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error('Summary missing answer or sources');
    }
  });

  console.log(`\n================================================================`);
  console.log(`   REGRESSION RESULTS: ${passed} / ${total} TESTS PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runRegressionSuite().catch((err) => {
  console.error('Regression suite failed:', err);
  process.exit(1);
});
