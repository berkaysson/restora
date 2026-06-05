/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview File processing hook for document upload and OCR.
 *
 * Provides functions for uploading new documents and reprocessing
 * existing ones through the OCR backend.
 *
 * @module hooks/useFileProcessing
 */

import { useCallback, useEffect, useState, useRef } from "react";
import axios from "axios";
import { useLayout } from "../context/LayoutContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useLogs } from "../context/LogContext";
import { fixTurkishHyphens } from "../utils/textUtils";
import type { PageData } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const { setData, setHiddenLabels, setAllPages, allPages, setSelectedIndex, clearAnalysis } =
    useAnalysis();
  const { addLog, clearLogs } = useLogs();

  const fetchAllPages = useCallback(
    async (jobId: string) => {
      try {
        setLoadingMessage("Tüm sayfalar indiriliyor...");
        const res = await axios.get(
          `${BASE_URL}/api/v2/documents/${jobId}/pages`,
        );
        const pages = res.data;

        // Parse layout and fix text for all pages
        const processedPages: PageData[] = pages.map((page: any) => {
          const text = page.ocr_result?.text || "";
          const layoutRaw = page.layout_data || { lines: [], blocks: [] };

          const parsedLayout = {
            width: layoutRaw.width || 0,
            height: layoutRaw.height || 0,
            text_lines: layoutRaw.lines || [],
            layout_blocks: layoutRaw.blocks || [],
          };

          const fixedText = fixTurkishHyphens(text);

          return {
            status: "success",
            job_id: jobId,
            text: fixedText,
            layout: parsedLayout,
            clean_image: page.image_path ? page.image_path.replace(/\\/g, '/') : "",
            page_number: page.page_number,
          };
        });

        setAllPages(processedPages);
        setTotalPages(processedPages.length);
        setCurrentPage(1);

        // Set initial page data to page 1
        if (processedPages.length > 0) {
          const firstPage = processedPages.find(
            (p: PageData) => p.page_number === 1,
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
        setIsOverlayOpen(false);
        addLog(`Frontend: Loaded all pages for job ${jobId}`, "frontend");
      } catch (e) {
        console.error("Error fetching all pages", e);
        addLog(`Frontend: Error fetching all pages: ${e}`, "frontend");
        setLoading(false);
        setIsOverlayOpen(false);
        alert("Error loading document pages.");
      }
    },
    [
      addLog,
      setData,
      setHiddenLabels,
      setLoading,
      setIsOverlayOpen,
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
      e.target.value = ""; // Reset input value to allow selecting same file again
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

      try {
        addLog(`Frontend: Sending POST /api/v2/ocr/upload request...`, "frontend");
        
        const res = await axios.post(`${BASE_URL}/api/v2/ocr/upload`, formData, {
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || 1;
            const percentCompleted = Math.round(
              (progressEvent.loaded * 30) / total
            );
            // Limit to 30% for raw upload phase
            setProgress(percentCompleted);
          },
        });

        const doc = res.data;
        const jobId = doc.id;
        
        setTotalPages(doc.total_pages);
        setProcessedPages(doc.processed_pages);
        
        addLog(
          `Frontend: Upload complete. Job ID: ${jobId}. Connecting to WS...`,
          "frontend"
        );

        if (doc.status === "completed") {
          addLog(`Frontend: Job ${jobId} already completed.`, "system");
          setProgress(100);
          await fetchAllPages(jobId);
        } else {
          setActiveJobId(jobId);
          setLoadingMessage("AI Analizi yapılıyor...");
          
          // Connect to progress WS
          const wsUrl = `${BASE_URL.replace(/^http/, "ws")}/api/v2/ws/progress/${jobId}`;
          const socket = new WebSocket(wsUrl);
          socketRef.current = socket;

          socket.onopen = () => {
            addLog(`Frontend: Connected to progress stream for ${jobId}`, "system");
          };

          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.event === "page_completed") {
                setProcessedPages(data.processed_pages);
                setTotalPages(data.total_pages);
                
                // Calculate progress: 30% uploaded + remaining 70% scale
                const workProgress = data.total_pages > 0 
                  ? Math.round((data.processed_pages / data.total_pages) * 70) 
                  : 0;
                setProgress(30 + workProgress);
                
                addLog(
                  `Frontend: Page ${data.page_number}/${data.total_pages} processed`,
                  "system"
                );

                if (data.status === "completed" || data.processed_pages === data.total_pages) {
                  setProgress(100);
                  addLog(`Frontend: Job ${jobId} completed`, "system");
                  socket.close();
                  socketRef.current = null;
                  setActiveJobId(null);

                  setTimeout(() => {
                    fetchAllPages(jobId);
                  }, 500);
                }
              } else if (data.event === "page_failed") {
                addLog(
                  `Frontend: Page ${data.page_number} failed: ${data.error}`,
                  "system"
                );
              }
            } catch (e) {
              console.error("WS Parse Error", e);
            }
          };

          socket.onerror = (error) => {
            console.error("WS Error", error);
            addLog(`Frontend: WebSocket error`, "system");
            socketRef.current = null;
            setActiveJobId(null);
          };
        }
      } catch (err) {
        console.error(err);
        addLog(`Frontend: Error during upload - ${err}`, "frontend");
        alert(
          `Hata oluştu! ${err instanceof Error ? err.message : "Backend hatası"}`
        );
        setLoading(false);
        setActiveJobId(null);
      }
    },
    [
      setLoading,
      setIsOverlayOpen,
      setProgress,
      setLoadingMessage,
      addLog,
      setProcessedPages,
      setTotalPages,
      clearLogs,
      fetchAllPages,
      setCurrentPage,
      setSelectedIndex,
      setActiveJobId,
    ]
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

      try {
        // 1. Get current document status
        const statusRes = await axios.get(
          `${BASE_URL}/api/v2/documents/${jobId}`,
        );
        const doc = statusRes.data;

        setProcessedPages(doc.processed_pages);
        setTotalPages(doc.total_pages);
        
        if (doc.status === "completed") {
          // If already completed, load all pages
          await fetchAllPages(jobId);
          setProgress(100);
        } else {
          setActiveJobId(jobId);
          // If not completed, trigger reprocessing and listen via WebSocket progress
          const reprocessRes = await axios.post(
            `${BASE_URL}/api/v2/ocr/process-existing/${jobId}`,
          );
          
          if (reprocessRes.data.status === "completed") {
            await fetchAllPages(jobId);
            setProgress(100);
            setActiveJobId(null);
          } else {
            // Document is processing, open WS progress stream
            setLoadingMessage("AI Analizi yapılıyor...");
            const wsUrl = `${BASE_URL.replace(/^http/, "ws")}/api/v2/ws/progress/${jobId}`;
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => {
              addLog(`Frontend: Connected to progress stream for ${jobId}`, "system");
            };

            socket.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);

                if (data.event === "page_completed") {
                  setProcessedPages(data.processed_pages);
                  setTotalPages(data.total_pages);
                  setProgress(Math.round((data.processed_pages / data.total_pages) * 100));
                  addLog(
                    `Frontend: Page ${data.page_number}/${data.total_pages} processed`,
                    "system",
                  );

                  if (data.status === "completed" || data.processed_pages === data.total_pages) {
                    setProgress(100);
                    addLog(`Frontend: Job completed`, "system");
                    socket.close();
                    socketRef.current = null;
                    setActiveJobId(null);
                    setTimeout(() => {
                      fetchAllPages(jobId);
                    }, 500);
                  }
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
              socketRef.current = null;
              setActiveJobId(null);
            };
          }
        }
      } catch (err) {
        console.error(err);
        addLog(`Frontend: Error opening job - ${err}`, "frontend");
        alert(`Hata: ${err instanceof Error ? err.message : "Bilinmeyen hata"}`);
        setLoading(false);
        setActiveJobId(null);
      }
    },
    [
      setLoading,
      setIsOverlayOpen,
      setIsFileListOpen,
      setProgress,
      setLoadingMessage,
      addLog,
      clearLogs,
      setProcessedPages,
      setTotalPages,
      fetchAllPages,
      setCurrentPage,
      setSelectedIndex,
      setActiveJobId,
    ]
  );

  const cancelProcessing = useCallback(async () => {
    if (!activeJobId) return;
    try {
      setLoadingMessage("İşlem iptal ediliyor...");
      addLog(`Frontend: Cancelling job ${activeJobId}...`, "frontend");
      
      await axios.post(`${BASE_URL}/api/v2/ocr/cancel/${activeJobId}`);
      
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      addLog(`Frontend: Job ${activeJobId} successfully cancelled.`, "frontend");
      clearAnalysis();
      setActiveJobId(null);
      setLoading(false);
      setProgress(0);
      setIsOverlayOpen(false);
    } catch (err) {
      console.error("Cancel failed", err);
      addLog(`Frontend: Cancel failed - ${err}`, "frontend");
      alert("İptal işlemi başarısız oldu.");
      clearAnalysis();
      setActiveJobId(null);
      setLoading(false);
      setIsOverlayOpen(false);
    }
  }, [activeJobId, addLog, setLoading, setProgress, setIsOverlayOpen, setLoadingMessage, clearAnalysis]);

  return { handleUpload, handleOpenFile, fetchAllPages, cancelProcessing, activeJobId };
}
