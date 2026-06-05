"""
OCR Inference and Layout Analysis Module.

This module contains the core OCR logic using Surya models. It performs:
- Text line detection and recognition
- Document layout analysis (identifying headers, tables, figures, etc.)
- Fusion of text content with layout semantic labels

The output provides both raw text and structured layout information
with bounding boxes, confidence scores, and semantic labels for each line.
"""

from PIL import Image
from logger import log_manager
from . import models


async def run_ocr(image_path: str) -> tuple[str, dict]:
    """Run OCR detection, recognition, and layout analysis on an image.

    Performs the complete OCR pipeline:
    1. Loads the image using PIL
    2. Runs text detection to find text line locations
    3. Runs text recognition to read the content
    4. Runs layout analysis to identify semantic regions
    5. Fuses text lines with layout labels based on geometric overlap

    Args:
        image_path: Path to the image file to process.
            Must be a valid image format (JPG, PNG, etc.).

    Returns:
        A tuple containing:
            - full_text (str): All extracted text joined by newlines.
            - layout_json (dict): Structured layout data with keys:
                - text_lines (list): List of text line objects, each containing:
                    - text: The recognized text content
                    - confidence: OCR confidence score (0-1)
                    - bbox: Bounding box [x1, y1, x2, y2]
                    - polygon: Polygon coordinates for the text region
                    - layout_labels: Semantic labels (e.g., ["Header", "Text"])
                - layout_blocks (list): Detected layout regions
                - width: Image width in pixels
                - height: Image height in pixels

    Note:
        Layout label assignment uses center-point containment:
        A text line is assigned a layout label if its center point
        falls within the layout block's bounding box.

    Example:
        >>> text, layout = await run_ocr("uploads/page.jpg")
        >>> for line in layout["text_lines"]:
        ...     print(f"{line['layout_labels']}: {line['text']}")
    """
    pil_img = Image.open(image_path)
    full_text = ""
    layout_json = {}

    if models.rec_predictor and models.det_predictor:
        await log_manager.log("OCR Engine: Running Surya OCR...", "backend")

        try:
            # Run recognition with detection
            predictions = models.rec_predictor(
                [pil_img], det_predictor=models.det_predictor
            )
            result = predictions[0]

            # Run Layout Analysis
            layout_blocks = []
            if models.layout_predictor:
                try:
                    layout_preds = models.layout_predictor([pil_img])
                    l_result = layout_preds[0]
                    # Surya Layout returns 'bboxes' attribute for blocks
                    for block in getattr(l_result, "bboxes", []):
                        layout_blocks.append(
                            {
                                "label": block.label,
                                "confidence": getattr(block, "confidence", 1.0),
                                "bbox": block.bbox,
                                "polygon": block.polygon,
                                "position": getattr(block, "position", 0),
                            }
                        )
                except Exception as e:
                    await log_manager.log(f"Layout Inference Error: {e}", "backend")

            # Extract Text & Construct Custom Layout
            text_lines = []
            if hasattr(result, "text_lines"):
                full_text = "\n".join([line.text for line in result.text_lines])

                for line in result.text_lines:
                    # Convert Surya line object to our specific schema
                    line_bbox = getattr(line, "bbox", [0, 0, 0, 0])

                    # Determine layout labels for this line
                    assigned_labels = []
                    cx = (line_bbox[0] + line_bbox[2]) / 2
                    cy = (line_bbox[1] + line_bbox[3]) / 2

                    line_position = 0
                    for lb in layout_blocks:
                        l_bbox = lb["bbox"]
                        # Check if line center is inside layout block
                        if (
                            l_bbox[0] <= cx <= l_bbox[2]
                            and l_bbox[1] <= cy <= l_bbox[3]
                        ):
                            assigned_labels.append(lb["label"])
                            # Use the position from the first matching block as the line's primary position
                            if line_position == 0:
                                line_position = lb["position"]

                    line_data = {
                        "text": getattr(line, "text", ""),
                        "confidence": getattr(line, "confidence", 0.0),
                        "bbox": line_bbox,
                        "polygon": getattr(line, "polygon", []),
                        "chars": [],
                        "original_text_good": True,
                        "words": [],
                        "layout_labels": assigned_labels,
                        "position": line_position,
                    }
                    text_lines.append(line_data)

    # Group text lines into blocks
            blocks = _group_lines_into_blocks(text_lines, layout_blocks)

            layout_json = {
                "text_lines": text_lines,
                "layout_blocks": layout_blocks,
                "blocks": blocks,
                "width": pil_img.width,
                "height": pil_img.height,
            }

            await log_manager.log(
                f"OCR Engine: Surya OCR completed successfully. Extracted {len(full_text)} characters, {len(text_lines)} lines, and {len(blocks)} blocks.",
                "backend",
            )
        except Exception as e:
            await log_manager.log(f"OCR Inference Error: {e}", "backend")
            full_text = f"OCR Error: {e}"
    else:
        error_msg = "OCR Modelleri Yüklü Değil (surya-ocr kütüphanesini güncelleyin)."
        await log_manager.log(f"OCR Engine Error: {error_msg}", "backend")
        full_text = error_msg
        layout_json = {"text_lines": [], "image_bbox": [0, 0, 0, 0], "blocks": []}

    return full_text, layout_json


def _group_lines_into_blocks(text_lines: list, layout_blocks: list) -> list:
    """Group text lines into semantic blocks based on layout regions and proximity."""
    blocks = []
    
    # 1. Group by Layout Blocks
    # Create a mapping of layout block index to text lines
    block_map = {i: [] for i in range(len(layout_blocks))}
    ungrouped_lines = []

    for line in text_lines:
        # Check if line's center is inside any layout block
        assigned = False
        cx = (line["bbox"][0] + line["bbox"][2]) / 2
        cy = (line["bbox"][1] + line["bbox"][3]) / 2

        for i, lb in enumerate(layout_blocks):
            l_bbox = lb["bbox"]
            if (
                l_bbox[0] <= cx <= l_bbox[2]
                and l_bbox[1] <= cy <= l_bbox[3]
            ):
                block_map[i].append(line)
                assigned = True
                break  # Assign to first matching block (usually sufficient)
        
        if not assigned:
            ungrouped_lines.append(line)

    # 2. Process Layout Groups
    for i, lines in block_map.items():
        if not lines:
            continue
            
        # Sort lines vertically
        lines.sort(key=lambda x: x["bbox"][1])
        
        # Merge text
        full_text = " ".join([l["text"] for l in lines])
        
        # Calculate union bbox
        x1 = min(l["bbox"][0] for l in lines)
        y1 = min(l["bbox"][1] for l in lines)
        x2 = max(l["bbox"][2] for l in lines)
        y2 = max(l["bbox"][3] for l in lines)
        
        blocks.append({
            "text": full_text,
            "bbox": [x1, y1, x2, y2],
            "confidence": sum(l["confidence"] for l in lines) / len(lines),
            "layout_label": layout_blocks[i]["label"],
            "position": layout_blocks[i]["position"],
            "line_indices": [text_lines.index(l) for l in lines] # Keep track of source lines
        })

    # 3. Process Ungrouped Lines (Simple vertical proximity clustering)
    if ungrouped_lines:
        ungrouped_lines.sort(key=lambda x: x["bbox"][1])
        current_cluster = [ungrouped_lines[0]]
        
        for line in ungrouped_lines[1:]:
            prev_line = current_cluster[-1]
            
            # Simple heuristic: if vertical distance is small relative to line height
            line_height = line["bbox"][3] - line["bbox"][1]
            prev_height = prev_line["bbox"][3] - prev_line["bbox"][1]
            avg_height = (line_height + prev_height) / 2
            
            vertical_gap = line["bbox"][1] - prev_line["bbox"][3]
            
            # If gap is less than 1.5x line height and horizontal overlap exists
            if vertical_gap < avg_height * 1.5:
                 current_cluster.append(line)
            else:
                # Close current cluster and start new one
                _create_block_from_cluster(blocks, current_cluster, text_lines)
                current_cluster = [line]
        
        # Close last cluster
        if current_cluster:
            _create_block_from_cluster(blocks, current_cluster, text_lines)

    return blocks

def _create_block_from_cluster(blocks, cluster, all_lines):
    if not cluster:
        return

    full_text = " ".join([l["text"] for l in cluster])
    
    x1 = min(l["bbox"][0] for l in cluster)
    y1 = min(l["bbox"][1] for l in cluster)
    x2 = max(l["bbox"][2] for l in cluster)
    y2 = max(l["bbox"][3] for l in cluster)
    
    blocks.append({
        "text": full_text,
        "bbox": [x1, y1, x2, y2],
        "confidence": sum(l["confidence"] for l in cluster) / len(cluster),
        "layout_label": "Text", # Default for ungrouped
        "position": 0, # Default for ungrouped
        "line_indices": [all_lines.index(l) for l in cluster]
    })
