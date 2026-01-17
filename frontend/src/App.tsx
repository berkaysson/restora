import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import type { AxiosResponse } from "axios";
import type { PageData } from "./types";
import { FileList } from "./components/FileList";
import { LogProvider, useLogs } from "./context/LogContext";

// Components
import { Header } from "./components/header/Header";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { ImagePreview } from "./components/preview/ImagePreview";
import { TextEditor } from "./components/editor/TextEditor";
// Fonts
import RobotoRegular from "./assets/Roboto-Regular.ttf";
import { LogPanel } from "./components/logs/LogPanel";

// Yardımcı Fonksiyonlar
const fixTurkishHyphens = (text: string | null | undefined) => {
  if (!text) return "";
  // Satır sonu "-" ve alt satırdaki kelimeyi birleştir
  return text.replace(/(\w+)-\s*\n\s*([a-zğüşıöç]+)/g, "$1$2");
};

function AppContent() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("İşleniyor...");
  const [progress, setProgress] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [isFileListOpen, setIsFileListOpen] = useState(false);
  const { addLog } = useLogs();

  // Layout Filtering State
  const [hiddenLabels, setHiddenLabels] = useState<string[]>([]);

  const toggleLabel = (label: string) => {
    setHiddenLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  // Resizable Layout Components
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80)); // Clamp between 20% and 80%
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  // Reset filters when new data loads
  const processResponse = (res: AxiosResponse) => {
    if (res.data.status === "error") {
      throw new Error(res.data.message || "Unknown backend error");
    }

    // Surya çıktısını parse et
    const parsedLayout = (typeof res.data.layout === "string"
      ? JSON.parse(res.data.layout)
      : res.data.layout) || { text_lines: [] };

    // Türkçe Temizlikleri Uygula (Opsiyonel: otomatik yapabilir veya buton koyabiliriz)
    // Burada sadece layout'u işliyoruz, text ayrıca geliyor.
    // Text üzerinde de hyphenation düzeltmesi yapalım.
    const fixedText = fixTurkishHyphens(res.data.text);

    setHiddenLabels([]); // Reset filters
    setData({ ...res.data, text: fixedText, layout: parsedLayout });
    addLog(`Frontend: Data successfully updated.`, "frontend");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    setIsOverlayOpen(true);
    setProgress(0);
    setLoadingMessage("Dosya yükleniyor...");

    const file = e.target.files[0];
    addLog(`Frontend: Started processing file ${file.name}`, "frontend");

    const formData = new FormData();
    formData.append("file", file);

    // Simulated progress timer for processing phase
    let progressInterval: ReturnType<typeof setInterval>;

    try {
      addLog(`Frontend: Sending POST /upload request...`, "frontend");
      const res = await axios.post("http://localhost:8000/upload", formData, {
        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total || 1;
          // Upload is 30% of total visual progress
          const percentCompleted = Math.round(
            (progressEvent.loaded * 30) / total,
          );
          setProgress(percentCompleted);
        },
      });

      // Upload done, start processing simulation
      setLoadingMessage("AI Analizi yapılıyor...");
      addLog(`Frontend: Upload complete. Waiting for analysis...`, "frontend");

      // Simulate progress from 30% to 90%
      setProgress(30);
      progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 1; // Increment slowly
        });
      }, 500); // Update every 500ms

      console.log("🚀 ~ handleUpload ~ res:", res);

      addLog(`Frontend: Received response. Parsing layout...`, "frontend");
      processResponse(res);
      setProgress(100);
    } catch (err) {
      console.error(err);
      addLog(`Frontend: Error during upload - ${err}`, "frontend");
      alert(
        `Hata oluştu! ${err instanceof Error ? err.message : "Backend hatası"}`,
      );
    } finally {
      if (progressInterval!) clearInterval(progressInterval);
      // We don't close the overlay here anymore, let user inspect
      setLoading(false);
    }
  };

  const handleOpenFile = async (jobId: string) => {
    setLoading(true);
    setIsOverlayOpen(true);
    setIsFileListOpen(false);
    setProgress(0);
    setLoadingMessage("Dosya açılıyor...");
    addLog(`Frontend: Opening existing job ${jobId}`, "frontend");

    // Simulated progress for opening
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return 90;
        return prev + 10;
      });
    }, 200);

    try {
      const res = await axios.post(
        `http://localhost:8000/process-existing/${jobId}`,
      );
      processResponse(res);
      setProgress(100);
    } catch (err) {
      console.error(err);
      addLog(`Frontend: Error opening job - ${err}`, "frontend");
      alert(`Hata: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!data) return;

    setData(null);
    setHighlightIndex(null);
    setHiddenLabels([]);
  };

  const handleExportPdf = async () => {
    if (!data || !data.layout?.text_lines) {
      alert("OCR verisi bulunamadı.");
      return;
    }

    try {
      let pdfWidth = 595.28; // A4 pt (approx)
      let pdfHeight = 841.89;

      if (data.clean_image) {
        const imgUrl = `http://localhost:8000/${data.clean_image}`;
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            pdfWidth = img.naturalWidth;
            pdfHeight = img.naturalHeight;
            resolve();
          };
          img.onerror = () => {
            console.warn("Failed to load image for dimensions, using default.");
            resolve();
          };
          img.src = imgUrl;
        });
      }

      const doc = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "px",
        format: [pdfWidth, pdfHeight],
      });

      // Load Roboto Font
      const response = await fetch(RobotoRegular);
      const buffer = await response.arrayBuffer();
      const base64Font = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      doc.addFileToVFS("Roboto-Regular.ttf", base64Font);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.setFont("Roboto", "normal");

      data.layout.text_lines.forEach(
        (line: { bbox: number[]; text: string }) => {
          const { bbox, text } = line;
          if (!bbox) return;

          const x = bbox[0];
          const y = bbox[1];
          const height = bbox[3] - bbox[1];

          doc.setFontSize(height);
          doc.text(text, x, y + height * 0.75);
        },
      );

      doc.save(`export_${data.job_id || "document"}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("PDF oluşturulurken hata oluştu.");
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans text-base-content bg-base-100 selection:bg-primary/30">
      <FileList
        isOpen={isFileListOpen}
        onClose={() => setIsFileListOpen(false)}
        onSelect={handleOpenFile}
      />

      <Header
        loading={loading}
        data={data}
        onOpenFileList={() => setIsFileListOpen(true)}
        onUpload={handleUpload}
        onClear={handleClear}
      />

      <div className="relative flex flex-1 overflow-hidden" ref={containerRef}>
        <LoadingOverlay
          isOpen={isOverlayOpen}
          loading={loading}
          message={loadingMessage}
          progress={progress}
          onClose={() => setIsOverlayOpen(false)}
        />

        {/* Left Panel: Image Preview */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="h-full relative shrink-0 transition-[width] duration-75 ease-out will-change-[width]"
        >
          <ImagePreview
            data={data}
            highlightIndex={highlightIndex}
            setHighlightIndex={setHighlightIndex}
            hiddenLabels={hiddenLabels}
          />
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1.5 h-full cursor-col-resize bg-base-200 hover:bg-primary/50 active:bg-primary z-40 transition-colors flex flex-col justify-center items-center shadow-sm select-none shrink-0"
          onMouseDown={startResizing}
        >
          <div className="w-0.5 h-8 bg-base-content/20 rounded-full" />
        </div>

        {/* Right Panel: Text Editor */}
        <div
          className="h-full relative shrink-0 bg-base-100 transition-[width] duration-75 ease-out will-change-[width]"
          style={{ width: `calc(100% - ${leftPanelWidth}% - 6px)` }}
        >
          <TextEditor
            data={data}
            highlightIndex={highlightIndex}
            setHighlightIndex={setHighlightIndex}
            hiddenLabels={hiddenLabels}
            onToggleLabel={toggleLabel}
          />
        </div>
      </div>

      <LogPanel
        onOpenOverlay={() => setIsOverlayOpen(true)}
        showOverlayButton={!!data}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
}

function App() {
  return (
    <LogProvider>
      <AppContent />
    </LogProvider>
  );
}

export default App;
