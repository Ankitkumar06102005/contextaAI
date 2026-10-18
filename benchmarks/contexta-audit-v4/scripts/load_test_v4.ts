import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BENCHMARK_BASE_URL || 'http://localhost:3000';
const CSV_FILE = path.resolve(__dirname, '..', 'load_test_results_v4.csv');

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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

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

  const errorCount = Object.entries(statusCounts)
    .filter(([k]) => !k.startsWith('2') && k !== 'TIMEOUT')
    .reduce((acc, [, count]) => acc + count, 0);

  const timeoutCount = statusCounts['TIMEOUT'] || 0;
  const totalCompleted = latencies.length;
  const errorRate = totalCompleted > 0 ? ((errorCount + timeoutCount) / totalCompleted) * 100 : 0;
  const rps = durationSec > 0 ? totalCompleted / durationSec : 0;

  const sumLatencies = latencies.reduce((a, b) => a + b, 0);
  const meanMs = totalCompleted > 0 ? sumLatencies / totalCompleted : 0;

  return {
    concurrency,
    route,
    total_requests: totalCompleted,
    successful_requests: successCount,
    error_count: errorCount,
    timeout_count: timeoutCount,
    error_rate_pct: Number(errorRate.toFixed(2)),
    duration_sec: Number(durationSec.toFixed(3)),
    rps: Number(rps.toFixed(2)),
    p50_ms: percentile(latencies, 50),
    p95_ms: percentile(latencies, 95),
    p99_ms: percentile(latencies, 99),
    mean_ms: Number(meanMs.toFixed(2)),
    max_ms: Number((latencies[latencies.length - 1] || 0).toFixed(2)),
  };
}

async function runLoadTests() {
  console.log('================================================================');
  console.log('   CONTEXTA AI — LOAD & CONCURRENCY BENCHMARK V4');
  console.log('================================================================\n');

  // Warm up server and ensure document is loaded
  console.log('Warming up server & preloading sample document...');
  const sampleRes = await fetch(`${BASE_URL}/sample-doc`);
  const sampleData = await sampleRes.json();
  const docId = sampleData.doc_id;

  for (let i = 0; i < 20; i++) {
    await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: docId, message: 'Warmup query attention mechanism' }),
    });
  }
  console.log('Warmup complete.\n');

  const results: ConcurrencyResult[] = [];
  const testPlan = [
    { concurrency: 1, requests: 50, route: '/chat', method: 'POST', body: { doc_id: docId, message: 'What is the attention equation?' } },
    { concurrency: 5, requests: 150, route: '/chat', method: 'POST', body: { doc_id: docId, message: 'How many layers make up the encoder stack?' } },
    { concurrency: 10, requests: 300, route: '/chat', method: 'POST', body: { doc_id: docId, message: 'Explain positional encodings sine cosine' } },
    { concurrency: 20, requests: 400, route: '/chat', method: 'POST', body: { doc_id: docId, message: 'What dimension d_model is used?' } },
    { concurrency: 10, requests: 250, route: '/health', method: 'GET', body: null },
  ];

  for (const step of testPlan) {
    process.stdout.write(`Benchmarking ${step.route} at Concurrency ${step.concurrency} (${step.requests} reqs)... `);
    const res = await benchmarkConcurrency(step.concurrency, step.requests, step.route, step.method, step.body);
    results.push(res);
    console.log(`RPS: ${res.rps} | P50: ${res.p50_ms}ms | P95: ${res.p95_ms}ms | Errors: ${res.error_count}`);
  }

  // Generate CSV
  const headers = [
    'concurrency',
    'route',
    'total_requests',
    'successful_requests',
    'error_count',
    'timeout_count',
    'error_rate_pct',
    'duration_sec',
    'rps',
    'p50_ms',
    'p95_ms',
    'p99_ms',
    'mean_ms',
    'max_ms',
  ];

  const rows = results.map((r) => [
    r.concurrency,
    r.route,
    r.total_requests,
    r.successful_requests,
    r.error_count,
    r.timeout_count,
    r.error_rate_pct,
    r.duration_sec,
    r.rps,
    r.p50_ms,
    r.p95_ms,
    r.p99_ms,
    r.mean_ms,
    r.max_ms,
  ].join(','));

  const csvContent = [headers.join(','), ...rows].join('\n') + '\n';
  fs.writeFileSync(CSV_FILE, csvContent, 'utf-8');
  console.log(`\nSuccessfully exported V4 load test results to: ${CSV_FILE}`);
}

runLoadTests().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
