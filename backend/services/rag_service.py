from typing import Any

from fastapi import HTTPException

from services.embedding_service import EmbeddingService
from services.llm_service import LLMService
from services.retrieval_service import RetrievalService
from services.vector_store import VectorStore


class RAGService:
    @classmethod
    def answer_question(
        cls,
        question: str,
        vector_store: VectorStore | None = None,
    ) -> dict[str, Any]:

        clean_question = question.strip()

        if not clean_question:
            raise HTTPException(
                status_code=400,
                detail="Question is required.",
            )

        # Generate embedding for the query
        query_embedding = EmbeddingService.embed_chunks(
            [
                {
                    "chunk_id": 1,
                    "text": clean_question,
                }
            ]
        )[0]["vector"]

        # Retrieve candidate chunks
        search_results = (vector_store or VectorStore()).search(
            query_embedding,
            top_k=8,
        )

        if not search_results:
            raise HTTPException(
                status_code=404,
                detail="No indexed document chunks found. Upload a PDF before asking questions.",
            )

        # Enrich results
        enriched = [
            RetrievalService.enrich_search_result(r)
            for r in search_results
        ]

        # Remove duplicate chunks
        deduped = RetrievalService.dedupe_results(enriched)

        # Filter by similarity threshold
        qualified = [
            r
            for r in deduped
            if r.get("similarity", 0.0)
            >= RetrievalService.min_similarity_threshold()
        ]

        if not qualified:
            return {
                "answer": RetrievalService.INSUFFICIENT_EVIDENCE_MESSAGE,
                "citations": [],
                "confidence": 0.0,
            }

        # Keep highest similarity first
        qualified.sort(
            key=lambda x: x.get("similarity", 0.0),
            reverse=True,
        )

        # Keep only top 5 most relevant chunks
        qualified = qualified[:5]

        # Reorder for readability
        qualified.sort(
            key=lambda x: (
                x.get("page_number", 0),
                x.get("chunk_id", 0),
            )
        )

        # Build citations
        citations = [
            RetrievalService.build_citation(i + 1, r)
            for i, r in enumerate(qualified)
        ]

        # Generate answer
        answer = LLMService.generate_answer(
            clean_question,
            citations,
        )

        # Confidence = best similarity score
        confidence_score = max(
            r.get("similarity", 0.0)
            for r in qualified
        )

        return {
            "answer": answer,
            "citations": citations,
            "confidence": round(confidence_score, 3),
        }