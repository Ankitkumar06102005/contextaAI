import time
from typing import List, Dict, Any, Tuple
from config import Config
from rag.embedder import embed_text
from rag.faiss_store import FaissStore

def is_duplicate_or_overlapping(candidate_text: str, selected_texts: List[str], threshold: float = 0.85) -> bool:
    """Checks if candidate_text has high character-level / word-level Jaccard overlap with already selected chunks."""
    c_words = set(candidate_text.lower().split())
    if not c_words:
        return True
    for s_text in selected_texts:
        s_words = set(s_text.lower().split())
        if not s_words:
            continue
        intersection = len(c_words.intersection(s_words))
        union = len(c_words.union(s_words))
        if union > 0 and (intersection / union) >= threshold:
            return True
    return False

def retrieve_and_filter_pipeline(
    doc_id: str,
    query: str,
    top_k: int = Config.TOP_K,
    max_context: int = Config.MAX_CONTEXT_CHUNKS,
    min_threshold: float = Config.MIN_RELEVANCE_THRESHOLD
) -> Tuple[List[Dict[str, Any]], Dict[str, float], bool]:
    """
    RAG retrieval pipeline:
    1. Embed query (measures embedding_ms)
    2. FAISS Top-K (up to 30 candidates) retrieval (measures search_ms)
    3. Deduplication & relevance filtering (measures filtering_ms)
    4. Evidence sufficiency gating
    5. Returns (filtered_chunks, latencies_dict, is_evidence_sufficient)
    """
    latencies: Dict[str, float] = {}

    store = FaissStore(doc_id)
    if not store.load():
        return [], {"embedding_ms": 0.0, "search_ms": 0.0, "filtering_ms": 0.0, "context_assembly_ms": 0.0}, False

    # 1. Measure Embedding Latency
    t0 = time.perf_counter()
    query_vec = embed_text(query)
    latencies["embedding_ms"] = round((time.perf_counter() - t0) * 1000, 2)

    # 2. Measure Search Latency (retrieving up to 30 candidates)
    t1 = time.perf_counter()
    search_hits = store.search(query_vec, top_k=top_k)
    latencies["search_ms"] = round((time.perf_counter() - t1) * 1000, 2)

    # 3. Measure Filtering & Deduplication Latency
    t2 = time.perf_counter()
    filtered_chunks: List[Dict[str, Any]] = []
    selected_texts: List[str] = []

    # Check evidence sufficiency: if top score is below threshold, insufficient evidence
    top_score = search_hits[0][1] if search_hits else 0.0
    is_sufficient = bool(search_hits and top_score >= min_threshold)

    if is_sufficient:
        for chunk, score in search_hits:
            if score < min_threshold:
                continue
            text = chunk.get("text", "").strip()
            if not text:
                continue
            if is_duplicate_or_overlapping(text, selected_texts):
                continue
            
            selected_texts.append(text)
            filtered_chunks.append({
                "chunk_id": chunk["chunk_id"],
                "page": chunk["page"],
                "text": text,
                "score": float(score)
            })
            if len(filtered_chunks) >= max_context:
                break

    latencies["filtering_ms"] = round((time.perf_counter() - t2) * 1000, 2)

    # If no chunk passed filtering, mark as insufficient
    if not filtered_chunks:
        is_sufficient = False

    return filtered_chunks, latencies, is_sufficient

def retrieve_relevant_chunks(doc_id: str, query: str, top_k: int = Config.TOP_K) -> List[Dict[str, Any]]:
    chunks, _, _ = retrieve_and_filter_pipeline(doc_id, query, top_k=top_k)
    return chunks
