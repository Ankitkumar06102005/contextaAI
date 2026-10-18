import fs from 'fs';

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

const docMeta = JSON.parse(fs.readFileSync('e:/contexta ai/data/doc_sample_transformer_foundations/metadata.json', 'utf-8'));
const docVecs = JSON.parse(fs.readFileSync('e:/contexta ai/data/doc_sample_transformer_foundations/vectors.json', 'utf-8'));

const query = 'How does the GPT-4 router select active Mixture of Experts feed-forward layers?';
const qVec = generateFallbackEmbedding(query);

const scored = docVecs.map((item: any) => {
  const score = dotProduct(qVec, item.vector);
  const meta = docMeta.chunks.find((c: any) => c.chunk_id === item.chunk_id);
  return { score, page: meta?.page, chunk_id: item.chunk_id, text: meta?.text.slice(0, 80) };
});
scored.sort((a: any, b: any) => b.score - a.score);

const queryTokens = (query.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || []);
const stopWords = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'this', 'that',
  'these', 'those', 'have', 'from', 'with', 'about', 'explain', 'tell', 'show',
  'does', 'your', 'their', 'there', 'could', 'would', 'should', 'please',
  'the', 'for', 'and', 'are', 'was', 'were', 'not', 'you', 'all', 'any',
  'can', 'had', 'her', 'him', 'his', 'how', 'its', 'may', 'nor', 'our',
  'out', 'she', 'too', 'use', 'but'
]);
const significantQueryTokens = queryTokens.filter((t) => !stopWords.has(t));
const topScore = scored.length > 0 ? scored[0].score : 0;
const stem = (w: string) => (w.length > 5 ? w.slice(0, w.length - 2) : w);
let bestLexicalMatches = 0;
for (const cand of scored) {
  const lower = docMeta.chunks.find((c: any) => c.chunk_id === cand.chunk_id)?.text.toLowerCase() || '';
  const matches = significantQueryTokens.filter((token) => {
    return lower.includes(token) || (token.length > 4 && lower.includes(stem(token)));
  }).length;
  if (matches > bestLexicalMatches) bestLexicalMatches = matches;
}
const queryCoverageRatio = significantQueryTokens.length > 0
  ? bestLexicalMatches / significantQueryTokens.length
  : 1.0;
const hasStrongLexicalMatch = bestLexicalMatches >= 2 && queryCoverageRatio >= 0.35;
const effectiveMinRelevance = hasStrongLexicalMatch ? 0.12 : 0.28;
const hasLexicalEvidence = significantQueryTokens.length === 0 || (bestLexicalMatches >= 1 && queryCoverageRatio >= 0.30);
const isSufficient =
  scored.length > 0 &&
  topScore >= effectiveMinRelevance &&
  (topScore >= 0.38 || (hasLexicalEvidence && queryCoverageRatio >= 0.30));

console.log({
  significantQueryTokens,
  topScore,
  bestLexicalMatches,
  queryCoverageRatio,
  hasStrongLexicalMatch,
  effectiveMinRelevance,
  hasLexicalEvidence,
  isSufficient
});
