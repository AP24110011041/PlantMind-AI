from typing import Any
import logging
from fastapi import HTTPException

from services.embedding_service import EmbeddingService
from services.vector_store import VectorStore
from services.retrieval_service import RetrievalService
from services.llm_service import LLMService

logger = logging.getLogger("plantmind.compliance")


class ComplianceService:
    """Performs SOP compliance checks using the RAG pipeline.

    Features produced:
      - sop_check: LLM summary of whether SOP steps are supported by documents
      - compliance_score: numeric 0-100
      - missing_evidence: list of SOP items lacking supporting citations
      - risk_level: low/medium/high derived from compliance_score
      - recommendations: prioritized remediation actions
    """

    @classmethod
    def assess_sop(
        cls, sop_text: str | None = None, target: str | None = None, top_k: int = 12, vector_store: VectorStore | None = None
    ) -> dict[str, Any]:
        if not sop_text and not target:
            raise HTTPException(status_code=400, detail="sop_text or target is required")

        query_text = sop_text if sop_text else target

        try:
            query_emb = EmbeddingService.embed_chunks([{"chunk_id": 0, "text": query_text}])[0]["vector"]
        except Exception:
            logger.exception("Failed to embed compliance query")
            raise HTTPException(status_code=500, detail="Embedding failure")

        store = vector_store or VectorStore()
        search_results = store.search(query_emb, top_k=top_k)

        if not search_results:
            return {
                "sop_check": RetrievalService.INSUFFICIENT_EVIDENCE_MESSAGE,
                "compliance_score": 0.0,
                "missing_evidence": [],
                "risk_level": "high",
                "recommendations": "No supporting documents were found.",
                "citations": [],
            }

        enriched = [RetrievalService.enrich_search_result(r) for r in search_results]
        deduped = RetrievalService.dedupe_results(enriched)
        qualified = [r for r in deduped if r.get("similarity", 0.0) >= RetrievalService.min_similarity_threshold()]

        citations = [RetrievalService.build_citation(i + 1, r) for i, r in enumerate(qualified)]

        # Determine missing evidence: naive heuristic — if SOP provided, split into sentences and check presence
        missing = []
        if sop_text:
            steps = RetrievalService.split_sentences(sop_text)
            for step in steps:
                found = any(step.lower()[:60] in (c.get("text", "").lower()[:60]) for c in qualified)
                if not found:
                    missing.append(step)

        # Compose prompts for LLM
        sop_q = f"Check the following SOP and indicate which steps are supported by the provided sources. Be specific and cite sources. SOP:\n{sop_text or 'N/A'}"
        rec_q = f"Provide prioritized compliance remediation recommendations for the SOP above, focusing on missing evidence and risk mitigation. Cite sources when relevant."

        try:
            sop_check = LLMService.generate_answer(sop_q, citations)
            recommendations = LLMService.generate_answer(rec_q, citations)
        except Exception:
            logger.exception("LLM generation failed for compliance assessment")
            raise HTTPException(status_code=500, detail="LLM generation failed")

        # Simple compliance score: proportion of SOP steps found weighted by high confidence
        if sop_text and steps:
            matched = 0
            for step in steps:
                for c in qualified:
                    if step.lower()[:40] in (c.get("text", "").lower()[:40]):
                        matched += 1
                        break
            base_score = matched / len(steps)
        else:
            base_score = min(1.0, max((r.get("similarity") or 0.0) for r in qualified))

        high_conf_count = sum(1 for r in qualified if r.get("high_confidence"))
        compliance_score = min(1.0, base_score * 0.8 + min(1.0, high_conf_count * 0.05))

        if compliance_score >= 0.85:
            risk = "low"
        elif compliance_score >= 0.55:
            risk = "medium"
        else:
            risk = "high"

        return {
            "sop_check": sop_check,
            "compliance_score": round(compliance_score * 100, 1),
            "missing_evidence": missing,
            "risk_level": risk,
            "recommendations": recommendations,
            "citations": citations,
        }
