from pathlib import Path
from typing import Any

import chromadb
from fastapi import HTTPException

from services.retrieval_service import RetrievalService
import os
import logging


logger = logging.getLogger("plantmind.vectorstore")


class VectorStore:
    DEFAULT_COLLECTION_NAME = "plantmind_chunks"
    DEFAULT_PERSIST_DIR = Path(__file__).resolve().parents[1] / "chroma_db"
    TOP_K = 8

    # cache PersistentClient and collection objects per (collection_name, persist_dir)
    _collection_cache: dict[tuple[str, str], tuple[Any, Any]] = {}

    def __init__(
        self,
        collection_name: str = DEFAULT_COLLECTION_NAME,
        persist_dir: str | Path = DEFAULT_PERSIST_DIR,
    ) -> None:
        persist_dir_str = str(persist_dir)
        key = (collection_name, persist_dir_str)

        cached = self._collection_cache.get(key)
        if cached:
            self.client, self.collection = cached
            logger.debug("Reusing chroma client and collection for %s at %s", collection_name, persist_dir_str)
            return

        # Create a new persistent client and collection, then cache it
        client = chromadb.PersistentClient(path=persist_dir_str)
        collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

        self.client = client
        self.collection = collection
        self._collection_cache[key] = (self.client, self.collection)
        logger.info("Created chroma client and collection '%s' at %s", collection_name, persist_dir_str)

        # TEMP DEBUG — remove once the mismatch is diagnosed
        print(
            f"[VECTORSTORE INIT] pid={os.getpid()} persist_dir={persist_dir_str} "
            f"collection={collection_name} count={collection.count()}"
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
            # enrich metadata with explicit fields, existing keys preserved
            chunk_metadata.update(
                {
                    "chunk_id": chunk_id,
                    "filename": str(
                        chunk.get("filename") or chunk_metadata.get("filename") or "Unknown"
                    ),
                    "page_number": int(chunk.get("page_number", chunk_metadata.get("page_number", 0))),
                    "section_title": str(
                        chunk.get("section_title") or chunk_metadata.get("section_title") or ""
                    ),
                    # preserve optional diagnostics if available
                    "char_count": int(chunk.get("char_count", chunk_metadata.get("char_count", 0))) ,
                    "word_count": int(chunk.get("word_count", chunk_metadata.get("word_count", 0))),
                }
            )

            ids.append(self._document_id(chunk_id, chunk_metadata))
            documents.append(str(chunk["text"]))
            vectors.append([float(value) for value in embedding_by_chunk_id[chunk_id]])
            metadatas.append(self._clean_metadata(chunk_metadata))

        # Perform upserts in batches to avoid huge single operations
        try:
            batch_size = int(os.getenv("VECTORSTORE_UPSERT_BATCH", "500"))
        except ValueError:
            batch_size = 500

        stored_ids: list[str] = []
        for i in range(0, len(ids), batch_size):
            j = min(i + batch_size, len(ids))
            self.collection.upsert(
                ids=ids[i:j],
                documents=documents[i:j],
                embeddings=vectors[i:j],
                metadatas=metadatas[i:j],
            )
            stored_ids.extend(ids[i:j])

        logger.info("Upserted %d chunk(s) into collection %s", len(stored_ids), self.collection.name)
        return {"stored": len(stored_ids), "ids": stored_ids}

    def delete_document(self, document_id: str) -> int:
        try:
            results = self.collection.get(include=["metadatas"])
            ids = results.get("ids") or []
            metadatas = results.get("metadatas") or []
        except Exception:
            return 0

        if isinstance(ids, list) and ids and isinstance(ids[0], list):
            ids = [item for group in ids for item in group]
        else:
            ids = list(ids)

        if isinstance(metadatas, list) and metadatas and isinstance(metadatas[0], list):
            metadatas = [metadata for group in metadatas for metadata in group]
        else:
            metadatas = list(metadatas)

        matching_ids: list[str] = []
        for entry_id, metadata in zip(ids, metadatas, strict=False):
            if not isinstance(metadata, dict):
                continue

            metadata_document_id = metadata.get("document_id") or metadata.get("filename")
            if isinstance(metadata_document_id, str) and metadata_document_id == document_id:
                matching_ids.append(entry_id)

        if matching_ids:
            self.collection.delete(ids=matching_ids)

        return len(matching_ids)

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

        # TEMP DEBUG — remove once the mismatch is diagnosed
        print(
            f"[VECTORSTORE SEARCH] pid={os.getpid()} collection={self.collection.name} "
            f"count={stored_count}"
        )

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

        raw_results = [
            {
                "id": document_id,
                "chunk_id": metadata.get("chunk_id"),
                "text": document,
                "metadata": metadata or {},
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

        # Enrich with similarity score and sort by similarity desc for robust ordering
        enriched_with_similarity = []
        for r in raw_results:
            try:
                sim = RetrievalService.cosine_similarity_from_distance(r.get("distance"))
            except Exception:
                sim = 0.0

            r["similarity"] = sim
            enriched_with_similarity.append(r)

        enriched_with_similarity.sort(key=lambda x: x.get("similarity", 0.0), reverse=True)

        # Final enrichment to map fields and preserve previous behavior
        return [RetrievalService.enrich_search_result(result) for result in enriched_with_similarity]