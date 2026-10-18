import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';

interface LiveTestResult {
  test_name: string;
  endpoint: string;
  request_payload: any;
  status_code: number;
  duration_ms: number;
  answer_preview: string;
  sources_count: number;
  sources_summary: any[];
  timings?: any;
  passed: boolean;
  verifications: {
    check: string;
    passed: boolean;
    detail: string;
  }[];
}

async function testLiveApp() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — LIVE END-TO-END APPLICATION INTERACTION TEST');
  console.log('================================================================\n');

  // Step 0: Ensure document is loaded
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;
  console.log(`Using Live Document: "${sampleDoc.filename}" (ID: ${docId})\n`);

  const results: LiveTestResult[] = [];

  // -------------------------------------------------------------------------
  // TEST 1: Direct Factual Query via /chat
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 1: Direct Factual Query — Attention Formula');
  console.log('----------------------------------------------------------------');
  const q1 = 'What is the mathematical equation for scaled dot-product attention?';
  const t0_1 = performance.now();
  const res1 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: q1 }),
  });
  const dur1 = performance.now() - t0_1;
  const data1 = await res1.json();

  const timings1 = data1.latency_ms || data1.timings;
  const v1 = [
    { check: 'HTTP 200 OK', passed: res1.status === 200, detail: `Status ${res1.status}` },
    { check: 'Non-empty answer returned', passed: Boolean(data1.answer && data1.answer.length > 20), detail: `Answer length: ${data1.answer?.length || 0} chars` },
    { check: 'Contains attention formula terms (softmax, sqrt, d_k, or Attention)', passed: /softmax|sqrt|d_k|Attention/i.test(data1.answer || ''), detail: 'Formula keywords verified' },
    { check: 'Sources returned and grounded on Page 3', passed: Array.isArray(data1.sources) && data1.sources.some((s: any) => s.page === 3), detail: `Sources: ${data1.sources?.map((s: any) => `Page ${s.page} (Score: ${s.score?.toFixed(3)})`).join(', ')}` },
    { check: 'Pipeline latency timings provided', passed: Boolean(timings1?.total_ms !== undefined), detail: `Timings: search=${timings1?.search_ms}ms, total=${timings1?.total_ms}ms` },
  ];

  console.log(`Question: "${q1}"`);
  console.log(`HTTP Status: ${res1.status} | Client Roundtrip: ${dur1.toFixed(1)}ms | Server Total: ${timings1?.total_ms}ms`);
  console.log(`Answer:\n${data1.answer}\n`);
  console.log(`Sources:\n${JSON.stringify(data1.sources, null, 2)}\n`);

  results.push({
    test_name: 'Direct Factual Query (Attention Formula)',
    endpoint: 'POST /chat',
    request_payload: { doc_id: docId, message: q1 },
    status_code: res1.status,
    duration_ms: Number(dur1.toFixed(1)),
    answer_preview: data1.answer?.slice(0, 200),
    sources_count: data1.sources?.length || 0,
    sources_summary: data1.sources?.map((s: any) => ({ page: s.page, score: s.score })),
    timings: timings1,
    passed: v1.every((v) => v.passed),
    verifications: v1,
  });

  // -------------------------------------------------------------------------
  // TEST 2: Architecture Query via /chat
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 2: Architectural Details — Encoder Stack Layers & Sub-layers');
  console.log('----------------------------------------------------------------');
  const q2 = 'How many identical layers make up the encoder stack, and what sub-layers are inside each layer?';
  const t0_2 = performance.now();
  const res2 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: q2 }),
  });
  const dur2 = performance.now() - t0_2;
  const data2 = await res2.json();

  const v2 = [
    { check: 'HTTP 200 OK', passed: res2.status === 200, detail: `Status ${res2.status}` },
    { check: 'Mentions 6 identical layers (N = 6)', passed: /6|six/i.test(data2.answer || ''), detail: 'Encoder layer count verified' },
    { check: 'Mentions self-attention and feed-forward sub-layers', passed: /attention/i.test(data2.answer || '') && /feed-forward|feedforward/i.test(data2.answer || ''), detail: 'Sub-layer architecture verified' },
    { check: 'Sources grounded on Page 2 (Architecture overview)', passed: Array.isArray(data2.sources) && data2.sources.some((s: any) => s.page === 2), detail: `Sources: ${data2.sources?.map((s: any) => `Page ${s.page} (Score: ${s.score?.toFixed(3)})`).join(', ')}` },
  ];

  const timings2 = data2.latency_ms || data2.timings;
  console.log(`Question: "${q2}"`);
  console.log(`HTTP Status: ${res2.status} | Client Roundtrip: ${dur2.toFixed(1)}ms | Server Total: ${timings2?.total_ms}ms`);
  console.log(`Answer:\n${data2.answer}\n`);

  results.push({
    test_name: 'Architecture Query (Encoder Stack)',
    endpoint: 'POST /chat',
    request_payload: { doc_id: docId, message: q2 },
    status_code: res2.status,
    duration_ms: Number(dur2.toFixed(1)),
    answer_preview: data2.answer?.slice(0, 200),
    sources_count: data2.sources?.length || 0,
    sources_summary: data2.sources?.map((s: any) => ({ page: s.page, score: s.score })),
    timings: timings2,
    passed: v2.every((v) => v.passed),
    verifications: v2,
  });

  // -------------------------------------------------------------------------
  // TEST 3: Negative Probe / Out-of-Domain Query (Abstention Gate)
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 3: Negative Out-Of-Domain Probe — Chocolate Cake on Mars');
  console.log('----------------------------------------------------------------');
  const q3 = 'What is the secret recipe for chocolate strawberry gelato on Mars?';
  const t0_3 = performance.now();
  const res3 = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, message: q3 }),
  });
  const dur3 = performance.now() - t0_3;
  const data3 = await res3.json();

  const isProperAbstention = (data3.answer || '').includes("couldn't find enough information") || (data3.sources?.length === 0);
  const v3 = [
    { check: 'HTTP 200 OK', passed: res3.status === 200, detail: `Status ${res3.status}` },
    { check: 'Sufficiency gate cleanly intercepted out-of-domain probe', passed: isProperAbstention, detail: `Abstention message: "${data3.answer?.slice(0, 80)}..."` },
    { check: 'Sources array is empty (zero hallucinated context)', passed: data3.sources?.length === 0, detail: `Sources count: ${data3.sources?.length || 0}` },
  ];

  console.log(`Question: "${q3}"`);
  console.log(`HTTP Status: ${res3.status} | Client Roundtrip: ${dur3.toFixed(1)}ms`);
  console.log(`Answer:\n${data3.answer}\n`);

  results.push({
    test_name: 'Negative Out-of-Domain Probe',
    endpoint: 'POST /chat',
    request_payload: { doc_id: docId, message: q3 },
    status_code: res3.status,
    duration_ms: Number(dur3.toFixed(1)),
    answer_preview: data3.answer?.slice(0, 200),
    sources_count: data3.sources?.length || 0,
    sources_summary: [],
    timings: data3.timings,
    passed: v3.every((v) => v.passed),
    verifications: v3,
  });

  // -------------------------------------------------------------------------
  // TEST 4: Executive Document Summary via /summary
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 4: Executive Document Summary (/summary)');
  console.log('----------------------------------------------------------------');
  const t0_4 = performance.now();
  const res4 = await fetch(`${BASE_URL}/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId }),
  });
  const dur4 = performance.now() - t0_4;
  const data4 = await res4.json();

  const v4 = [
    { check: 'HTTP 200 OK', passed: res4.status === 200, detail: `Status ${res4.status}` },
    { check: 'Summary text contains executive synthesis', passed: Boolean(data4.answer && data4.answer.length > 100), detail: `Summary length: ${data4.answer?.length} chars` },
    { check: 'Summary cites document pages', passed: Array.isArray(data4.sources) && data4.sources.length >= 2, detail: `Sources sampled: ${data4.sources?.map((s: any) => `Page ${s.page}`).join(', ')}` },
  ];

  console.log(`HTTP Status: ${res4.status} | Client Roundtrip: ${dur4.toFixed(1)}ms`);
  console.log(`Summary Preview:\n${data4.answer?.slice(0, 400)}...\n`);

  results.push({
    test_name: 'Executive Document Summary',
    endpoint: 'POST /summary',
    request_payload: { doc_id: docId },
    status_code: res4.status,
    duration_ms: Number(dur4.toFixed(1)),
    answer_preview: data4.answer?.slice(0, 250),
    sources_count: data4.sources?.length || 0,
    sources_summary: data4.sources?.map((s: any) => ({ page: s.page })),
    passed: v4.every((v) => v.passed),
    verifications: v4,
  });

  // -------------------------------------------------------------------------
  // TEST 5: Interactive Quiz Genie Generation (/quiz)
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('TEST 5: Interactive Quiz Genie Generation (/quiz)');
  console.log('----------------------------------------------------------------');
  const t0_5 = performance.now();
  const res5 = await fetch(`${BASE_URL}/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_id: docId, num_questions: 4, difficulty: 'medium' }),
  });
  const dur5 = performance.now() - t0_5;
  const data5 = await res5.json();

  const questions = Array.isArray(data5.questions) ? data5.questions : [];
  const allHave4Options = questions.every((q: any) => Array.isArray(q.options) && q.options.length === 4);
  const allHaveCorrectAnswerInOptions = questions.every((q: any) => q.options.includes(q.correct_answer));
  const allHaveSourcePages = questions.every((q: any) => Array.isArray(q.source_pages) && q.source_pages.length > 0);

  const v5 = [
    { check: 'HTTP 200 OK', passed: res5.status === 200, detail: `Status ${res5.status}` },
    { check: 'Generated requested 4 distinct questions', passed: questions.length === 4, detail: `Count: ${questions.length}` },
    { check: 'Every question has exactly 4 options', passed: allHave4Options, detail: '4 options verified per question' },
    { check: 'Every correct_answer is strictly one of the 4 options', passed: allHaveCorrectAnswerInOptions, detail: 'Answer key consistency verified' },
    { check: 'Every question references source page citations', passed: allHaveSourcePages, detail: 'Source page grounding verified' },
  ];

  console.log(`HTTP Status: ${res5.status} | Client Roundtrip: ${dur5.toFixed(1)}ms`);
  questions.forEach((q: any, i: number) => {
    console.log(`  Q${i + 1}: ${q.question}`);
    console.log(`      Options: ${q.options.map((opt: string) => `"${opt.slice(0, 40)}..."`).join(' | ')}`);
    console.log(`      Correct Answer: "${q.correct_answer?.slice(0, 50)}..."`);
    console.log(`      Source Pages: [${q.source_pages?.join(', ')}]`);
  });

  results.push({
    test_name: 'Interactive Quiz Genie',
    endpoint: 'POST /quiz',
    request_payload: { doc_id: docId, num_questions: 4, difficulty: 'medium' },
    status_code: res5.status,
    duration_ms: Number(dur5.toFixed(1)),
    answer_preview: `${questions.length} questions generated`,
    sources_count: questions.reduce((acc: number, q: any) => acc + (q.source_pages?.length || 0), 0),
    sources_summary: questions.map((q: any) => q.source_pages),
    passed: v5.every((v) => v.passed),
    verifications: v5,
  });

  // -------------------------------------------------------------------------
  // FINAL EVALUATION REPORT
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('   INTERACTIVE PIPELINE VERIFICATION SUMMARY');
  console.log('================================================================');
  let allPassed = true;
  for (const r of results) {
    const mark = r.passed ? '✅' : '❌';
    console.log(`${mark} ${r.test_name} (${r.endpoint}) — ${r.duration_ms}ms`);
    for (const v of r.verifications) {
      console.log(`    - [${v.passed ? 'PASS' : 'FAIL'}] ${v.check}: ${v.detail}`);
    }
    if (!r.passed) allPassed = false;
  }
  console.log('================================================================');
  console.log(`OVERALL APPLICATION VERDICT: ${allPassed ? 'ALL PIPELINES OPERATING PERFECTLY' : 'DEFECTS DETECTED'}\n`);

  const outPath = path.resolve(__dirname, '..', 'live_interaction_report.json');
  fs.writeFileSync(outPath, JSON.stringify({ timestamp: new Date().toISOString(), overall_passed: allPassed, results }, null, 2), 'utf-8');
  console.log(`Saved live interaction report to: ${outPath}`);
}

testLiveApp().catch((err) => {
  console.error('Live app interaction test failed:', err);
  process.exit(1);
});
