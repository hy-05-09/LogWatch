from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict
import re

from .loaders import RawSection

@dataclass
class Chunk:
    chunk_id: str
    text: str
    metadata: Dict


"""
    MVP용 간단 청킹:
    - 빈 줄 기준 단락 split
    - 단락들을 max_chars 근처로 합치고 overlap 적용
    """
def chunk_text(text: str, max_chars: int = 900, overlap: int = 150) -> List[str]:
    # paras = []
    # for p in re.split(r"\n\s*\n", text):
    #     if p.strip():
    #         paras.append(p.strip())
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paras:
        return []
    
    merged: List[str] = []
    cur = ""

    for p in paras:
        if not cur:
            cur = p
            continue
        if len(cur) + 2 + len(p) <= max_chars:
            cur = cur + "\n\n" + p
        else:
            merged.append(cur)
            cur = p
    
    if cur:
        merged.append(cur)

    if overlap <=0 or len(merged) <= 1:
        return merged
    
    out: List[str] = []
    prev_tail = ""
    for i, m in enumerate(merged):
        if i==0:
            out.append(m)
        else:
            pref = prev_tail[-overlap:] if prev_tail else ""
            out.append((pref + "\n" + m).strip())
        prev_tail = m

    return out

def make_chunks(sections: List[RawSection]) -> List[Chunk]:
    chunks: List[Chunk] = []
    for s_idx, sec in enumerate(sections):
        parts = chunk_text(sec.text)
        for c_idx, part in enumerate(parts):
            chunk_id = f"{sec.doc_id}::s{s_idx}::c{c_idx}"
            meta = {
                "doc_id":sec.doc_id,
                "title":sec.title,
                "section":sec.section,
                "page":sec.page,
                "chunk_id":chunk_id,
            }
            chunks.append(
                Chunk(
                    chunk_id=chunk_id,
                    text=part,
                    metadata=meta,
                )
            )
    return chunks