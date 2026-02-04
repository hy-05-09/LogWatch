from __future__ import annotations
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings

class ChromaStore:
    def __init__(self, persist_dir: str, collection_name: str):
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space":"cosine"},
        )
    
    def reset(self):
        name = self.collection.name
        self.client.delete_collection(name)
        self.collection = self.client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space":"cosine"},
        )
    
    def upsert(
            self, 
            ids: List[str], 
            documents: List[str], 
            metadatas: List[Dict[str, Any]], 
            embeddings: List[List[float]],
        ):
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
            embeddings=embeddings,
        )
        
    def query(self, query_embedding: List[float], top_k: int = 5):
        return self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            include=["documents","metadatas","distances"]
        )