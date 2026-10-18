import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load 100 items from V2
const v2Script = fs.readFileSync(path.resolve(__dirname, '../../contexta-audit-v2/scripts/eval_comprehensive_100.ts'), 'utf-8');
const datasetMatch = v2Script.match(/export const DATASET_100: BenchmarkItem\[\] = (\[[\s\S]*?\n\];)/);

if (!datasetMatch) {
  console.error('Could not extract DATASET_100 from eval_comprehensive_100.ts');
  process.exit(1);
}

// Write clean dataset_100.ts for V4
const cleanDatasetTs = `export interface BenchmarkItem {
  id: string;
  category: 'direct_factual' | 'paraphrased' | 'multi_passage' | 'ambiguous' | 'absent_fact' | 'shared_keyword_ood' | 'adversarial';
  question: string;
  is_answerable: boolean;
  expected_pages: number[];
  reference_answer: string;
  supporting_keywords: string[];
  ground_truth_facts: string[];
  split: 'dev' | 'test';
}

export const DATASET_100: BenchmarkItem[] = ${datasetMatch[1]}
`;

fs.writeFileSync(path.resolve(__dirname, 'dataset_100.ts'), cleanDatasetTs, 'utf-8');
console.log('Successfully created clean benchmarks/contexta-audit-v4/scripts/dataset_100.ts');
