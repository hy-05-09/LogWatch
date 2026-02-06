from __future__ import annotations

from typing import List
from langchain_core.documents import Document

from app.rag.loaders import load_policies
from app.rag.chunking import make_chunks
from app.rag.config import POLICY_DIR

def build_policy_documents() -> List[Document]:
    """
    정책 문서를 로딩 -> 청킹 -> LangChain Document로 변환
    BM25Retriever에서 사용.
    """
    sections = load_policies(POLICY_DIR)
    chunks = make_chunks(sections)

    docs: List[Document] = []
    for c in chunks:
        docs.append(
            Document(
                page_content=c.text,
                metadata=c.metadata or {},
            )
        )
    return docs
