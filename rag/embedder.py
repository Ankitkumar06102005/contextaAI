import numpy as np
from typing import List
from config import Config

try:
    from google import genai
    client = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None
except Exception:
    client = None

def normalize_vector(v: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(v)
    if norm == 0:
        return v
    return v / norm

def fallback_semantic_vector(text: str, dim: int = 768) -> np.ndarray:
    """Generates a normalized hash-based bag-of-words vector when offline or API is unavailable."""
    vec = np.zeros(dim, dtype=np.float32)
    words = text.lower().split()
    for word in words:
        h = hash(word) % dim
        vec[h] += 1.0
    return normalize_vector(vec)

def embed_text(text: str) -> np.ndarray:
    """Embeds a single string and returns a normalized float32 vector."""
    if client and Config.GEMINI_API_KEY:
        try:
            res = client.models.embed_content(
                model=Config.EMBEDDING_MODEL,
                contents=text
            )
            if hasattr(res, "embedding") and res.embedding and res.embedding.values:
                vec = np.array(res.embedding.values, dtype=np.float32)
                return normalize_vector(vec)
        except Exception as e:
            print(f"Embedding API error: {e}, using semantic fallback")
    return fallback_semantic_vector(text)

def embed_batch(texts: List[str]) -> np.ndarray:
    """Embeds a batch of texts and returns a 2D numpy array with shape (N, dim)."""
    vectors = [embed_text(t) for t in texts]
    return np.vstack(vectors).astype(np.float32)
