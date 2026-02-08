import os
import json
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from PIL import Image
from typing import List, Optional, Tuple, Dict
from logger import log_manager
from storage_manager import storage_manager
from db_helpers import get_document_pages, get_page_data

class ExportService:
    """Service for exporting processed documents in various formats."""

    async def create_searchable_pdf(
        self, job_id: str, output_path: str, page_range: Optional[List[int]] = None
    ) -> str:
        """
        Create a searchable PDF from processed pages.
        
        Args:
            job_id: Document identifier
            output_path: Path to save the generated PDF
            page_range: Optional list of page numbers to include
            
        Returns:
            Path to the generated PDF
        """
        try:
            # Create PDF canvas
            c = canvas.Canvas(output_path)
            
            # Get pages to export
            pages = await self._get_pages_to_export(job_id, page_range)
            
            if not pages:
                raise ValueError("No pages found to export")

            await log_manager.log(f"Export: Starting PDF export for job {job_id} ({len(pages)} pages)", "backend")
            
            for i, page in enumerate(pages):
                page_num = page["page_number"]
                
                # Get page data
                page_data = get_page_data(job_id, page_num)
                if not page_data or page_data.get("status") != "completed":
                    await log_manager.log(f"Export: Skipping incomplete page {page_num}", "backend")
                    continue
                    
                # Get image path and OCR data
                image_path = page_data.get("image_path")
                ocr_data = storage_manager.get_page_ocr(job_id, page_num)
                
                if not image_path or not os.path.exists(image_path):
                    await log_manager.log(f"Export: Image not found for page {page_num}", "backend")
                    continue
                
                # Load image to get dimensions
                try:
                    img = Image.open(image_path)
                    width, height = img.size
                    
                    # Set page size to match image
                    c.setPageSize((width, height))
                    
                    # Draw image
                    c.drawImage(image_path, 0, 0, width=width, height=height)
                    
                    # Draw invisible text if OCR data exists
                    if ocr_data and "layout" in ocr_data:
                        self._draw_invisible_text(c, ocr_data["layout"], height)
                        
                    c.showPage()
                    
                except Exception as e:
                    await log_manager.log(f"Export: Error processing page {page_num}: {e}", "backend")
                    continue
                    
                # Log progress periodically
                if (i + 1) % 10 == 0:
                    await log_manager.log(f"Export: Processed {i + 1}/{len(pages)} pages", "backend")

            c.save()
            await log_manager.log(f"Export: PDF saved to {output_path}", "backend")
            return output_path
            
        except Exception as e:
            await log_manager.log(f"Export: Error creating PDF: {e}", "backend")
            raise

    async def create_text_export(
        self, job_id: str, output_path: str, page_range: Optional[List[int]] = None
    ) -> str:
        """Create a plain text export."""
        try:
            pages = await self._get_pages_to_export(job_id, page_range)
            
            with open(output_path, "w", encoding="utf-8") as f:
                for page in pages:
                    page_num = page["page_number"]
                    ocr_data = storage_manager.get_page_ocr(job_id, page_num)
                    
                    if ocr_data and "text" in ocr_data:
                        f.write(f"--- Page {page_num} ---\n\n")
                        f.write(ocr_data["text"])
                        f.write("\n\n")
                        
            return output_path
        except Exception as e:
            await log_manager.log(f"Export: Error creating text export: {e}", "backend")
            raise

    async def create_json_export(
        self, job_id: str, output_path: str, page_range: Optional[List[int]] = None
    ) -> str:
        """Create a JSON export with full structure."""
        try:
            pages = await self._get_pages_to_export(job_id, page_range)
            export_data = {
                "job_id": job_id,
                "exported_at": str(os.path.getmtime(output_path)) if os.path.exists(output_path) else None,
                "pages": []
            }
            
            for page in pages:
                page_num = page["page_number"]
                ocr_data = storage_manager.get_page_ocr(job_id, page_num)
                
                if ocr_data:
                    export_data["pages"].append({
                        "page_number": page_num,
                        "text": ocr_data.get("text", ""),
                        "layout": ocr_data.get("layout", {}),
                        "confidence": ocr_data.get("confidence", 0)
                    })
            
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2)
                
            return output_path
        except Exception as e:
            await log_manager.log(f"Export: Error creating JSON export: {e}", "backend")
            raise

    async def _get_pages_to_export(self, job_id: str, page_range: Optional[List[int]]) -> List[Dict]:
        """Helper to get list of pages to export."""
        # This is a simplified fetch. In reality we might use get_document_pages 
        # but we need ALL pages, not paginated.
        # So we'll fetch all pages 1 by 1 or implement a get_all_pages in db_helpers
        
        # For now, let's just use get_document_pages with a large limit or loop
        # Better: get total pages and iterate
        from db_helpers import get_document
        doc = get_document(job_id)
        if not doc:
            return []
            
        total_pages = doc["total_pages"]
        pages = []
        
        # If specific range requested
        if page_range:
            for p in page_range:
                if 1 <= p <= total_pages:
                    pages.append({"page_number": p})
            pages.sort(key=lambda x: x["page_number"])
        else:
            # All pages
            for p in range(1, total_pages + 1):
                pages.append({"page_number": p})
                
        return pages

    def _draw_invisible_text(self, canvas_obj, layout, page_height):
        """Draw invisible text on the PDF canvas to make it searchable."""
        if not layout or "text_lines" not in layout:
            return
            
        # Set text to invisible mode (rendering mode 3)
        canvas_obj.setTextRenderMode(3) 
        
        for line in layout["text_lines"]:
            text = line.get("text", "")
            bbox = line.get("bbox", []) # [x0, y0, x1, y1]
            
            if not text or len(bbox) != 4:
                continue
                
            x0, y0, x1, y1 = bbox
            width = x1 - x0
            height = y1 - y0
            
            if width <= 0 or height <= 0:
                continue
                
            # Calculate font size roughly
            # This is an approximation. For better results, one would calculate exact font width
            font_size = height * 0.8 
            
            # PDF coordinates are bottom-up, Surya/OCR might be top-down
            # Usually Surya is top-down (0,0 is top-left). ReportLab is bottom-up (0,0 is bottom-left).
            # We need to flip Y.
            # y_pdf = page_height - y_ocr
            
            pdf_y0 = page_height - y1
            
            canvas_obj.setFont("Helvetica", font_size)
            canvas_obj.drawString(x0, pdf_y0, text)

export_service = ExportService()
