from fastapi import FastAPI
from app.api.routes_analyze import router as analyze_router
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes_policies import router as policies_router

app = FastAPI(title="LogWatch AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status":"ok"}

app.include_router(analyze_router, prefix="/api")
app.include_router(policies_router)
