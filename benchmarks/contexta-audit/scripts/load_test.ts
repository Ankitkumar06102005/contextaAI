import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const CSV_FILE = path.resolve(__dirname, '..', 'load_test_results.csv');

interface ConcurrencyResult {
  concurrency: number;
  route: string;
  total_requests: number;
  successful_requests: number;
  error_count: number;
  error_rate_pct: number;
  duration_sec: number;
  rps: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  mean_ms: number;
  max_ms: number;
}

function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return Number(sortedArr[idx].toFixed(2));
}

async function runWorker(
  workerId: number,
  requestsPerWorker: number,
  route: string,
  method: string,
  body: any,
  latencies: number[],
  statusCounts: Record<string, number>
) {
  for (let i = 0; i < requestsPerWorker; i++) {
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      await res.text();
      const dur = performance.now() - t0;
      latencies.push(dur);
      const code = String(res.status);
      statusCounts[code] = (statusCounts[code] || 0) + 1;
    } catch {
      const dur = performance.now() - t0;
      latencies.push(dur);
      statusCounts['ERROR'] = (statusCounts['ERROR'] || 0) + 1;
    }
  }
}

async function benchmarkConcurrency(
  concurrency: number,
  totalRequests: number,
  route: string,
  method: string,
  body: any
): Promise<ConcurrencyResult> {
  const requestsPerWorker = Math.ceil(totalRequests / concurrency);
  const actualTotal = requestsPerWorker * concurrency;
  const latencies: number[] = [];
  const statusCounts: Record<string, number> = {};

  const tStart = performance.now();
  const workers: Promise<void>[] = [];

  for (let c = 0; c < concurrency; c++) {
    workers.push(runWorker(c, requestsPerWorker, route, method, body, latencies, statusCounts));
  }

  await Promise.all(workers);
  const durationSec = (performance.now() - tStart) / 1000;

  latencies.sort((a, b) => a - b);
  const successCount = Object.entries(statusCounts)
    .filter(([k]) => k.startsWith('2'))
    .reduce((acc, [, count]) => acc + count, 0);

  const errorCount = actualTotal - successCount;
  const mean = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  return {
    concurrency,
    route,
    total_requests: actualTotal,
    successful_requests: successCount,
    error_count: errorCount,
    error_rate_pct: Number(((errorCount / actualTotal) * 100).toFixed(2)),
    duration_sec: Number(durationSec.toFixed(2)),
    rps: Number((actualTotal / durationSec).toFixed(2)),
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    mean_ms: Number(mean.toFixed(2)),
    max_ms: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
  };
}

async function runLoadTests() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — CONCURRENT LOAD & THROUGHPUT TESTING');
  console.log('================================================================\n');

  // Load sample doc
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  const concurrencyLevels = [1, 5, 10, 25, 50];
  const results: ConcurrencyResult[] = [];

  console.log('--- TEST SUITE 1: End-to-End Grounded RAG Query (/chat) ---');
  for (const c of concurrencyLevels) {
    const totalReqs = c <= 10 ? 50 : 100;
    process.stdout.write(`Executing concurrency=${c} (${totalReqs} requests)... `);
    const res = await benchmarkConcurrency(
      c,
      totalReqs,
      '/chat',
      'POST',
      { doc_id: docId, message: 'Explain Scaled Dot-Product Attention formula' }
    );
    console.log(`RPS: ${res.rps} | P50: ${res.p50_ms}ms | P95: ${res.p95_ms}ms | Errors: ${res.error_count}`);
    results.push(res);
  }

  console.log('\n--- TEST SUITE 2: High-Concurrency Health API (/health) ---');
  for (const c of concurrencyLevels) {
    const totalReqs = c <= 10 ? 100 : 250;
    process.stdout.write(`Executing concurrency=${c} (${totalReqs} requests)... `);
    const res = await benchmarkConcurrency(c, totalReqs, '/health', 'GET', null);
    console.log(`RPS: ${res.rps} | P50: ${res.p50_ms}ms | P95: ${res.p95_ms}ms | Errors: ${res.error_count}`);
    results.push(res);
  }

  // Write CSV
  const csvHeaders = 'Concurrency,Route,TotalRequests,SuccessRequests,Errors,ErrorRatePct,DurationSec,RPS,P50_ms,P95_ms,P99_ms,Mean_ms,Max_ms\n';
  const csvRows = results.map((r) =>
    `${r.concurrency},"${r.route}",${r.total_requests},${r.successful_requests},${r.error_count},${r.error_rate_pct},${r.duration_sec},${r.rps},${r.p50_ms},${r.p95_ms},${r.p99_ms},${r.mean_ms},${r.max_ms}`
  ).join('\n');

  fs.writeFileSync(CSV_FILE, csvHeaders + csvRows + '\n', 'utf-8');
  console.log(`\nLoad test CSV output written to: ${CSV_FILE}`);
}

runLoadTests().catch((err) => {
  console.error('Load tests failed:', err);
  process.exit(1);
});
