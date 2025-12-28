# Restora

Restora is an AI-powered project designed for the digitization, restoration, and analysis of physical book pages. It leverages advanced OCR (Object Character Recognition) and image processing techniques to convert scanned book pages into structured digital formats with high accuracy.

The project consists of a **FastAPI** backend for image processing and a **React (Vite)** frontend for user interaction.

## 🚀 Features

- **Image Cleanup**: Uses OpenCV for adaptive thresholding to remove noise and improved readability of scanned pages.
- **AI-Powered OCR**: Utilizes [Surya OCR](https://github.com/VikParuchuri/surya) (with Segformer and recognition models) for high-accuracy text detection and reading, capable of handling complex layouts.
- **Layout Analysis**: Extracts and provides coordinate-based layout information (bounding boxes) for text lines.
- **Database Integration**: Stores book metadata, page images, raw text, and layout JSON in a localized SQLite database.
- **Modern UI**: A responsive frontend built with React, TypeScript, and TailwindCSS for easy uploading and viewing of results.

---

## 🛠 Tech Stack

### Backend

- **Language**: Python 3.10+
- **Framework**: FastAPI
- **OCR Engine**: Surya OCR (PyTorch based)
- **Image Processing**: OpenCV, Pillow, Numpy
- **Database**: SQLite

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Language**: TypeScript
- **HTTP Client**: Axios
- **Icons**: Lucide React

---

## ⚙️ Usage & Installation

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.10 or higher)
- Git

### 1. Backend Setup

The backend handles image uploads, processing, and database interactions.

1.  Navigate to the backend directory:

    ```bash
    cd backend
    ```

2.  Create and activate a virtual environment:

    ```bash
    # Windows (CMD / PowerShell)
    python -m venv venv
    .\venv\Scripts\activate

    # Windows (Git Bash)
    python -m venv venv
    source venv/Scripts/activate

    # macOS/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  Install dependencies:
    _(Note: Ensure you have PyTorch installed if required by Surya, primarily efficient on GPU)_

    ```bash
    pip install fastapi uvicorn python-multipart opencv-python pillow numpy surya-ocr
    ```

4.  Run the server:
    ```bash
    uvicorn app:app --reload
    ```
    The backend will start at `http://localhost:8000`.
    - API Docs: `http://localhost:8000/docs`
    - Static Uploads: `http://localhost:8000/uploads`

### 2. Frontend Setup

The frontend provides a user interface to upload pages and view OCR results.

1.  Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2.  Install dependencies:

    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will run at `http://localhost:5173`.

---

## 📂 Project Structure

```
restora/
├── backend/
│   ├── app.py              # Main FastAPI application & endpoints
│   ├── database.py         # SQLite database initialization & connection
│   ├── ocr_engine.py       # Core logic for OpenCV clean & Surya OCR
│   ├── restora.db          # SQLite database file (auto-generated)
│   └── uploads/            # Directory for storing uploaded images
│
└── frontend/
    ├── src/
    │   ├── App.tsx         # Main application component
    │   ├── assets/         # Static assets
    │   └── ...
    ├── index.html          # HTML entry point
    ├── package.json        # Frontend dependencies
    └── vite.config.ts      # Vite configuration
```

## 📝 How It Works

1.  **Upload**: User selects a book page image (JPG/PNG) via the frontend.
2.  **Processing**:
    - Backend receives the image.
    - **OpenCV** applies adaptive thresholding to create a "clean" binary version of the image.
    - **Surya OCR** detects text lines and reads the content, returning text and bounding box coordinates.
3.  **Storage**: The original image, clean image path, extracted text, and layout JSON are saved to the `pages` table in SQLite.
4.  **Display**: The frontend displays the cleaned image and the extracted text to the user.

## ⚠️ Notes

- **Model Weights**: The first time you run the OCR engine, `surya-ocr` will download necessary model weights. This might take some time depending on your internet connection.
- **GPU Support**: For faster processing, ensure your machine typically has a CUDA-capable GPU and the appropriate PyTorch version installed. The engine will fallback to CPU but will be significantly slower.
