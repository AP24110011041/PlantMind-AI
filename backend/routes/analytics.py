from fastapi import APIRouter
from typing import Any
from pathlib import Path
import datetime

from services.vector_store import VectorStore
from services.maintenance_service import MaintenanceService
from services.compliance_service import ComplianceService

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/")
def analytics() -> dict[str, Any]:
    base = Path(__file__).resolve().parents[1]
    uploads_dir = base / "uploads"

    # Documents uploaded: count files
    files = []
    if uploads_dir.exists():
        files = [p for p in uploads_dir.iterdir() if p.is_file()]

    documents_uploaded = len(files)

    # Documents trend: last 14 days by modification date
    now = datetime.datetime.utcnow()
    days = [(now - datetime.timedelta(days=i)).date() for i in range(13, -1, -1)]
    trend = {str(d): 0 for d in days}
    for f in files:
        try:
            mtime = datetime.datetime.utcfromtimestamp(f.stat().st_mtime).date()
            key = str(mtime)
            if key in trend:
                trend[key] += 1
        except Exception:
            continue

    # Vector store counts
    try:
        vs = VectorStore()
        chunks_indexed = vs.collection.count()
    except Exception:
        chunks_indexed = 0

    # Sample assets from uploaded filenames (limit 5)
    asset_files = [p.name for p in files][:5]
    plant_health = []
    compliance_scores = []
    for name in asset_files:
        asset_name = name
        try:
            m = MaintenanceService.assess(asset_name, top_k=5)
            plant_health.append({"asset": asset_name, "risk_score": m.get("risk_score", None), "confidence": m.get("confidence", None)})
        except Exception:
            plant_health.append({"asset": asset_name, "risk_score": None, "confidence": None})

        try:
            c = ComplianceService.assess_sop(None, target=asset_name, top_k=5)
            compliance_scores.append({"asset": asset_name, "compliance_score": c.get("compliance_score")})
        except Exception:
            compliance_scores.append({"asset": asset_name, "compliance_score": None})

    # AI usage placeholder — recommend enabling metrics collection
    ai_usage = {"requests": None, "tokens": None, "note": "Enable usage tracking to populate these fields."}

    return {
        "documents_uploaded": documents_uploaded,
        "documents_trend": trend,
        "chunks_indexed": chunks_indexed,
        "plant_health": plant_health,
        "compliance_scores": compliance_scores,
        "ai_usage": ai_usage,
    }
