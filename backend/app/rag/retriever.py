from __future__ import annotations
from typing import List, Optional, Dict, Any, Tuple
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from app.models.schemas import Evidence
from app.rag.config import (
    VECTORSTORE_DIR,
    CHROMA_COLLECTION,
    RETRIEVAL_TOP_K,
    RETRIEVAL_DISTANCE_THRESHOLD,
    EVIDENCE_SNIPPET_MAX_CHARS,
    EMBEDDING_MODEL_NAME,
    RRF_C,
)
from app.rag.lc_docs import build_policy_documents


# evidence snippet 길이 잘라주는 유틸
def _snip(text: str, max_chars: int) -> str:
    t = (text or "").strip()
    if len(t) <= max_chars:
        return t
    return t[:max_chars-3].rstrip() + "..."


def _rank_map(docs: List[Document]) -> Dict[str, int]:
    """문서 리스트 -> {chunk_id: 1-based rank}. 같은 chunk가 여러 번 나오면 첫 등수 유지."""
    out: Dict[str, int] = {}
    for i, d in enumerate(docs, start=1):
        cid = (d.metadata or {}).get("chunk_id")
        if cid and cid not in out:
            out[cid] = i
    return out


def _sort_key(e: Evidence) -> float:
    """distance가 없으면 맨 뒤로."""
    return e.distance if e.distance is not None else 9999.0


# chunk_id 기준 중복 Evidence 제거 (같은 chunk면 더 강하게 매칭된 쪽을 유지)
def _dedupe_evidence(items: List[Evidence]) -> List[Evidence]:
    best: Dict[str, Evidence] = {}
    order: List[str] = []
    for e in items:
        cur = best.get(e.chunk_id)
        if cur is None:
            best[e.chunk_id] = e
            order.append(e.chunk_id)
            continue
        # rrf_score 우선, 없으면(vector 모드) 더 가까운 쪽
        cur_key = (cur.rrf_score or 0.0, -_sort_key(cur))
        new_key = (e.rrf_score or 0.0, -_sort_key(e))
        if new_key > cur_key:
            best[e.chunk_id] = e
    return [best[c] for c in order]


def _dedupe_by_section(items: List[Evidence]) -> List[Evidence]:
    seen = set()
    out = []
    for e in items:
        key = (e.doc_id, e.section)
        if key in seen:
            continue
        out.append(e)
        seen.add(key)
    return out


def _doc_to_evidence(
    doc: Document,
    *,
    distance: Optional[float] = None,
    rrf_score: Optional[float] = None,
    bm25_rank: Optional[int] = None,
    vector_rank: Optional[int] = None,
) -> Evidence:
    meta = doc.metadata or {}
    return Evidence(
        title=meta.get("title") or meta.get("doc_id") or "unknown",
        doc_id=meta.get("doc_id") or "unknown",
        section=meta.get("section"),
        page=meta.get("page"),
        chunk_id=meta.get("chunk_id") or "unknown",
        quote=_snip(doc.page_content, EVIDENCE_SNIPPET_MAX_CHARS),
        distance=distance,
        rrf_score=rrf_score,
        bm25_rank=bm25_rank,
        vector_rank=vector_rank,
    )


class PolicyRetriever:
    """
    LangChain 기반 Retriever 레이어.
    - mode="vector": Chroma(Vector)만 사용 -> distance 오름차순 정렬
    - mode="hybrid": BM25 + Vector Ensemble -> RRF 융합 점수 내림차순 정렬
    """
    def __init__(self,
                *, mode: str = "vector",
                top_k: int = RETRIEVAL_TOP_K,
                distance_threshold: float = RETRIEVAL_DISTANCE_THRESHOLD,
                embed_model_name: Optional[str] = None,
                ensemble_weights: Tuple[float, float] = (0.4, 0.6),
                enable_threshold: bool = False,
                ):
        self.mode = mode
        self.top_k = top_k
        self.distance_threshold = distance_threshold
        self.enable_threshold = enable_threshold
        self.ensemble_weights = ensemble_weights

        model_name = embed_model_name or EMBEDDING_MODEL_NAME
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)

        # Vectorstore
        self.vs = Chroma(
            collection_name=CHROMA_COLLECTION,
            persist_directory=str(VECTORSTORE_DIR),
            embedding_function=self.embeddings,
        )

        # Vector retriever
        self.vector_retriever = self.vs.as_retriever(search_kwargs={"k": self.top_k})

        # Hybrid : BM25 + Ensemble
        self.bm25_retriever: Optional[BM25Retriever] = None
        self.ensemble: Optional[EnsembleRetriever] = None

        if self.mode == "hybrid":
            policy_docs = build_policy_documents()

            bm25 = BM25Retriever.from_documents(policy_docs)
            bm25.k = self.top_k
            self.bm25_retriever = bm25

            w_bm25, w_vec = self.ensemble_weights
            self.ensemble = EnsembleRetriever(
                retrievers=[bm25, self.vector_retriever],
                weights=[w_bm25, w_vec]
            )

    def _vector_score_map(self, query: str, k: int) -> Dict[str, float]:
        """
        Chroma에서 query에 대한 결과를 score(distance) 포함으로 가져와
        {chunk_id: distance} 맵으로 만든다.
        - distance: 작을수록 유사
        """
        pairs = self.vs.similarity_search_with_score(query, k=k)
        out: Dict[str, float] = {}
        for doc, dist in pairs:
            cid = (doc.metadata or {}).get("chunk_id")
            if cid:
                # 더 작은 dist가 더 좋은 결과이므로, 최소값 유지
                out[cid] = min(out.get(cid, float("inf")), float(dist))
        return out

    def _vector_hits_with_optional_score(
            self, query: str
    ) -> Tuple[List[Document], Optional[List[float]]]:
        """
        score(거리/유사도)를 함께 받는 기능.
        enable_threshold=False면 안정적으로 docs만 가져온다.
        """
        if not self.enable_threshold:
            docs = self.vs.similarity_search(query, k=self.top_k)
            return docs, None

        # score 포함 검색
        pairs = self.vs.similarity_search_with_score(query, k=self.top_k)
        docs = [d for d, _ in pairs]
        scores = [float(s) for _, s in pairs]
        return docs, scores

    def retrieve(self, queries: List[str]) -> Tuple[List[Evidence], Dict[str, Any]]:
        """
        Returns:
          - evidence list
          - debug meta (for logging / future UI)
        """
        all_hits: List[Evidence] = []
        debug: Dict[str, Any] = {
            "mode": self.mode,
            "queries": queries,
            "top_k": self.top_k,
            "enable_threshold": self.enable_threshold,
            "threshold": self.distance_threshold,
            }

        # --------------------------
        # VECTOR ONLY
        # --------------------------
        if self.mode == "vector":
            per_query = []
            for q in queries:
                docs, scores = self._vector_hits_with_optional_score(q)

                evs: List[Evidence] = []
                if scores is None:
                    for d in docs:
                        evs.append(_doc_to_evidence(d, distance=None))
                else:
                    for d, s in zip(docs, scores):
                        if s is None:
                            continue
                        if s > self.distance_threshold:
                            continue
                        evs.append(_doc_to_evidence(d, distance=float(s)))

                per_query.append({"q": q, "hits": len(evs)})
                all_hits.extend(evs)
            debug["vector"] = {"per_query": per_query}

        # -------------------------
        # HYBRID (BM25 + VECTOR)
        # -------------------------
        else:
            if self.ensemble is None or self.bm25_retriever is None:
                raise RuntimeError("Hybrid mode requires bm25_retriever and ensemble to be initialized.")

            bm25_counts = []
            vec_counts = []
            w_bm25, w_vec = self.ensemble_weights

            for q in queries:
                bm25_docs = self.bm25_retriever.invoke(q)
                bm25_counts.append({"q": q, "hits": len(bm25_docs)})

                vec_docs, _ = self._vector_hits_with_optional_score(q)
                vec_counts.append({"q": q, "hits": len(vec_docs)})

                score_map = self._vector_score_map(q, k=self.top_k)

                # 검색기별 등수 맵 (RRF 계산용)
                bm25_ranks = _rank_map(bm25_docs)
                vec_ranks = _rank_map(vec_docs)

                ens_docs = self.ensemble.invoke(q)
                for d in ens_docs:
                    cid = (d.metadata or {}).get("chunk_id")
                    dist = score_map.get(cid) if cid else None

                    rb = bm25_ranks.get(cid) if cid else None
                    rv = vec_ranks.get(cid) if cid else None

                    # RRF: 점수가 아니라 등수로 융합한다. 없는 항은 생략.
                    rrf = 0.0
                    if rb is not None:
                        rrf += w_bm25 / (RRF_C + rb)
                    if rv is not None:
                        rrf += w_vec / (RRF_C + rv)

                    all_hits.append(_doc_to_evidence(
                        d,
                        distance=dist,
                        rrf_score=rrf if rrf > 0 else None,
                        bm25_rank=rb,
                        vector_rank=rv,
                    ))

            debug["hybrid"] = {
                "weights": list(self.ensemble_weights),
                "rrf_c": RRF_C,
                "bm25_per_query": bm25_counts,
                "vector_per_query": vec_counts,
            }

            with_dist = sum(1 for e in all_hits if e.distance is not None)
            debug["hybrid"]["distance_coverage"] = f"{with_dist}/{len(all_hits)}"

        # 공통 후처리
        all_hits = _dedupe_evidence(all_hits)

        if self.mode == "hybrid":
            # 융합 점수 내림차순, 동점이면 더 가까운 근거 우선
            all_hits.sort(key=lambda e: (-(e.rrf_score or 0.0), _sort_key(e)))
        else:
            all_hits.sort(key=_sort_key)

        debug["evidence_count"] = len(all_hits)

        if self.mode == "hybrid":
            debug["hybrid"]["top_contrib"] = [
                {
                    "chunk_id": e.chunk_id,
                    "bm25_rank": e.bm25_rank,
                    "vector_rank": e.vector_rank,
                    "rrf": round(e.rrf_score, 6) if e.rrf_score is not None else None,
                    "distance": e.distance,
                }
                for e in all_hits[:5]
            ]

        all_hits = _dedupe_by_section(all_hits)
        return all_hits, debug