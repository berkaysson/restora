import { useCallback } from "react";
import axios, { type AxiosResponse } from "axios";
import { useLayout } from "../context/LayoutContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useLogs } from "../context/LogContext";
import { fixTurkishHyphens } from "../utils/textUtils";

export function useFileProcessing() {
  const {
    setLoading,
    setIsOverlayOpen,
    setLoadingMessage,
    setProgress,
    setIsFileListOpen,
  } = useLayout();

  const { setData, setHiddenLabels } = useAnalysis();
  const { addLog } = useLogs();

  const processResponse = useCallback(
    (res: AxiosResponse) => {
      if (res.data.status === "error") {
        throw new Error(res.data.message || "Unknown backend error");
      }

      // Surya çıktısını parse et
      const parsedLayout = (typeof res.data.layout === "string"
        ? JSON.parse(res.data.layout)
        : res.data.layout) || { text_lines: [] };

      // Türkçe Temizlikleri Uygula
      const fixedText = fixTurkishHyphens(res.data.text);

      setHiddenLabels([]); // Reset filters
      setData({ ...res.data, text: fixedText, layout: parsedLayout });
      addLog(`Frontend: Data successfully updated.`, "frontend");
    },
    [setData, setHiddenLabels, addLog],
  );

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files?.[0]) return;
      setLoading(true);
      setIsOverlayOpen(true);
      setProgress(0);
      setLoadingMessage("Dosya yükleniyor...");

      const file = e.target.files[0];
      addLog(`Frontend: Started processing file ${file.name}`, "frontend");

      const formData = new FormData();
      formData.append("file", file);

      let progressInterval: ReturnType<typeof setInterval>;

      try {
        addLog(`Frontend: Sending POST /upload request...`, "frontend");
        const res = await axios.post("http://localhost:8000/upload", formData, {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || 1;
            const percentCompleted = Math.round(
              (progressEvent.loaded * 30) / total,
            );
            setProgress(percentCompleted);
          },
        });

        setLoadingMessage("AI Analizi yapılıyor...");
        addLog(
          `Frontend: Upload complete. Waiting for analysis...`,
          "frontend",
        );

        setProgress(30);
        progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 1;
          });
        }, 500);

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
        setLoading(false);
      }
    },
    [
      setLoading,
      setIsOverlayOpen,
      setProgress,
      setLoadingMessage,
      addLog,
      processResponse,
    ],
  );

  const handleOpenFile = useCallback(
    async (jobId: string) => {
      setLoading(true);
      setIsOverlayOpen(true);
      setIsFileListOpen(false);
      setProgress(0);
      setLoadingMessage("Dosya açılıyor...");
      addLog(`Frontend: Opening existing job ${jobId}`, "frontend");

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
    },
    [
      setLoading,
      setIsOverlayOpen,
      setIsFileListOpen,
      setProgress,
      setLoadingMessage,
      addLog,
      processResponse,
    ],
  );

  return { handleUpload, handleOpenFile };
}
