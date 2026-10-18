import os
import uuid
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import Config
from rag.loader import extract_pdf_pages
from rag.chunker import chunk_document
from rag.embedder import embed_batch
from rag.faiss_store import FaissStore
from rag.retriever import retrieve_relevant_chunks
from agents.router import route_query
from agents.teacher import run_teacher_agent
from agents.summary import run_summary_agent
from agents.quiz import run_quiz_agent

app = FastAPI(
    title="Contexta AI",
    description="A premium RAG-based PDF learning assistant with Teacher, Summary, and Quiz Genie agents.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ChatRequest(BaseModel):
    doc_id: str
    message: str

class SummaryRequest(BaseModel):
    doc_id: str

class QuizRequest(BaseModel):
    doc_id: str
    num_questions: int = Field(default=5, ge=1, le=10)
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "product": "Contexta AI",
        "version": "1.0.0",
        "embedding_model": Config.EMBEDDING_MODEL,
        "generation_model": Config.GENERATION_MODEL
    }

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported."
        )

    content = await file.read()
    if len(content) > Config.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of {Config.MAX_UPLOAD_SIZE_MB}MB."
        )

    try:
        pages = extract_pdf_pages(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"

    # Chunking
    chunks = chunk_document(pages, doc_id, chunk_size=Config.CHUNK_SIZE, chunk_overlap=Config.CHUNK_OVERLAP)
    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to extract meaningful passages from this document."
        )

    # Embedding and FAISS store
    texts = [c["text"] for c in chunks]
    vectors = embed_batch(texts)

    store = FaissStore(doc_id)
    store.build_and_save(
        chunks=chunks,
        vectors=vectors,
        filename=file.filename,
        page_count=len(pages)
    )

    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "status": "ready",
        "page_count": len(pages),
        "chunk_count": len(chunks)
    }

@app.post("/chat")
def chat_with_doc(request: ChatRequest):
    import time
    t_start = time.perf_counter()
    store = FaissStore(request.doc_id)
    if not store.load():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{request.doc_id}' not found."
        )

    intent = route_query(request.message)
    from rag.retriever import retrieve_and_filter_pipeline
    retrieved, latencies, is_sufficient = retrieve_and_filter_pipeline(
        request.doc_id, request.message, top_k=Config.TOP_K, max_context=Config.MAX_CONTEXT_CHUNKS
    )

    filename = store.metadata.get("filename", "Uploaded Document")

    # Context assembly measurement
    t_ctx = time.perf_counter()
    formatted_context = "\n\n---\n\n".join([f"[Page {c['page']}]: {c['text']}" for c in retrieved])
    latencies["context_assembly_ms"] = round((time.perf_counter() - t_ctx) * 1000, 2)

    # Evidence sufficiency gate
    if not is_sufficient or not retrieved:
        latencies["generation_ms"] = 0.0
        latencies["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
        return {
            "agent": intent,
            "answer": "I couldn't find enough information about this in the uploaded document.",
            "sources": [],
            "latency_ms": latencies
        }

    # Generation measurement
    t_gen = time.perf_counter()
    answer = run_teacher_agent(filename, request.message, retrieved)
    latencies["generation_ms"] = round((time.perf_counter() - t_gen) * 1000, 2)
    latencies["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)

    is_insufficient_answer = (
        "couldn't find enough information" in answer.lower()
        or "not enough information" in answer.lower()
        or "cannot find information" in answer.lower()
    )

    sources = [] if is_insufficient_answer else [
        {"chunk_id": c["chunk_id"], "page": c["page"], "text": c["text"]}
        for c in retrieved
    ]

    return {
        "agent": intent,
        "answer": answer,
        "sources": sources,
        "latency_ms": latencies
    }

@app.post("/summary")
def summarize_doc(request: SummaryRequest):
    store = FaissStore(request.doc_id)
    if not store.load():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{request.doc_id}' not found."
        )

    chunks = store.metadata.get("chunks", [])
    total_pages = store.metadata.get("page_count", 1)
    filename = store.metadata.get("filename", "Uploaded Document")

    # Sample representative chunks across the document
    if len(chunks) <= 6:
        sampled = chunks
    else:
        step = max(1, len(chunks) // 6)
        sampled = [chunks[i] for i in range(0, len(chunks), step)][:6]

    answer = run_summary_agent(filename, sampled, total_pages)
    sources = [
        {"chunk_id": c["chunk_id"], "page": c["page"], "text": c["text"]}
        for c in sampled
    ]

    return {
        "agent": "summary",
        "answer": answer,
        "sources": sources
    }

@app.post("/quiz")
def generate_quiz(request: QuizRequest):
    store = FaissStore(request.doc_id)
    if not store.load():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{request.doc_id}' not found."
        )

    chunks = store.metadata.get("chunks", [])
    filename = store.metadata.get("filename", "Uploaded Document")
    sampled = chunks[:min(len(chunks), 8)]

    questions = run_quiz_agent(
        doc_filename=filename,
        context_chunks=sampled,
        num_questions=request.num_questions,
        difficulty=request.difficulty
    )

    return {
        "doc_id": request.doc_id,
        "difficulty": request.difficulty,
        "questions": questions
    }

@app.delete("/document/{doc_id}")
def delete_doc(doc_id: str):
    import re
    if not re.match(r"^[a-zA-Z0-9_-]+$", doc_id) or doc_id in (".", ".."):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format."
        )
    sanitized = os.path.basename(doc_id)
    store = FaissStore(sanitized)
    if not store.delete():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or already deleted."
        )
    return {
        "success": True,
        "message": f"Document '{sanitized}' deleted successfully."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
