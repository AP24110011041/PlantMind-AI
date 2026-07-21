import os
import re
from typing import Any


class RetrievalService:
    """Reusable helpers for vector search scoring, filtering, and citation formatting."""

    DEFAULT_MIN_SIMILARITY = 0.20
    INSUFFICIENT_EVIDENCE_MESSAGE = (
        "I couldn't find enough evidence in the uploaded documents."
    )
    # Minimum similarity above which citations are considered high confidence
    HIGH_CONFIDENCE_THRESHOLD = float(os.getenv("RAG_HIGH_CONFIDENCE", "0.8"))

    @staticmethod
    def cosine_similarity_from_distance(distance: float | None) -> float:
        if distance is None:
            return 0.0

        return max(0.0, min(1.0, 1.0 - float(distance)))

    @classmethod
    def min_similarity_threshold(cls) -> float:
        raw_value = os.getenv("RAG_MIN_SIMILARITY", str(cls.DEFAULT_MIN_SIMILARITY)).strip()

        try:
            threshold = float(raw_value)
        except ValueError:
            threshold = cls.DEFAULT_MIN_SIMILARITY

        return max(0.0, min(1.0, threshold))

    @classmethod
    def enrich_search_result(cls, result: dict[str, Any]) -> dict[str, Any]:
        metadata = result.get("metadata") or {}
        similarity = cls.cosine_similarity_from_distance(result.get("distance"))
        filename = metadata.get("filename") or result.get("filename") or "Unknown"
        page_number = metadata.get("page_number", result.get("page_number"))
        # Calculate a normalized confidence score (0.0-1.0)
        confidence = round(float(similarity), 3) if similarity is not None else 0.0

        # Flag high-confidence matches for later use in prompts or UI
        high_confidence = confidence >= cls.HIGH_CONFIDENCE_THRESHOLD

        return {
            **result,
            "similarity": similarity,
            "confidence": confidence,
            "high_confidence": high_confidence,
            "filename": filename,
            "page_number": page_number,
            "section_title": metadata.get("section_title", result.get("section_title", "")),
        }

    @classmethod
    def filter_by_similarity(cls, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        threshold = cls.min_similarity_threshold()

        return [
            enriched
            for result in results
            if (enriched := cls.enrich_search_result(result))["similarity"] >= threshold
        ]

    @staticmethod
    def format_citation_label(filename: str, page_number: int | None) -> str:
        if page_number is not None and int(page_number) > 0:
            return f"{filename}\nPage {int(page_number)}"

        return filename

    @staticmethod
    def format_inline_citation(filename: str, page_number: int | None) -> str:
        if page_number is not None and int(page_number) > 0:
            return f"{filename}, Page {int(page_number)}"

        return filename

    @classmethod
    def dedupe_results(cls, results: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Deduplicate search results by (filename, page_number, section_title) keeping the highest similarity."""
        seen: dict[tuple[str, int | None, str], dict[str, Any]] = {}

        for res in results:
            key = (
                str(res.get("filename") or "Unknown"),
                res.get("page_number"),
                str(res.get("section_title") or ""),
            )

            existing = seen.get(key)
            if not existing:
                seen[key] = res
                continue

            # keep the one with higher similarity
            if float(res.get("similarity", 0.0)) > float(existing.get("similarity", 0.0)):
                seen[key] = res

        return list(seen.values())

    @classmethod
    def build_citation(cls, index: int, result: dict[str, Any]) -> dict[str, Any]:
        enriched = cls.enrich_search_result(result)
        filename = str(enriched.get("filename") or "Unknown")
        page_number = enriched.get("page_number")
        normalized_page = int(page_number) if page_number is not None else None

        if normalized_page is not None and normalized_page <= 0:
            normalized_page = None

        return {
            "source_id": index,
            "filename": filename,
            "page_number": normalized_page,
            "chunk_id": enriched.get("chunk_id"),
            "section_title": enriched.get("section_title") or "",
            "text": enriched.get("text", ""),
            "similarity": enriched.get("similarity"),
            "distance": enriched.get("distance"),
            "citation_label": cls.format_citation_label(filename, normalized_page),
        }

    @staticmethod
    def split_sentences(text: str) -> list[str]:
        parts = re.split(r"(?<=[.!?])\s+", text.strip())
        return [part.strip() for part in parts if part.strip()]
