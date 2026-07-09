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

        # Enrich & dedupe search results to improve retrieval quality
        enriched = [RetrievalService.enrich_search_result(r) for r in search_results]
        deduped = RetrievalService.dedupe_results(enriched)

        # Filter by similarity threshold
        qualified = [r for r in deduped if r.get("similarity", 0.0) >= RetrievalService.min_similarity_threshold()]

        if not qualified:
            return {"answer": RetrievalService.INSUFFICIENT_EVIDENCE_MESSAGE, "citations": []}

        # Sort by confidence then similarity
        qualified.sort(key=lambda x: (x.get("high_confidence", False), x.get("similarity", 0.0)), reverse=True)

        citations = [RetrievalService.build_citation(i + 1, r) for i, r in enumerate(qualified)]

        # Call LLM with citations and also return a simple confidence metric (max similarity)
        answer = LLMService.generate_answer(clean_question, citations)

        confidence_score = max((c.get("similarity") or 0.0) for c in qualified) if qualified else 0.0

        return {"answer": answer, "citations": citations, "confidence": round(confidence_score, 3)}
