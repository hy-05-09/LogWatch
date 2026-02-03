from __future__ import annotations
from typing import List
from sentence_transformers import SentenceTransformer

class Embedder:
    def __init__(self,model_name: str) :
        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        # returns list of vectors
        vecs = self.model.encode(texts, normalize_embeddings=True)
        return vecs.tolist()
    
    def embed_query(self, q: str) -> List[float]:
        v = self.model.encode([q], normalize_embeddings=True)[0]
        return v.tolist()