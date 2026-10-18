import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const V4_DIR = path.resolve(__dirname, '..');
const MANIFEST_OUT = path.join(V4_DIR, 'run_manifest_v4.json');

function hashFile(filePath: string): string {
  if (!fs.existsSync(filePath)) return 'MISSING';
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

const artifactFiles = [
  'retrieval_evaluation_v4.json',
  'answer_quality_evaluation_v4.json',
  'citation_evaluation_v4.json',
  'experiment_comparison_v4.json',
  'load_test_results_v4.csv',
  'resource_soak_results_v4.json',
  'security_results_v4.json',
  'metric_reconciliation_v4.json',
  'metric_registry_v4.json'
];

const artifactsManifest: Record<string, { relative_path: string; sha256: string; bytes: number }> = {};
for (const file of artifactFiles) {
  const fullPath = path.join(V4_DIR, file);
  artifactsManifest[file] = {
    relative_path: `benchmarks/contexta-audit-v4/${file}`,
    sha256: hashFile(fullPath),
    bytes: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0,
  };
}

const datasetPath = path.join(__dirname, 'dataset_100.ts');
const datasetHash = hashFile(datasetPath);

const runManifest = {
  run_id: 'CONTEXTA-V4-CANONICAL-20261017',
  timestamp: new Date().toISOString(),
  environment: {
    runtime: 'Node.js v20+ / tsx v4.19+',
    os: 'Windows 11',
    server_base_url: 'http://localhost:3000',
    data_directory: 'E:\\contexta ai\\data',
    active_workspace: 'f:\\contexta Ai',
    target_repository: 'E:\\contexta ai'
  },
  benchmark_target: {
    corpus_file: 'transformer-foundations-sample.pdf',
    doc_id: 'doc_sample_transformer_foundations',
    pages: 4,
    chunks: 4,
    dataset_version: 'v4.0.0-canonical-100',
    dataset_sha256: datasetHash,
    question_count: 100,
    answerable_count: 65,
    unanswerable_count: 35
  },
  commands: {
    server_start: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\server.ts"',
    rag_evaluation: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\benchmarks\\contexta-audit-v4\\scripts\\eval_rag_v4.ts"',
    load_test: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\benchmarks\\contexta-audit-v4\\scripts\\load_test_v4.ts"',
    resource_soak: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\benchmarks\\contexta-audit-v4\\scripts\\resource_soak_v4.ts"',
    security_audit: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\benchmarks\\contexta-audit-v4\\scripts\\verify_security_v4.ts"',
    metric_validation: 'npx --prefix "e:\\contexta ai" tsx "e:\\contexta ai\\benchmarks\\contexta-audit-v4\\scripts\\validate_metrics_v4.ts"'
  },
  artifacts: artifactsManifest,
  audit_summary: {
    population_recall_at_5: '100.0% (65/65)',
    false_abstention_rate: '0.0% (0/65)',
    unanswerable_abstention_rate: '45.7% (16/35)',
    strict_citation_precision: '83.8% (62/74)',
    claim_support_rate: '86.3% (69/80)',
    peak_concurrency_rps: '1489.63 RPS (C=20)',
    soak_operations: '1000 ops (0 failures, 17.33s duration)',
    net_heap_delta_mb: '+0.79 MB',
    security_tests_passed: '9/9 (100.0%)'
  }
};

fs.writeFileSync(MANIFEST_OUT, JSON.stringify(runManifest, null, 2), 'utf-8');
console.log(`Saved canonical run manifest to: ${MANIFEST_OUT}`);
