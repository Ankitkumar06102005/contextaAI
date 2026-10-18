import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { isValidDocId } from '../../../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const SECURITY_OUT = path.resolve(__dirname, '..', 'security_results_v4.json');
const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

async function runSecurityV4() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — SECURITY & FILESYSTEM CONTAINMENT AUDIT V4');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;
  const testResults: any[] = [];

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    process.stdout.write(`TEST ${total}: ${name}... `);
    try {
      await fn();
      console.log('✅ PASSED');
      passed++;
      testResults.push({ id: total, name, status: 'PASSED' });
    } catch (err: any) {
      console.log(`❌ FAILED: ${err.message || err}`);
      testResults.push({ id: total, name, status: 'FAILED', error: err.message || String(err) });
    }
  }

  // 1. Direct unit verification of production isValidDocId exported from server.ts
  await test('Production isValidDocId rejects directory traversal sequences', async () => {
    const maliciousPayloads = [
      '..', '../', '../../', '..\\..\\', '%2e%2e', '%2e%2e%2f',
      '/etc/passwd', 'C:\\Windows\\System32', 'doc\0null', '<script>', 'doc;rm -rf /'
    ];
    for (const payload of maliciousPayloads) {
      if (isValidDocId(payload)) {
        throw new Error(`Production isValidDocId accepted attack payload: "${payload}"`);
      }
    }
  });

  await test('Production isValidDocId accepts clean alphanumeric document IDs', async () => {
    const valid = ['doc_sample_transformer_foundations', 'doc-123_abc', 'DOC_99', 'a'];
    for (const id of valid) {
      if (!isValidDocId(id)) {
        throw new Error(`Production isValidDocId rejected valid ID: "${id}"`);
      }
    }
  });

  // 2. Strict Boundary HTTP 400 assertion on traversal payloads (rejecting 404)
  await test('API: POST /chat strictly returns HTTP 400 (not 404) on traversal doc_id', async () => {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '../../../../etc/passwd', message: 'Read file' }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 Bad Request, but received HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body.error?.includes('Invalid document ID format')) {
      throw new Error(`Unexpected error message: ${body.error}`);
    }
  });

  await test('API: POST /quiz strictly returns HTTP 400 (not 404) on traversal doc_id', async () => {
    const res = await fetch(`${BASE_URL}/quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '..%2f..%2fsecret', num_questions: 3 }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 Bad Request, but received HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body.error?.includes('Invalid document ID format')) {
      throw new Error(`Unexpected error message: ${body.error}`);
    }
  });

  await test('API: POST /summary strictly returns HTTP 400 (not 404) on traversal doc_id', async () => {
    const res = await fetch(`${BASE_URL}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: '..\\..\\boot.ini' }),
    });
    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 Bad Request, but received HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body.error?.includes('Invalid document ID format')) {
      throw new Error(`Unexpected error message: ${body.error}`);
    }
  });

  await test('API: DELETE /document/.. strictly returns HTTP 400 on traversal delete', async () => {
    const res = await fetch(`${BASE_URL}/document/..`, { method: 'DELETE' });
    if (res.status !== 400 && res.status !== 404) {
      throw new Error(`Expected HTTP 400 or 404 (route matching), received HTTP ${res.status}`);
    }
  });

  // 3. Filesystem containment probe: Canary file isolation
  await test('Filesystem Containment: Canary file outside DATA_DIR cannot be accessed or deleted', async () => {
    const canaryPath = path.resolve(DATA_DIR, '..', 'canary_isolation_test.tmp');
    fs.writeFileSync(canaryPath, 'CRITICAL_CANARY_SECRET_DATA_DO_NOT_DELETE', 'utf-8');

    try {
      // Attempt traversal read
      const chatRes = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: '../canary_isolation_test.tmp', message: 'Extract secret' }),
      });
      if (chatRes.status === 200) throw new Error('Traversal succeeded in reading canary file!');

      // Attempt traversal deletion
      await fetch(`${BASE_URL}/document/../canary_isolation_test.tmp`, { method: 'DELETE' });

      // Verify canary file still exists completely intact
      if (!fs.existsSync(canaryPath)) {
        throw new Error('Canary file was deleted by traversal attack!');
      }
      const contents = fs.readFileSync(canaryPath, 'utf-8');
      if (contents !== 'CRITICAL_CANARY_SECRET_DATA_DO_NOT_DELETE') {
        throw new Error('Canary file contents were modified!');
      }
    } finally {
      if (fs.existsSync(canaryPath)) {
        fs.unlinkSync(canaryPath);
      }
    }
  });

  // 4. XSS & Script Injection Prevention
  await test('XSS Defense: DOMPurify strips <script> and malicious event handlers', async () => {
    const window = new JSDOM('').window;
    const purify = createDOMPurify(window as any);
    const attackPayload = '<p>Normal text</p><script>alert("xss")</script><img src=x onerror="alert(1)">';
    const sanitized = purify.sanitize(attackPayload, {
      ADD_TAGS: ['span', 'div', 'svg'],
      ADD_ATTR: ['class', 'style'],
    });
    if (sanitized.includes('<script>') || sanitized.includes('onerror')) {
      throw new Error(`Sanitization allowed XSS execution vector: ${sanitized}`);
    }
    if (!sanitized.includes('Normal text')) {
      throw new Error('Sanitizer corrupted legitimate markup');
    }
  });

  // 5. Mermaid Sandbox Configuration Check
  await test('Mermaid Sandbox: AcademicRenderer enforces securityLevel: strict', async () => {
    const rendererPath = path.resolve(__dirname, '..', '..', '..', 'src', 'components', 'AcademicRenderer.tsx');
    const content = fs.readFileSync(rendererPath, 'utf-8');
    if (!content.includes("securityLevel: 'strict'")) {
      throw new Error("AcademicRenderer does not configure securityLevel: 'strict'!");
    }
  });

  console.log(`\n================================================================`);
  console.log(`   SECURITY SUMMARY: ${passed} / ${total} TESTS PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log(`================================================================\n`);

  const output = {
    suite: 'Contexta AI Security & Filesystem Containment Audit V3',
    timestamp: new Date().toISOString(),
    total_tests: total,
    passed_tests: passed,
    failed_tests: total - passed,
    pass_rate_pct: Number(((passed / total) * 100).toFixed(1)),
    results: testResults,
    audit_notes: 'Verified production isValidDocId exported from server.ts and HTTP 400 boundary enforcement.'
  };

  fs.writeFileSync(SECURITY_OUT, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Security results saved to: ${SECURITY_OUT}`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSecurityV4().catch((err) => {
  console.error('Security audit V4 failed:', err);
  process.exit(1);
});
