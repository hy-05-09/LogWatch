from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.features import extract_features
from app.services.Scoring import score_risk

router = APIRouter(tags=["analyze"])

@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    baseline = None
    if req.context and req.context.baseline:
        baseline = req.context.baseline

    features = extract_features(req.logs, baseline)
    summary, signals, actions = score_risk(features)

    return AnalyzeResponse(
        request_id=req.request_id,
        summary=summary,
        signals=signals,
        recommended_actions=actions,
        evidence=[],
        debug=None
    )