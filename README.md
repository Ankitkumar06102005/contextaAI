# Contexta AI — RAG-Based PDF Learning Assistant

> **"Your documents. Your context. Your understanding."**  
> Turn complex PDFs into clear explanations, structured summaries, and interactive quizzes grounded in retrieved passages with verified page citations.

---

## 1. Project Overview

**Contexta AI** is a document-grounded learning companion designed for researchers, university students, and technical professionals studying dense PDFs. Unlike general-purpose chatbots, Contexta AI grounds every response strictly in retrieved passages from the user's uploaded document, citing exact page numbers and verbatim excerpts so learners can verify sources.

### Key Capabilities

- **Teacher Agent (`agents/teacher.py`)**: Pedagogical concept explanations, step-by-step mathematical/technical derivations, and clear definitions with inline `[Page X]` citations. Acknowledges missing evidence if the document does not support a claim.
- **Summary Agent (`agents/summary.py`)**: Executive synthesis, core thematic definitions, and exam-focused revision checklists sampled deliberately across all document sections.
- **Quiz Genie (`agents/quiz.py`)**: Validated 4-option multiple-choice quizzes with configurable difficulty (`easy`, `medium`, `hard`), locked answers, and evidence-based rationales.
- **Source Passage Inspector**: Inspect verbatim chunk excerpts, chunk IDs, and page numbers side-by-side with assistant explanations.
- **Safe Lifecycle Management**: Permanent deletion endpoint (`DELETE /document/{doc_id}`) removing indexes and metadata from disk.

---

## 2. Architecture & RAG Pipeline

```
[ User PDF Upload ]
        │
        ▼
[ Page-by-Page Extraction ] ── (1-indexed page preservation)
        │
        ▼
[ Sentence-Aligned Chunking ] ── (~800 characters with ~100 char overlap)
        │
        ▼
[ Gemini Embeddings ] ── (Normalized float32 vectors)
        │
        ▼
[ FAISS Vector Store ] ── (IndexFlatIP cosine similarity + JSON metadata under /data/<doc_id>/)
        │
        ▼
[ Top-K Query Retrieval ] ── (Ranked by cosine inner product)
        │
        ▼
[ Agents: Teacher / Summary / Quiz ] ── (Gemini 3.8 Flash with strict grounding instructions)
```

---

## 3. Project Structure

```text
contexta-ai/
├── main.py                     # FastAPI REST API application
├── config.py                   # Centralized configuration & environment constants
├── requirements.txt            # Python dependencies (FastAPI, pypdf, faiss-cpu, google-genai)
├── server.ts                   # Full-stack Node.js / Express runner for AI Studio live preview
├── package.json                # Frontend & full-stack dependencies
├── vite.config.ts              # Vite configuration
├── metadata.json               # AI Studio metadata
├── index.html                  # HTML entry point with DM Serif Display & Plus Jakarta Sans
├── .env.example                # Environment variables template
├── .gitignore                  # Excludes private uploads, indexes, and secrets
├── agents/
│   ├── __init__.py
│   ├── teacher.py              # Pedagogical explanation agent
│   ├── summary.py              # Multi-section summary & revision agent
│   ├── quiz.py                 # Interactive MCQ generation agent with schema validation
│   └── router.py               # Keyword-based intent classification
├── rag/
│   ├── __init__.py
│   ├── loader.py               # Page-by-page PDF extraction
│   ├── chunker.py              # Sentence-aligned 800-char chunking
│   ├── embedder.py             # Vector embedding with normalization
│   ├── faiss_store.py          # FAISS IndexFlatIP persistence & search
│   └── retriever.py            # Top-K retrieval orchestrator
├── src/
│   ├── App.tsx                 # Main application controller (Landing + Workspace)
│   ├── types.ts                # TypeScript domain models
│   ├── index.css               # Design tokens (warm off-white, pale sage, forest green)
│   ├── components/
│   │   ├── Navbar.tsx          # 3-zone top bar
│   │   ├── LandingHero.tsx     # Editorial hero with real upload & floating previews
│   │   ├── WorkflowSection.tsx # 4-step methodical pipeline
│   │   ├── FeatureShowcase.tsx # 4-agent showcase with real mockups
│   │   ├── WorkspaceSidebar.tsx# Active document card, modes, and deletion
│   │   ├── ConversationArea.tsx# Grounded chat & source drawer
│   │   ├── QuizView.tsx        # Interactive MCQ examination UI
│   │   ├── SourceInspector.tsx # Verbatim passage viewer
│   │   └── Footer.tsx          # Editorial footer
└── data/                       # Per-document FAISS index & metadata storage
    └── .gitkeep
```

---

## 4. Environment Prerequisites & Setup

### Option A: Running with Python & FastAPI

1. **Python Version**: Python 3.10+ recommended.
2. **Create and Activate a Virtual Environment**:
   ```bash
   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Configure Gemini API Key**:
   Create a `.env` file in the root directory:
   ```bash
   GEMINI_API_KEY="your-gemini-api-key"
   ```
5. **Start the FastAPI Server**:
   ```bash
   python main.py
   # Or using uvicorn directly:
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   Interactive API documentation will be available at `http://localhost:8000/docs`.

### Option B: Running Full-Stack Dev Server (AI Studio / Node.js)

The project includes a unified `server.ts` Express entry point that runs the full RAG pipeline and mounts the Vite frontend on port 3000:

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

---

## 5. REST API Contract & Examples

### 1. `POST /upload`
Uploads and indexes a PDF document.
- **Request**: `multipart/form-data` with `file: <binary.pdf>`
- **Response**:
  ```json
  {
    "doc_id": "doc_m8x21a9",
    "filename": "quantum-computing.pdf",
    "status": "ready",
    "page_count": 18,
    "chunk_count": 94
  }
  ```

### 2. `POST /chat`
Asks a question grounded in the uploaded document.
- **Request**:
  ```json
  {
    "doc_id": "doc_m8x21a9",
    "message": "Explain how phase kickback works."
  }
  ```
- **Response**:
  ```json
  {
    "agent": "teacher",
    "answer": "Phase kickback is a quantum phenomenon where a target qubit's eigenvalue is kicked back into the control qubit [Page 7]...",
    "sources": [
      {
        "chunk_id": "chunk-doc_m8-0024",
        "page": 7,
        "text": "The phase kickback mechanism allows..."
      }
    ]
  }
  ```

### 3. `POST /summary`
Generates a multi-section executive summary with core definitions and exam takeaways.
- **Request**: `{"doc_id": "doc_m8x21a9"}`
- **Response**: `{ "agent": "summary", "answer": "...", "sources": [...] }`

### 4. `POST /quiz`
Generates validated multiple-choice questions.
- **Request**:
  ```json
  {
    "doc_id": "doc_m8x21a9",
    "num_questions": 5,
    "difficulty": "medium"
  }
  ```
- **Response**:
  ```json
  {
    "doc_id": "doc_m8x21a9",
    "difficulty": "medium",
    "questions": [
      {
        "question": "What is the primary function of the Hadamard gate?",
        "options": [
          "Creates equal superposition states",
          "Applies a bit flip",
          "Measures the target qubit",
          "Decouples environmental noise"
        ],
        "correct_answer": "Creates equal superposition states",
        "explanation": "Page 3 defines the Hadamard operation as transforming computational basis states into superposition.",
        "source_pages": [3]
      }
    ]
  }
  ```

### 5. `DELETE /document/{doc_id}`
Permanently deletes the document index and JSON metadata from disk.
- **Response**: `{"success": true, "message": "Document artifacts removed successfully."}`

---

## 6. Persistence & Security

- **Storage Location**: `./data/<doc_id>/`
  - `index.faiss`: Binary FAISS FlatIP index.
  - `metadata.json`: Document properties, chunk IDs, page maps, and text passages.
- **Security Protections**:
  - `path.basename` sanitation against directory traversal (`../`).
  - No client-side exposure of `GEMINI_API_KEY`.
  - Max upload size enforcement (25 MB limit).
  - Validation against non-PDF mime types and corrupted files.
  - Scanned PDF detection: returns clear error when no extractable text is present.

---

## 7. Visual Design Principles

- **Primary Colors**: White (`#FFFFFF`), Warm off-white (`#F8FAF7`), Pale Sage Accent (`#DCE9DD`), Forest Green (`#294331`), Accent Strong (`#739678`).
- **Zero Blue Lighting**: All electric-blue glows, dark navy cards, and saturated neon accents have been replaced with subtle sage illumination.
- **Typography Pairing**: `Plus Jakarta Sans` for clean interface clarity paired with `DM Serif Display` for editorial italic accents.
- **Zero-Pill Discipline**: Metadata is displayed as unboxed text separated by subtle typographic dots (`·` / `/`), avoiding generic AI pill badges.
