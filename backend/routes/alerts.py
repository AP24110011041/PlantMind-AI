from pathlib import Path

from fastapi import APIRouter

from services.vector_store import VectorStore

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/")
def get_alerts():
    upload_dir = Path(__file__).resolve().parents[1] / "uploads"

    pdf_files = list(upload_dir.glob("*.pdf"))

    total_documents = len(pdf_files)

    try:
        vector_store = VectorStore()

        collection = vector_store.collection.get(include=["metadatas"])

        metadatas = collection.get("metadatas", [])

        indexed_files = {
            metadata.get("filename")
            for metadata in metadatas
            if isinstance(metadata, dict) and metadata.get("filename")
        }

    except Exception:
        indexed_files = set()

    alerts = []

    for pdf in pdf_files:

        if pdf.name not in indexed_files:
            alerts.append(
                {
                    "severity": "warning",
                    "title": "Document Not Indexed",
                    "message": f"{pdf.name} has not been indexed.",
                }
            )

    if total_documents == 0:
        alerts.append(
            {
                "severity": "info",
                "title": "No Documents",
                "message": "No PDF documents have been uploaded.",
            }
        )

    if not alerts:
        alerts.append(
            {
                "severity": "success",
                "title": "System Healthy",
                "message": "All uploaded documents are indexed successfully.",
            }
        )

    return {
        "total_alerts": len(alerts),
        "alerts": alerts,
    }