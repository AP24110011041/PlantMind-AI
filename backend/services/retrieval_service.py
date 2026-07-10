import os
import re
from typing import Any


class RetrievalService:
    """Utilities for retrieval scoring, filtering, deduplication, and citations."""

    DEFAULT_MIN_SIMILARITY = 0.30

    INSUFFICIENT_EVIDENCE_MESSAGE = (
        "I couldn't find enough evidence in the uploaded documents."
    )

    HIGH_CONFIDENCE_THRESHOLD = float(
        os.getenv("RAG_HIGH_CONFIDENCE", "0.8")
    )

    @staticmethod
    def cosine_similarity_from_distance(distance: float | None) -> float:
        if distance is None:
            return 0.0

        similarity = 1.0 - float(distance)

        return max(0.0, min(1.0, similarity))

    @classmethod
    def min_similarity_threshold(cls) -> float:
        try:
            threshold = float(
                os.getenv(
                    "RAG_MIN_SIMILARITY",
                    str(cls.DEFAULT_MIN_SIMILARITY),
                )
            )
        except Exception:
            threshold = cls.DEFAULT_MIN_SIMILARITY

        return max(0.0, min(1.0, threshold))

    @classmethod
    def enrich_search_result(
        cls,
        result: dict[str, Any],
    ) -> dict[str, Any]:

        metadata = result.get("metadata") or {}

        similarity = cls.cosine_similarity_from_distance(
            result.get("distance")
        )

        confidence = round(similarity, 3)

        return {
            **result,
            "similarity": similarity,
            "confidence": confidence,
            "high_confidence": confidence >= cls.HIGH_CONFIDENCE_THRESHOLD,
            "filename": metadata.get(
                "filename",
                result.get("filename", "Unknown"),
            ),
            "page_number": metadata.get(
                "page_number",
                result.get("page_number"),
            ),
            "section_title": metadata.get(
                "section_title",
                result.get("section_title", ""),
            ),
            "chunk_id": metadata.get(
                "chunk_id",
                result.get("chunk_id"),
            ),
        }

    @classmethod
    def filter_by_similarity(
        cls,
        results: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:

        threshold = cls.min_similarity_threshold()

        filtered = []

        for result in results:

            enriched = cls.enrich_search_result(result)

            if enriched["similarity"] >= threshold:
                filtered.append(enriched)

        return filtered

    @staticmethod
    def format_citation_label(
        filename: str,
        page_number: int | None,
    ) -> str:

        if page_number:
            return f"{filename}\nPage {page_number}"

        return filename

    @staticmethod
    def format_inline_citation(
        filename: str,
        page_number: int | None,
    ) -> str:

        if page_number:
            return f"{filename}, Page {page_number}"

        return filename

    @classmethod
    def dedupe_results(
        cls,
        results: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Keep every unique chunk.

        Previous implementation removed different chunks from the
        same page because they had the same page number.

        We now deduplicate using chunk_id.
        """

        unique = {}

        for result in results:

            enriched = cls.enrich_search_result(result)

            key = (
                enriched["filename"],
                enriched["chunk_id"],
            )

            existing = unique.get(key)

            if (
                existing is None
                or enriched["similarity"] > existing["similarity"]
            ):
                unique[key] = enriched

        return sorted(
            unique.values(),
            key=lambda x: x["similarity"],
            reverse=True,
        )

    @classmethod
    def build_citation(
        cls,
        index: int,
        result: dict[str, Any],
    ) -> dict[str, Any]:

        enriched = cls.enrich_search_result(result)

        return {
            "source_id": index,
            "filename": enriched["filename"],
            "page_number": enriched["page_number"],
            "chunk_id": enriched["chunk_id"],
            "section_title": enriched["section_title"],
            "text": enriched["text"],
            "similarity": enriched["similarity"],
            "distance": enriched["distance"],
            "citation_label": cls.format_citation_label(
                enriched["filename"],
                enriched["page_number"],
            ),
        }

    @staticmethod
    def split_sentences(text: str) -> list[str]:

        return [
            sentence.strip()
            for sentence in re.split(
                r"(?<=[.!?])\s+",
                text.strip(),
            )
            if sentence.strip()
        ]