import os
from typing import Any

from fastapi import HTTPException
from openai import OpenAI, OpenAIError

from services.retrieval_service import RetrievalService


class LLMService:
    DEFAULT_MODEL = "gpt-4o-mini"

    @staticmethod
    def _get_api_key() -> str:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()

        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="OPENAI_API_KEY is not configured.",
            )

        return api_key

    @classmethod
    def generate_answer(cls, question: str, sources: list[dict[str, Any]]) -> str:
        api_key = cls._get_api_key()
        model = os.getenv("OPENAI_MODEL", cls.DEFAULT_MODEL)
        client = OpenAI(api_key=api_key)
        # Build context with only high-confidence or top-N sources and include short preview
        # We keep full context but annotate with confidence for better model behavior.
        context_entries = []
        for source in sources:
            confidence = source.get("confidence") if source else None
            confidence_str = f" (confidence: {confidence})" if confidence is not None else ""
            label = RetrievalService.format_inline_citation(
                source.get("filename", "Unknown"), source.get("page_number")
            )
            context_entries.append(
                f"[Source {source['source_id']}] {label}{cls._format_section_suffix(source)}{confidence_str}\n{source['text']}"
            )

        context = "\n\n".join(context_entries)

        try:
            # Strong, conservative system prompt to reduce hallucination
            system_prompt = (
                "You are PlantMind AI, an enterprise asset and operations assistant. "
                "Use ONLY the provided source chunks to answer the question. "
                "Do not invent facts or make assumptions beyond what the sources state. "
                "If the sources do not support a definitive answer, reply exactly: 'I couldn't find enough evidence in the uploaded documents.' "
                "Include inline citations in square brackets like [Source 1] and reference document filename and page number when available. "
                "Be concise and operationally useful."
            )

            user_content = (
                f"Question:\n{question}\n\n"
                f"Source chunks (each line shows source id, citation label, optional confidence):\n{context}\n\n"
                "Produce a concise answer that cites the minimal set of sources required. If the evidence is weak, be explicit."
            )

            response = client.chat.completions.create(
                model=model,
                temperature=0.0,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_content}],
            )
        except OpenAIError as exc:
            raise HTTPException(status_code=502, detail="LLM request failed.") from exc

        answer = response.choices[0].message.content
        return answer.strip() if answer else "No answer was generated."

    @staticmethod
    def _format_section_suffix(source: dict[str, Any]) -> str:
        section_title = str(source.get("section_title") or "").strip()

        if section_title:
            return f" | Section: {section_title}"

        return ""
