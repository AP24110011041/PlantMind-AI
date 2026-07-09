import re
from typing import Any

from fastapi import HTTPException

from services.retrieval_service import RetrievalService


class ChunkService:
    MAX_CHUNK_CHARS = 1200
    HEADING_LINE = re.compile(
        r"^(?:"
        r"(?:\d+(?:\.\d+)*\.?\s+[A-Z0-9])|"
        r"(?:Chapter|Section|Appendix|Part)\s+[\dIVXLCivxlc]+|"
        r"[A-Z][A-Z0-9\s\-/&]{2,90}"
        r")$"
    )
    BULLET_LINE = re.compile(
        r"^(?:[-*•●◦▪]\s+|\(?\d+\)\s+|\d+[.)]\s+|[a-z][.)]\s+)"
    )

    @staticmethod
    def _normalize_whitespace(text: str) -> str:
        return re.sub(r"[ \t]+", " ", text).strip()

    @classmethod
    def _is_heading(cls, line: str) -> bool:
        normalized = cls._normalize_whitespace(line)

        if not normalized or len(normalized) > 120:
            return False

        if cls.BULLET_LINE.match(normalized):
            return False

        if cls.HEADING_LINE.match(normalized):
            return True

        words = normalized.split()
        if len(words) <= 10 and normalized.endswith(":"):
            return True

        if len(words) <= 8 and normalized.isupper() and any(char.isalpha() for char in normalized):
            return True

        return False

    @classmethod
    def _is_probable_heading(cls, line: str) -> bool:
        """Additional heuristic heading detector for title-case and short lines."""
        normalized = cls._normalize_whitespace(line)
        if not normalized or len(normalized) > 100:
            return False

        # Numerals or enumerated headings (1., 1.1, a) at start
        if re.match(r"^(?:\d+\.|\d+\.|[A-Za-z]\))\s+", normalized):
            return True

        # Short title-case line (e.g., "Emergency Shutdown")
        words = normalized.split()
        if 1 < len(words) <= 6 and all(w[0].isupper() for w in words if w):
            return True

        return False

    @classmethod
    def _is_bullet(cls, line: str) -> bool:
        return bool(cls.BULLET_LINE.match(cls._normalize_whitespace(line)))

    @classmethod
    def _parse_page_blocks(cls, page_text: str) -> list[dict[str, str]]:
        blocks: list[dict[str, str]] = []
        current_section = ""
        lines = page_text.splitlines()
        index = 0

        while index < len(lines):
            line = cls._normalize_whitespace(lines[index])

            if not line:
                index += 1
                continue

            if cls._is_heading(line):
                current_section = line
                blocks.append(
                    {
                        "type": "heading",
                        "text": line,
                        "section_title": current_section,
                    }
                )
                index += 1
                continue

            # Use supplemental heuristic for headings (title-case short lines)
            if cls._is_probable_heading(line):
                current_section = line
                blocks.append({"type": "heading", "text": line, "section_title": current_section})
                index += 1
                continue

            if cls._is_bullet(line):
                bullet_lines: list[str] = []

                while index < len(lines):
                    current_line = lines[index].rstrip()
                    stripped = cls._normalize_whitespace(current_line)

                    if not stripped:
                        break

                    if bullet_lines and cls._is_heading(stripped):
                        break

                    if cls._is_bullet(stripped) or (
                        bullet_lines and (current_line.startswith("  ") or current_line.startswith("\t"))
                    ):
                        bullet_lines.append(stripped)
                        index += 1
                        continue

                    if not bullet_lines:
                        break

                    if len(stripped) <= 100:
                        bullet_lines.append(stripped)
                        index += 1
                        continue

                    break

                blocks.append(
                    {
                        "type": "list",
                        "text": "\n".join(bullet_lines),
                        "section_title": current_section,
                    }
                )
                continue

            paragraph_lines: list[str] = []

            while index < len(lines):
                current_line = cls._normalize_whitespace(lines[index])

                if not current_line or cls._is_heading(current_line) or cls._is_bullet(current_line):
                    break

                paragraph_lines.append(current_line)
                index += 1

            blocks.append(
                {
                    "type": "paragraph",
                    "text": " ".join(paragraph_lines),
                    "section_title": current_section,
                }
            )

        return blocks

    @classmethod
    def _split_long_text(cls, text: str) -> list[str]:
        if len(text) <= cls.MAX_CHUNK_CHARS:
            return [text]

        pieces: list[str] = []
        sentences = RetrievalService.split_sentences(text)
        buffer = ""

        for sentence in sentences:
            candidate = f"{buffer} {sentence}".strip() if buffer else sentence

            if len(candidate) <= cls.MAX_CHUNK_CHARS:
                buffer = candidate
                continue

            if buffer:
                pieces.append(buffer)

            if len(sentence) <= cls.MAX_CHUNK_CHARS:
                buffer = sentence
                continue

            start = 0
            while start < len(sentence):
                end = min(start + cls.MAX_CHUNK_CHARS, len(sentence))
                pieces.append(sentence[start:end].strip())
                start = end

            buffer = ""

        if buffer:
            pieces.append(buffer)

        return [piece for piece in pieces if piece]

    @staticmethod
    def _approx_length(parts: list[str]) -> int:
        """Estimate character length of joined parts with separators (\n\n)."""
        if not parts:
            return 0
        # sum lengths plus 2 chars per join
        total = sum(len(p) for p in parts) + (len(parts) - 1) * 2
        return total

    @classmethod
    def _append_chunk(
        cls,
        chunks: list[dict[str, Any]],
        *,
        chunk_id: int,
        text: str,
        filename: str,
        page_number: int,
        section_title: str,
    ) -> int:
        clean_text = text.strip()

        if not clean_text:
            return chunk_id

        # lightweight metadata: char and word counts help downstream filtering and diagnostics
        char_count = len(clean_text)
        word_count = len(clean_text.split())

        chunks.append(
            {
                "chunk_id": chunk_id,
                "text": clean_text,
                "filename": filename,
                "page_number": page_number,
                "section_title": section_title.strip(),
                "char_count": char_count,
                "word_count": word_count,
            }
        )

        return chunk_id + 1

    @classmethod
    def _pack_blocks_into_chunks(
        cls,
        blocks: list[dict[str, str]],
        *,
        filename: str,
        page_number: int,
        start_chunk_id: int,
    ) -> tuple[list[dict[str, Any]], int]:
        chunks: list[dict[str, Any]] = []
        chunk_id = start_chunk_id
        # buffer collects block texts to form a chunk; maintain both parts and length estimate
        buffer_parts: list[str] = []
        current_section = ""
        buffer_len = 0

        def flush_buffer() -> None:
            nonlocal chunk_id, buffer_parts, current_section, buffer_len

            if not buffer_parts:
                return

            chunk_text = "\n\n".join(buffer_parts)
            chunk_id = cls._append_chunk(
                chunks,
                chunk_id=chunk_id,
                text=chunk_text,
                filename=filename,
                page_number=page_number,
                section_title=current_section,
            )

            buffer_parts = []
            buffer_len = 0

        for block in blocks:
            block_text = block.get("text", "").strip()
            block_section = block.get("section_title", current_section)

            if not block_text:
                continue

            # Headings start a new chunk; keep the heading as the first line of the next chunk
            if block["type"] == "heading":
                if buffer_parts:
                    flush_buffer()

                current_section = block_section or block_text
                # start buffer with heading text
                buffer_parts = [block_text]
                buffer_len = len(block_text)
                # small headings may be merged with following paragraph; continue
                continue

            # If block belongs to a new section, flush to keep section grouping
            if block_section and block_section != current_section and buffer_parts:
                flush_buffer()
                current_section = block_section

            # If block is long, split into pieces and append each as its own chunk
            if len(block_text) > cls.MAX_CHUNK_CHARS:
                if buffer_parts:
                    flush_buffer()

                for piece in cls._split_long_text(block_text):
                    chunk_id = cls._append_chunk(
                        chunks,
                        chunk_id=chunk_id,
                        text=piece,
                        filename=filename,
                        page_number=page_number,
                        section_title=block_section or current_section,
                    )

                continue

            # projected length if we append this block into buffer
            projected_len = buffer_len + (2 if buffer_parts else 0) + len(block_text)

            # If adding the block would exceed MAX_CHUNK_CHARS, flush buffer first
            if buffer_parts and projected_len > cls.MAX_CHUNK_CHARS:
                flush_buffer()
                current_section = block_section or current_section

            # Start new buffer if empty
            if not buffer_parts:
                buffer_parts = [block_text]
                buffer_len = len(block_text)
            else:
                buffer_parts.append(block_text)
                buffer_len = cls._approx_length(buffer_parts)

        flush_buffer()
        return chunks, chunk_id

    @classmethod
    def create_chunks_from_pages(
        cls,
        pages: list[dict[str, Any]],
        filename: str,
    ) -> list[dict[str, Any]]:
        if not isinstance(pages, list):
            raise HTTPException(status_code=400, detail="Pages must be a list.")

        if not isinstance(filename, str) or not filename.strip():
            raise HTTPException(status_code=400, detail="Filename is required.")

        clean_filename = filename.strip()
        all_chunks: list[dict[str, Any]] = []
        chunk_id = 1

        for page in pages:
            if not isinstance(page, dict):
                raise HTTPException(status_code=400, detail="Each page must be an object.")

            page_number = int(page.get("page_number", 0))
            page_text = str(page.get("text", "")).strip()

            if not page_text:
                continue

            blocks = cls._parse_page_blocks(page_text)
            page_chunks, chunk_id = cls._pack_blocks_into_chunks(
                blocks,
                filename=clean_filename,
                page_number=page_number,
                start_chunk_id=chunk_id,
            )
            all_chunks.extend(page_chunks)

        return all_chunks

    @classmethod
    def create_chunks(cls, text: str, filename: str = "document.pdf") -> list[dict[str, Any]]:
        if not isinstance(text, str):
            raise HTTPException(status_code=400, detail="Text must be a string.")

        clean_text = cls._normalize_whitespace(text)

        if not clean_text:
            return []

        return cls.create_chunks_from_pages(
            [{"page_number": 1, "text": clean_text}],
            filename=filename,
        )
