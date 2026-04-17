# Restora OCR Engine

The **Restora OCR Engine** is a specialized module designed to process documents (images and PDFs), extract text, and analyze layout using advanced AI models. It serves as the core processing unit for the Restora backend.

## Architecture

The engine is modularized into four key components, each handling a specific part of the pipeline:

### 1. Core (`core.py`)

the central orchestrator. It acts as the entry point for the backend application.

- **Function**: `process_page(image_path)`
- **Responsibilities**:
  - Validates model status.
  - Checks if the input is a PDF and triggers conversion if necessary.
  - Calls the preprocessor (if enabled).
  - Invokes the OCR module.
  - Logs performance metrics (execution time).

### 2. Models (`models.py`)

Responsible for loading and managing the AI models in memory.

- **Models Used**: [Surya OCR](https://github.com/VikParuchuri/surya)
  - `RecognitionPredictor`: Reads text from the image.
  - `DetectionPredictor`: Detects text line locations.
  - `LayoutPredictor`: Identifies structural elements (Headers, Tables, Figures, etc.).
- **Behavior**: Models are loaded once at startup to ensure fast inference during requests. It handles GPU/CPU fallback automatically.

### 3. OCR (`ocr.py`)

Contains the logic for running inference and structuring the output.

- **Workflow**:
  1. **Detection & Recognition**: Finds text lines and reads their content.
  2. **Layout Analysis**: Segments the page into semantic blocks (e.g., specific columns, headers).
  3. **Data Fusion**: Merges text line data with layout information. It assigns semantic labels (from the layout model) to each text line based on geometric overlap.
- **Output**: Returns raw text and a rich JSON object containing coordinates (`bbox`), confidence scores, and layout labels for every line.

### 4. Preprocessor (`preprocessor.py`)

Handles raw file manipulation before AI processing.

- **PDF Conversion**: Uses `pypdfium2` to render PDF pages into high-resolution images (scaled for optimal OCR accuracy).
- **Extraction**: Allows extracting specific pages from multi-page PDFs.

## Workflow

When a file is submitted to the engine:

1.  **Input**: A file path (PDF or Image) is received by `core.process_page`.
2.  **Conversion**: If PDF, it is converted to an image.
3.  **Inference**:
    - Text locations are detected.
    - Text is recognized.
    - Page layout regions are classified.
5.  **Synthesis**: The engine calculates which text lines belong to which layout regions using coordinate geometry.
6.  **Output**: A comprehensive JSON response is generated.

## Output Data Structure

The engine returns a JSON object detailing the document structure:

```json
{
  "text_lines": [
    {
      "text": "Sample text content",
      "bbox": [x1, y1, x2, y2],      // Bounding box coordinates
      "confidence": 0.98,            // OCR confidence score
      "layout_labels": ["Text", "Header"] // Associated semantic labels helping identifying the nature of the text
    },
    ...
  ],
  "layout_blocks": [
    {
      "label": "Header",
      "bbox": [x1, y1, x2, y2],
      "confidence": 0.99
    },
    ...
  ]
}
```
