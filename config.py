import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2-preview")
    GENERATION_MODEL: str = os.getenv("GENERATION_MODEL", "gemini-3.8-flash")
    
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 100
    TOP_K: int = 30
    MAX_CONTEXT_CHUNKS: int = 6
    MIN_RELEVANCE_THRESHOLD: float = float(os.getenv("MIN_RELEVANCE_THRESHOLD", "0.15"))
    
    MAX_UPLOAD_SIZE_MB: int = 25
    DATA_DIR: str = os.path.join(os.path.dirname(__file__), "data")
    
os.makedirs(Config.DATA_DIR, exist_ok=True)
