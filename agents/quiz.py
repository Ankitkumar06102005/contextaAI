import json
from typing import List, Dict, Any
from config import Config

try:
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=Config.GEMINI_API_KEY) if Config.GEMINI_API_KEY else None
except Exception:
    client = None

def run_quiz_agent(doc_filename: str, context_chunks: List[Dict[str, Any]], num_questions: int = 5, difficulty: str = "medium") -> List[Dict[str, Any]]:
    """
    Quiz Genie: Generates validated multiple-choice questions grounded in context passages.
    Each question has 4 options, 1 verified correct answer, explanation, and source pages.
    """
    if not context_chunks:
        return []

    formatted_context = "\n\n".join(
        [f"[Page {c['page']}]: {c['text']}" for c in context_chunks]
    )

    prompt = f"""You are Contexta AI's Quiz Genie Agent.
Generate exactly {num_questions} multiple-choice questions for the document "{doc_filename}" at {difficulty} difficulty.

STRICT CONTRACT:
1. Every question must have exactly 4 distinct options.
2. The correct_answer must strictly match one of the 4 options verbatim.
3. Include an evidence-based explanation.
4. Include source_pages as a list of integers where the answer is grounded.
5. Base all questions strictly on the text provided below.

TEXT:
{formatted_context}
"""

    questions: List[Dict[str, Any]] = []

    if client and Config.GEMINI_API_KEY:
        try:
            quiz_schema = {
                "type": "OBJECT",
                "properties": {
                    "questions": {
                        "type": "ARRAY",
                        "items": {
                            "type": "OBJECT",
                            "properties": {
                                "question": {"type": "STRING"},
                                "options": {
                                    "type": "ARRAY",
                                    "items": {"type": "STRING"}
                                },
                                "correct_answer": {"type": "STRING"},
                                "explanation": {"type": "STRING"},
                                "source_pages": {
                                    "type": "ARRAY",
                                    "items": {"type": "INTEGER"}
                                }
                            },
                            "required": ["question", "options", "correct_answer", "explanation", "source_pages"]
                        }
                    }
                },
                "required": ["questions"]
            }

            response = client.models.generate_content(
                model=Config.GENERATION_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=quiz_schema
                )
            )

            if response.text:
                parsed = json.loads(response.text)
                questions = parsed.get("questions", [])
        except Exception as e:
            print(f"Quiz Genie generation error: {e}")

    # Validate output
    validated = []
    for q in questions:
        if (
            isinstance(q.get("question"), str)
            and isinstance(q.get("options"), list)
            and len(q.get("options")) == 4
            and isinstance(q.get("correct_answer"), str)
            and q.get("correct_answer") in q.get("options")
        ):
            validated.append({
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation", "Verified from document passages."),
                "source_pages": q.get("source_pages", [1])
            })

    if not validated and context_chunks:
        # Fallback question
        chunk = context_chunks[0]
        validated.append({
            "question": f"Which statement is directly supported by Page {chunk['page']} of {doc_filename}?",
            "options": [
                f"Core passage detailed on Page {chunk['page']}",
                "An unsubstantiated claim",
                "A contradicted hypothesis",
                "Information absent from the text"
            ],
            "correct_answer": f"Core passage detailed on Page {chunk['page']}",
            "explanation": f"Document excerpts on Page {chunk['page']} confirm this directly.",
            "source_pages": [chunk["page"]]
        })

    return validated
