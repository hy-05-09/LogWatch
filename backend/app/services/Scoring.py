from __future__ import annotations
from typing import List, Tuple
from app.models.schemas import Signal, ActionItem, AnalyzeSummary
from app.services.features import ComputedFeatures

# 피처를 기반으로 위험 점수/등급/결정과 signals, recommended_actions 생성
def score_risk(features: ComputedFeatures) -> Tuple[AnalyzeSummary, List[Signal], List[ActionItem]]:
    signals: List[Signal] = []
    actions: List[ActionItem] = []
    score = 0

    # 1) 실패 로그인 폭주 (최근 5분 내 FAIL)
    # - threshold는 3회로 설정
    if features.failed_login_burst_count >= 5:
        w=min(40, 10 * features.failed_login_burst_count)
        score += w
        signals.append(
            Signal(
                key="failed_login_burst",
                value=features.failed_login_burst_count,
                weight=w,
                reason="최근 5분 내 로그인 실패가 반복되어 크리덴셜 스터핑/무차별 대입 가능성이 있습니다.",
            )
        )
        actions.append(
            ActionItem(
                action="해당 계정 임시 잠금 또는 CAPTCHA/Rate limit 적용",
                priority="P0",
                why="짧은 시간 내 반복 실패는 자동화 공격 가능성이 높습니다.",
            )
        )


    # 2) 야간 접속
    if features.night_access:
        w = 15
        score += w
        signals.append(
            Signal(
                key="night_access",
                value=True,
                weight=w,
                reason="야간 시간대 접속은 평소 패턴과 다를 수 있어 추가 확인이 필요합니다.",
            )
        )
        actions.append(
            ActionItem(
                action="해당 세션/계정의 최근 활동 로그 추가 점검",
                priority="P2",
                why="야간 접속이 정상 업무인지 확인하면 오탐을 줄일 수 있습니다.",
            )
        )

    # 3) 신규 국가 접속
    if features.new_country:
        w = 25
        score += w
        signals.append(
            Signal(
                key="new_country",
                value=True,
                weight=w,
                reason="기존에 관측되지 않은 국가에서 접속하여 계정 탈취 가능성이 있습니다.",
            )
        )
        actions.append(
            ActionItem(
                action="MFA 재인증 요구 또는 비밀번호 변경 유도",
                priority="P1",
                why="신규 지역 로그인은 2차 인증/재인증으로 방어 효과가 큽니다.",
            )
        )
    
    # 4) 새 기기 접속
    if getattr(features, "new_device", False):
        w = 20
        score += w
        signals.append(
            Signal(
                key="new_device",
                value=True,
                weight=w,
                reason="기존에 관측되지 않은 기기에서 로그인하여 기기 탈취/세션 하이재킹 가능성이 있습니다.",
            )
        )
        actions.append(
            ActionItem(
                action="Step-up 인증(MFA) 요구 또는 해당 세션 종료 + 사용자 out-of-band 확인",
                priority="P1",
                why="신규 기기 로그인은 추가 인증으로 계정 탈취 피해를 크게 줄일 수 있습니다.",
            )
        )

    risk_level = _risk_level(score)
    decision = _decision(risk_level)

    summary = AnalyzeSummary(
        risk_score=score,
        risk_level=risk_level,
        decision=decision,
    )

    return summary, signals, actions

# 점수 합산 결과를 LOW/MED/HIGH로 구간화
def _risk_level(score: int) -> str:
    if score >= 60:
        return "HIGH"
    if score >= 30:
        return "MED"
    return "LOW"

# 위험 등급을 운영 액션으로 매핑
def _decision(risk_level: str) -> str:
    if risk_level == "HIGH":
        return "ESCALATE"
    if risk_level == "MED":
        return "REVIEW"
    return "ALLOW"