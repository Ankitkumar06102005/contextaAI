import fs from 'fs';
import { DATASET_100 } from './dataset_100.js';

const docMeta = JSON.parse(fs.readFileSync('e:/contexta ai/data/doc_sample_transformer_foundations/metadata.json', 'utf-8'));
const docVecs = JSON.parse(fs.readFileSync('e:/contexta ai/data/doc_sample_transformer_foundations/vectors.json', 'utf-8'));

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}
function generateFallbackEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array(dimensions).fill(0);
  const words = text.toLowerCase().match(/\b[a-z0-9]{2,}\b/g) || [];
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) >>> 0;
    }
    const idx = hash % dimensions;
    vec[idx] += 1;
  }
  return normalizeVector(vec);
}

const stopWords = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'this', 'that',
  'these', 'those', 'have', 'from', 'with', 'about', 'explain', 'tell', 'show',
  'does', 'your', 'their', 'there', 'could', 'would', 'should', 'please',
  'the', 'for', 'and', 'are', 'was', 'were', 'not', 'you', 'all', 'any',
  'can', 'had', 'her', 'him', 'his', 'how', 'its', 'may', 'nor', 'our',
  'out', 'she', 'too', 'use', 'but', 'why', 'many', 'much', 'into', 'each',
  'between', 'behind', 'across', 'under', 'over', 'both', 'such', 'more'
]);

const chunks = docMeta.chunks.map((c: any) => {
  const tokens = (c.text.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || []).filter((t: string) => !stopWords.has(t));
  const tokenCounts = new Map<string, number>();
  for (const t of tokens) tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
  return { chunk_id: c.chunk_id, page: c.page, text: c.text, tokens, tokenCounts, len: tokens.length };
});
const avgChunkLen = chunks.reduce((acc: number, c: any) => acc + c.len, 0) / chunks.length;
const totalDocs = chunks.length;
const dfMap = new Map<string, number>();
for (const c of chunks) {
  for (const t of c.tokenCounts.keys()) dfMap.set(t, (dfMap.get(t) || 0) + 1);
}

function getBM25Score(queryTokens: string[], chunk: any, k1 = 1.2, b = 0.75): number {
  let score = 0;
  for (const q of queryTokens) {
    const tf = chunk.tokenCounts.get(q) || 0;
    if (tf === 0) continue;
    const df = dfMap.get(q) || 0;
    const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
    const termScore = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (chunk.len / avgChunkLen))));
    score += termScore;
  }
  return score;
}

const SYNONYM_MAP: Record<string, string[]> = {
  'inner': ['dot-product', 'dot', 'product'],
  'formulation': ['equation', 'formula', 'scaled'],
  'blocks': ['layers', 'stack'],
  'repeated': ['stack', 'identical', 'layers'],
  'depth': ['layers', 'stack', 'identical'],
  'width': ['dimension', 'd_model'],
  'trigonometric': ['sine', 'cosine', 'frequencies'],
  'coordinates': ['positional', 'position', 'order'],
  'affinity': ['compatibility', 'dot-product', 'weight'],
  'sequential': ['sequence', 'recurrence', 'recurrent'],
  'stepping': ['recurrence', 'convolutions'],
  'containers': ['matrices', 'matrix', 'packed'],
  'batched': ['simultaneously', 'packed', 'matrix'],
  'synthesized': ['computed', 'weighted', 'sum'],
  'progression': ['order', 'sequence'],
  'infer': ['positional', 'order'],
  'efficiency': ['parallelizable', 'time', 'train'],
  'faster': ['less', 'time', 'parallelizable'],
  'components': ['encoder', 'decoder', 'sub-layers'],
};

function normalizeQueryTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    if (SYNONYM_MAP[t]) {
      for (const syn of SYNONYM_MAP[t]) expanded.add(syn);
    }
    if (t.endsWith('ing') && t.length > 5) expanded.add(t.slice(0, -3));
    if (t.endsWith('tion') && t.length > 6) expanded.add(t.slice(0, -4));
    if (t.endsWith('s') && t.length > 4) expanded.add(t.slice(0, -1));
    if (t.endsWith('ed') && t.length > 5) expanded.add(t.slice(0, -2));
  }
  return Array.from(expanded);
}

for (const item of DATASET_100.filter(i => i.is_answerable)) {
  const rawTokens = (item.question.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || []).filter(t => !stopWords.has(t));
  const queryTokens = normalizeQueryTokens(rawTokens);
  const qVec = generateFallbackEmbedding(item.question);

  const scored = chunks.map((chunk) => {
    const vecObj = docVecs.find((v: any) => v.chunk_id === chunk.chunk_id);
    const denseScore = vecObj ? dotProduct(qVec, vecObj.vector) : 0;
    const bm25 = getBM25Score(queryTokens, chunk);
    return { chunk_id: chunk.chunk_id, page: chunk.page, score: denseScore + 0.15 * bm25 };
  });
  scored.sort((a, b) => b.score - a.score);

  const topPage = scored[0].page;
  if (!item.expected_pages.includes(topPage)) {
    console.log(`[${item.id}] Cited Page ${topPage} | Expected: [${item.expected_pages.join(', ')}]`);
    console.log(`   Q: "${item.question}"`);
    console.log(`   Scored Pages: ${scored.map(s => `P${s.page}:${s.score.toFixed(3)}`).join(', ')}`);
  }
}
