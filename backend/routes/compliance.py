from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from services.compliance_service import ComplianceService

router = APIRouter(prefix="/compliance", tags=["compliance"])


class ComplianceRequest(BaseModel):
    sop_text: str | None = None
    target: str | None = None
    top_k: int | None = 12


@router.post("/check")
def check(request: ComplianceRequest) -> dict[str, Any]:
    if not request.sop_text and not request.target:
        raise HTTPException(status_code=400, detail="sop_text or target is required")

    return ComplianceService.assess_sop(request.sop_text, request.target, top_k=request.top_k or 12)
