from fastapi import APIRouter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.features import extract_features
from app.services.scoring import score_risk
from app.rag.queries import build_retrieval_queries
from app.rag.retriever import PolicyRetriever

router = APIRouter(tags=["analyze"])
# retriever = PolicyRetriever(mode="vector", enable_threshold=False)
retriever = PolicyRetriever(mode="hybrid", enable_threshold=False, ensemble_weights=(0.4, 0.6))


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest) -> AnalyzeResponse:
    baseline = None
    if req.context and req.context.baseline:
        baseline = req.context.baseline

    features = extract_features(req.logs, baseline)
    summary, signals, actions = score_risk(features)

    # 1) signals -> queries
    queries = build_retrieval_queries(signals)
    
    # 2) queries -> evidence
    evidence, debug = retriever.retrieve(queries)
    debug = debug or {}

    # 3) guardrail : evidence 없으면 추측 기반 escalation 금지
    if not evidence and summary.decision == "ESCALATE":
        summary.decision = "REVIEW"
    debug["guardrail_no_evidence"] = (not evidence)

    return AnalyzeResponse(
        request_id=req.request_id,
        summary=summary,
        signals=signals,
        recommended_actions=actions,
        evidence=evidence,
        debug=debug,
    )