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
  timeout_count: number;
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${BASE_URL}${route}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      await res.text();
      const dur = performance.now() - t0;
      latencies.push(dur);
      const code = String(res.status);
      statusCounts[code] = (statusCounts[code] || 0) + 1;
    } catch (err: any) {
      const dur = performance.now() - t0;
      latencies.push(dur);
      if (err.name === 'AbortError') {
        statusCounts['TIMEOUT'] = (statusCounts['TIMEOUT'] || 0) + 1;
      } else {
        statusCounts['ERROR'] = (statusCounts['ERROR'] || 0) + 1;
      }
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

  const timeoutCount = statusCounts['TIMEOUT'] || 0;
  const errorCount = actualTotal - successCount;
  const mean = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

  return {
    concurrency,
    route,
    total_requests: actualTotal,
    successful_requests: successCount,
    error_count: errorCount,
    timeout_count: timeoutCount,
    error_rate_pct: Number(((errorCount / actualTotal) * 100).toFixed(2)),
    duration_sec: Number(durationSec.toFixed(2)),
    rps: Number((actualTotal / (durationSec || 0.001)).toFixed(2)),
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    mean_ms: Number(mean.toFixed(2)),
    max_ms: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
  };
}

async function runLoadTestsV3() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — PRODUCTION LOAD & THROUGHPUT BENCHMARK V3');
  console.log('================================================================\n');

  // Load sample doc
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleDoc = await sampleRes.json();
  const docId = sampleDoc.doc_id;

  const concurrencyLevels = [1, 5, 10, 25, 50];
  const results: ConcurrencyResult[] = [];

  console.log('--- SUITE 1: Cached RAG Query Pipeline (/chat) ---');
  for (const c of concurrencyLevels) {
    const totalReqs = c <= 10 ? 50 : 100;
    process.stdout.write(`Executing concurrency=${c} (${totalReqs} reqs)... `);
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

  console.log('\n--- SUITE 2: Edge Health Check API (/health) ---');
  for (const c of concurrencyLevels) {
    const totalReqs = c <= 10 ? 100 : 250;
    process.stdout.write(`Executing concurrency=${c} (${totalReqs} reqs)... `);
    const res = await benchmarkConcurrency(c, totalReqs, '/health', 'GET', null);
    console.log(`RPS: ${res.rps} | P50: ${res.p50_ms}ms | P95: ${res.p95_ms}ms | Errors: ${res.error_count}`);
    results.push(res);
  }

  // Summary counts
  const chatTotal = results.filter((r) => r.route === '/chat').reduce((a, b) => a + b.total_requests, 0);
  const healthTotal = results.filter((r) => r.route === '/health').reduce((a, b) => a + b.total_requests, 0);
  const grandTotal = chatTotal + healthTotal;
  const totalErrors = results.reduce((a, b) => a + b.error_count, 0);

  console.log('\n================ LOAD TEST EXECUTION TOTALS ================');
  console.log(`/chat Requests:    ${chatTotal} (Across 5 concurrency levels: 50, 50, 50, 100, 100)`);
  console.log(`/health Requests:  ${healthTotal} (Across 5 concurrency levels: 100, 100, 100, 250, 250)`);
  console.log(`Total Requests:    ${grandTotal}`);
  console.log(`Total Errors:      ${totalErrors} (Error rate: ${((totalErrors / grandTotal) * 100).toFixed(2)}%)`);
  console.log('============================================================\n');

  // Write CSV
  const csvHeaders = 'Concurrency,Route,TotalRequests,SuccessRequests,Errors,Timeouts,ErrorRatePct,DurationSec,RPS,P50_ms,P95_ms,P99_ms,Mean_ms,Max_ms\n';
  const csvRows = results.map((r) =>
    `${r.concurrency},"${r.route}",${r.total_requests},${r.successful_requests},${r.error_count},${r.timeout_count},${r.error_rate_pct},${r.duration_sec},${r.rps},${r.p50_ms},${r.p95_ms},${r.p99_ms},${r.mean_ms},${r.max_ms}`
  ).join('\n');

  fs.writeFileSync(CSV_FILE, csvHeaders + csvRows + '\n', 'utf-8');
  console.log(`Load test V3 CSV written to: ${CSV_FILE}`);
}

runLoadTestsV3().catch((err) => {
  console.error('Load test V3 failed:', err);
  process.exit(1);
});
