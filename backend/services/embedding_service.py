from typing import Any, List
import os
import logging

from fastapi import HTTPException
from sentence_transformers import SentenceTransformer


logger = logging.getLogger("plantmind.embedding")


class EmbeddingService:
    MODEL_NAME = "all-MiniLM-L6-v2"
    _model: SentenceTransformer | None = None

    @classmethod
    def _get_model(cls) -> SentenceTransformer:
        if cls._model is None:
            try:
                cls._model = SentenceTransformer(cls.MODEL_NAME, local_files_only=True)
                logger.info("Loaded embedding model from local files: %s", cls.MODEL_NAME)
            except Exception:
                logger.info("Local model not found; attempting remote download: %s", cls.MODEL_NAME)
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
        """Generate embeddings for chunks in configurable batches to reduce memory usage.

        Returns a list preserving input order where each item has `chunk_id` and `vector`.
        Public API unchanged.
        """
        cls._validate_chunks(chunks)

        if not chunks:
            return []

        model = cls._get_model()

        # determine batch size from env or default
        try:
            batch_size = int(os.getenv("EMBED_BATCH_SIZE", "64"))
        except ValueError:
            batch_size = 64

        results: List[dict[str, Any]] = []

        # Process in batches to avoid keeping all embeddings in memory
        total = len(chunks)
        logger.debug("Embedding %d chunks with batch_size=%d", total, batch_size)

        for start in range(0, total, batch_size):
            end = min(start + batch_size, total)
            batch = chunks[start:end]
            texts = [chunk["text"] for chunk in batch]

            try:
                vectors = model.encode(
                    texts,
                    batch_size=batch_size,
                    convert_to_numpy=True,
                    show_progress_bar=False,
                )
            except Exception as exc:
                logger.exception("Embedding model failed on batch %d-%d", start, end - 1)
                raise HTTPException(status_code=500, detail="Failed to generate embeddings.") from exc

            # convert and append results while preserving chunk order
            for chunk, vector in zip(batch, vectors, strict=True):
                # convert numpy vector to native floats; ensure JSON-serializable
                try:
                    vector_list = vector.astype(float).tolist()
                except Exception:
                    # fallback: attempt generic conversion
                    vector_list = [float(x) for x in vector.tolist()]

                results.append({"chunk_id": int(chunk["chunk_id"]), "vector": vector_list})

            # Help GC by deleting intermediate objects
            del texts
            del vectors

        return results
