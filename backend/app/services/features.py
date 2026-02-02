from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional
from app.models.schemas import LogEvent, Baseline

# 로그 ts 문자열을 datetime(UTC)로 변환
def _parse_ts(ts: str) -> datetime:
    if ts.endswith("Z"):
        ts = ts.replace("Z", "+00:00")
    return datetime.fromisoformat(ts).astimezone(timezone.utc)

# 로그에서 추출한 피처 결과를 담는 컨테이너
@dataclass
class ComputedFeatures:
    failed_login_burst_count: int
    night_access: bool
    new_country: bool

# LogEvent에 대해 위험 신호 피처 계산
def extract_features(logs: List[LogEvent], baseline:Optional[Baseline]) -> ComputedFeatures:
    if not logs: 
        return  ComputedFeatures(0, False, False)
    
    logs_sorted = sorted(logs, key=lambda x: _parse_ts(x.ts))
    latest = logs_sorted[-1] # 마지막 로그 가져오기
    latest_dt = _parse_ts(latest.ts)

    window_seconds = 5 * 60 # 5분
    burst_fail = 0
    for e in reversed(logs_sorted):
        dt = _parse_ts(e.ts)
        if (latest_dt - dt).total_seconds() > window_seconds:
            break
        if e.action.upper() == "LOGIN" and e.result == "FAIL":
            burst_fail += 1

    hour = latest_dt.hour
    night = 0 <= hour <= 5

    new_country = False
    if baseline and latest.source.country:
        new_country = latest.source.country not in set(baseline.known_countries)

    return ComputedFeatures(
        failed_login_burst_count=burst_fail,
        night_access=night,
        new_country=new_country
    )