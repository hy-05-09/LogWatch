from __future__ import annotations
from typing import List, Optional, Dict, Any, Tuple
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_classic.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.documents import Document
from app.models.schemas import Evidence
from app.rag.config import (
    VECTORSTORE_DIR,
    CHROMA_COLLECTION,
    RETRIEVAL_TOP_K,
    RETRIEVAL_DISTANCE_THRESHOLD,
    EVIDENCE_SNIPPET_MAX_CHARS,
    EMBEDDING_MODEL_NAME
)
from app.rag.lc_docs import build_policy_documents
# from app.rag.embedder import Embedder
# from app.rag.chroma_store import ChromaStore

# evidence snippet 길이 잘라주는 유틸
def _snip(text: str, max_chars: int) -> str:
    t = (text or "").strip()
    if len(t) <= max_chars:
        return t
    return t[:max_chars-3].rstrip() + "..."

# chunk_id  기준 중복 Evidence 제거
def _dedupe_evidence(items: List[Evidence]) -> List[Evidence]:
    seen = set()
    out = []
    for e in items:
        if e.chunk_id in seen:
            continue
        out.append(e)
        seen.add(e.chunk_id)
    return out

def _doc_to_evidence(doc: Document, *, distance: Optional[float] = None) -> Evidence:
    meta = doc.metadata or {}
    return Evidence(
        title=meta.get("title") or meta.get("doc_id") or "unknown",
        doc_id=meta.get("doc_id") or "unknown",
        section=meta.get("section"),
        page=meta.get("page"),
        chunk_id=meta.get("chunk_id") or "unknown",
        quote=_snip(doc.page_content, EVIDENCE_SNIPPET_MAX_CHARS),
        distance=distance,
    )

class PolicyRetriever:
    """
    LangChain 기반 Retriever 레이어.
    - mode="vector": Chroma(Vector)만 사용
    - mode="hybrid": BM25 + Vector Ensemble 사용 (classic EnsembleRetriever)
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
        self.vector_retriever = self.vs.as_retriever(search_kwargs={"k":self.top_k})

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
            "threshold":self.distance_threshold,
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
                
                per_query.append({"q":q, "hits": len(evs)})
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

            for q in queries:
                bm25_docs = self.bm25_retriever.invoke(q)
                bm25_counts.append({"q":q, "hits": len(bm25_docs)})

                vec_docs, _ = self._vector_hits_with_optional_score(q)
                vec_counts.append({"q":q, "hits":len(vec_docs)})

                ens_docs = self.ensemble.invoke(q)
                for d in ens_docs:
                    all_hits.append(_doc_to_evidence(d, distance=None))

            debug["hybrid"] = {
                "weights": list(self.ensemble_weights),
                "bm25_per_query": bm25_counts,
                "vector_per_query": vec_counts,
            }


        # 공통 후처리       
        all_hits = _dedupe_evidence(all_hits)
        all_hits.sort(key=lambda e: (e.distance if e.distance is not None else 9999.0))

        debug["evidence_count"] = len(all_hits)
        return all_hits, debug
