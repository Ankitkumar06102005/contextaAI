export interface SourceSnippet {
  chunk_id: string;
  page: number;
  text: string;
  score?: number;
}

export interface LatencyMetrics {
  embedding_ms: number;
  search_ms: number;
  filtering_ms: number;
  context_assembly_ms: number;
  generation_ms: number;
  total_ms: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  agent?: 'teacher' | 'summary' | 'quiz';
  text: string;
  sources?: SourceSnippet[];
  latency_ms?: LatencyMetrics;
  timestamp: string;
}

export interface DocumentInfo {
  doc_id: string;
  filename: string;
  status: 'ready' | 'processing' | 'failed';
  page_count: number;
  chunk_count: number;
  uploaded_at?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  source_pages: number[];
}

export interface QuizResponse {
  doc_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic?: string | null;
  count?: number;
  questions: QuizQuestion[];
}
