from __future__ import __annotations__
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Dict, Iterable, Tuple 

from pypdf import PdfReader

@dataclass
class RawSection:
    doc_id: str
    title: str
    section: str
    page: Optional[int]
    text: str

# 확장자 뺀 파일명 생성
def _doc_id_from_path(p: Path) -> str:
    return p.stem

# 텍스트 파일 읽고 섹션 리스트 생성
## #로 시작하는 줄을 만나면 섹션 경계로 인식 후 이전 buffer flush
def load_text_file(path: Path) -> List[RawSection]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    title = path.name
    doc_id = _doc_id_from_path(path)
    sections: List[RawSection] = []
    current_section = "root"
    buffer: List[str] = []

    def flush():
        nonlocal current_section, buffer
        chunk ="\n".join(buffer).strip()
        if chunk:
            sections.append(
                RawSection(
                    doc_id=doc_id,
                    title=title,
                    section=current_section,
                    page=None,
                    text=chunk,
                )
            )
        burffer = []
    
    for line in text.splitlines():
        ls = line.strip()
        if ls.startswith("#"):
            flush()
            current_section = ls.strip("#").strip()[:120] or "heading"
        else:
            buffer.append(line)
    
    flush()

    return sections

# pdf 파일 읽고 섹션 리스트 생성
## 각 페이지의 extract_text 결과를 묶어 저장
def load_pdf_file(path: Path) -> List[RawSection]:
    reader = PdfReader(str(path))
    title = path.name
    doc_id = _doc_id_from_path(path)

    sections: List[RawSection] = []
    for i, page in enumerate(reader.pages):
        page_text = (page.extract_text() or "").strip()
        sections.append(
            RawSection(
                doc_id=doc_id,
                title=title,
                section=f"page{i+1}",
                page=i+1,
                text=page_text,
            )
        )

    return sections

# policies 폴더 전체를 스캔하여 확장자별로 관련 정보 가져오기
def load_policies(policy_dir: Path) -> List[RawSection]:
    if not policy_dir.exists():
        raise FileExistsError(f"Policy dir not found: {policy_dir}")
    
    out: List[RawSection] = []
    for p in sorted(policy_dir.glob("*")):
        if p.is_dir:
            continue
        ext = p.suffix.lower()
        if ext in [".txt", ".md"]:
            out.extend(load_text_file(p))
        elif ext == ".pdf":
            out.extend(load_pdf_file(p))
        else:
            continue
    return out