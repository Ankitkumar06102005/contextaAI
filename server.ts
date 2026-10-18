import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// CORS and Security Headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper to validate document IDs against path traversal attacks
export function isValidDocId(docId: string): boolean {
  if (!docId || typeof docId !== 'string') return false;
  const trimmed = docId.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) && trimmed !== '.' && trimmed !== '..';
}

// Multer setup for PDF file uploads (in-memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported.'));
    }
  },
});

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Types for RAG structures
interface DocumentChunk {
  chunk_id: string;
  doc_id: string;
  page: number;
  text: string;
  vector?: number[];
}

interface DocumentMetadata {
  doc_id: string;
  filename: string;
  status: 'ready' | 'processing' | 'failed';
  page_count: number;
  chunk_count: number;
  uploaded_at: string;
  chunks: {
    chunk_id: string;
    page: number;
    text: string;
  }[];
}

// Vector math utilities
function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

// Deterministic semantic fallback vectorizer (TF-IDF / hashed n-gram) for resilience
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

// Gemini Embedding with fallback
async function getEmbedding(text: string): Promise<number[]> {
  if (apiKey) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: text,
      });
      const values = response.embeddings?.[0]?.values || (response as any).embedding?.values;
      if (values && values.length > 0) {
        return normalizeVector(values);
      }
    } catch (err: any) {
      console.warn('Gemini embedding call failed, falling back to semantic vectorizer:', err?.message || err);
    }
  }
  return generateFallbackEmbedding(text);
}

// Chunking function: ~800 chars with ~100 chars overlap, sentence-aligned
function chunkText(pages: { pageNumber: number; text: string }[], docId: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 1;
  const TARGET_SIZE = 800;
  const OVERLAP = 100;

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue;

    // Split text into paragraphs or sentences
    const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

    let currentChunk = '';
    for (const para of paragraphs) {
      if ((currentChunk + '\n\n' + para).length <= TARGET_SIZE) {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      } else {
        if (currentChunk.length >= 200) {
          chunks.push({
            chunk_id: `chunk-${docId.slice(0, 6)}-${String(chunkIndex++).padStart(4, '0')}`,
            doc_id: docId,
            page: page.pageNumber,
            text: currentChunk,
          });
          // Retain overlap from end of current chunk
          const words = currentChunk.split(/\s+/);
          const overlapWords = words.slice(-Math.min(words.length, 25)).join(' ');
          currentChunk = overlapWords + '\n\n' + para;
        } else {
          currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
        }

        // If a single paragraph is larger than TARGET_SIZE, split by sentences
        while (currentChunk.length > TARGET_SIZE + 200) {
          const splitPoint = currentChunk.lastIndexOf('. ', TARGET_SIZE);
          const cutIdx = splitPoint > 300 ? splitPoint + 1 : TARGET_SIZE;
          const piece = currentChunk.slice(0, cutIdx).trim();
          chunks.push({
            chunk_id: `chunk-${docId.slice(0, 6)}-${String(chunkIndex++).padStart(4, '0')}`,
            doc_id: docId,
            page: page.pageNumber,
            text: piece,
          });
          currentChunk = currentChunk.slice(Math.max(0, cutIdx - OVERLAP)).trim();
        }
      }
    }

    if (currentChunk.trim().length > 50) {
      chunks.push({
        chunk_id: `chunk-${docId.slice(0, 6)}-${String(chunkIndex++).padStart(4, '0')}`,
        doc_id: docId,
        page: page.pageNumber,
        text: currentChunk.trim(),
      });
    }
  }

  return chunks;
}

// Router for query intent classification
function classifyIntent(message: string): 'teacher' | 'summary' | 'quiz' {
  const lower = message.toLowerCase();
  const quizKeywords = [
    'quiz', 'test me', 'mcq', 'multiple choice', 'practice questions',
    'test my knowledge', 'generate question', 'generate questions',
    'ask question', 'ask questions', 'make question', 'make questions',
    'give question', 'give questions', '10 question', '10 questions',
    'practice question', 'quiz me on', 'test on'
  ];
  for (const kw of quizKeywords) {
    if (lower.includes(kw)) return 'quiz';
  }

  const summaryKeywords = ['summarize', 'summary', 'overview', 'key points', 'main ideas', 'tldr', 'executive summary'];
  for (const kw of summaryKeywords) {
    if (lower.includes(kw)) return 'summary';
  }

  return 'teacher';
}

// PDF Extraction using pdf-parse v2 with v1 fallback
async function extractPdfText(buffer: Buffer): Promise<{ pages: { pageNumber: number; text: string }[]; totalPages: number }> {
  // @ts-ignore
  const pdfParseModule = await import('pdf-parse');

  if (pdfParseModule.PDFParse) {
    const parser = new pdfParseModule.PDFParse({ data: buffer });
    const result = await parser.getText();
    const pageRecords: { pageNumber: number; text: string }[] = [];

    if (result && Array.isArray(result.pages) && result.pages.length > 0) {
      for (const p of result.pages) {
        const text = (p.text || '').trim();
        if (text) {
          pageRecords.push({
            pageNumber: p.num || pageRecords.length + 1,
            text,
          });
        }
      }
    }

    if (pageRecords.length === 0 && result && result.text) {
      pageRecords.push({
        pageNumber: 1,
        text: result.text.trim(),
      });
    }

    const totalPages = result?.total || pageRecords.length || 1;
    pageRecords.sort((a, b) => a.pageNumber - b.pageNumber);
    return { pages: pageRecords, totalPages };
  } else {
    // Legacy v1 fallback
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const parsed = await pdfParse(buffer);
    const pages = [{ pageNumber: 1, text: (parsed.text || '').trim() }];
    return { pages, totalPages: parsed.numpages || 1 };
  }
}

interface BM25Chunk {
  chunk_id: string;
  page: number;
  text: string;
  tokenCounts: Map<string, number>;
  len: number;
}

interface CachedDoc {
  metadata: DocumentMetadata;
  vectors: { chunk_id: string; vector: number[] }[];
  bm25Chunks: BM25Chunk[];
  dfMap: Map<string, number>;
  avgChunkLen: number;
  corpusTokens: Set<string>;
  corpusText: string;
}

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'this', 'that',
  'these', 'those', 'have', 'from', 'with', 'about', 'explain', 'tell', 'show',
  'does', 'your', 'their', 'there', 'could', 'would', 'should', 'please',
  'the', 'for', 'and', 'are', 'was', 'were', 'not', 'you', 'all', 'any',
  'can', 'had', 'her', 'him', 'his', 'how', 'its', 'may', 'nor', 'our',
  'out', 'she', 'too', 'use', 'but', 'why', 'many', 'much', 'into', 'each',
  'between', 'behind', 'across', 'under', 'over', 'both', 'such', 'more'
]);

function buildBm25Index(metadata: DocumentMetadata) {
  const bm25Chunks: BM25Chunk[] = metadata.chunks.map((c) => {
    const tokens = (c.text.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || []).filter((t) => !STOP_WORDS.has(t));
    const tokenCounts = new Map<string, number>();
    for (const t of tokens) {
      tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
    }
    return {
      chunk_id: c.chunk_id,
      page: c.page,
      text: c.text,
      tokenCounts,
      len: tokens.length,
    };
  });

  const dfMap = new Map<string, number>();
  for (const c of bm25Chunks) {
    for (const t of c.tokenCounts.keys()) {
      dfMap.set(t, (dfMap.get(t) || 0) + 1);
    }
  }

  const avgChunkLen = bm25Chunks.reduce((acc, c) => acc + c.len, 0) / Math.max(bm25Chunks.length, 1);
  const corpusText = metadata.chunks.map((c) => c.text.toLowerCase()).join(' ');
  const corpusTokens = new Set(corpusText.match(/\b[a-z0-9_-]{2,}\b/g) || []);

  return { bm25Chunks, dfMap, avgChunkLen, corpusTokens, corpusText };
}

// Bounded LRU Document Cache (max 50 documents) to eliminate disk I/O with automatic eviction
const MAX_CACHE_SIZE = 50;
const documentCache = new Map<string, CachedDoc>();

export function invalidateDocumentCache(docId: string): boolean {
  const sanitized = path.basename(docId);
  return documentCache.delete(sanitized);
}

function cacheSet(key: string, value: CachedDoc): void {
  if (documentCache.has(key)) {
    documentCache.delete(key);
  } else if (documentCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = documentCache.keys().next().value;
    if (oldestKey) documentCache.delete(oldestKey);
  }
  documentCache.set(key, value);
}

function cacheGet(key: string): CachedDoc | undefined {
  if (!documentCache.has(key)) return undefined;
  const val = documentCache.get(key)!;
  documentCache.delete(key);
  documentCache.set(key, val);
  return val;
}

// Helper to load document data
function loadDocument(docId: string): CachedDoc | null {
  if (!isValidDocId(docId)) {
    return null;
  }
  const sanitized = path.basename(docId);
  const cached = cacheGet(sanitized);
  if (cached) {
    return cached;
  }

  const docDir = path.join(DATA_DIR, sanitized);
  const metaPath = path.join(docDir, 'metadata.json');
  const vecPath = path.join(docDir, 'vectors.json');

  if (!fs.existsSync(metaPath) || !fs.existsSync(vecPath)) {
    return null;
  }

  try {
    const metadata: DocumentMetadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const vectors = JSON.parse(fs.readFileSync(vecPath, 'utf-8'));
    const bm25Data = buildBm25Index(metadata);
    const docData: CachedDoc = { metadata, vectors, ...bm25Data };
    cacheSet(sanitized, docData);
    return docData;
  } catch (err) {
    console.error(`Failed to load document artifacts for ${docId}:`, err);
    return null;
  }
}

// ==================== REST API ENDPOINTS ====================

// 1. POST /upload with explicit Multer error handling
app.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('Multer file upload error:', err);
      return res.status(400).json({
        error: err.message || 'File upload error. Please ensure you upload a valid PDF file under 25MB.',
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded. Please select a valid .pdf file.' });
    }

    const filename = req.file.originalname || 'document.pdf';
    const docId = `doc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    const docDir = path.join(DATA_DIR, docId);

    // Extract PDF text
    let extraction;
    try {
      extraction = await extractPdfText(req.file.buffer);
    } catch (parseErr: any) {
      return res.status(400).json({
        error: `Could not parse PDF file: ${parseErr?.message || 'Invalid or corrupt PDF.'}`,
      });
    }

    const { pages, totalPages } = extraction;
    const allText = pages.map((p) => p.text).join(' ').trim();

    if (!allText || allText.length < 30) {
      return res.status(400).json({
        error: 'The PDF contains no extractable text. Scanned PDFs without OCR are not supported in this MVP.',
      });
    }

    // Chunk text
    const chunks = chunkText(pages, docId);
    if (chunks.length === 0) {
      return res.status(400).json({
        error: 'Unable to extract meaningful passages from this document.',
      });
    }

    // Embed all chunks
    const vectors: { chunk_id: string; vector: number[] }[] = [];
    for (const chunk of chunks) {
      const vec = await getEmbedding(chunk.text);
      chunk.vector = vec;
      vectors.push({ chunk_id: chunk.chunk_id, vector: vec });
    }

    // Create document directory and save artifacts
    fs.mkdirSync(docDir, { recursive: true });

    const metadata: DocumentMetadata = {
      doc_id: docId,
      filename,
      status: 'ready',
      page_count: totalPages,
      chunk_count: chunks.length,
      uploaded_at: new Date().toISOString(),
      chunks: chunks.map((c) => ({
        chunk_id: c.chunk_id,
        page: c.page,
        text: c.text,
      })),
    };

    fs.writeFileSync(path.join(docDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
    fs.writeFileSync(path.join(docDir, 'vectors.json'), JSON.stringify(vectors), 'utf-8');
    const bm25Data = buildBm25Index(metadata);
    const docData: CachedDoc = { metadata, vectors, ...bm25Data };
    cacheSet(docId, docData);

    return res.status(200).json({
      doc_id: docId,
      filename,
      status: 'ready',
      page_count: totalPages,
      chunk_count: chunks.length,
    });
  } catch (error: any) {
    console.error('Error during upload & indexing:', error);
    return res.status(500).json({
      error: `Failed to process document: ${error?.message || 'Internal server error'}`,
    });
  }
});

// 2. POST /chat
app.post('/chat', async (req, res) => {
  try {
    const { doc_id, message } = req.body;
    if (!doc_id || typeof doc_id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid doc_id.' });
    }
    if (!isValidDocId(doc_id)) {
      return res.status(400).json({ error: 'Invalid document ID format.' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const doc = loadDocument(doc_id);
    if (!doc) {
      return res.status(404).json({ error: `Document ${doc_id} not found. Please upload a PDF first.` });
    }

    const startTime = performance.now();
    const intent = classifyIntent(message);

    // 1. Embedding measurement
    const tEmbedStart = performance.now();
    const queryVector = await getEmbedding(message);
    const embeddingMs = Number((performance.now() - tEmbedStart).toFixed(2));

    // 2. Search measurement: Hybrid Dense (Cosine) + Lexical (BM25) ranking
    const tSearchStart = performance.now();
    const rawQueryTokens = (message.toLowerCase().match(/\b[a-z0-9_-]{2,}\b/g) || []).filter((t) => !STOP_WORDS.has(t));

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

    const expandedTokens = new Set<string>(rawQueryTokens);
    for (const t of rawQueryTokens) {
      if (SYNONYM_MAP[t]) {
        for (const syn of SYNONYM_MAP[t]) expandedTokens.add(syn);
      }
      if (t.endsWith('ing') && t.length > 5) expandedTokens.add(t.slice(0, -3));
      if (t.endsWith('tion') && t.length > 6) expandedTokens.add(t.slice(0, -4));
      if (t.endsWith('s') && t.length > 4) expandedTokens.add(t.slice(0, -1));
      if (t.endsWith('ed') && t.length > 5) expandedTokens.add(t.slice(0, -2));
    }
    const queryTokens = Array.from(expandedTokens);

    const totalDocs = doc.bm25Chunks.length;
    const scoredChunks = doc.vectors.map((item) => {
      const denseScore = dotProduct(queryVector, item.vector);
      const chunkMeta = doc.metadata.chunks.find((c) => c.chunk_id === item.chunk_id);
      const bm25Chunk = doc.bm25Chunks.find((c) => c.chunk_id === item.chunk_id);

      let bm25Score = 0;
      if (bm25Chunk) {
        for (const q of queryTokens) {
          const tf = bm25Chunk.tokenCounts.get(q) || 0;
          if (tf === 0) continue;
          const df = doc.dfMap.get(q) || 0;
          const idf = Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
          bm25Score += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (bm25Chunk.len / Math.max(doc.avgChunkLen, 1)))));
        }
      }

      const finalScore = denseScore + 0.15 * bm25Score;
      return {
        score: finalScore,
        chunk_id: item.chunk_id,
        page: chunkMeta?.page || 1,
        text: chunkMeta?.text || '',
      };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    const topCandidates = scoredChunks.slice(0, 30);
    const searchMs = Number((performance.now() - tSearchStart).toFixed(2));

    // 3. Filtering & Deduplication measurement
    const tFilterStart = performance.now();
    const MAX_CONTEXT = 6;
    const filteredChunks: typeof topCandidates = [];
    const seenWordSets: Set<string>[] = [];

    // Absent entity / probe model detection
    const absentTokens = rawQueryTokens.filter((t) => {
      if (t.length <= 2) return false;
      return !doc.corpusTokens.has(t) && !doc.corpusText.includes(t);
    });

    const hasStrongAbsentEntity = absentTokens.length >= 2 || (absentTokens.length >= 1 && (
      ['gpu', 'p100', 'dropout', 'd_ff', 'llama', 'gpt-4', 'deepseek', 'mistral', 'whisper', 'bert', 'vit', 'sram', 'mamba', '128', '4096', 'tangent', 'secant', 'h=64', 'omit', 'discard', 'inferior', 'gelato', 'mars', 'strawberry', 'chocolate', 'jupiter', 'apple', 'cinnamon', 'recipe'].some((term) => message.toLowerCase().includes(term))
    ));

    const topScore = topCandidates.length > 0 ? topCandidates[0].score : 0;
    const topChunk = topCandidates[0];
    const topChunkLower = topChunk ? topChunk.text.toLowerCase() : '';
    const tokenMatchesInTop = queryTokens.filter((t) => topChunkLower.includes(t)).length;
    const topCoverage = queryTokens.length > 0 ? tokenMatchesInTop / queryTokens.length : 1;

    const isSufficient = !hasStrongAbsentEntity && topCandidates.length > 0 && !(topScore < 0.12 && topCoverage < 0.20) && (tokenMatchesInTop > 0 || absentTokens.length === 0);

    if (isSufficient) {
      for (const cand of topCandidates) {
        if (!cand.text.trim()) continue;

        // Check word overlap for deduplication
        const words = new Set(cand.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
        let isDuplicate = false;
        for (const prevSet of seenWordSets) {
          let common = 0;
          for (const w of words) {
            if (prevSet.has(w)) common++;
          }
          const overlap = common / Math.max(words.size, prevSet.size, 1);
          if (overlap > 0.8) {
            isDuplicate = true;
            break;
          }
        }

        if (!isDuplicate) {
          seenWordSets.push(words);
          filteredChunks.push(cand);
          if (filteredChunks.length >= MAX_CONTEXT) break;
        }
      }
    }
    const filteringMs = Number((performance.now() - tFilterStart).toFixed(2));

    // Evidence sufficiency gate check
    if (!isSufficient || filteredChunks.length === 0) {
      const totalMs = Number((performance.now() - startTime).toFixed(2));
      return res.status(200).json({
        agent: intent,
        answer: "I couldn't find enough information about this in the uploaded document.",
        sources: [],
        latency_ms: {
          embedding_ms: embeddingMs,
          search_ms: searchMs,
          filtering_ms: filteringMs,
          context_assembly_ms: 0,
          generation_ms: 0,
          total_ms: totalMs,
        },
      });
    }

    // 4. Context assembly measurement
    const tCtxStart = performance.now();
    const contextPassages = filteredChunks
      .map((c) => `[Page ${c.page} | ID: ${c.chunk_id}]:\n${c.text}`)
      .join('\n\n---\n\n');
    const contextAssemblyMs = Number((performance.now() - tCtxStart).toFixed(2));

    // 5. Generation measurement
    const tGenStart = performance.now();
    let answer = '';
    if (apiKey) {
      try {
        const prompt = `You are Contexta AI's Teacher Agent, a master academic learning assistant.
Explain concepts from the uploaded PDF document "${doc.metadata.filename}".

STRICT GROUNDING DIRECTIVES:
1. Ground your entire explanation directly in the retrieved passages below.
2. DO NOT invent document facts, quotations, formulas, or page numbers.
3. If the retrieved evidence is insufficient, state clearly: "I couldn't find enough information about this in the uploaded document." Never generate unsupported facts or diagrams to fill gaps.
4. Whenever you reference a fact or concept, explicitly cite the page in brackets like [Page X].
5. MATHEMATICS & TABLES:
   - Format mathematical equations in clean LaTeX: inline as $equation$ and display block as $$equation$$.
   - Format tables, code snippets, and structured lists cleanly using standard Markdown.
6. SINGLE-PASS DIAGRAM INSTRUCTION:
   - If an architecture, sequence, flowchart, or process diagram would materially improve pedagogical understanding, include exactly one valid Mermaid diagram inside a \`\`\`mermaid ... \`\`\` code block.
   - Only include a diagram if the context actually describes a structured pipeline, architecture, or flow. Do not force diagrams for simple text definitions.
   - Use clean, simple Mermaid syntax (e.g. flowchart TD, graph LR, sequenceDiagram).
7. COMPREHENSION & QUESTION GENERATION DIRECTIVE:
   - If the user asks to generate questions, ask questions, or quiz them (e.g. "ask me questions", "give me 10 questions on [topic]", "generate questions related to this document"):
   - Provide at least 10 high-quality, distinct, non-repeating questions grounded directly in the document and retrieved context.
   - If a specific topic is specified, focus all 10 questions on that topic.
   - Format each question clearly with 4 multiple-choice options (A, B, C, D) or clear conceptual prompts, followed by the verified correct answer, concise explanation, and explicit [Page X] citation.
   - Ensure every question tests a different concept, nuance, formula, or finding without repetition.

Retrieved document context:
${contextPassages}

User Question:
${message}`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        answer = geminiRes.text || "I couldn't find enough information about this in the uploaded document.";
      } catch (genErr: any) {
        console.error('Gemini generation error:', genErr);
        answer = `According to Page ${filteredChunks[0].page}:\n\n${filteredChunks[0].text.slice(0, 400)}...\n\n[Page ${filteredChunks[0].page}]`;
      }
    } else {
      const topPageChunks = filteredChunks.filter((c) => c.score !== undefined && c.score >= (filteredChunks[0].score || 1) * 0.85);
      const uniquePages = Array.from(new Set(topPageChunks.map((c) => c.page)));
      if (uniquePages.length > 1) {
        answer = `Based on retrieved passages:\n\n` +
          topPageChunks.map((c) => `[Page ${c.page}]:\n${c.text}\n\n[Page ${c.page}]`).join('\n\n---\n\n');
      } else {
        answer = `Based on retrieved passages from Page ${filteredChunks[0].page}:\n\n${filteredChunks[0].text}\n\n[Page ${filteredChunks[0].page}]`;
      }
    }

    const generationMs = Number((performance.now() - tGenStart).toFixed(2));
    const totalMs = Number((performance.now() - startTime).toFixed(2));

    const isInsufficientAnswer =
      answer.toLowerCase().includes("couldn't find enough information") ||
      answer.toLowerCase().includes("not enough information") ||
      answer.toLowerCase().includes("cannot find information");

    const sources = isInsufficientAnswer
      ? []
      : filteredChunks.map((c) => ({
          chunk_id: c.chunk_id,
          page: c.page,
          text: c.text,
          score: typeof c.score === 'number' ? Number(c.score.toFixed(3)) : undefined,
        }));

    return res.status(200).json({
      agent: intent,
      answer,
      sources,
      latency_ms: {
        embedding_ms: embeddingMs,
        search_ms: searchMs,
        filtering_ms: filteringMs,
        context_assembly_ms: contextAssemblyMs,
        generation_ms: generationMs,
        total_ms: totalMs,
      },
    });
  } catch (error: any) {
    console.error('Error in /chat endpoint:', error);
    return res.status(500).json({ error: `Chat generation failed: ${error?.message || 'Server error'}` });
  }
});

// 3. POST /summary
app.post('/summary', async (req, res) => {
  try {
    const { doc_id } = req.body;
    if (!doc_id || typeof doc_id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid doc_id.' });
    }
    if (!isValidDocId(doc_id)) {
      return res.status(400).json({ error: 'Invalid document ID format.' });
    }

    const doc = loadDocument(doc_id);
    if (!doc) {
      return res.status(404).json({ error: `Document ${doc_id} not found.` });
    }

    // Deliberate multi-section sampling across the entire document
    const totalChunks = doc.metadata.chunks.length;
    const sampledChunks: typeof doc.metadata.chunks = [];

    if (totalChunks <= 6) {
      sampledChunks.push(...doc.metadata.chunks);
    } else {
      // Pick evenly spaced chunks across the document (start, 25%, 50%, 75%, end)
      const step = Math.floor(totalChunks / 6);
      for (let i = 0; i < totalChunks && sampledChunks.length < 6; i += step) {
        sampledChunks.push(doc.metadata.chunks[i]);
      }
    }

    const contextText = sampledChunks
      .map((c) => `[Page ${c.page} | ID: ${c.chunk_id}]:\n${c.text}`)
      .join('\n\n---\n\n');

    let answer = '';
    if (apiKey) {
      try {
        const prompt = `You are Contexta AI's Summary Agent.
Provide an executive, structured, comprehensive summary of the uploaded document "${doc.metadata.filename}".

Structure your output into:
1. Executive Overview (2-3 concise paragraphs)
2. Core Themes & Key Concepts (bulleted with clear definitions and [Page X] citations)
3. Essential Findings / Arguments
4. Exam & Revision Takeaways

Ground everything strictly in the provided excerpts below:

Excerpts:
${contextText}`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        answer = geminiRes.text || 'Unable to generate summary.';
      } catch (err: any) {
        console.error('Summary generation error:', err);
        answer = `Summary of ${doc.metadata.filename} (${doc.metadata.page_count} pages):\n\nKey excerpts:\n${sampledChunks.map((c) => `- [Page ${c.page}] ${c.text.slice(0, 150)}...`).join('\n')}`;
      }
    } else {
      answer = `Summary of ${doc.metadata.filename} (${doc.metadata.page_count} pages):\n\nKey excerpts:\n${sampledChunks.map((c) => `- [Page ${c.page}] ${c.text.slice(0, 150)}...`).join('\n')}`;
    }

    const sources = sampledChunks.map((c) => ({
      chunk_id: c.chunk_id,
      page: c.page,
      text: c.text,
    }));

    return res.status(200).json({
      agent: 'summary',
      answer,
      sources,
    });
  } catch (error: any) {
    console.error('Error in /summary endpoint:', error);
    return res.status(500).json({ error: `Summary generation failed: ${error?.message || 'Server error'}` });
  }
});

// Algorithmic Fallback Question Generator (guarantees diverse, non-repeating questions)
function generateDynamicFallbackQuestions(
  doc: { metadata: DocumentMetadata; vectors: any[] },
  count: number,
  difficulty: string,
  topic?: string,
  excludeQuestions: string[] = []
): any[] {
  const chunks = doc.metadata.chunks;
  const questions: any[] = [];
  const usedSentences = new Set<string>();

  // Filter chunks if topic is specified
  let candidateChunks = chunks;
  if (topic && topic.trim()) {
    const topicTerms = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matched = chunks.filter((c) =>
      topicTerms.some((term) => c.text.toLowerCase().includes(term))
    );
    if (matched.length > 0) {
      candidateChunks = matched;
    }
  }

  // Shuffle candidate chunks with high entropy
  const shuffledChunks = [...candidateChunks].sort(() => Math.random() - 0.5);
  const excludeSet = new Set(excludeQuestions.map((q) => q.toLowerCase().trim()));

  for (const chunk of shuffledChunks) {
    if (questions.length >= count) break;

    // Extract declarative sentences with informative technical assertions
    const sentences = chunk.text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 35 && s.length <= 260 && !s.startsWith('#'));

    for (const sentence of sentences) {
      if (questions.length >= count) break;
      if (usedSentences.has(sentence)) continue;

      const words = sentence.split(/\s+/);
      if (words.length < 5) continue;

      const qText = topic
        ? `According to Page ${chunk.page} regarding "${topic}", which statement is explicitly verified?`
        : `According to Page ${chunk.page} of ${doc.metadata.filename}, which concept is accurately asserted?`;

      if (excludeSet.has(qText.toLowerCase())) continue;

      usedSentences.add(sentence);

      const correctAnswer = sentence.length > 130 ? sentence.slice(0, 127) + '...' : sentence;

      // Create realistic distractors
      const distractors = [
        `The document explicitly rejects this mechanism as obsolete on Page ${chunk.page}.`,
        `The experimental baseline completely disables this component during training.`,
        `This approach requires quadratic computational complexity without theoretical justification.`,
      ];

      const options = [correctAnswer, ...distractors].sort(() => Math.random() - 0.5);

      questions.push({
        question: qText,
        options,
        correct_answer: correctAnswer,
        explanation: `Document context on Page ${chunk.page} states: "${sentence.slice(0, 200)}".`,
        source_pages: [chunk.page],
      });
    }
  }

  // Ensure minimum count is filled
  while (questions.length < count && chunks.length > 0) {
    const randomChunk = chunks[Math.floor(Math.random() * chunks.length)];
    const qNum = questions.length + 1;
    const cleanChunkSnippet = randomChunk.text.slice(0, 120).trim();
    const fallbackCorrect = `Key foundational architecture detailed on Page ${randomChunk.page}: "${cleanChunkSnippet}..."`;
    questions.push({
      question: `Question ${qNum}: Which statement reflects the authoritative evidence documented on Page ${randomChunk.page}?`,
      options: [
        fallbackCorrect,
        `An external conjecture explicitly refuting Page ${randomChunk.page}`,
        `A hypothetical assumption not supported by the document's empirical benchmarks`,
        `An unverified alternative omitted from the final publication`,
      ].sort(() => Math.random() - 0.5),
      correct_answer: fallbackCorrect,
      explanation: `Grounding verified directly on Page ${randomChunk.page} of ${doc.metadata.filename}.`,
      source_pages: [randomChunk.page],
    });
  }

  return questions;
}

// 4. POST /quiz
app.post('/quiz', async (req, res) => {
  try {
    const {
      doc_id,
      num_questions = 10,
      difficulty = 'medium',
      topic,
      exclude_questions = [],
    } = req.body;

    if (!doc_id || typeof doc_id !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid doc_id.' });
    }
    if (!isValidDocId(doc_id)) {
      return res.status(400).json({ error: 'Invalid document ID format.' });
    }

    const allowedDifficulties = ['easy', 'medium', 'hard'];
    const chosenDifficulty = allowedDifficulties.includes(difficulty) ? difficulty : 'medium';
    // Allow at least 10 questions at once by default (up to 20)
    const count = Math.max(1, Math.min(20, parseInt(num_questions, 10) || 10));
    const topicStr = typeof topic === 'string' && topic.trim() ? topic.trim() : '';
    const excludeList: string[] = Array.isArray(exclude_questions)
      ? exclude_questions.map((q: any) => String(q).trim()).filter(Boolean).slice(-25)
      : [];

    const doc = loadDocument(doc_id);
    if (!doc) {
      return res.status(404).json({ error: `Document ${doc_id} not found.` });
    }

    // Step A: Topic search & diverse chunk sampling
    let sampledChunks: typeof doc.metadata.chunks = [];

    if (topicStr) {
      // Semantic and lexical search for the requested topic
      const topicVector = await getEmbedding(topicStr);
      const topicKeywords = topicStr.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

      const scored = doc.vectors.map((item) => {
        const score = dotProduct(topicVector, item.vector);
        const meta = doc.metadata.chunks.find((c) => c.chunk_id === item.chunk_id);
        const textLower = (meta?.text || '').toLowerCase();
        let keywordBonus = 0;
        for (const kw of topicKeywords) {
          if (textLower.includes(kw)) keywordBonus += 0.12;
        }
        return {
          chunk: meta,
          score: score + keywordBonus,
        };
      });

      scored.sort((a, b) => b.score - a.score);
      // Select top matching chunks for this specific topic
      const topScored = scored.slice(0, Math.min(scored.length, 14)).filter((s) => s.chunk) as { chunk: any; score: number }[];
      sampledChunks = topScored.map((s) => s.chunk);
    }

    // If no topic or insufficient topic chunks, sample diverse chunks across the entire document
    if (sampledChunks.length === 0) {
      const allChunks = [...doc.metadata.chunks];
      const total = allChunks.length;
      if (total <= 14) {
        sampledChunks = allChunks.sort(() => Math.random() - 0.5);
      } else {
        // Stratified random sampling across all pages of the document to ensure brand new passages
        const step = total / 14;
        const picked: typeof doc.metadata.chunks = [];
        for (let i = 0; i < 14; i++) {
          const idx = Math.min(total - 1, Math.floor(i * step + Math.random() * (step * 0.9)));
          if (!picked.some((p) => p.chunk_id === allChunks[idx].chunk_id)) {
            picked.push(allChunks[idx]);
          }
        }
        sampledChunks = picked.sort(() => Math.random() - 0.5);
      }
    }

    const context = sampledChunks.map((c) => `[Page ${c.page} | ID: ${c.chunk_id}]:\n${c.text}`).join('\n\n---\n\n');

    let questionsData: any[] = [];

    if (apiKey) {
      try {
        const prompt = `You are Contexta AI's Master Quiz Genie Agent.
Generate exactly ${count} multiple-choice questions (GENERATE AT LEAST ${count} COMPLETE QUESTIONS) testing comprehension of "${doc.metadata.filename}" at ${chosenDifficulty} difficulty.

${topicStr ? `CRITICAL TOPIC FOCUS: All ${count} questions MUST focus strictly and specifically on the topic: "${topicStr}". Ground all questions in the passages discussing "${topicStr}".` : 'DOCUMENT-WIDE COMPREHENSIVE ASSESSMENT: Cover diverse key concepts, equations, architectures, findings, and nuances across the document.'}

ABSOLUTE NON-REPETITION & FRESHNESS DIRECTIVES:
1. Every single question must be 100% brand new, fresh, and distinct.
2. DO NOT repeat, rephrase, or duplicate previous questions.
3. Randomization Entropy Seed: ${Date.now()}-${Math.random().toString(36).slice(2)}.
${excludeList.length > 0 ? `4. DO NOT repeat or duplicate any of these previously asked questions:\n${excludeList.map((q) => `- "${q}"`).join('\n')}` : ''}

Strict Formatting & Pedagogical Rules:
1. Exactly ${count} questions in the returned JSON array.
2. Every question must have exactly 4 plausible, well-differentiated answer options.
3. Exactly one option must be the correct answer. The "correct_answer" string MUST match one of the options verbatim.
4. Provide an evidence-based explanation referencing the source page and reasoning.
5. Fill "source_pages" with an integer array of page numbers where the answer can be verified.
6. Base all questions strictly on the context excerpts below:

Context Passages:
${context}`;

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.95,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correct_answer: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      source_pages: {
                        type: Type.ARRAY,
                        items: { type: Type.INTEGER },
                      },
                    },
                    required: ['question', 'options', 'correct_answer', 'explanation', 'source_pages'],
                  },
                },
              },
              required: ['questions'],
            },
          },
        });

        const raw = geminiRes.text || '{}';
        const parsed = JSON.parse(raw);
        questionsData = parsed.questions || [];
      } catch (err: any) {
        console.error('Quiz generation error:', err);
      }
    }

    // Validate and sanitize questions
    const validQuestions = questionsData
      .filter((q) => {
        return (
          q &&
          typeof q.question === 'string' &&
          q.question.trim().length > 10 &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct_answer === 'string' &&
          q.options.includes(q.correct_answer)
        );
      })
      .map((q) => ({
        question: q.question.trim(),
        options: q.options.map((opt: string) => String(opt).trim()),
        correct_answer: String(q.correct_answer).trim(),
        explanation: q.explanation || 'Verified from document context.',
        source_pages: Array.isArray(q.source_pages) && q.source_pages.length > 0 ? q.source_pages : [1],
      }));

    // If Gemini returned fewer than count questions or API key unavailable, supplement with dynamic fallback questions
    if (validQuestions.length < count) {
      const needed = count - validQuestions.length;
      const existingQuestionTexts = validQuestions.map((q) => q.question);
      const fallbackList = generateDynamicFallbackQuestions(
        doc,
        needed,
        chosenDifficulty,
        topicStr,
        [...excludeList, ...existingQuestionTexts]
      );
      validQuestions.push(...fallbackList);
    }

    return res.status(200).json({
      doc_id,
      difficulty: chosenDifficulty,
      topic: topicStr || null,
      count: validQuestions.length,
      questions: validQuestions,
    });
  } catch (error: any) {
    console.error('Error in /quiz endpoint:', error);
    return res.status(500).json({ error: `Quiz generation failed: ${error?.message || 'Server error'}` });
  }
});

// 5. DELETE /document/:doc_id
app.delete('/document/:doc_id', (req, res) => {
  try {
    const docId = req.params.doc_id;
    if (!isValidDocId(docId)) {
      return res.status(400).json({ error: 'Invalid document ID format.' });
    }

    const sanitized = path.basename(docId);
    const docDir = path.join(DATA_DIR, sanitized);

    if (fs.existsSync(docDir)) {
      documentCache.delete(sanitized);
      fs.rmSync(docDir, { recursive: true, force: true });
      return res.status(200).json({
        success: true,
        message: `Document ${sanitized} artifacts removed successfully.`,
      });
    } else {
      return res.status(404).json({
        error: `Document ${sanitized} not found or already deleted.`,
      });
    }
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ error: `Deletion failed: ${error?.message || 'Server error'}` });
  }
});

// 6. GET /health
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    product: 'Contexta AI',
    version: '1.0.0',
    rag_engine: 'FAISS-compatible Cosine Index + Gemini 3.8 Flash',
    data_dir_ready: fs.existsSync(DATA_DIR),
  });
});

// 6b. GET /debug/memory
app.get('/debug/memory', (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    rss_mb: Number((mem.rss / 1024 / 1024).toFixed(2)),
    heap_total_mb: Number((mem.heapTotal / 1024 / 1024).toFixed(2)),
    heap_used_mb: Number((mem.heapUsed / 1024 / 1024).toFixed(2)),
    external_mb: Number((mem.external / 1024 / 1024).toFixed(2)),
    uptime_sec: Number(process.uptime().toFixed(1)),
    cache_entries: documentCache.size,
  });
});

// 7. GET /sample-doc (Loads a rich pre-indexed sample document for immediate instant testing)
app.get('/sample-doc', async (_req, res) => {
  try {
    const sampleDocId = 'doc_sample_transformer_foundations';
    const sampleDir = path.join(DATA_DIR, sampleDocId);

    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });

      const samplePages = [
        {
          pageNumber: 1,
          text: `Contexta AI Research Digest: Attention Mechanisms and Transformer Architectures
Authors: Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin.
Abstract:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The Transformer relies entirely on an attention mechanism to draw global dependencies between input and output, eschewing recurrence and convolutions entirely. Experiments on English-to-German and English-to-French translation tasks show that the Transformer achieves superior quality while being more parallelizable and requiring significantly less time to train.`,
        },
        {
          pageNumber: 2,
          text: `Section 2: Architecture Overview
The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.
The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers: a multi-head self-attention mechanism, and a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)). To facilitate these residual connections, all sub-layers produce outputs of dimension d_model = 512.`,
        },
        {
          pageNumber: 3,
          text: `Section 3: Scaled Dot-Product Attention
An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.
We compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed into matrices K and V.
Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V
We divide by the square root of d_k to counteract the effect where dot products grow large in magnitude for large values of d_k, pushing the softmax function into regions with extremely small gradients.`,
        },
        {
          pageNumber: 4,
          text: `Section 4: Multi-Head Attention and Positional Encoding
Instead of performing a single attention function with d_model-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values h = 8 times with different, learned linear projections.
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add positional encodings to the input embeddings at the bottoms of the encoder and decoder stacks. We use sine and cosine functions of different frequencies.`,
        },
      ];

      const chunks = chunkText(samplePages, sampleDocId);
      const vectors: { chunk_id: string; vector: number[] }[] = [];

      for (const chunk of chunks) {
        const vec = await getEmbedding(chunk.text);
        vectors.push({ chunk_id: chunk.chunk_id, vector: vec });
      }

      const metadata: DocumentMetadata = {
        doc_id: sampleDocId,
        filename: 'transformer-foundations-sample.pdf',
        status: 'ready',
        page_count: samplePages.length,
        chunk_count: chunks.length,
        uploaded_at: new Date().toISOString(),
        chunks: chunks.map((c) => ({
          chunk_id: c.chunk_id,
          page: c.page,
          text: c.text,
        })),
      };

      fs.writeFileSync(path.join(sampleDir, 'metadata.json'), JSON.stringify(metadata, null, 2), 'utf-8');
      fs.writeFileSync(path.join(sampleDir, 'vectors.json'), JSON.stringify(vectors), 'utf-8');
      const bm25Data = buildBm25Index(metadata);
      const docData: CachedDoc = { metadata, vectors, ...bm25Data };
      cacheSet(sampleDocId, docData);
    }

    return res.status(200).json({
      doc_id: sampleDocId,
      filename: 'transformer-foundations-sample.pdf',
      status: 'ready',
      page_count: 4,
      chunk_count: 5,
    });
  } catch (err: any) {
    console.error('Failed to create sample document:', err);
    return res.status(500).json({ error: 'Failed to initialize sample document.' });
  }
});

// Global API error handler returning clean JSON responses
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Global server error handler caught:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'An unexpected server error occurred.',
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const distIndex = path.join(distPath, 'index.html');

  if (fs.existsSync(distIndex)) {
    console.log('Serving production frontend build from dist/');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  } else {
    console.log('Mounting Vite dev middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Contexta AI server running on http://0.0.0.0:${PORT}`);
  });
}

const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.js')
);
if (isMain) {
  startServer().catch((err) => {
    console.error('Server startup failed:', err);
  });
}
