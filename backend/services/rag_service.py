from typing import Any

from fastapi import HTTPException

from services.embedding_service import EmbeddingService
from services.llm_service import LLMService
from services.vector_store import VectorStore


class RAGService:
    @staticmethod
    def _citation_from_result(index: int, result: dict[str, Any]) -> dict[str, Any]:
        metadata = result.get("metadata") or {}

        return {
            "source_id": index,
            "filename": metadata.get("filename", "Unknown"),
            "chunk_id": result.get("chunk_id"),
            "text": result.get("text", ""),
            "distance": result.get("distance"),
        }

    @classmethod
    def answer_question(
        cls,
        question: str,
        vector_store: VectorStore | None = None,
    ) -> dict[str, Any]:
        clean_question = question.strip()

        if not clean_question:
            raise HTTPException(status_code=400, detail="Question is required.")

        query_embedding = EmbeddingService.embed_chunks(
            [{"chunk_id": 1, "text": clean_question}]
        )[0]["vector"]

        search_results = (vector_store or VectorStore()).search(query_embedding, top_k=5)

        if not search_results:
            raise HTTPException(
                status_code=404,
                detail="No indexed document chunks found. Upload a PDF before asking questions.",
            )

        citations = [
            cls._citation_from_result(index, result)
            for index, result in enumerate(search_results, start=1)
        ]
        answer = LLMService.generate_answer(clean_question, citations)

        return {
            "answer": answer,
            "citations": citations,
        }
