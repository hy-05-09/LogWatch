from fastapi import FastAPI
# from app.api.routes_analyze import router as analyze_router

app = FastAPI(title="LogWatch AI", version="0.1.0")


@app.get("/health")
def health():
    return {"status":"ok"}

# app.include_router(analyze_router, prefix="/api")