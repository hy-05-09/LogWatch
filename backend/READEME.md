# LogWatch AI — Backend (FastAPI)

접근/인증 로그(JSON)를 입력받아 **위험도 점수·등급·운영결정(ALLOW/REVIEW/ESCALATE)** 을 산출하고,  
정책/플레이북 문서를 **RAG로 검색**해 근거(Evidence)와 권장 조치를 함께 반환하는 API 서버입니다.

---

## Features

- **Risk Scoring**
  - 최근 5분 내 로그인 실패 폭주(failed_login_burst)
  - 야간 접속(00~05시, night_access)
  - 신규 국가(new_country), 신규 디바이스(new_device)
  - 신호별 가중치 합산 → `risk_score`, `risk_level`, `decision` 산출
- **RAG Evidence**
  - 정책 문서(텍스트/PDF)를 청킹 → 임베딩 → **Chroma Vectorstore**에 저장
  - signals → retrieval queries 생성 후 Evidence 검색
  - **Retrieval Mode**
    - `vector`: Chroma 유사도 검색
    - `hybrid`: BM25 + Vector **EnsembleRetriever**
- **Guardrail**
  - Evidence가 0개인데 `ESCALATE`이면 **추측 기반 escalation 금지** → `REVIEW`로 완화
- **Policy File Serving**
  - `/api/policies/{filename}`로 원문(PDF/텍스트) 서빙
  - `filename`에 `/`, `\`, `..` 포함 시 차단하여 **Path Traversal 방지**

---

## Prerequisites

- Python 3.10+ 권장 (가상환경 사용)
- Windows PowerShell 기준 안내

---

## Setup & Run

### 1) 가상환경 생성/활성화 (Windows PowerShell)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2) 의존성 설치
```powershell
pip install -r requirements.txt
```

### 3) 정책 문서 인덱스 생성/갱신
```
python -m app.rag.build_index
```

### 4) 서버 실행
```powershell
python -m uvicorn app.main:app --reload --port 8000
```

## API Docs / Health Check
Swagger UI: http://127.0.0.1:8000/docs
Health: http://127.0.0.1:8000/health

## Key Endpoints
### POST /api/analyze
입력 로그를 분석해 점수/판단/신호/조치/근거를 반환합니다.
- Request: AnalyzeRequest
-   logs[]: 로그 이벤트 리스트
-   context.baseline: 정상 기준(known_countries, known_devices, typical_login_hours)
-   context.retrieval_mode: "vector" | "hybrid"

- Response: AnalyzeResponse
-   summary: risk_score / risk_level / decision
-   signals[]: 트리거 신호(key/value/weight/reason)
-   recommended_actions[]: 운영 조치(action/priority/why)
-   evidence[]: 근거 조각(doc_id/title/section/page/chunk_id/quote/distance)
-   debug: 검색 mode, evidence_count, guardrail 등

### GET /api/policies/{filename}
정책 원문 파일을 반환합니다(PDF는 inline 표시).
- 보안: /, \, .. 포함 filename 요청 차단 (Path Traversal 방지)

## Demo: Sample Requests
샘플 입력 파일:
app/data/samples/low.json → 정상(LOW, ALLOW)
app/data/samples/med.json → 경고(MED, REVIEW)
app/data/samples/high.json → 심각(HIGH, ESCALATE)

## Swagger에서 테스트
1. /docs 접속
2. POST /api/analyze → Try it out
3. 위 샘플 JSON 내용을 붙여넣고 Execute

## Notes / Assumptions
현재 점수화 규칙은 데모용 룰 기반이며, 실제 운영 환경에서는 조직 정책/과거 데이터 기반 튜닝이 필요합니다.
Hybrid 모드에서 일부 BM25-only 결과는 vector distance가 없을 수 있으며(distance=None), debug에 coverage를 남깁니다.