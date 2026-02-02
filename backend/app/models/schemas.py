from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# --------------------------------------------------------
# Request (입력 로그 구조)

# 접근한 사용자, 기본값은 None
class Actor(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: Optional[str] = None

# 어디서 접근했는지
class Source(BaseModel):
    ip: str
    country: Optional[str] = None
    device_id: Optional[str] = None
    user_agent: Optional[str] = None

# 무엇을 건드렸는지
class Target(BaseModel):
    resource: str
    sensitivity: Optional[Literal["LOW", "MED", "HIGH"]] = "LOW"

# 분석에 필요한 부가정보
class Meta(BaseModel):
    mfa_used: Optional[bool] = None # mfa : Multi-Factor Authentication(다중 인증) 
    reason: Optional[str] = None


# 로그 표준 형태
class LogEvent(BaseModel):
    event_id: str
    ts: str #timestamp
    actor: Actor
    action: str #LOGIN, READ, EXPORT ...
    result: Literal["SUCCESS", "FAIL"]
    source: Source
    target: Target
    meta: Optional[Meta] = None

# ----------------------------------------------------
# Context / Baseline (옵션 입력)

# 정상 기준 데이터
class Baseline(BaseModel):
    known_countries: List[str] = Field(default_factory=list)
    known_devices: List[str] = Field(default_factory=list)
    typical_login_hours: List[int] = Field(default_factory=list)

# 부가 정보 묶음
class AnalyzeContext(BaseModel):
    baseline: Optional[Baseline] = None

# /analyze 요청 전체 포맷
class AnalyzeRequest(BaseModel):
    request_id: Optional[str] = None
    tenant_id: Optional[str] = None
    logs: List[LogEvent]
    context: Optional[AnalyzeContext] = None

# -----------------------------------------------------
# Response (출력 형태)

# 위험 트리거(피처)
class Signal(BaseModel):
    key: str # 내부 규칙명 ex) failed_login_burst
    value: object
    weight: int # 점수 기여도
    reason: str 

# 운영자 권장 조치
class ActionItem(BaseModel):
    action: str
    priority: Literal["P0", "P1", "P2"] # P0:긴급, P1:중요, P2:권장
    why: str

# 정책 근거 문서 조각
class Evidence(BaseModel):
    doc_id: str
    title: str
    section: Optional[str] = None
    page: Optional[int] = None
    quote: Optional[str] = None
    relevance: Optional[float] = None # 관련도 (0~1)

# 점수/등급/결정 요약
class AnalyzeSummary(BaseModel):
    risk_score: int
    risk_level: Literal["LOW", "MED", "HIGH"]
    decision: Literal["ALLOW", "REVIEW", "ESCALATE"]

# 분석 API 최종 응답
class AnalyzeResponse(BaseModel):
    request_id: Optional[str] = None
    summary: AnalyzeSummary
    signals: List[Signal]
    recommended_actions: List[ActionItem]
    evidence: List[Evidence] = Field(default_factory=list)
    debug: Optional[dict] = None