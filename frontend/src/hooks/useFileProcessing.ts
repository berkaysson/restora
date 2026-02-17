/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview File processing hook for document upload and OCR.
 *
 * Provides functions for uploading new documents and reprocessing
 * existing ones through the OCR backend.
 *
 * @module hooks/useFileProcessing
 */

import { useCallback, useEffect } from "react";
import axios, { type AxiosResponse } from "axios";
import { useLayout } from "../context/LayoutContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useLogs } from "../context/LogContext";
import { fixTurkishHyphens } from "../utils/textUtils";

/**
 * Hook for handling file uploads and OCR processing.
 *
 * Manages the complete file processing lifecycle including:
 * - File upload with progress tracking
 * - Backend communication via axios
 * - Response parsing and state updates
 * - Error handling and user feedback
 *
 * @returns Object containing file handling functions
 *
 * @example
 * ```tsx
 * const { handleUpload, handleOpenFile } = useFileProcessing();
 *
 * // For file input element
 * <input type="file" onChange={handleUpload} accept=".pdf,.jpg,.png" />
 *
 * // For reopening existing job
 * <button onClick={() => handleOpenFile(job.id)}>Open</button>
 * ```
 */
export function useFileProcessing() {
  const {
    setLoading,
    setIsOverlayOpen,
    setLoadingMessage,
    setProgress,
    setIsFileListOpen,
    setProcessedPages,
    setTotalPages,
    currentPage,
    setCurrentPage,
  } = useLayout();

  const { setData, setHiddenLabels, setAllPages, allPages, setSelectedIndex } =
    useAnalysis();
  const { addLog, clearLogs } = useLogs();

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
      setSelectedIndex(null);
      setData({ ...res.data, text: fixedText, layout: parsedLayout });
      addLog(`Frontend: Data successfully updated.`, "frontend");
    },
    [setData, setHiddenLabels, addLog, setSelectedIndex],
  );

  const fetchAllPages = useCallback(
    async (jobId: string) => {
      try {
        setLoadingMessage("Tüm sayfalar indiriliyor...");
        const res = await axios.get(
          `http://localhost:8000/document/${jobId}/all-pages`,
        );
        const { pages } = res.data;

        // Parse layout and fix text for all pages
        const processedPages = pages.map((page: any) => {
          const layout = page.ocr_data?.layout || { text_lines: [] };
          const text = page.ocr_data?.text || "";

          const parsedLayout = (typeof layout === "string"
            ? JSON.parse(layout)
            : layout) || { text_lines: [] };

          const fixedText = fixTurkishHyphens(text);

          return {
            ...page,
            text: fixedText,
            layout: parsedLayout,
            clean_image: page.image_path,
          };
        });

        setAllPages(processedPages);
        setTotalPages(processedPages.length);
        setCurrentPage(1);

        // Set initial page data to page 1
        if (processedPages.length > 0) {
          const firstPage = processedPages.find(
            (p: any) => p.page_number === 1,
          );
          if (firstPage) {
            setHiddenLabels([]);
            setSelectedIndex(null);
            setData({
              status: "success",
              job_id: jobId,
              clean_image: firstPage.clean_image,
              text: firstPage.text,
              layout: firstPage.layout,
              typos: [],
              page_number: firstPage.page_number,
            });
          }
        }

        setLoading(false);
        addLog(`Frontend: Loaded all pages for job ${jobId}`, "frontend");
      } catch (e) {
        console.error("Error fetching all pages", e);
        addLog(`Frontend: Error fetching all pages: ${e}`, "frontend");
        setLoading(false);
        alert("Error loading document pages.");
      }
    },
    [
      addLog,
      setData,
      setHiddenLabels,
      setLoading,
      setAllPages,
      setLoadingMessage,
      setTotalPages,
      setCurrentPage,
      setSelectedIndex,
    ],
  );

  // Update displayed data when currentPage changes
  useEffect(() => {
    if (currentPage > 0 && allPages.length > 0) {
      const pageData = allPages.find((p) => p.page_number === currentPage);
      if (pageData) {
        setSelectedIndex(null);
        setData({
          status: "success",
          job_id: pageData.job_id || "",
          clean_image: pageData.clean_image,
          text: pageData.text,
          layout: pageData.layout,
          typos: [],
          page_number: pageData.page_number,
        });
      }
    }
  }, [currentPage, allPages, setData, setHiddenLabels, setSelectedIndex]);

  // Check queue status periodically or rely on WS?
  // WS is better. We will connect specifically for the job.

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

      // Reset state for new upload
      clearLogs();
      setProcessedPages(0);
      setTotalPages(0);
      setProgress(0);
      setCurrentPage(1);
      setSelectedIndex(null);

      let progressInterval: ReturnType<typeof setInterval> | undefined;

      const isPdf = file.type === "application/pdf";
      const uploadUrl = isPdf
        ? "http://localhost:8000/upload-pdf"
        : "http://localhost:8000/upload";

      try {
        addLog(
          `Frontend: Sending POST ${isPdf ? "/upload-pdf" : "/upload"} request...`,
          "frontend",
        );
        const res = await axios.post(uploadUrl, formData, {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || 1;
            const percentCompleted = Math.round(
              (progressEvent.loaded * 30) / total,
            );
            // Only update progress for upload phase if not PDF (PDF progress handled by WS after upload)
            if (!isPdf || percentCompleted < 100) {
              setProgress(percentCompleted);
            }
          },
        });

        if (isPdf) {
          // Async flow
          const jobId = res.data.job_id;
          setLoadingMessage("AI Analizi yapılıyor (Çok Sayfalı)...");
          addLog(
            `Frontend: PDF Upload complete. Job ID: ${jobId}. Connecting to WS...`,
            "frontend",
          );

          // Connect to Job-specific WebSocket
          const wsUrl = `ws://localhost:8000/ws/progress/${jobId}`;
          const socket = new WebSocket(wsUrl);

          socket.onopen = async () => {
            addLog(
              `Frontend: Connected to progress stream for ${jobId}`,
              "system",
            );

            // Check status immediately in case we missed events due to race condition
            try {
              const statusRes = await axios.get(
                `http://localhost:8000/document/${jobId}/status`,
              );
              const statusData = statusRes.data;

              setProcessedPages(statusData.completed_pages);
              setTotalPages(statusData.total_pages);
              setProgress(statusData.progress_percentage);

              if (statusData.status === "completed") {
                addLog(`Frontend: Job ${jobId} already completed.`, "system");
                socket.close();
                fetchAllPages(jobId);
              }
            } catch (err) {
              console.error("Error fetching initial status", err);
            }
          };

          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.event === "page_completed") {
                setProcessedPages(data.processed_pages);
                setTotalPages(data.total_pages);
                setProgress(data.progress);
                addLog(
                  `Frontend: Page ${data.page_number}/${data.total_pages} processed`,
                  "system",
                );
              } else if (data.event === "job_completed") {
                setProcessedPages(data.processed_pages);
                setTotalPages(data.total_pages);
                setProgress(100);
                addLog(`Frontend: Job ${data.job_id} completed`, "system");
                socket.close(); // Close on completion

                setTimeout(() => {
                  fetchAllPages(data.job_id);
                }, 500);
              } else if (data.event === "page_failed") {
                addLog(
                  `Frontend: Page ${data.page_number} failed: ${data.error}`,
                  "system",
                );
              }
            } catch (e) {
              console.error("WS Parse Error", e);
            }
          };

          socket.onerror = (error) => {
            console.error("WS Error", error);
            addLog(`Frontend: WebSocket error`, "system");
          };
        } else {
          // Sync flow (Image)
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
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        addLog(`Frontend: Error during upload - ${err}`, "frontend");
        alert(
          `Hata oluştu! ${err instanceof Error ? err.message : "Backend hatası"}`,
        );
      } finally {
        if (progressInterval!) clearInterval(progressInterval);
        // Loading state determines if overlay is shown.
        // For PDF, we keep loading true until WS job_completed finishes fetching data.
        if (!isPdf) {
          setLoading(false);
        }
      }
    },
    [
      setLoading,
      setIsOverlayOpen,
      setProgress,
      setLoadingMessage,
      addLog,
      processResponse,
      setProcessedPages,
      setTotalPages,
      clearLogs,
      fetchAllPages,
      setCurrentPage,
      setSelectedIndex,
    ],
  );

  const handleOpenFile = useCallback(
    async (jobId: string) => {
      setLoading(true);
      setIsOverlayOpen(true);
      setIsFileListOpen(false);

      // Reset state for new job open
      clearLogs();
      setProcessedPages(0);
      setTotalPages(0);
      setProgress(0);
      setCurrentPage(1);
      setSelectedIndex(null);

      setLoadingMessage("Dosya açılıyor...");
      addLog(`Frontend: Opening existing job ${jobId}`, "frontend");

      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return 90;
          return prev + 10;
        });
      }, 200);

      try {
        const statusRes = await axios.get(
          `http://localhost:8000/document/${jobId}/status`,
        );

        if (
          statusRes.data.status === "completed" &&
          statusRes.data.total_pages > 1
        ) {
          await fetchAllPages(jobId);
          setIsOverlayOpen(false);
        } else {
          const res = await axios.post(
            `http://localhost:8000/process-existing/${jobId}`,
          );
          processResponse(res);
        }
        setProgress(100);
      } catch (err) {
        console.error(err);
        try {
          const res = await axios.post(
            `http://localhost:8000/process-existing/${jobId}`,
          );
          processResponse(res);
          setProgress(100);
        } catch (e) {
          addLog(`Frontend: Error opening job - ${e}`, "frontend");
          alert(`Hata: ${e instanceof Error ? e.message : "Unknown error"}`);
        }
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
      clearLogs,
      setProcessedPages,
      setTotalPages,
      fetchAllPages,
      setCurrentPage,
      setSelectedIndex,
    ],
  );

  return { handleUpload, handleOpenFile, fetchAllPages };
}
