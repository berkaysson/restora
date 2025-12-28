import React, { useState } from "react";
import axios from "axios";
import type { AxiosResponse } from "axios";
import type { PageData, TextLine } from "./types";
import {
  Scan,
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { FileList } from "./components/FileList";

// Yardımcı Fonksiyonlar
const fixTurkishHyphens = (text: string | null | undefined) => {
  if (!text) return "";
  // Satır sonu "-" ve alt satırdaki kelimeyi birleştir
  return text.replace(/(\w+)-\s*\n\s*([a-zğüşıöç]+)/g, "$1$2");
};

import { LogProvider, useLogs } from "./context/LogContext";
import { Logs } from "./components/Logs";

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
      : res.data.layout) || { text_lines: [], image_bbox: [0, 0, 0, 0] };

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

  const handleOpenFile = async (filename: string) => {
    setLoading(true);
    setIsFileListOpen(false);
    addLog(`Frontend: Opening existing file ${filename}`, "frontend");
    try {
      const res = await axios.post(
        `http://localhost:8000/process-existing/${filename}`
      );
      processResponse(res);
    } catch (err) {
      console.error(err);
      addLog(`Frontend: Error opening file - ${err}`, "frontend");
      alert(`Hata: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen font-sans text-gray-100 bg-gray-950 selection:bg-indigo-500/30">
      <FileList
        isOpen={isFileListOpen}
        onClose={() => setIsFileListOpen(false)}
        onSelect={handleOpenFile}
      />
      {/* Toolbar */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Scan className="w-6 h-6 text-indigo-400" />
          <h1 className="text-lg font-bold tracking-tight text-transparent bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text">
            Restora{" "}
            <span className="font-mono text-xs text-gray-500 opacity-70">
              v.0.1
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-indigo-400 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI İşleniyor ...</span>
            </div>
          )}

          <button
            onClick={() => setIsFileListOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 transition-all bg-gray-800 rounded-lg hover:bg-gray-700 hover:text-white"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Dosyalar</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-sm text-white transition-all bg-indigo-600 rounded-lg shadow-lg cursor-pointer hover:bg-indigo-500 shadow-indigo-500/20 active:scale-95">
            <Upload className="w-4 h-4" />
            <span>PDF/Resim Yükle</span>
            <input
              type="file"
              onChange={handleUpload}
              className="hidden"
              accept="image/*,.pdf"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SOL PANEL: Resim & Bounding Box */}
        <div className="relative flex justify-center w-1/2 p-8 overflow-auto border-r border-gray-800 bg-gray-900/50">
          {data ? (
            <div className="relative inline-block overflow-hidden rounded-lg shadow-2xl shadow-black/50 group">
              <img
                src={`http://localhost:8000/${data.clean_image}`}
                alt="Scan"
                className="block max-w-full"
              />
              {/* Surya Kutucuklarını Çiz */}
              {data.layout?.text_lines?.map((line: TextLine, idx: number) => {
                const [x0, y0, x1, y1] = line.bbox;
                return (
                  <div
                    key={idx}
                    className={`absolute border cursor-pointer transition-all duration-200 ${
                      highlightIndex === idx
                        ? "border-indigo-400 bg-indigo-500/30"
                        : "border-transparent hover:border-indigo-500/50 hover:bg-indigo-500/10"
                    }`}
                    style={{
                      left: x0,
                      top: y0,
                      width: x1 - x0,
                      height: y1 - y0,
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseLeave={() => setHighlightIndex(null)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-gray-600">
              <ImageIcon className="w-16 h-16 opacity-20" />
              <p>Görüntülenecek belge yok</p>
            </div>
          )}
        </div>

        {/* SAĞ PANEL: Metin Editörü */}
        <div className="flex flex-col w-1/2 p-0 bg-gray-950">
          <div className="flex justify-between p-4 font-mono text-xs text-gray-500 border-b border-gray-800 bg-gray-900/30">
            <span>DETECTED TEXT</span>
            <span>UTF-8</span>
          </div>
          <div className="flex-1 p-8 overflow-auto font-mono text-sm leading-7 text-gray-300">
            {data ? (
              data.layout?.text_lines?.map((line: TextLine, idx: number) => (
                <div
                  key={idx}
                  className={`rounded px-2 -mx-2 transition-colors duration-200 ${
                    highlightIndex === idx
                      ? "bg-indigo-900/30 text-indigo-200"
                      : "hover:bg-gray-900"
                  }`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseLeave={() => setHighlightIndex(null)}
                  contentEditable
                  suppressContentEditableWarning
                >
                  {line.text_content}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
                <FileText className="w-16 h-16 opacity-20" />
                <p>Henüz metin çıkarılmadı</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logs Panel - Fixed Height */}
      <div className="h-48 shrink-0">
        <Logs />
      </div>
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
