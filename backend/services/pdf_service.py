from pathlib import Path
from typing import Any
import os
import logging

from fastapi import HTTPException
import fitz


logger = logging.getLogger("plantmind.pdf")


class PDFService:
    """PDF extraction helpers with improved error handling, limits, and logging.

    This implementation avoids concatenating the full document text into memory
    and provides configurable limits for pages and character counts. Encrypted
    PDFs are attempted to be opened with an optional `PDF_PASSWORD` env var or
    authenticated with an empty password before returning a clear error.
    """

    DEFAULT_MAX_PAGES = int(os.getenv("PDF_MAX_PAGES", "2000"))
    DEFAULT_MAX_CHARACTERS = int(os.getenv("PDF_MAX_CHARACTERS", "5000000"))

    @staticmethod
    def extract_text(file_path: str | Path) -> dict[str, Any]:
        pdf_path = Path(file_path)

        if not pdf_path.exists():
            logger.warning("PDF not found: %s", pdf_path)
            raise HTTPException(status_code=404, detail="PDF file not found.")

        max_pages = int(os.getenv("PDF_MAX_PAGES", PDFService.DEFAULT_MAX_PAGES))
        max_chars = int(os.getenv("PDF_MAX_CHARACTERS", PDFService.DEFAULT_MAX_CHARACTERS))

        try:
            with fitz.open(pdf_path) as document:
                if document.is_encrypted:
                    # Try authenticate with provided password (if any), then empty string
                    pdf_password = os.getenv("PDF_PASSWORD", "")
                    if pdf_password:
                        try:
                            ok = document.authenticate(pdf_password)
                        except Exception:
                            ok = False
                    else:
                        try:
                            ok = document.authenticate("")
                        except Exception:
                            ok = False

                    if not ok:
                        logger.warning("Encrypted PDF rejected: %s", pdf_path)
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                "Encrypted or password-protected PDFs are not supported. "
                                "Remove encryption or provide a password via the PDF_PASSWORD env var."
                            ),
                        )

                pages: list[dict[str, int | str]] = []
                total_chars = 0
                page_count = document.page_count

                if page_count > max_pages:
                    logger.warning(
                        "PDF page count %d exceeds max allowed %d: %s",
                        page_count,
                        max_pages,
                        pdf_path,
                    )
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"PDF contains {page_count} pages which exceeds the allowed limit of {max_pages}. "
                            "Split the document or increase PDF_MAX_PAGES if appropriate."
                        ),
                    )

                for page_index, page in enumerate(document, start=1):
                    try:
                        page_text = page.get_text("text") or ""
                    except Exception as exc:
                        logger.exception("Failed to extract text from page %s of %s", page_index, pdf_path)
                        raise HTTPException(
                            status_code=400,
                            detail=f"Failed to extract text from page {page_index}.",
                        ) from exc

                    page_text = page_text.strip()
                    page_chars = len(page_text)
                    total_chars += page_chars

                    if total_chars > max_chars:
                        logger.warning(
                            "PDF extracted characters %d exceed max %d at page %d: %s",
                            total_chars,
                            max_chars,
                            page_index,
                            pdf_path,
                        )
                        raise HTTPException(
                            status_code=400,
                            detail=(
                                f"Extracted text exceeds the allowed character limit of {max_chars}. "
                                "Consider splitting the file into smaller documents."
                            ),
                        )

                    pages.append({"page_number": page_index, "text": page_text})

                logger.info(
                    "Extracted PDF: %s pages=%d characters=%d",
                    pdf_path.name,
                    len(pages),
                    total_chars,
                )

                return {
                    "filename": pdf_path.name,
                    "pages": pages,
                    "page_count": page_count,
                    "characters": total_chars,
                }
        except HTTPException:
            raise
        except (fitz.FileDataError, RuntimeError, ValueError, OSError) as exc:
            logger.exception("Invalid or corrupted PDF: %s", pdf_path)
            raise HTTPException(
                status_code=400,
                detail="Invalid or corrupted PDF file.",
            ) from exc
