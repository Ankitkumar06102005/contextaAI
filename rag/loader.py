import io
from typing import List, Dict, Any
from pypdf import PdfReader

def extract_pdf_pages(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts text page-by-page from PDF bytes, preserving human-readable 1-indexed page numbers.
    Returns a list of dicts with 'page': int and 'text': str.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Could not parse PDF content: {str(e)}")

    if len(reader.pages) == 0:
        raise ValueError("The uploaded PDF has 0 pages.")

    pages = []
    has_text = False
    for i, page in enumerate(reader.pages):
        page_num = i + 1
        extracted = page.extract_text() or ""
        cleaned = extracted.strip()
        if cleaned:
            has_text = True
        pages.append({
            "page": page_num,
            "text": cleaned
        })

    if not has_text:
        raise ValueError("The PDF contains no extractable text. Scanned PDFs without OCR are not supported in this MVP.")

    return pages
