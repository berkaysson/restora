"""
Surya OCR Model Management Module.

This module handles the loading and lifecycle management of Surya OCR models.
Models are loaded once at application startup and kept in memory for fast
inference during requests.

Models loaded:
    - FoundationPredictor: Base model for feature extraction
    - RecognitionPredictor: Text recognition from detected regions
    - DetectionPredictor: Text line detection
    - LayoutPredictor: Document layout analysis (headers, tables, etc.)

Note:
    Models are loaded automatically when this module is imported.
    GPU is preferred if available; falls back to CPU otherwise.
"""

try:
    from surya.foundation import FoundationPredictor
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor
    from surya.layout import LayoutPredictor
    from surya.settings import settings
except ImportError:
    FoundationPredictor = None
    RecognitionPredictor = None
    DetectionPredictor = None
    LayoutPredictor = None
    print("CRITICAL ERROR: 'surya-ocr' library is outdated or missing modules.")
    print("Please run: pip install --upgrade surya-ocr")

#: Global instance of FoundationPredictor for shared feature extraction
foundation_predictor = None

#: Global instance of RecognitionPredictor for text recognition
rec_predictor = None

#: Global instance of DetectionPredictor for text line detection
det_predictor = None

#: Global instance of LayoutPredictor for document structure analysis
layout_predictor = None


def load_models() -> None:
    """Load all Surya OCR models into memory.

    Initializes the global predictor instances for use throughout the
    application. This function should be called once at startup.

    The function attempts to use GPU (CUDA) if available. If GPU loading
    fails, it may fall back to CPU depending on PyTorch configuration.

    Models loaded:
        - FoundationPredictor: Shared backbone model
        - RecognitionPredictor: For reading text content
        - DetectionPredictor: For finding text regions
        - LayoutPredictor: For semantic document analysis

    Side Effects:
        Sets global variables: foundation_predictor, rec_predictor,
        det_predictor, layout_predictor

    Note:
        First-time execution will download model weights (~2GB).
        This may take several minutes depending on connection speed.
    """
    global foundation_predictor, rec_predictor, det_predictor, layout_predictor
    if FoundationPredictor is None:
        return

    try:
        print("Loading Surya models...")
        foundation_predictor = FoundationPredictor()
        rec_predictor = RecognitionPredictor(foundation_predictor)
        det_predictor = DetectionPredictor()

        # Load Layout Model (uses a specific checkpoint)
        layout_predictor = LayoutPredictor(
            FoundationPredictor(checkpoint=settings.LAYOUT_MODEL_CHECKPOINT)
        )

        print("Surya models loaded successfully.")
    except Exception as e:
        print(f"Model loading error (GPU/CPU issue): {e}")


# Initialize models on import
load_models()
