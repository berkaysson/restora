from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class CharSchema(BaseModel):
    text: str
    confidence: float
    bbox: List[float]
    bbox_valid: bool
    polygon: List[List[float]]

class TextLineSchema(BaseModel):
    text: str
    confidence: float
    bbox: List[float]
    polygon: List[List[float]]
    chars: List[CharSchema]
    original_text_good: bool
    words: List[Any]
    layout_labels: Optional[List[str]] = None
    position: Optional[int] = 0

class LayoutBlockSchema(BaseModel):
    label: str
    confidence: float
    bbox: List[float]
    polygon: Optional[List[List[float]]] = None
    position: Optional[int] = 0

class BlockSchema(BaseModel):
    text: str
    confidence: float
    bbox: List[float]
    layout_label: str
    position: Optional[int] = 0
    line_indices: List[int]

class LayoutSchema(BaseModel):
    text_lines: List[TextLineSchema]
    layout_blocks: List[LayoutBlockSchema]
    blocks: Optional[List[BlockSchema]] = None
    width: int
    height: int

class OCRResponse(BaseModel):
    status: str
    job_id: str
    image_path: Optional[str] = None
    text: str
    layout: LayoutSchema
    typos: Optional[List[str]] = None
