from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel
from typing import Any

from services.report_service import ReportService

router = APIRouter(prefix="/report", tags=["report"])


class ReportRequest(BaseModel):
    asset: str | None = None
    sop_text: str | None = None
    pdf: bool | None = True


@router.post("/generate")
def generate(request: ReportRequest) -> Any:
    if not request.asset and not request.sop_text:
        raise HTTPException(status_code=400, detail="asset or sop_text is required")

    out = ReportService.generate(request.asset, request.sop_text, pdf=bool(request.pdf))

    if out.get("format") == "pdf":
        return Response(content=out["bytes"], media_type="application/pdf")

    return {"format": "html", "html": out.get("html")}
