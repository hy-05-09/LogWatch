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