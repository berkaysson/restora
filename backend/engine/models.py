try:
    from surya.foundation import FoundationPredictor
    from surya.recognition import RecognitionPredictor
    from surya.detection import DetectionPredictor
except ImportError:
    FoundationPredictor = None
    RecognitionPredictor = None
    DetectionPredictor = None
    print("CRITICAL ERROR: 'surya-ocr' library is outdated or missing modules.")
    print("Please run: pip install --upgrade surya-ocr")

foundation_predictor = None
rec_predictor = None
det_predictor = None


def load_models():
    global foundation_predictor, rec_predictor, det_predictor
    if FoundationPredictor is None:
        return

    try:
        print("Loading Surya models...")
        foundation_predictor = FoundationPredictor()
        rec_predictor = RecognitionPredictor(foundation_predictor)
        det_predictor = DetectionPredictor()
        print("Surya models loaded successfully.")
    except Exception as e:
        print(f"Model loading error (GPU/CPU issue): {e}")


# Initialize models on import
load_models()
