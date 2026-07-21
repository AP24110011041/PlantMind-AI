import os
from typing import Any

from fastapi import HTTPException
from ollama import Client, RequestError, ResponseError

from services.retrieval_service import RetrievalService


class LLMService:
    DEFAULT_MODEL = "qwen2.5:7b"

    @classmethod
    def _get_model(cls) -> str:
        return os.getenv("OLLAMA_MODEL", cls.DEFAULT_MODEL)

    @staticmethod
    def _get_host() -> str:
        return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    @classmethod
    def generate_answer(
        cls,
        question: str,
        sources: list[dict[str, Any]],
    ) -> str:

        model = cls._get_model()
        host = cls._get_host()

        context_entries = []

        for source in sources:
            label = RetrievalService.format_inline_citation(
                source.get("filename", "Unknown"),
                source.get("page_number"),
            )

            section = cls._format_section_suffix(source)

            context_entries.append(
                f"[Source {source['source_id']}] {label}{section}\n{source['text']}"
            )

        context = "\n\n".join(context_entries)

        system_prompt = """
        If the user refers to "the file", "this document", "the uploaded PDF", or similar phrases, interpret the request as referring to the retrieved document(s).

If the user asks "Tell me about the file", "Say about the file", or similar, provide a concise summary of the retrieved document instead of looking for the literal word "file".

You are PlantMind AI, an enterprise document intelligence assistant.

The retrieval system has already selected the most relevant document chunks.

STRICT RULES

1. Use ONLY the supplied document chunks.
2. Never invent or assume information.
3. If the answer is not present in the supplied chunks, clearly state that it was not found.
4. Always include inline citations like [Source 1].
5. If multiple sources support the same statement, cite all relevant sources.
6. Keep answers professional, concise, and easy to read.

RESPONSE FORMAT

For factual questions:

## Answer
Provide a direct answer.

## Evidence
Explain briefly using the retrieved information and include citations.

## Sources
Do not list sources manually; the frontend already displays them.

For summary requests:

## Summary
Provide a concise overview.

## Key Findings
Use bullet points.

## Recommendations
If the document suggests actions, list them.
Otherwise write:
"No recommendations are explicitly mentioned in the document."

Never use markdown tables.
Never fabricate recommendations.
8. If the user refers to "the file", "this file", "the document", "this document", or "the uploaded PDF", assume they are referring to the retrieved document chunks.

9. If the user asks:
- "Tell me about the file"
- "Say about the file"
- "Describe this document"
- "What is this PDF about?"
then provide a concise summary of the retrieved document instead of searching for the literal word "file".
10. If the user greets you (e.g., "Hi", "Hello", "Hey"), respond politely as PlantMind AI without saying that no documents were found.

11. If the user thanks you, reply politely.

12. If the user asks "Who are you?", introduce yourself as PlantMind AI, an AI-powered document intelligence assistant.

13. Only use retrieved document chunks when the question is about uploaded documents. For general greetings or introductions, answer naturally without referring to document chunks.

"""

        user_prompt = f"""
User Question:
{question}

Retrieved Document Chunks:

{context}

Generate the response following the required format.
"""

        try:
            client = Client(host=host)

            response = client.chat(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],
                options={
                    "temperature": 0,
                },
            )

        except (RequestError, ResponseError, ConnectionError) as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama request failed: {exc}",
            )

        answer = response["message"]["content"]

        if not answer:
            return "No answer was generated."

        return answer.strip()

    @staticmethod
    def _format_section_suffix(source: dict[str, Any]) -> str:
        section = str(source.get("section_title") or "").strip()

        if section:
            return f" | Section: {section}"

        return ""