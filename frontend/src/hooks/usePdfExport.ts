/**
 * @fileoverview PDF export hook for searchable PDF generation.
 *
 * Creates searchable PDFs from OCR results by positioning extracted
 * text at the original coordinates from the source document.
 *
 * @module hooks/usePdfExport
 */

import { useCallback, useState } from "react";
import { jsPDF } from "jspdf";
import { useAnalysis } from "../context/AnalysisContext";
import type { PageData, TextLine } from "../types";
import RobotoRegular from "../assets/Roboto-Regular.ttf";

import {
  calculateTextLayout,
  calculateMedianLineHeight,
} from "./useTextLayout";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Hook for exporting OCR results as searchable PDF documents.
 */
export function usePdfExport() {
  const {
    data,
    allPages,
    originalPages,
    globalHiddenLabels,
    pageHiddenLabels,
  } = useAnalysis();
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Generate and download a searchable PDF from current OCR data.
   * Uses the shared layout logic to match the UI's appearance.
   */
  /**
   * Determine which pages should be exported based on user selection.
   */
  const getPagesToExport = useCallback(
    (startPage?: number, endPage?: number, includeChanges: boolean = true) => {
      const sourcePages =
          includeChanges || originalPages.length === 0 ? allPages : originalPages;

      if (sourcePages && sourcePages.length > 0) {
        const start = startPage || 1;
        const end = endPage || sourcePages.length;
        return sourcePages
            .filter(
                (p) => (p.page_number || 0) >= start && (p.page_number || 0) <= end,
            )
            .sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
      }

      return data ? [data] : [];
    },
    [allPages, originalPages, data],
  );

  /**
   * Load and embed the Roboto font into the PDF document.
   */
  const loadPdfFont = useCallback(async (doc: jsPDF) => {
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
  }, []);

  /**
   * Get the natural dimensions of a page image.
   */
  const getPageDimensions = useCallback(
    async (pageData: PageData): Promise<{ width: number; height: number }> => {
      // 1. Priority: Use layout dimensions if available
      if (pageData.layout?.width && pageData.layout?.height) {
        return {
          width: pageData.layout.width,
          height: pageData.layout.height,
        };
      }

      // 2. Secondary: Load image to get dimensions
      if (pageData.clean_image) {
        const imgUrl = `${BASE_URL}/${pageData.clean_image}`;
        try {
          return await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              resolve({
                width: img.naturalWidth,
                height: img.naturalHeight,
              });
            };
            img.onerror = () => reject(new Error("Image load failed"));
            img.src = imgUrl;
          });
        } catch (error) {
          console.warn(
            "Failed to load image for dimensions, falling back to default.",
            error,
          );
        }
      }
      // 3. Fallback: Default A4 dimensions (595.28 x 841.89 px)
      return { width: 595.28, height: 841.89 };
    },
    [],
  );

  /**
   * Get all hidden labels (global + page-specific) for a given page.
   */
  const getHiddenLabelsForPage = useCallback(
    (pageNumber: number, includeChanges: boolean) => {
      if (!includeChanges) return [];
      return [...globalHiddenLabels, ...(pageHiddenLabels[pageNumber] || [])];
    },
    [globalHiddenLabels, pageHiddenLabels],
  );

  /**
   * Check if an item (block or line) is visible based on its labels.
   */
  const isItemVisible = useCallback(
    (
      labels: string[] | string | undefined,
      hiddenLabels: string[],
      includeChanges: boolean,
    ) => {
      if (!includeChanges || !labels) return true;

      const labelArray = Array.isArray(labels) ? labels : [labels];
      return !labelArray.some((lbl) => hiddenLabels.includes(lbl));
    },
    [],
  );

  /**
   * Renders the content of a single page onto the PDF.
   */
  const renderPage = useCallback(
    (
      doc: jsPDF,
      pageData: PageData,
      pdfWidth: number,
      pdfHeight: number,
      includeChanges: boolean,
    ) => {
      const UI_REFERENCE_WIDTH = 1000;
      const aspectRatio = pdfWidth / pdfHeight;
      const exportWidth = UI_REFERENCE_WIDTH;
      const exportHeight = UI_REFERENCE_WIDTH / aspectRatio;

      doc.addPage(
        [exportWidth, exportHeight],
        pdfWidth > pdfHeight ? "landscape" : "portrait",
      );
      doc.setFont("Roboto", "normal");
      doc.setLineHeightFactor(1); // Match CSS line-height: 1

      const hiddenLabels = getHiddenLabelsForPage(
        pageData.page_number || 0,
        includeChanges,
      );

      // Calculate median line height for normalization
      const medianLineHeight = calculateMedianLineHeight(
        pageData.layout.text_lines,
      );

      // Render text using individual lines (matches UI behavior)
      if (pageData.layout?.text_lines) {
        pageData.layout.text_lines.forEach((line: TextLine) => {
          if (
            !isItemVisible(line.layout_labels, hiddenLabels, includeChanges)
          ) {
            return;
          }

          const { position, fontSize } = calculateTextLayout({
            bbox: line.bbox as [number, number, number, number],
            text: line.text,
            documentWidth: pageData.layout.width,
            documentHeight: pageData.layout.height,
            targetWidth: exportWidth,
            targetHeight: exportHeight,
            medianLineHeight,
            skipWidthConstraint: false, // Re-enable for better alignment within boxes
          });

          doc.setFontSize(fontSize);
          // jsPDF text positioning: y coordinate is the baseline.
          // To match UI (top-left), we offset y by the baseline ratio.
          doc.text(line.text, position.left, position.top + fontSize);
        });
      }
    },
    [getHiddenLabelsForPage, isItemVisible],
  );

  /**
   * Generate and download a searchable PDF from current OCR data.
   * Uses the shared layout logic to match the UI's appearance.
   */
  const handleExportPdf = useCallback(
    async (
      startPage?: number,
      endPage?: number,
      includeChanges: boolean = true,
    ) => {
      setIsExporting(true);

      try {
        const pagesToExport = getPagesToExport(
          startPage,
          endPage,
          includeChanges,
        );

        if (pagesToExport.length === 0) {
          alert("Dışa aktarılacak sayfa bulunamadı.");
          return;
        }

        // Create PDF document
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: "a4",
        });
        doc.deletePage(1);

        // Load Font
        await loadPdfFont(doc);

        // Process each page
        for (const pageData of pagesToExport) {
          const { width, height } = await getPageDimensions(pageData);
          renderPage(doc, pageData, width, height, includeChanges);
        }

        doc.save(`export_${data?.job_id || "document"}.pdf`);
      } catch (error) {
        console.error("PDF Export Error:", error);
        alert("PDF oluşturulurken hata oluştu.");
      } finally {
        setIsExporting(false);
      }
    },
    [data, getPagesToExport, loadPdfFont, getPageDimensions, renderPage],
  );

  return { handleExportPdf, isExporting };
}
