from pathlib import Path, PurePath
import re
import shutil

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from services.chunk_service import ChunkService
from services.embedding_service import EmbeddingService
from services.pdf_service import PDFService
from services.rag_service import RAGService
from services.vector_store import VectorStore

app = FastAPI()

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "PlantMind AI Backend Running"}


def sanitize_filename(filename: str) -> str:
    base_name = PurePath(filename).name.strip()
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", base_name)
    safe_name = safe_name.strip("._")

    if not safe_name:
        raise HTTPException(status_code=400, detail="Invalid file name.")

    return safe_name


def resolve_upload_path(filename: str) -> Path:
    target_path = UPLOAD_DIR / filename

    if not target_path.exists():
        return target_path

    stem = target_path.stem
    suffix = target_path.suffix
    counter = 1

    while True:
        candidate = UPLOAD_DIR / f"{stem}_{counter}{suffix}"
        if not candidate.exists():
            return candidate
        counter += 1


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="A PDF file is required.")

    filename = sanitize_filename(file.filename)
    is_pdf = filename.lower().endswith(".pdf") and file.content_type in {
        "application/pdf",
        "application/octet-stream",
        "binary/octet-stream",
    }

    if not is_pdf:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    target_path = resolve_upload_path(filename)

    try:
        with target_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Failed to save uploaded file.") from exc
    finally:
        await file.close()

    try:
        extraction = PDFService.extract_text(target_path)
    except HTTPException:
        try:
            target_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise

    print(
        "[PDF Extraction] "
        f"filename={extraction['filename']} "
        f"pages={extraction['pages']} "
        f"characters={extraction['characters']}"
    )

    chunks = ChunkService.create_chunks(str(extraction["text"]))
    embeddings = EmbeddingService.embed_chunks(chunks)
    store_result = VectorStore().add_documents(
        chunks,
        embeddings,
        metadata={
            "filename": target_path.name,
            "document_id": target_path.name,
        },
    )

    print(
        "[Vector Store] "
        f"filename={target_path.name} "
        f"chunks_indexed={store_result['stored']}"
    )

    return {
        "status": "uploaded",
        "filename": extraction["filename"],
        "pages": extraction["pages"],
        "characters": extraction["characters"],
        "chunks_indexed": store_result["stored"],
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    return RAGService.answer_question(request.question)
