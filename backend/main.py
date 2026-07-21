from datetime import datetime
from pathlib import Path, PurePath
from typing import Any
import re
import shutil
import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# Logging
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Services
from services.chunk_service import ChunkService
from services.embedding_service import EmbeddingService
from services.pdf_service import PDFService
from services.rag_service import RAGService
from services.vector_store import VectorStore

# Routes
from routes.knowledge_graph import router as kg_router
from routes.maintenance import router as maintenance_router
from routes.compliance import router as compliance_router
from routes.report import router as report_router
from routes.analytics import router as analytics_router

app = FastAPI(title="PlantMind AI Backend")

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|\[::1\]|(\d{1,3}\.){3}\d{1,3}):\d+",

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Routers
# -----------------------------
app.include_router(kg_router)
app.include_router(maintenance_router)
app.include_router(compliance_router)
app.include_router(report_router)
app.include_router(analytics_router)

# -----------------------------
# Upload Folder
# -----------------------------
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
AI_QUERY_COUNT = 0
FAILED_UPLOADS: list[dict[str, Any]] = []


# -----------------------------
# Request Models
# -----------------------------
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)


# -----------------------------
# Home
# -----------------------------
@app.get("/")
def home():
    return {"message": "PlantMind AI Backend Running"}


# -----------------------------
# Helpers
# -----------------------------
def sanitize_filename(filename: str) -> str:
    base_name = PurePath(filename).name.strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", base_name)
    safe_name = safe_name.strip("._")

    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    return safe_name


def resolve_upload_path(filename: str) -> Path:
    target = UPLOAD_DIR / filename

    if not target.exists():
        return target

    stem = target.stem
    suffix = target.suffix

    counter = 1

    while True:
        candidate = UPLOAD_DIR / f"{stem}_{counter}{suffix}"

        if not candidate.exists():
            return candidate

        counter += 1


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024 * 1024:
        return f"{max(size_bytes / 1024, 1):.1f} KB"

    return f"{(size_bytes / (1024 * 1024)):.1f} MB"


def slugify_filename(filename: str) -> str:
    stem = PurePath(filename).stem
    slug = re.sub(r"[^A-Za-z0-9]+", "_", stem).strip("_")
    return slug or "document"


def is_document_indexed(filename: str) -> bool:
    try:
        vector_store = VectorStore()
        results = vector_store.collection.get(include=["metadatas"])
        raw_metadatas = results.get("metadatas") or []
    except Exception:
        return False

    if isinstance(raw_metadatas, list) and raw_metadatas and isinstance(raw_metadatas[0], list):
        metadatas = [metadata for group in raw_metadatas for metadata in group]
    else:
        metadatas = list(raw_metadatas)

    target_name = PurePath(filename).name.strip().casefold()

    return any(
        isinstance(metadata, dict)
        and isinstance(metadata.get("filename"), str)
        and PurePath(metadata["filename"]).name.strip().casefold() == target_name
        for metadata in metadatas
    )


def get_compliance_stats() -> dict[str, Any]:
    if not UPLOAD_DIR.exists():
        return {
            "indexed_documents": 0,
            "uploaded_documents": 0,
            "failed_uploads": 0,
            "documents_needing_review": 0,
        }

    pdf_files = [
        path
        for path in UPLOAD_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf"
    ]

    indexed_documents = sum(1 for path in pdf_files if is_document_indexed(path.name))
    uploaded_documents = len(pdf_files) - indexed_documents
    failed_uploads = len(FAILED_UPLOADS)

    return {
        "indexed_documents": indexed_documents,
        "uploaded_documents": uploaded_documents,
        "failed_uploads": failed_uploads,
        "documents_needing_review": uploaded_documents + failed_uploads,
    }


def get_reports_stats() -> dict[str, Any]:
    if not UPLOAD_DIR.exists():
        return {
            "total_pdfs": 0,
            "total_pages": 0,
            "total_chunks": 0,
            "indexed_documents": 0,
            "failed_documents": 0,
            "upload_dates": [],
        }

    pdf_files = [
        path
        for path in UPLOAD_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf"
    ]

    total_pages = 0
    total_chunks = 0
    upload_dates: list[str] = []

    for pdf_path in pdf_files:
        try:
            extraction = PDFService.extract_text(pdf_path)
            total_pages += extraction.get("page_count", 0)
            total_chunks += len(ChunkService.create_chunks_from_pages(extraction.get("pages", []), filename=pdf_path.name))
        except Exception:
            continue

        upload_dates.append(datetime.fromtimestamp(pdf_path.stat().st_mtime).strftime("%Y-%m-%d"))

    indexed_documents = sum(1 for path in pdf_files if is_document_indexed(path.name))
    failed_documents = len(FAILED_UPLOADS)

    return {
        "total_pdfs": len(pdf_files),
        "total_pages": total_pages,
        "total_chunks": total_chunks,
        "indexed_documents": indexed_documents,
        "failed_documents": failed_documents,
        "upload_dates": upload_dates,
    }


def get_dashboard_stats() -> dict[str, Any]:
    if not UPLOAD_DIR.exists():
        return {
            "total_documents": 0,
            "indexed_documents": 0,
            "uploaded_documents": 0,
            "needs_review": 0,
            "total_storage": "0.0 MB",
            "ai_queries": AI_QUERY_COUNT,
        }

    pdf_files = [
        path
        for path in UPLOAD_DIR.iterdir()
        if path.is_file() and path.suffix.lower() == ".pdf"
    ]

    total_documents = len(pdf_files)
    indexed_documents = sum(1 for path in pdf_files if is_document_indexed(path.name))
    uploaded_documents = total_documents - indexed_documents
    total_storage_bytes = sum(path.stat().st_size for path in pdf_files)

    return {
        "total_documents": total_documents,
        "indexed_documents": indexed_documents,
        "uploaded_documents": uploaded_documents,
        "needs_review": 0,
        "total_storage": format_file_size(total_storage_bytes),
        "ai_queries": AI_QUERY_COUNT,
    }


def get_analytics_stats() -> dict[str, Any]:
    dashboard_stats = get_dashboard_stats()
    total_documents = dashboard_stats["total_documents"]
    indexed_documents = dashboard_stats["indexed_documents"]
    uploaded_documents = dashboard_stats["uploaded_documents"]

    if not UPLOAD_DIR.exists():
        return {
            "total_documents": 0,
            "indexed_documents": 0,
            "uploaded_documents": 0,
            "total_pages": 0,
            "total_chunks": 0,
            "average_chunks_per_document": 0,
            "total_storage": "0.0 MB",
        }

    total_pages = 0
    total_chunks = 0

    for pdf_path in UPLOAD_DIR.iterdir():
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        try:
            extraction = PDFService.extract_text(pdf_path)
            total_pages += extraction.get("page_count", 0)
            total_chunks += len(ChunkService.create_chunks_from_pages(extraction.get("pages", []), filename=pdf_path.name))
        except Exception:
            continue

    average_chunks_per_document = round(total_chunks / total_documents, 2) if total_documents else 0

    return {
        "total_documents": total_documents,
        "indexed_documents": indexed_documents,
        "uploaded_documents": uploaded_documents,
        "total_pages": total_pages,
        "total_chunks": total_chunks,
        "average_chunks_per_document": average_chunks_per_document,
        "total_storage": dashboard_stats["total_storage"],
    }


# -----------------------------
# Documents API
# -----------------------------
@app.get("/documents")
def list_documents():
    if not UPLOAD_DIR.exists():
        return []

    documents = []

    for pdf_path in sorted(UPLOAD_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        filename = pdf_path.name
        status = "Indexed" if is_document_indexed(filename) else "Uploaded"
        uploaded_at = datetime.fromtimestamp(pdf_path.stat().st_mtime).strftime("%b %d, %Y")

        documents.append(
            {
                "id": slugify_filename(filename),
                "filename": filename,
                "uploadDate": uploaded_at,
                "size": format_file_size(pdf_path.stat().st_size),
                "status": status,
            }
        )

    return documents


@app.get("/documents/{document_id}/file")
def get_document_file(document_id: str):
    if not UPLOAD_DIR.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    target_path: Path | None = None

    for pdf_path in sorted(UPLOAD_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        if slugify_filename(pdf_path.name) == document_id:
            target_path = pdf_path
            break

    if target_path is None or not target_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=target_path,
        media_type="application/pdf",
        filename=target_path.name,
    )


@app.get("/documents/{document_id}/download")
def download_document(document_id: str):
    if not UPLOAD_DIR.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    target_path: Path | None = None

    for pdf_path in sorted(UPLOAD_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        if slugify_filename(pdf_path.name) == document_id:
            target_path = pdf_path
            break

    if target_path is None or not target_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    return FileResponse(
        path=target_path,
        media_type="application/pdf",
        filename=target_path.name,
        headers={"Content-Disposition": f"attachment; filename={target_path.name}"},
    )


@app.delete("/documents/{document_id}")
def delete_document(document_id: str):
    target_path = None

    for pdf_path in UPLOAD_DIR.iterdir():
        if not pdf_path.is_file() or pdf_path.suffix.lower() != ".pdf":
            continue

        if slugify_filename(pdf_path.name) == document_id:
            target_path = pdf_path
            break

    if target_path is None or not target_path.exists():
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        target_path.unlink(missing_ok=True)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to delete document file.") from exc

    try:
        VectorStore().delete_document(target_path.name)
    except Exception:
        pass

    return {"deleted": True, "filename": target_path.name}


# -----------------------------
# Compliance API
# -----------------------------
@app.get("/compliance")
def compliance_stats():
    return get_compliance_stats()


# -----------------------------
# Reports API
# -----------------------------
@app.get("/reports")
def reports_stats():
    return get_reports_stats()


# -----------------------------
# Dashboard API
# -----------------------------
@app.get("/dashboard")
def dashboard_stats():
    return get_dashboard_stats()


# -----------------------------
# Analytics API
# -----------------------------
@app.get("/analytics")
def analytics_stats():
    return get_analytics_stats()


# -----------------------------
# Upload API
# -----------------------------
@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    global FAILED_UPLOADS

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="PDF file required."
        )

    filename = sanitize_filename(file.filename)

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    save_path = resolve_upload_path(filename)

    try:
        with save_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        extraction = PDFService.extract_text(save_path)

        chunks = ChunkService.create_chunks_from_pages(
            extraction["pages"],
            filename=save_path.name,
        )

        embeddings = EmbeddingService.embed_chunks(chunks)

        result = VectorStore().add_documents(
            chunks,
            embeddings,
            metadata={
                "filename": save_path.name,
                "document_id": save_path.name,
            },
        )

        FAILED_UPLOADS = [entry for entry in FAILED_UPLOADS if entry.get("filename") != filename]

        return {
            "status": "indexed" if result["stored"] > 0 else "failed",
            "filename": extraction["filename"],
            "pages": extraction["page_count"],
            "characters": extraction["characters"],
            "chunks_indexed": result["stored"],
        }
    except Exception as exc:
        FAILED_UPLOADS.append({"filename": filename, "error": str(exc)})
        raise HTTPException(
            status_code=500,
            detail="Unable to process uploaded file."
        ) from exc
    finally:
        await file.close()


# -----------------------------
# Chat API
# -----------------------------
@app.post("/chat")
async def chat(request: ChatRequest):
    return RAGService.answer_question(request.question)
# -----------------------------
# Alerts API
# -----------------------------
# -----------------------------
# Alerts API
# -----------------------------
@app.get("/alerts/")
def alerts():
    dashboard = get_dashboard_stats()

    alerts = []

    if dashboard["uploaded_documents"] > 0:
        alerts.append(
            {
                "severity": "warning",
                "title": "Documents Awaiting Indexing",
                "message": f"{dashboard['uploaded_documents']} uploaded document(s) are waiting to be indexed.",
            }
        )

    if dashboard["indexed_documents"] > 0:
        alerts.append(
            {
                "severity": "success",
                "title": "Documents Indexed",
                "message": f"{dashboard['indexed_documents']} document(s) are successfully indexed and ready for AI search.",
            }
        )

    if dashboard["total_documents"] == 0:
        alerts.append(
            {
                "severity": "info",
                "title": "No Documents",
                "message": "Upload a PDF to start using PlantMind AI.",
            }
        )

    return {
        "total_alerts": len(alerts),
        "alerts": alerts,
    }