from __future__ import annotations
from .config import VECTORSTORE_DIR, CHROMA_COLLECTION, EMBEDDING_MODEL_NAME, RETRIEVAL_TOP_K
from .embedder import Embedder
from .chroma_store import ChromaStore
from .queries import SIGNAL_TO_QUERY

# 위험 신호별로 1순위에 와야 하는 정책 청크
EXPECTED_TOP1 = {
    "failed_login_burst": "access_policy::s0::c0",   # Authentication Failure Monitoring
    "new_country":        "access_policy::s1::c0",   # New Country / Geo-velocity
    "night_access":       "access_policy::s2::c0",   # Night Access (00:00-06:00)
    "new_device":         "access_policy::s3::c0",   # New Device / Device Mismatch
}


def pretty_hit(i: int, meta: dict, dist: float):
    print(f"    [{i}] dist={dist:.4f}  {meta.get('chunk_id')}  ({meta.get('section')})")


def run_queries(top_k: int = RETRIEVAL_TOP_K, verbose: bool = True):
    embedder = Embedder(EMBEDDING_MODEL_NAME)
    store = ChromaStore(str(VECTORSTORE_DIR), CHROMA_COLLECTION)

    results = []

    for signal, expected in EXPECTED_TOP1.items():
        query = SIGNAL_TO_QUERY[signal]

        qv = embedder.embed_query(query)
        res = store.query(qv, top_k=top_k)

        metas = res["metadatas"][0]
        dists = res["distances"][0]

        top1_chunk = (metas[0] or {}).get("chunk_id")
        top1_section = (metas[0] or {}).get("section")
        ok = (top1_chunk == expected)
        gap = dists[1] - dists[0] if len(dists) > 1 else None

        results.append({
            "signal": signal,
            "ok": ok,
            "top1": top1_chunk,
            "section": top1_section,
            "dist": dists[0],
            "gap": gap,
        })

        print("\n" + "=" * 78)
        print(f"SIGNAL : {signal}")
        print(f"QUERY  : {query}")
        print(f"RESULT : {'PASS' if ok else 'FAIL'}  ->  {top1_chunk}  ({top1_section})")
        if not ok:
            print(f"         expected {expected}")
        if verbose:
            for i, (meta, dist) in enumerate(zip(metas, dists), 1):
                pretty_hit(i, meta or {}, dist)

    # 요약
    print("\n" + "=" * 78)
    print("SUMMARY")
    print(f"{'signal':<22}{'top-1':<8}{'dist':<10}{'gap to #2':<12}section")
    print("-" * 78)
    for r in results:
        gap = f"{r['gap']:.4f}" if r["gap"] is not None else "-"
        print(f"{r['signal']:<22}{'PASS' if r['ok'] else 'FAIL':<8}{r['dist']:<10.4f}{gap:<12}{r['section']}")

    passed = sum(1 for r in results if r["ok"])
    print("-" * 78)
    print(f"{passed}/{len(results)} signals returned the intended policy section at rank 1")

    return results


# 파일을 직접 실행했을 때만 실행
if __name__ == "__main__":
    run_queries()