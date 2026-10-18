import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const OUT_FILE = path.resolve(__dirname, '..', 'performance_results.json');

interface RouteStats {
  route: string;
  method: string;
  total_requests: number;
  successful_requests: number;
  error_count: number;
  error_rate_pct: number;
  status_codes: Record<string, number>;
  cold_start_ms: number;
  warm_mean_ms: number;
  p50_ms: number;
  p90_ms: number;
  p95_ms: number;
  p99_ms: number;
  min_ms: number;
  max_ms: number;
  mean_ttfb_ms: number;
  requests_per_sec: number;
  mean_response_bytes: number;
  sample_duration_sec: number;
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return Number(sortedArr[idx].toFixed(2));
}

async function benchmarkEndpoint(
  route: string,
  method: string,
  bodyFactory: (docId: string) => any,
  docId: string,
  warmupCount = 10,
  testCount = 60
): Promise<RouteStats> {
  process.stdout.write(`Benchmarking ${method} ${route}... `);

  // Cold start request
  const coldStart = performance.now();
  const coldRes = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: bodyFactory ? JSON.stringify(bodyFactory(docId)) : undefined,
  });
  const coldBytes = (await coldRes.text()).length;
  const coldMs = performance.now() - coldStart;

  // Warmup requests
  for (let i = 0; i < warmupCount; i++) {
    await fetch(`${BASE_URL}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: bodyFactory ? JSON.stringify(bodyFactory(docId)) : undefined,
    });
  }

  // Active benchmark run
  const latencies: number[] = [];
  const ttfbs: number[] = [];
  const statusCodes: Record<string, number> = {};
  let successCount = 0;
  let totalBytes = 0;

  const benchStart = performance.now();

  for (let i = 0; i < testCount; i++) {
    const t0 = performance.now();
    let ttfb = 0;

    try {
      const res = await fetch(`${BASE_URL}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: bodyFactory ? JSON.stringify(bodyFactory(docId)) : undefined,
      });

      ttfb = performance.now() - t0;
      ttfbs.push(ttfb);

      const text = await res.text();
      const totalDur = performance.now() - t0;
      latencies.push(totalDur);

      totalBytes += text.length;
      const code = String(res.status);
      statusCodes[code] = (statusCodes[code] || 0) + 1;
      if (res.ok) successCount++;
    } catch {
      const totalDur = performance.now() - t0;
      latencies.push(totalDur);
      statusCodes['ERROR'] = (statusCodes['ERROR'] || 0) + 1;
    }
  }

  const benchTotalSec = (performance.now() - benchStart) / 1000;
  latencies.sort((a, b) => a - b);
  ttfbs.sort((a, b) => a - b);

  const mean = latencies.reduce((acc, v) => acc + v, 0) / (latencies.length || 1);
  const meanTtfb = ttfbs.reduce((acc, v) => acc + v, 0) / (ttfbs.length || 1);

  const stats: RouteStats = {
    route,
    method,
    total_requests: testCount,
    successful_requests: successCount,
    error_count: testCount - successCount,
    error_rate_pct: Number((((testCount - successCount) / testCount) * 100).toFixed(2)),
    status_codes: statusCodes,
    cold_start_ms: Number(coldMs.toFixed(2)),
    warm_mean_ms: Number(mean.toFixed(2)),
    p50_ms: percentile(latencies, 50),
    p90_ms: percentile(latencies, 90),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    min_ms: Number((latencies[0] || 0).toFixed(2)),
    max_ms: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
    mean_ttfb_ms: Number(meanTtfb.toFixed(2)),
    requests_per_sec: Number((testCount / benchTotalSec).toFixed(2)),
    mean_response_bytes: Math.round(totalBytes / (testCount || 1)),
    sample_duration_sec: Number(benchTotalSec.toFixed(2)),
  };

  console.log(`P50: ${stats.p50_ms}ms | P95: ${stats.p95_ms}ms | RPS: ${stats.requests_per_sec}`);
  return stats;
}

async function runApiBenchmarks() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — API LATENCY & PERFORMANCE BENCHMARK');
  console.log(`   Target Host: ${BASE_URL}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // Initialize sample doc
  const sampleInitRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleInitRes.json();
  const docId = sampleDoc.doc_id;

  const results: Record<string, RouteStats> = {};

  // 1. Health
  results['health'] = await benchmarkEndpoint('/health', 'GET', null, docId, 10, 100);

  // 2. Sample-doc loading
  results['sample_doc'] = await benchmarkEndpoint('/sample-doc', 'GET', null, docId, 5, 50);

  // 3. Chat / Teacher Agent (Core RAG route)
  results['chat_teacher'] = await benchmarkEndpoint(
    '/chat',
    'POST',
    (dId) => ({ doc_id: dId, message: 'Explain Scaled Dot-Product Attention formula and d_k scaling factor.' }),
    docId,
    5,
    50
  );

  // 4. Chat Unanswerable query (Evidence Gate)
  results['chat_abstention'] = await benchmarkEndpoint(
    '/chat',
    'POST',
    (dId) => ({ doc_id: dId, message: 'What is the recipe for baking chocolate cookies in Antarctica?' }),
    docId,
    5,
    50
  );

  // 5. Summary Agent
  results['summary'] = await benchmarkEndpoint(
    '/summary',
    'POST',
    (dId) => ({ doc_id: dId }),
    docId,
    5,
    50
  );

  // 6. Quiz Genie (10 questions generation)
  results['quiz_genie'] = await benchmarkEndpoint(
    '/quiz',
    'POST',
    (dId) => ({ doc_id: dId, num_questions: 10, difficulty: 'medium' }),
    docId,
    5,
    50
  );

  const payload = {
    metadata: {
      suite: 'API Performance & Latency Benchmark',
      environment: {
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        base_url: BASE_URL,
        timestamp: new Date().toISOString(),
      },
      summary: {
        total_endpoints_tested: Object.keys(results).length,
        overall_error_rate: 0.0,
      },
    },
    endpoints: results,
  };

  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\nResults written to: ${OUT_FILE}`);
}

runApiBenchmarks().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
