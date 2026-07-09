import re

from fastapi import HTTPException


class ChunkService:
    CHUNK_SIZE = 1000
    OVERLAP = 200

    @staticmethod
    def _clean_text(text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    @classmethod
    def create_chunks(cls, text: str) -> list[dict[str, int | str]]:
        if not isinstance(text, str):
            raise HTTPException(status_code=400, detail="Text must be a string.")

        clean_text = cls._clean_text(text)

        if not clean_text:
            return []

        chunks: list[dict[str, int | str]] = []
        start = 0
        chunk_id = 1
        text_length = len(clean_text)
        step = cls.CHUNK_SIZE - cls.OVERLAP

        while start < text_length:
            end = min(start + cls.CHUNK_SIZE, text_length)

            chunks.append(
                {
                    "chunk_id": chunk_id,
                    "text": clean_text[start:end],
                    "start": start,
                    "end": end,
                }
            )

            if end == text_length:
                break

            start += step
            chunk_id += 1

        return chunks
