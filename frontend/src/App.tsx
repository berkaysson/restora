import React, { useState } from "react";
import axios from "axios";
import type { AxiosResponse } from "axios";
import type { PageData } from "./types";
import { FileList } from "./components/FileList";
import { LogProvider, useLogs } from "./context/LogContext";

// Components
import { Header } from "./components/header/Header";
import { LoadingOverlay } from "./components/ui/LoadingOverlay";
import { ImagePreview } from "./components/preview/ImagePreview";
import { TextEditor } from "./components/editor/TextEditor";
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
            (progressEvent.loaded * 30) / total
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
        `Hata oluştu! ${err instanceof Error ? err.message : "Backend hatası"}`
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
        `http://localhost:8000/process-existing/${jobId}`
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

      <div className="relative flex flex-1 overflow-hidden">
        <LoadingOverlay
          isOpen={isOverlayOpen}
          loading={loading}
          message={loadingMessage}
          progress={progress}
          onClose={() => setIsOverlayOpen(false)}
        />

        <ImagePreview
          data={data}
          highlightIndex={highlightIndex}
          setHighlightIndex={setHighlightIndex}
        />

        <TextEditor
          data={data}
          highlightIndex={highlightIndex}
          setHighlightIndex={setHighlightIndex}
        />
      </div>

      <LogPanel
        onOpenOverlay={() => setIsOverlayOpen(true)}
        showOverlayButton={!!data}
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
