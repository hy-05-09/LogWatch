from __future__ import annotations
from .config import POLICY_DIR, VECTORSTORE_DIR, CHROMA_COLLECTION, EMBEDDING_MODEL_NAME
from .loaders import load_policies
from .chunking import make_chunks
from .embedder import Embedder
from .chroma_store import ChromaStore

def main(reset: bool = True):
    VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)

    print(f"[build_index] policy_dir = {POLICY_DIR}")
    sections = load_policies(POLICY_DIR)
    print(f"[build_index] loaded sections = {len(sections)}")

    chunks = make_chunks(sections)
    print(f"[build_index] total chunks = {len(chunks)}")

    if not chunks:
        print("[build_index] no chunks to index. abort.")
        return
    
    embedder = Embedder(EMBEDDING_MODEL_NAME)
    store = ChromaStore(str(VECTORSTORE_DIR), CHROMA_COLLECTION)

    if reset:
        print("[build_index] reset chroma collection")
        store.reset()

    texts = [c.text for c in chunks]
    ids = [c.chunk_id for c in chunks]
    metas = [c.metadata for c in chunks]

    print("[build_index] embedding...")
    vecs = embedder.embed_texts(texts)

    print("[build_index] upsert to chroma...")
    store.upsert(ids=ids, documents=texts, metadatas=metas, embeddings=vecs)

    print("[build_index] done.")
    print(f"[build_index] persist_dir = {VECTORSTORE_DIR}")
    print(f"[build_index] collection = {CHROMA_COLLECTION}")

# 파일을 직접 실행했을 때만 실행
if __name__ == "__main__":
    main(reset=True)