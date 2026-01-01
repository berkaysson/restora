# Restora Frontend

This is the frontend for **Restora**, an AI-powered project for digitizing, restoring, and analyzing physical book pages. Built with a focus on visual clarity and user interaction, it provides a seamless interface to interact with the backend OCR and image processing engine.

## ✨ Features

- **Multi-format Support**: Upload book pages as images (JPG, PNG) or PDFs.
- **Interactive Document Viewer**: View cleaned images with synchronized bounding boxes. Hover over text in the editor to highlight its location on the image, or vice-versa.
- **Real-time Processing Logs**: Integrated log panel powered by WebSockets, showing live updates from both the frontend and backend.
- **Extracted Text Editor**: View and edit OCR-extracted text line-by-line.
- **Historical Gallery**: Access and re-process previously uploaded documents.
- **Premium UI/UX**: Modern dark-themed interface built with TailwindCSS, featuring glassmorphism and smooth animations.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **API Client**: [Axios](https://axios-http.com/)
- **State Management**: React Context (for Logs)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- Backend server running (default: `http://localhost:8000`)

### Installation

1.  **Clone the repository** (if you haven't already):

    ```bash
    git clone https://github.com/your-repo/restora.git
    cd restora/frontend
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Run the development server**:

    ```bash
    npm run dev
    ```

4.  **Access the app**:
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📂 Project Structure

- `src/components`: UI components like `FileList` and `Logs`.
- `src/context`: React Context for managing global states (e.g., Log stream).
- `src/types`: TypeScript interfaces for OCR data and application state.
- `src/App.tsx`: Main application logic and layout.
- `src/index.css`: TailwindCSS directives and global styles.

## 🔧 Configuration

The frontend is configured to communicate with the backend at `http://localhost:8000`. If your backend is running on a different port, update the API calls in `src/App.tsx` and the WebSocket connection in `src/components/Logs.tsx`.

---

Part of the **Restora** ecosystem.
