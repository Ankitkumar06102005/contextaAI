def route_query(message: str) -> str:
    """
    Keyword-based router resolving user queries to 'quiz', 'summary', or 'teacher'.
    Resolves in documented priority: Quiz -> Summary -> Teacher (default).
    """
    lower = message.lower()

    # Quiz Genie keywords
    quiz_keywords = ["quiz", "test me", "mcq", "multiple choice", "practice questions", "practice quiz"]
    for kw in quiz_keywords:
        if kw in lower:
            return "quiz"

    # Summary Agent keywords
    summary_keywords = ["summarize", "summary", "overview", "key points", "main ideas", "tldr", "synopsis"]
    for kw in summary_keywords:
        if kw in lower:
            return "summary"

    # Teacher Agent (or default)
    return "teacher"
