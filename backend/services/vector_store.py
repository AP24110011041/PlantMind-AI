from pathlib import Path
from typing import Any

import chromadb
from fastapi import HTTPException


class VectorStore:
    DEFAULT_COLLECTION_NAME = "plantmind_chunks"
    DEFAULT_PERSIST_DIR = Path(__file__).resolve().parents[1] / "chroma_db"
    TOP_K = 5

    def __init__(
        self,
        collection_name: str = DEFAULT_COLLECTION_NAME,
        persist_dir: str | Path = DEFAULT_PERSIST_DIR,
    ) -> None:
        self.client = chromadb.PersistentClient(path=str(persist_dir))
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

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

    @staticmethod
    def _validate_embeddings(embeddings: list[dict[str, Any]]) -> None:
        if not isinstance(embeddings, list):
            raise HTTPException(status_code=400, detail="Embeddings must be a list.")

        for embedding in embeddings:
            if not isinstance(embedding, dict):
                raise HTTPException(status_code=400, detail="Each embedding must be an object.")

            if "chunk_id" not in embedding or "vector" not in embedding:
                raise HTTPException(
                    status_code=400,
                    detail="Each embedding must include chunk_id and vector.",
                )

            if not isinstance(embedding["vector"], list):
                raise HTTPException(status_code=400, detail="Embedding vector must be a list.")

    @staticmethod
    def _clean_metadata(metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
        cleaned: dict[str, str | int | float | bool] = {}

        for key, value in metadata.items():
            if value is None:
                continue

            if isinstance(value, (str, int, float, bool)):
                cleaned[key] = value
            else:
                cleaned[key] = str(value)

        return cleaned

    @staticmethod
    def _metadata_for_chunk(
        chunk: dict[str, Any],
        metadata: dict[str, Any] | list[dict[str, Any]] | None,
        index: int,
    ) -> dict[str, Any]:
        if metadata is None:
            return {}

        if isinstance(metadata, dict):
            return dict(metadata)

        if isinstance(metadata, list):
            if index >= len(metadata):
                return {}

            chunk_metadata = metadata[index]
            if not isinstance(chunk_metadata, dict):
                raise HTTPException(status_code=400, detail="Chunk metadata must be an object.")

            return dict(chunk_metadata)

        raise HTTPException(status_code=400, detail="Metadata must be an object or list.")

    @staticmethod
    def _document_id(chunk_id: int, metadata: dict[str, Any]) -> str:
        document_key = metadata.get("document_id") or metadata.get("filename") or "document"
        return f"{document_key}:chunk:{chunk_id}"

    def add_documents(
        self,
        chunks: list[dict[str, Any]],
        embeddings: list[dict[str, Any]],
        metadata: dict[str, Any] | list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        self._validate_chunks(chunks)
        self._validate_embeddings(embeddings)

        if not chunks:
            return {"stored": 0, "ids": []}

        embedding_by_chunk_id = {
            int(embedding["chunk_id"]): embedding["vector"] for embedding in embeddings
        }

        ids: list[str] = []
        documents: list[str] = []
        vectors: list[list[float]] = []
        metadatas: list[dict[str, str | int | float | bool]] = []

        for index, chunk in enumerate(chunks):
            chunk_id = int(chunk["chunk_id"])

            if chunk_id not in embedding_by_chunk_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing embedding for chunk_id {chunk_id}.",
                )

            chunk_metadata = self._metadata_for_chunk(chunk, metadata, index)
            chunk_metadata.update(
                {
                    "chunk_id": chunk_id,
                    "start": int(chunk.get("start", 0)),
                    "end": int(chunk.get("end", 0)),
                }
            )

            ids.append(self._document_id(chunk_id, chunk_metadata))
            documents.append(str(chunk["text"]))
            vectors.append([float(value) for value in embedding_by_chunk_id[chunk_id]])
            metadatas.append(self._clean_metadata(chunk_metadata))

        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=vectors,
            metadatas=metadatas,
        )

        return {"stored": len(ids), "ids": ids}

    def search(
        self,
        query_embedding: list[float],
        top_k: int = TOP_K,
    ) -> list[dict[str, Any]]:
        if not isinstance(query_embedding, list) or not query_embedding:
            raise HTTPException(status_code=400, detail="Query embedding must be a non-empty list.")

        if top_k <= 0:
            raise HTTPException(status_code=400, detail="top_k must be greater than zero.")

        stored_count = self.collection.count()
        if stored_count == 0:
            return []

        result_count = min(top_k, self.TOP_K, stored_count)
        results = self.collection.query(
            query_embeddings=[[float(value) for value in query_embedding]],
            n_results=result_count,
            include=["documents", "metadatas", "distances"],
        )

        ids = results.get("ids", [[]])[0]
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        return [
            {
                "id": document_id,
                "chunk_id": metadata.get("chunk_id"),
                "text": document,
                "metadata": metadata,
                "distance": distance,
            }
            for document_id, document, metadata, distance in zip(
                ids,
                documents,
                metadatas,
                distances,
                strict=True,
            )
        ]
