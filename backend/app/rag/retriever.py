from __future__ import annotations
from typing import List, Optional, Dict, Any, Tuple
from app.models.schemas import Evidence
from app.rag.config import (
    VECTORSTORE_DIR,
    CHROMA_COLLECTION,
    RETRIEVAL_TOP_K,
    RETRIEVAL_DISTANCE_THRESHOLD,
    EVIDENCE_SNIPPET_MAX_CHARS,
)
from app.rag.embedder import Embedder
from app.rag.chroma_store import ChromaStore

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
        seen.append(e.chunk_id)
    return out

class PolicyRetriever:
    def __init__(self, *, top_k= RETRIEVAL_TOP_K, distance_threshold = RETRIEVAL_DISTANCE_THRESHOLD, embed_model_name: Optional[str] = None):
        self.top_k = top_k
        self.distance_threshold = distance_threshold
        self.embedder = Embedder(model_name=embed_model_name) if embed_model_name else Embedder()
        self.store = ChromaStore(persist_dir=VECTORSTORE_DIR, collection_name=CHROMA_COLLECTION)

    def retrieve(self, queries) -> Tuple[List[Evidence], Dict[str, Any]]:
        """
        Returns:
          - evidence list
          - debug meta (for logging / future UI)
        """
        all_hits: List[Evidence] = []
        debug: Dict[str, Any] = {"quereis": queries, "threshold":self.distance_threshold}

        for q in queries:
            q_emb = self.embedder.embed_query(q)
            res = self.store.query(query_embedding=q_emb, top_k=self.top_k)

            documents = (res.get("documents") or [[]])[0]
            metadatas = (res.get("metadatas") or [[]])[0]
            distances = (res.get("distances") or [[]])[0]

            for doc_text, meta, dist in zip(documents, metadatas, distances):
                if dist is None or dist > self.distance_threshold:
                    continue

                meta = meta or {}
                all_hits.append(
                    Evidence(
                        title=meta.get("title") or meta.get("doc_id") or "unknown",
                        doc_id=meta.get("doc_id") or "unknown",
                        section=meta.get("section"),
                        page=meta.get("page"),
                        chunk_id=meta.get("chunk_id") or meta.get("id") or "unknown",
                        quote=_snip(doc_text, EVIDENCE_SNIPPET_MAX_CHARS),
                        distance=float(dist),
                    )
                )

                
        all_hits = _dedupe_evidence(all_hits)
        all_hits.sort(key=lambda e: (e.distance if e.distance is not None else 9999.0))
        return all_hits, debug
