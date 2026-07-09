from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

from services.maintenance_service import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


class AssessRequest(BaseModel):
    asset: str
    top_k: int | None = 10


@router.post("/assess")
def assess(request: AssessRequest) -> dict[str, Any]:
    if not request.asset:
        raise HTTPException(status_code=400, detail="asset is required")

    return MaintenanceService.assess(request.asset, top_k=request.top_k or 10)
