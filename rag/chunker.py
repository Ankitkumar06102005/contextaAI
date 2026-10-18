import re
from typing import List, Dict, Any

def chunk_document(pages: List[Dict[str, Any]], doc_id: str, chunk_size: int = 800, chunk_overlap: int = 100) -> List[Dict[str, Any]]:
    """
    Splits extracted pages into chunks of approximately 800 characters with 100 character overlap,
    aligning with sentence or paragraph boundaries where possible.
    """
    chunks = []
    chunk_counter = 1

    for page_item in pages:
        page_num = page_item["page"]
        text = page_item["text"]
        if not text:
            continue

        paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para
            else:
                if len(current_chunk) >= 200:
                    chunk_id = f"chunk-{doc_id[:6]}-{chunk_counter:04d}"
                    chunks.append({
                        "chunk_id": chunk_id,
                        "doc_id": doc_id,
                        "page": page_num,
                        "text": current_chunk.strip()
                    })
                    chunk_counter += 1
                    
                    # Capture overlap
                    words = current_chunk.split()
                    overlap_words = words[-min(len(words), 20):]
                    current_chunk = " ".join(overlap_words) + f"\n\n{para}"
                else:
                    current_chunk = f"{current_chunk}\n\n{para}" if current_chunk else para

                # If para is still oversized
                while len(current_chunk) > chunk_size + 200:
                    split_idx = current_chunk.rfind(". ", 0, chunk_size)
                    cut_point = split_idx + 1 if split_idx > 300 else chunk_size
                    piece = current_chunk[:cut_point].strip()
                    chunk_id = f"chunk-{doc_id[:6]}-{chunk_counter:04d}"
                    chunks.append({
                        "chunk_id": chunk_id,
                        "doc_id": doc_id,
                        "page": page_num,
                        "text": piece
                    })
                    chunk_counter += 1
                    current_chunk = current_chunk[max(0, cut_point - chunk_overlap):].strip()

        if current_chunk.strip():
            chunk_id = f"chunk-{doc_id[:6]}-{chunk_counter:04d}"
            chunks.append({
                "chunk_id": chunk_id,
                "doc_id": doc_id,
                "page": page_num,
                "text": current_chunk.strip()
            })
            chunk_counter += 1

    return chunks
