import os
from typing import Any

from fastapi import HTTPException
from openai import OpenAI, OpenAIError


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
        context = "\n\n".join(
            f"[Source {source['source_id']}] "
            f"File: {source.get('filename', 'Unknown')} | "
            f"Chunk: {source.get('chunk_id', 'Unknown')}\n"
            f"{source['text']}"
            for source in sources
        )

        try:
            response = client.chat.completions.create(
                model=model,
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are PlantMind AI, an enterprise asset and operations assistant. "
                            "Answer only from the provided source chunks. "
                            "If the sources are insufficient, say what is missing. "
                            "Cite sources inline using [Source 1], [Source 2], etc."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Question:\n{question}\n\n"
                            f"Source chunks:\n{context}\n\n"
                            "Write a concise, operationally useful answer with citations."
                        ),
                    },
                ],
            )
        except OpenAIError as exc:
            raise HTTPException(status_code=502, detail="LLM request failed.") from exc

        answer = response.choices[0].message.content
        return answer.strip() if answer else "No answer was generated."
