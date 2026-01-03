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

    const file = e.target.files[0];
    addLog(`Frontend: Started processing file ${file.name}`, "frontend");

    const formData = new FormData();
    formData.append("file", file);

    try {
      addLog(`Frontend: Sending POST /upload request...`, "frontend");
      const res = await axios.post("http://localhost:8000/upload", formData);
      console.log("🚀 ~ handleUpload ~ res:", res);

      addLog(`Frontend: Received response. Parsing layout...`, "frontend");
      processResponse(res);
    } catch (err) {
      console.error(err);
      addLog(`Frontend: Error during upload - ${err}`, "frontend");
      alert(
        `Hata oluştu! ${err instanceof Error ? err.message : "Backend hatası"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (jobId: string) => {
    setLoading(true);
    setIsFileListOpen(false);
    addLog(`Frontend: Opening existing job ${jobId}`, "frontend");
    try {
      const res = await axios.post(
        `http://localhost:8000/process-existing/${jobId}`
      );
      processResponse(res);
    } catch (err) {
      console.error(err);
      addLog(`Frontend: Error opening job - ${err}`, "frontend");
      alert(`Hata: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
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
        <LoadingOverlay loading={loading} />

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

      <LogPanel />
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
