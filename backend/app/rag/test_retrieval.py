from __future__ import annotations
from .config import VECTORSTORE_DIR, CHROMA_COLLECTION, EMBEDDING_MODEL_NAME
from .embedder import Embedder
from .chroma_store import ChromaStore

def pretty_hit(i: int, doc: str, meta: dict, dist: float):
    print(f"\n[{i}] dist={dist:.4f}")
    print(f"  title   : {meta.get('title')}")
    print(f"  doc_id  : {meta.get('doc_id')}")
    print(f"  section : {meta.get('section')}")
    print(f"  page    : {meta.get('page')}")
    print(f"  chunk_id: {meta.get('chunk_id')}")
    print("  ---- text ----")
    print(doc[:500].replace("\n", " "))
    print("  -------------")

def run_queries():
    embedder = Embedder(EMBEDDING_MODEL_NAME)
    store = ChromaStore(str(VECTORSTORE_DIR), CHROMA_COLLECTION)

    queries = [
        "recent 5 minutes failed login attempts threshold",
        "access from new country verification required",
        "night access 00:00 to 06:00 review escalate guidance",
    ]

    for q in queries:
        print("\n" + "="*80)
        print(f"QUERY: {q}")
        qv = embedder.embed_query(q)
        res = store.query(qv, top_k=5)

        docs = res["documents"][0]
        metas = res["metadatas"][0]
        dists = res["distances"][0]

        for i, (doc, meta, dist) in enumerate(zip(docs, metas, dists), 1):
            pretty_hit(i, doc, meta, dist)



# 파일을 직접 실행했을 때만 실행
if __name__ == "__main__":
    run_queries()
