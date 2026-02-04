from pathlib import Path

# base dirs
APP_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = APP_DIR / "data"
POLICY_DIR = DATA_DIR / "policies"

# chroma persist
VECTORSTORE_DIR = DATA_DIR / "vectorstore" / "chroma"
CHROMA_COLLECTION = "policies"

# embeddings
EMBEDDING_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Retrieval defaults
RETRIEVAL_TOP_K = 5

# Chroma cosine distance 기준 (작을수록 유사)
RETRIEVAL_DISTANCE_THRESHOLD = 0.85

# evidence snippet 길이 제한
EVIDENCE_SNIPPET_MAX_CHARS = 350