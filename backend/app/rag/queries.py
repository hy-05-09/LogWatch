from typing import List
from app.models.schemas import Signal

SIGNAL_TO_QUERY = {
  "failed_login_burst": "authentication failure monitoring, failed login burst threshold, rate limiting, temporary lockout, escalation guidance",
  "new_country": "new country login, geo-velocity, step-up authentication (MFA challenge), verification policy, escalation criteria",
  "night_access": "night access 00:00-06:00, after-hours access review, exception list, escalation conditions",
}

def build_retrieval_queries(signals: List[Signal]) -> List[str]:
    qs = []
    for s in signals:
        q = SIGNAL_TO_QUERY.get(s.key)
        if q:
            qs.append(q)
    
    if not qs:
        qs = ["access log risk assessment criteria and operator response guidance (REVIEW/ESCALATE) policy evidence"]
    seen = set()
    out = []
    for q in qs:
        if q not in seen:
            out.append(q)
            seen.add(q)
    return out