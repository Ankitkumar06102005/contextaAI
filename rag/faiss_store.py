import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Tuple
from config import Config

class FaissStore:
    def __init__(self, doc_id: str):
        self.doc_id = doc_id
        self.doc_dir = os.path.join(Config.DATA_DIR, doc_id)
        self.index_path = os.path.join(self.doc_dir, "index.faiss")
        self.metadata_path = os.path.join(self.doc_dir, "metadata.json")
        self.index: faiss.IndexFlatIP = None
        self.metadata: Dict[str, Any] = {}

    def build_and_save(self, chunks: List[Dict[str, Any]], vectors: np.ndarray, filename: str, page_count: int):
        os.makedirs(self.doc_dir, exist_ok=True)
        dimension = vectors.shape[1]
        
        # FAISS IndexFlatIP for cosine similarity on normalized vectors
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(vectors)
        faiss.write_index(self.index, self.index_path)

        self.metadata = {
            "doc_id": self.doc_id,
            "filename": filename,
            "status": "ready",
            "page_count": page_count,
            "chunk_count": len(chunks),
            "chunks": chunks
        }

        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2, ensure_ascii=False)

    def load(self) -> bool:
        if not os.path.exists(self.index_path) or not os.path.exists(self.metadata_path):
            return False
        try:
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
            return True
        except Exception as e:
            print(f"Error loading index for {self.doc_id}: {e}")
            return False

    def search(self, query_vector: np.ndarray, top_k: int = 4) -> List[Tuple[Dict[str, Any], float]]:
        if self.index is None:
            if not self.load():
                return []
        
        q_vec = np.expand_dims(query_vector, axis=0).astype(np.float32)
        scores, indices = self.index.search(q_vec, min(top_k, self.index.ntotal))

        results = []
        chunks = self.metadata.get("chunks", [])
        for score, idx in zip(scores[0], indices[0]):
            if idx >= 0 and idx < len(chunks):
                results.append((chunks[idx], float(score)))
        return results

    def delete(self) -> bool:
        if os.path.exists(self.doc_dir):
            import shutil
            shutil.rmtree(self.doc_dir, ignore_errors=True)
            return True
        return False
