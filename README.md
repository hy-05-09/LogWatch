# LogWatch AI (LogWatch Studio)

**접근/인증 로그 기반 보안 의사결정 보조 AI Agent**  
로그(JSON)를 입력하면 **위험도(점수/등급/결정)** 를 산출하고, **정책/플레이북 문서를 RAG로 검색**해 근거(Evidence)와 권장 조치를 함께 제시합니다.

- Team: LogWatch Studio  
- Member: 정혜윤(1인) — PM/기획, Frontend, Backend/AI(RAG), Demo 설계

---

## Why (문제 정의)

대기업·금융기관·공공기관 환경에서는 하루에도 수많은 접근 로그와 보안 이벤트가 발생합니다.  
하지만 모든 이벤트가 위협은 아니며, 운영자는 제한된 시간 안에 **이벤트의 위험성/조치 필요성**을 판단해야 합니다.

기존 시스템은 이벤트를 단순 나열하거나 경고만 제공하는 경우가 많아,
운영자가 정책 문서를 직접 찾아 근거를 확인해야 하고, 이 과정에서 **판단 편차/과잉 대응**이 발생할 수 있습니다.

**LogWatch**는 “판단 + 근거 + 조치”를 한 흐름으로 제공해 **빠르고 일관된 1차 분류**를 돕는 것을 목표로 합니다.

---

## What (핵심 기능)

### 1) Risk Scoring & Decision
- 신호 추출: `failed_login_burst`, `night_access`, `new_country`, `new_device`
- 가중치 합산 → `risk_score` 계산
- 구간화: `LOW / MED / HIGH`
- 운영 결정: `ALLOW / REVIEW / ESCALATE`
- 즉시 조치 추천: 계정 잠금, Rate limit, MFA 재인증, 세션 종료 등

### 2) RAG Evidence (정책 근거 제시)
- 정책/플레이북 문서를 청킹 → 임베딩 → **Chroma Vectorstore** 구축
- signals → retrieval query로 변환 후 Evidence 검색
- Evidence에는 `title/doc_id/section/page/chunk_id/quote/distance` 포함

### 3) Retrieval Mode Toggle (Vector vs Hybrid)
- `vector`: Chroma 유사도 검색
- `hybrid`: BM25 + Vector Ensemble (재현성 비교/검색품질 개선 목적)
- UI에서 토글로 전환하여 **근거 구성/개수 차이**를 비교 가능

### 4) Guardrail (근거 없는 Escalation 방지)
- Evidence가 없으면 추측 기반 `ESCALATE`를 금지 → `REVIEW`로 완화
- UI에서 debug로 완화 여부를 확인 가능

### 5) React UI Demo
- Overview / Signals & Actions / Evidence 탭
- 검색/필터/정렬
- Evidence에서 정책 **PDF 원문 페이지 열람**(모달/새 탭)

---

## Architecture

## Tech Stack
- Backend: FastAPI, Pydantic, Uvicorn
- RAG/Retrieval: Chroma, sentence-transformers (all-MiniLM-L6-v2), BM25, EnsembleRetriever
- Frontend: React + TypeScript (Vite)

## Quickstart (Local Demo)
1) Backend
```
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 정책 인덱스 생성/갱신
python -m app.rag.build_index

# 서버 실행
python -m uvicorn app.main:app --reload --port 8000
```

- Swagger: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

2) Frontend
```
cd frontend
npm install
npm run dev
```

- UI:  http://127.0.0.1:5173


## Design Notes / Assumptions

- 현재 점수화는 룰 기반 MVP이며, 실제 운영에서는 조직 정책/로그 데이터 기반 튜닝이 필요합니다.
- Hybrid 모드에서 일부 BM25-only 결과는 vector distance가 없을 수 있으며(distance=None), debug로 추적합니다.
- 정책 문서가 변경되면 인덱스 재생성이 필요합니다.


## Limitations & Next Steps

- 검색 품질 튜닝: chunking 전략/threshold/ensemble weight 최적화, 평가셋 구축
- 결과 저장 및 히스토리: 분석 결과 저장/추적성 강화
- 배포: Docker/Cloud 배포 및 공개 데모 링크 제공

## Links
- YouTube Demo Video: https://youtu.be/CemdE8yQkoc?si=VMU0mWzulxWgPVJF