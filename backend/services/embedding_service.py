from typing import Any

from fastapi import HTTPException
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    MODEL_NAME = "all-MiniLM-L6-v2"
    _model: SentenceTransformer | None = None

    @classmethod
    def _get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            try:
                cls._model = SentenceTransformer(cls.MODEL_NAME, local_files_only=True)
            except Exception:
                cls._model = SentenceTransformer(cls.MODEL_NAME)

        return cls._model

    @staticmethod
    def _validate_chunks(chunks: list[dict[str, Any]]) -> None:
        if not isinstance(chunks, list):
            raise HTTPException(status_code=400, detail="Chunks must be a list.")

        for chunk in chunks:
            if not isinstance(chunk, dict):
                raise HTTPException(status_code=400, detail="Each chunk must be an object.")

            if "chunk_id" not in chunk or "text" not in chunk:
                raise HTTPException(
                    status_code=400,
                    detail="Each chunk must include chunk_id and text.",
                )

            if not isinstance(chunk["text"], str):
                raise HTTPException(status_code=400, detail="Chunk text must be a string.")

    @classmethod
    def embed_chunks(cls, chunks: list[dict[str, Any]]) -> list[dict[str, int | list[float]]]:
        cls._validate_chunks(chunks)

        if not chunks:
            return []

        texts = [chunk["text"] for chunk in chunks]

        try:
            model = cls._get_model()
            vectors = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
        except Exception as exc:
            raise HTTPException(status_code=500, detail="Failed to generate embeddings.") from exc

        return [
            {
                "chunk_id": int(chunk["chunk_id"]),
                "vector": vector.astype(float).tolist(),
            }
            for chunk, vector in zip(chunks, vectors, strict=True)
        ]
