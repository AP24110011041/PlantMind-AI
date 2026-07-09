from pathlib import Path

from fastapi import HTTPException
import fitz


class PDFService:
    @staticmethod
    def extract_text(file_path: str | Path) -> dict[str, int | str]:
        pdf_path = Path(file_path)

        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF file not found.")

        try:
            with fitz.open(pdf_path) as document:
                if document.is_encrypted:
                    raise HTTPException(
                        status_code=400,
                        detail="Encrypted PDFs are not supported.",
                    )

                text_parts: list[str] = []

                for page in document:
                    page_text = page.get_text("text").strip()
                    if page_text:
                        text_parts.append(page_text)

                text = "\n\n".join(text_parts)

                return {
                    "filename": pdf_path.name,
                    "pages": document.page_count,
                    "characters": len(text),
                    "text": text,
                }
        except HTTPException:
            raise
        except (fitz.FileDataError, RuntimeError, ValueError, OSError) as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid or corrupted PDF file.",
            ) from exc
