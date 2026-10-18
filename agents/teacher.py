from typing import List, Dict, Any
from config import Config

try:
    from google import genai
    client = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None
except Exception:
    client = None

def run_teacher_agent(doc_filename: str, query: str, context_chunks: List[Dict[str, Any]]) -> str:
    """
    Teacher Agent: Explains concepts from the uploaded PDF in a clear, accessible, step-by-step way.
    Includes LaTeX formulas, single-turn Mermaid diagrams when helpful, and cites page numbers.
    """
    if not context_chunks:
        return "I couldn't find enough information about this in the uploaded document."

    formatted_context = "\n\n---\n\n".join(
        [f"[Page {c['page']} | ID {c['chunk_id']}]:\n{c['text']}" for c in context_chunks]
    )

    prompt = f"""You are Contexta AI's Teacher Agent, a master academic learning assistant.
Explain concepts from "{doc_filename}" with maximum pedagogical clarity and rigor.

STRICT GROUNDING DIRECTIVES:
1. Ground your entire explanation in the retrieved document passages below.
2. DO NOT invent document facts, definitions, formulas, or page numbers. Never generate unsupported facts or diagrams to fill gaps.
3. If the retrieved passages do not contain adequate evidence to answer, state clearly:
   "I couldn't find enough information about this in the uploaded document."
4. Attribute factual statements with explicit page citations, like [Page X].
5. FORMATTING & MATHEMATICAL NOTATION:
   - Use clean LaTeX for mathematical equations: inline as $equation$ and block display as $$equation$$.
   - Format lists, tables, and code blocks using clean Markdown.
6. SINGLE-PASS DIAGRAM INSTRUCTION:
   - When an architecture, process, pipeline, or state sequence would materially improve comprehension, include a single clean, valid Mermaid diagram block (using ```mermaid ... ```).
   - Only include a Mermaid diagram when the document context actually describes an architecture or process that benefits from visual depiction. Do NOT force a diagram for basic text definitions.
   - Use simple, syntactically valid Mermaid (graph TD, flowchart LR, sequenceDiagram, etc.).

RETRIEVED DOCUMENT CONTEXT:
{formatted_context}

LEARNER'S QUESTION:
{query}
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
            print(f"Teacher Agent generation error: {e}")

    # Fallback response
    first_chunk = context_chunks[0]
    return f"Based on passages from Page {first_chunk['page']}:\n\n{first_chunk['text']}\n\n[Page {first_chunk['page']}]"
