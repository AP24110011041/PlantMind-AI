import re
from collections import Counter
from pathlib import PurePath
from typing import Any

from fastapi import HTTPException

from services.embedding_service import EmbeddingService
from services.llm_service import LLMService
from services.retrieval_service import RetrievalService
from services.vector_store import VectorStore


class RAGService:
    LAST_DOCUMENT: str | None = None
    LAST_PAGE: int | None = None
    LAST_QUERY: str | None = None

    @classmethod
    def _classify_query(cls, question: str) -> dict[str, Any]:
        normalized = question.strip().lower()

        page_match = re.search(r"\bpage\s*(\d+)\b", normalized)
        if page_match:
            return {
                "type": "page_specific",
                "page_number": int(page_match.group(1)),
            }

        if re.search(r"\b(summary|summarize|overview)\b", normalized):
            return {"type": "summary"}

        if "tell me about this document" in normalized:
            return {"type": "document_overview"}

        return {"type": "normal"}

    @classmethod
    def _infer_document_name(
        cls,
        search_results: list[dict[str, Any]],
    ) -> str | None:

        filenames = []

        for result in search_results:
            metadata = result.get("metadata") or {}
            filename = metadata.get("filename") or result.get("filename")

            if isinstance(filename, str) and filename.strip():
                filenames.append(filename)

        if not filenames:
            return None

        counts = Counter(filenames)

        return counts.most_common(1)[0][0]

    @classmethod
    def _retrieve_by_metadata(
        cls,
        vector_store: VectorStore,
        document_name: str | None,
        page_number: int | None = None,
    ) -> list[dict[str, Any]]:

        try:
            results = vector_store.collection.get(
                include=["documents", "metadatas"]
            )
        except Exception:
            return []

        raw_documents = results.get("documents") or []
        raw_metadatas = results.get("metadatas") or []

        if (
            isinstance(raw_documents, list)
            and raw_documents
            and isinstance(raw_documents[0], list)
        ):
            documents = [
                document
                for group in raw_documents
                for document in group
            ]
        else:
            documents = list(raw_documents)

        if (
            isinstance(raw_metadatas, list)
            and raw_metadatas
            and isinstance(raw_metadatas[0], list)
        ):
            metadatas = [
                metadata
                for group in raw_metadatas
                for metadata in group
            ]
        else:
            metadatas = list(raw_metadatas)

        target_name = (
            PurePath(document_name).name.strip().casefold()
            if document_name
            else None
        )

        filtered_results: list[dict[str, Any]] = []

        for document_text, metadata in zip(
            documents,
            metadatas,
            strict=False,
        ):
            if not isinstance(metadata, dict):
                continue

            filename = metadata.get("filename")

            if not isinstance(filename, str) or not filename.strip():
                continue

            if (
                target_name
                and PurePath(filename).name.strip().casefold()
                != target_name
            ):
                continue

            if page_number is not None:
                metadata_page = metadata.get("page_number")

                if (
                    metadata_page is None
                    or int(metadata_page) != page_number
                ):
                    continue

            filtered_results.append(
                {
                    "id": metadata.get("chunk_id"),
                    "text": document_text,
                    "metadata": metadata,
                    "distance": None,
                    "filename": filename,
                    "page_number": metadata.get("page_number"),
                    "section_title": metadata.get(
                        "section_title",
                        "",
                    ),
                }
            )

        filtered_results.sort(
            key=lambda item: (
                int(item.get("metadata", {}).get("page_number") or 0),
                int(item.get("metadata", {}).get("chunk_id") or 0),
            ),
        )

        return filtered_results
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

        normalized = clean_question.lower()

        greetings = {
            "hi",
            "hello",
            "hey",
            "good morning",
            "good afternoon",
            "good evening",
            "thanks",
            "thank you",
            "who are you",
            "what are you",
        }

        if normalized in greetings:

            if normalized in {
                "hi",
                "hello",
                "hey",
                "good morning",
                "good afternoon",
                "good evening",
            }:
                return {
                    "answer": (
                        "Hello! 👋 I'm PlantMind AI.\n\n"
                        "I can help you:\n"
                        "• Answer questions about uploaded PDFs\n"
                        "• Summarize documents\n"
                        "• Find information from your documents\n"
                        "• Provide source-backed answers with citations.\n\n"
                        "How can I help you today?"
                    ),
                    "citations": [],
                    "confidence": 1.0,
                }

            if normalized in {"thanks", "thank you"}:
                return {
                    "answer": "You're welcome! 😊",
                    "citations": [],
                    "confidence": 1.0,
                }

            return {
                "answer": (
                    "I'm PlantMind AI. I answer questions only from uploaded documents "
                    "and provide evidence-backed citations."
                ),
                "citations": [],
                "confidence": 1.0,
            }

        follow_up_questions = {
            "it",
            "this",
            "that",
            "more",
            "continue",
            "tell me more",
            "explain it",
            "summarize it",
            "page 2",
            "page 3",
            "page 4",
        }

        if normalized in follow_up_questions and cls.LAST_QUERY:
            clean_question = (
                f"{cls.LAST_QUERY}\nFollow-up question: {clean_question}"
            )

        classification = cls._classify_query(clean_question)

        store = vector_store or VectorStore()

        query_embedding = EmbeddingService.embed_chunks(
            [
                {
                    "chunk_id": 1,
                    "text": clean_question,
                }
            ]
        )[0]["vector"]

        if classification["type"] in {
            "summary",
            "document_overview",
        }:

            semantic_results = store.search(
                query_embedding,
                top_k=5,
            )

            document_name = cls._infer_document_name(
                semantic_results
            )

            search_results = cls._retrieve_by_metadata(
                store,
                document_name,
            )

        elif classification["type"] == "page_specific":

            semantic_results = store.search(
                query_embedding,
                top_k=5,
            )

            document_name = cls._infer_document_name(
                semantic_results
            )

            search_results = cls._retrieve_by_metadata(
                store,
                document_name,
                page_number=classification["page_number"],
            )

        else:

            search_results = store.search(
                query_embedding,
                top_k=8,
            )

        if not search_results:
            raise HTTPException(
                status_code=404,
                detail="No indexed document chunks found. Upload a PDF before asking questions.",
            )

        enriched = [
            RetrievalService.enrich_search_result(r)
            for r in search_results
        ]

        deduped = RetrievalService.dedupe_results(
            enriched
        )

        qualified = [
            r
            for r in deduped
            if r.get("similarity", 0.0)
            >= RetrievalService.min_similarity_threshold()
        ]

        if not qualified:
            qualified = deduped[:3]

        qualified.sort(
            key=lambda r: (
                r.get("high_confidence", False),
                r.get("similarity", 0.0),
            ),
            reverse=True,
        )

        citations = [
            RetrievalService.build_citation(i + 1, r)
            for i, r in enumerate(qualified)
        ]

        answer = LLMService.generate_answer(
            clean_question,
            citations,
        )

        cls.LAST_QUERY = clean_question

        confidence_score = (
            max(
                r.get("similarity", 0.0)
                for r in qualified
            )
            if qualified
            else 0.0
        )

        return {
            "answer": answer,
            "citations": citations,
            "confidence": round(confidence_score, 3),
        }