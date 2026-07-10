import os
from typing import Any

from fastapi import HTTPException
from ollama import Client

from services.retrieval_service import RetrievalService


class LLMService:
    DEFAULT_MODEL = "llama3.2"

    @classmethod
    def _get_model(cls) -> str:
        return os.getenv("OLLAMA_MODEL", cls.DEFAULT_MODEL)

    @staticmethod
    def _get_host() -> str:
        return os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")

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
You are a document question-answering assistant.

The document chunks provided have already been verified as relevant to the user's question.

Answer the question ONLY using the supplied document chunks.

Summarize the answer clearly in your own words.

You may combine information from multiple chunks.

Always include citations such as [Source 1].

Do NOT use outside knowledge.
"""

        user_prompt = f"""
Question:

{question}

Below are the document chunks.

Document Chunks:

{context}

Answer the question using ONLY these document chunks.

If the answer exists, answer it naturally.

Include citations such as [Source 1].
"""

        try:
            client = Client(host=host)

            print("\n" + "=" * 80)
            print("SYSTEM PROMPT")
            print("=" * 80)
            print(system_prompt)

            print("\n" + "=" * 80)
            print("USER PROMPT")
            print("=" * 80)
            print(user_prompt)

            print("\nSending request to Ollama...\n")

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

            print("\n" + "=" * 80)
            print("OLLAMA RESPONSE")
            print("=" * 80)
            print(response)
            print("=" * 80)

        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama request failed: {str(exc)}",
            ) from exc

        if isinstance(response, dict):
            answer = response.get("message", {}).get("content", "")
        else:
            answer = response.message.content

        if not answer:
            return "No answer was generated."

        return answer.strip()

    @staticmethod
    def _format_section_suffix(source: dict[str, Any]) -> str:
        section = str(source.get("section_title") or "").strip()

        if section:
            return f" | Section: {section}"

        return ""