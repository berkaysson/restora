from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass(frozen=True)
class LayoutData:
    """Sayfa düzeni ve koordinat bilgilerini taşıyan Value Object."""
    width: int
    height: int
    blocks: List[Dict[str, Any]] = field(default_factory=list)
    lines: List[Dict[str, Any]] = field(default_factory=list)

@dataclass(frozen=True)
class OCRResult:
    """OCR işlem sonucunu taşıyan Value Object."""
    text: str
    confidence: float
    processing_time: float
