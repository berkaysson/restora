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
- CUDA-compatible GPU (Optional, but recommended for faster OCR, see [engine/README.md](engine/README.md))

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

## Multi-Page PDF Processing

The backend now supports asynchronous processing of large multi-page PDF documents. This system uses a job queue and worker architecture to handle long-running OCR tasks without blocking the API.

### Architecture

- **Queue Manager**: Manages asynchronous processing jobs and workers.
- **Storage Manager**: Handles hierarchical file storage for jobs, pages, and assets.
- **WebSockets**: Provides real-time progress updates to the frontend.

### New API Endpoints

#### Document Management

- **`POST /upload-pdf`**: Upload a multi-page PDF. Returns a `job_id`.
- **`GET /documents`**: List all document processing jobs.
- **`DELETE /document/{job_id}`**: Delete a document and all associated data.
- **`POST /document/{job_id}/cancel`**: Cancel an ongoing processing job.
- **`POST /document/{job_id}/retry-failed`**: Retry processing for failed pages.

#### Progress & Status

- **`GET /document/{job_id}/status`**: Get overall processing status and progress.

#### Page Data

- **`GET /document/{job_id}/pages`**: Get a paginated list of pages with their status.
- **`GET /document/{job_id}/page/{page_number}`**: Get OCR data (text, layout) for a specific page.

#### Export

- **`GET /document/{job_id}/export?format={pdf|txt|json}`**: Export the processed document.

## Legacy Single-File Endpoints

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

- `app.py`: Entry point wrapper to run the application.
- `app/`: Contains the core application logic.
  - `main.py`: FastAPI app initialization, middleware, and startup events.
  - `routers/`: Directory for API route modules (e.g., `ocr.py`, `logs.py`).
  - `utils.py`: Utility helper functions.
- `database.py`: SQLite database initialization and connection handling.
- `engine/`: **Core OCR and Processing Engine**. Contains the logic for modifying files, running models, and extracting data. See [engine/README.md](engine/README.md) for detailed documentation.
- `ocr_engine.py`: Wrapper entry point for the engine module.
- `logger.py`: System logging manager.
- `queue_manager.py`: Handles asynchronous job processing and workers.
- `storage_manager.py`: Manages file storage organization.
- `uploads/`: Directory where uploaded and processed files are stored.
- `restora.db`: SQLite database file (generated on startup).

## Notes

- **First Run**: The OCR models (Surya) will be downloaded on the first run. This might take some time and bandwidth.
- **GPU Usage**: The code attempts to load models onto the GPU if available. If not, it may fall back to CPU or fail depending on your PyTorch installation.
