from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

router = APIRouter(prefix="/api/policies", tags=["policies"])

APP_DIR = Path(__file__).resolve().parents[1]         
POLICIES_DIR = (APP_DIR / "data" / "policies").resolve()

@router.get("/{filename}")
def get_policy_file(filename: str):
    
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    p = (POLICIES_DIR / filename).resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"PDF not found: {filename}")

    headers = {"Content-Disposition": f'inline; filename="{p.name}"'}
    media = "application/pdf" if p.suffix.lower() == ".pdf" else "text/plain"
    return FileResponse(str(p), media_type=media, headers=headers)
