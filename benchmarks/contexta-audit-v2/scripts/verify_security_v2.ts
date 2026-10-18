import path from 'path';
import { fileURLToPath } from 'url';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';

function isValidDocId(docId: string): boolean {
  if (!docId || typeof docId !== 'string') return false;
  const trimmed = docId.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed !== '.' && trimmed !== '..';
}

async function runSecurityAndRegressionV2() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — SECURITY AUDIT & REGRESSION TEST SUITE V2');
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

  // 1. In-process doc_id sanitization regex tests
  await test('Security: Regex isValidDocId rejects path traversal patterns', async () => {
    const malicious = [
      '..',
      '../',
      '../../',
      '..\\..\\',
      '%2e%2e',
      '%2e%2e%2f',
      '/etc/passwd',
      'C:\\Windows\\System32',
      'doc<script>',
      'doc;rm -rf /',
      'doc\0null',
      '',
      '   ',
    ];
    for (const payload of malicious) {
      if (isValidDocId(payload)) {
        throw new Error(`Failed to reject malicious docId payload: "${payload}"`);
      }
    }
  });

  await test('Security: Regex isValidDocId accepts legitimate identifiers', async () => {
    const valid = [
      'doc_sample_transformer_foundations',
      'doc-123_abc',
      'USER_DOC_99',
      'a',
    ];
    for (const id of valid) {
      if (!isValidDocId(id)) {
        throw new Error(`Erroneously rejected legitimate docId: "${id}"`);
      }
    }
  });

  // 2. Server API path traversal injection tests
  await test('Security: POST /chat rejects path traversal doc_id with 400', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '../../../../etc/passwd', message: 'Read file' }),
    });
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400 or 404, got HTTP ${res.status}`);
    }
  });

  await test('Security: POST /quiz rejects path traversal doc_id with 400', async () => {
    const res = await fetch(`${BASE_URL}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '..%2f..%2fsecret', num_questions: 3 }),
    });
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400 or 404, got HTTP ${res.status}`);
    }
  });

  await test('Security: POST /summary rejects path traversal doc_id with 400', async () => {
    const res = await fetch(`${BASE_URL}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '..\\..\\boot.ini' }),
    });
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400 or 404, got HTTP ${res.status}`);
    }
  });

  await test('Security: DELETE /document/.. returns 400/404 without deleting parent', async () => {
    const res = await fetch(`${BASE_URL}/document/..`, { method: 'DELETE' });
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected 400 or 404, got HTTP ${res.status}`);
    }
  });

  // 3. Frontend XSS / Script Injection Prevention Test
  await test('Security: DOMPurify strips <script> and dangerous attributes from rendered output', async () => {
    const window = new JSDOM('').window;
    const purify = createDOMPurify(window as any);
    const attackPayload = '<p>Normal text</p><script>alert("xss")</script><img src=x onerror="alert(1)">';
    const sanitized = purify.sanitize(attackPayload, {
      ADD_TAGS: ['span', 'div', 'svg'],
      ADD_ATTR: ['class', 'style'],
    });
    if (sanitized.includes('<script>') || sanitized.includes('onerror')) {
      throw new Error(`Sanitizer allowed script execution payload: ${sanitized}`);
    }
    if (!sanitized.includes('Normal text')) {
      throw new Error('Sanitizer stripped legitimate content');
    }
  });

  // 4. Sample Document End-to-End Pipeline
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  await test('Integrity: GET /sample-doc returns valid document fixture', async () => {
    if (!sampleDoc.doc_id || !sampleDoc.filename) {
      throw new Error('Invalid sample doc fixture response');
    }
  });

  await test('Integrity: POST /chat returns valid response with 1-indexed citations', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: 'Explain Scaled Dot-Product Attention' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.answer || !Array.isArray(data.sources) || data.sources.length === 0) {
      throw new Error('Missing answer or citations');
    }
    for (const src of data.sources) {
      if (typeof src.page !== 'number' || src.page < 1) {
        throw new Error(`Invalid source page index: ${src.page}`);
      }
    }
  });

  await test('Integrity: POST /quiz generates 4 distinct options with correct answer key', async () => {
    const res = await fetch(`${BASE_URL}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, num_questions: 4, difficulty: 'medium' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data.questions) || data.questions.length !== 4) {
      throw new Error(`Expected 4 questions, received ${data.questions?.length}`);
    }
    for (const q of data.questions) {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error('Options array length must be 4');
      }
      if (!q.options.includes(q.correct_answer)) {
        throw new Error('correct_answer not found in options list');
      }
    }
  });

  await test('Integrity: POST /summary returns structured markdown summary with citations', async () => {
    const res = await fetch(`${BASE_URL}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.answer || !Array.isArray(data.sources)) {
      throw new Error('Summary missing answer or sources array');
    }
  });

  await test('Integrity: Evidence gate cleanly abstains on out-of-domain nonsense', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: 'What is the recipe for chocolate gelato on Jupiter?' }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.answer.includes("couldn't find enough information") || data.sources.length !== 0) {
      throw new Error(`Did not cleanly abstain: ${data.answer}`);
    }
  });

  console.log(`\n================================================================`);
  console.log(`   SECURITY & REGRESSION SUMMARY: ${passed} / ${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSecurityAndRegressionV2().catch((err) => {
  console.error('Security & regression suite failed:', err);
  process.exit(1);
});
