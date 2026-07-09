from typing import Any
import logging
from fastapi import HTTPException

from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.retrieval_service import RetrievalService
from services.llm_service import LLMService

logger = logging.getLogger("plantmind.maintenance")


class MaintenanceService:
    """Orchestrates a maintenance intelligence assessment using the RAG pipeline.

    Features: maintenance history, failure prediction, risk score, recommendations.
    Reuses EmbeddingService, VectorStore, RetrievalService and LLMService.
    """

    @classmethod
    def assess(cls, asset: str, top_k: int = 10, vector_store: VectorStore | None = None) -> dict[str, Any]:
        asset = (asset or "").strip()
        if not asset:
            raise HTTPException(status_code=400, detail="asset is required")

        # Embed the asset name and search the vector store for relevant chunks
        try:
            query_emb = EmbeddingService.embed_chunks([{"chunk_id": 0, "text": asset}])[0]["vector"]
        except Exception:
            logger.exception("Failed to embed asset name")
            raise HTTPException(status_code=500, detail="Embedding failure")

        store = vector_store or VectorStore()
        search_results = store.search(query_emb, top_k=top_k)

        if not search_results:
            return {
                "asset": asset,
                "answer": RetrievalService.INSUFFICIENT_EVIDENCE_MESSAGE,
                "citations": [],
            }

        enriched = [RetrievalService.enrich_search_result(r) for r in search_results]
        deduped = RetrievalService.dedupe_results(enriched)
        qualified = [r for r in deduped if r.get("similarity", 0.0) >= RetrievalService.min_similarity_threshold()]

        if not qualified:
            return {"asset": asset, "answer": RetrievalService.INSUFFICIENT_EVIDENCE_MESSAGE, "citations": []}

        citations = [RetrievalService.build_citation(i + 1, r) for i, r in enumerate(qualified)]

        # Compose LLM prompts reusing the citations
        history_q = f"Summarize the maintenance history for '{asset}'. Provide a concise timeline of maintenance actions and notable findings, citing sources."
        pred_q = f"Based on the provided sources, list likely failure modes for '{asset}', estimate likelihood (low/medium/high), and expected timeframe. Be concise and cite sources."
        rec_q = f"Provide prioritized maintenance recommendations for '{asset}', include short rationale and cite sources."

        try:
            maintenance_history = LLMService.generate_answer(history_q, citations)
            failure_prediction = LLMService.generate_answer(pred_q, citations)
            recommendations = LLMService.generate_answer(rec_q, citations)
        except Exception:
            logger.exception("LLM generation failed")
            raise HTTPException(status_code=500, detail="LLM generation failed")

        max_sim = max((r.get("similarity") or 0.0) for r in qualified) if qualified else 0.0
        high_conf_count = sum(1 for r in qualified if r.get("high_confidence"))

        # Simple risk score heuristic: base on max similarity and count of high-confidence incident matches
        risk_score = min(1.0, max_sim + 0.05 * high_conf_count)

        return {
            "asset": asset,
            "risk_score": round(risk_score * 100, 1),
            "confidence": round(max_sim, 3),
            "maintenance_history": maintenance_history,
            "failure_prediction": failure_prediction,
            "recommendations": recommendations,
            "citations": citations,
        }
