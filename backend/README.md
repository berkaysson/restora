# Restora Backend

This is the backend for the **Restora** project, a FastAPI-based application that processes PDF/Image pages, performs OCR using Surya OCR, and manages data using SQLite.

## Features

- **FastAPI Framework**: High-performance API.
- **OCR Engine**: Uses [Surya OCR](https://github.com/VikParuchuri/surya) for accurate text recognition and layout analysis.
- **Image Pre-processing**: Uses OpenCV for adaptive thresholding and cleaning.
- **Database**: SQLite for simple and efficient data storage (Books and Pages).
- **Static File Serving**: Serves processed images directly.

## Prerequisites

- Python 3.9+ (Recommended)
- CUDA-compatible GPU (Optional, but recommended for faster OCR, check `ocr_engine.py` logic)

## Installation

1.  **Navigate to the backend directory:**

    ```bash
    cd backend
    ```

2.  **Create a virtual environment:**

    ```bash
    python -m venv venv
    ```

3.  **Activate the virtual environment:**

    - Windows:
      ```bash
      venv\Scripts\activate
      ```
    - macOS/Linux:
      ```bash
      source venv/bin/activate
      ```

4.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    _Note: This will install `fastapi`, `uvicorn`, `surya-ocr`, `opencv-python`, etc._

## Running the Application

Start the server using Uvicorn with hot-reload enabled:

```bash
uvicorn app:app --reload
```

The API will be available at: [http://localhost:8000](http://localhost:8000)

## API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Key Endpoints

### `POST /upload`

Uploads a PDF page (as an image) or an image file for processing.

- **Request**: `multipart/form-data` with a file field named `file`.
- **Process**:
  1.  Saves the raw file to `uploads/`.
  2.  Cleans the image using OpenCV (destroys noise, adaptive threshold).
  3.  Runs Surya OCR to detect text and layout.
  4.  Returns the processed text and layout JSON.
- **Response**:
  ```json
  {
    "status": "success",
    "clean_image": "uploads/filename_clean.jpg",
    "text": "Extracted text content...",
    "layout": { ... }
  }
  ```

## Project Structure

- `app.py`: Main application entry point. Configures CORS, static files, and routes.
- `database.py`: SQLite database initialization and connection handling.
- `ocr_engine.py`: Contains the `process_page` function which handles image cleaning and OCR inference.
- `uploads/`: Directory where uploaded and processed files are stored.
- `restora.db`: SQLite database file (generated on startup).

## Notes

- **First Run**: The OCR models (Surya) will be downloaded on the first run. This might take some time and bandwidth.
- **GPU Usage**: The code attempts to load models onto the GPU if available. If not, it may fall back to CPU or fail depending on your PyTorch installation.
