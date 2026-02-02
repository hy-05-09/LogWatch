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
### 3) 서버 실행
```powershell
python -m uvicorn app.main:app --reload --port 8000
```

## API Docs / Health Check
Swagger UI: http://127.0.0.1:8000/docs
Health: http://127.0.0.1:8000/health

## Demo: Sample Requests
샘플 입력 파일:
app/data/samples/low.json → 정상(LOW, ALLOW)
app/data/samples/med.json → 경고(MED, REVIEW)
app/data/samples/high.json → 심각(HIGH, ESCALATE)

## Swagger에서 테스트
1. /docs 접속
2. POST /api/analyze → Try it out
3. 위 샘플 JSON 내용을 붙여넣고 Execute

## Output Schema (Summary)
- summary
    risk_score (int)
    risk_level ("LOW" | "MED" | "HIGH")
    decision ("ALLOW" | "REVIEW" | "ESCALATE")
- signals[]: 어떤 피처가 위험 트리거인지
- recommended_actions[]: 운영자가 취해야 할 조치 목록
- evidence[]: (추후 RAG 단계에서 추가)