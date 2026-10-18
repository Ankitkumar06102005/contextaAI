from typing import List, Dict, Any
from config import Config

try:
    from google import genai
    client = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None
except Exception:
    client = None

def run_summary_agent(doc_filename: str, context_chunks: List[Dict[str, Any]], page_count: int) -> str:
    """
    Summary Agent: Generates structured executive summaries, key concepts, definitions, and exam takeaways.
    """
    if not context_chunks:
        return "No document text available to summarize."

    formatted_context = "\n\n---\n\n".join(
        [f"[Page {c['page']} | ID {c['chunk_id']}]:\n{c['text']}" for c in context_chunks]
    )

    prompt = f"""You are Contexta AI's Summary Agent.
Provide an executive, structured summary of "{doc_filename}" ({page_count} pages).

Output Structure:
1. Executive Synthesis (high-level purpose and thesis)
2. Core Themes & Definitions (bulleted with [Page X] citations)
3. Essential Findings & Arguments
4. High-Yield Revision Points (key points for exam or study review)

Ground all points strictly in the document text provided below.

DOCUMENT EXCERPTS:
{formatted_context}
"""

    if client and Config.GEMINI_API_KEY:
        try:
            response = client.models.generate_content(
                model=Config.GENERATION_MODEL,
                contents=prompt
            )
            if response.text:
                return response.text
        except Exception as e:
            print(f"Summary Agent generation error: {e}")

    # Fallback summary
    summary_lines = [f"Summary of {doc_filename} ({page_count} pages):", ""]
    for c in context_chunks[:4]:
        summary_lines.append(f"- [Page {c['page']}] {c['text'][:150]}...")
    return "\n".join(summary_lines)
