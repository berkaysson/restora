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
import { stripHtmlTags } from "../utils/textUtils";
import { getSortedLines, groupLines, mergeHyphenatedLineBreaks } from "../utils/exportUtils";

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
   * Helper to generate a flowable semantic PDF.
   */
  const generateSemanticPdf = useCallback(
    async (pagesToExport: PageData[], includeChanges: boolean, mergeHyphens: boolean) => {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });
      doc.deletePage(1);

      await loadPdfFont(doc);

      const PAGE_WIDTH = 595.28;
      const PAGE_HEIGHT = 841.89;
      const MARGIN_LEFT = 40;
      const MARGIN_RIGHT = 40;
      const MARGIN_TOP = 50;
      const MARGIN_BOTTOM = 50;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

      let currentY = MARGIN_TOP;

      const ensurePage = () => {
        if (doc.getNumberOfPages() === 0) {
          doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], "portrait");
          doc.setFont("Roboto", "normal");
          currentY = MARGIN_TOP;
        }
      };

      const checkPageBreak = (neededHeight: number) => {
        ensurePage();
        if (currentY + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], "portrait");
          doc.setFont("Roboto", "normal");
          currentY = MARGIN_TOP;
        }
      };

      for (const page of pagesToExport) {
        if (!page.layout?.text_lines) continue;

        const pageNum = page.page_number || 1;
        const hiddenLabels = getHiddenLabelsForPage(pageNum, includeChanges);

        const visibleLines = page.layout.text_lines.filter((line) => {
          return isItemVisible(line.layout_labels, hiddenLabels, includeChanges);
        });

        const sortedLines = getSortedLines(visibleLines);
        const groups = groupLines(sortedLines);

        // Add page header/separator
        checkPageBreak(35);
        doc.setFont("Roboto", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`--- Sayfa ${pageNum} ---`, PAGE_WIDTH / 2, currentY, { align: "center" });
        currentY += 25;

        for (const group of groups) {
          let text = "";
          if (mergeHyphens) {
            const textWithNewlines = group.lines
              .map((l) => stripHtmlTags(l.text).trim())
              .join("\n");
            text = mergeHyphenatedLineBreaks(textWithNewlines);
          } else {
            text = group.lines
              .map((l) => stripHtmlTags(l.text).trim())
              .join(" ");
          }
          if (!text) continue;

          let fontSize = 11;
          let textColor = [50, 50, 50];
          let spacingAfter = 12;

          if (group.label === "Section-header") {
            fontSize = 15;
            textColor = [31, 41, 55];
            spacingAfter = 16;
          } else if (group.label === "List") {
            fontSize = 11;
            textColor = [60, 60, 60];
            spacingAfter = 8;
          } else if (group.label === "Footnote") {
            fontSize = 9;
            textColor = [120, 120, 120];
            spacingAfter = 10;
          } else if (group.label === "Caption") {
            fontSize = 10;
            textColor = [100, 100, 100];
            spacingAfter = 10;
          }

          ensurePage();
          doc.setFont("Roboto", "normal");
          doc.setFontSize(fontSize);
          doc.setTextColor(textColor[0], textColor[1], textColor[2]);

          let linesToDraw: string[] = [];
          if (group.label === "List") {
            group.lines.forEach((l) => {
              const itemText = `• ${stripHtmlTags(l.text).trim()}`;
              const splitLines = doc.splitTextToSize(itemText, CONTENT_WIDTH);
              linesToDraw.push(...splitLines);
            });
          } else {
            linesToDraw = doc.splitTextToSize(text, CONTENT_WIDTH);
          }

          const lineHeight = fontSize * 1.35;
          const blockHeight = linesToDraw.length * lineHeight + spacingAfter;

          checkPageBreak(blockHeight);

          doc.text(linesToDraw, MARGIN_LEFT, currentY + fontSize);
          currentY += blockHeight;
        }
      }

      doc.save(`export_semantic_${data?.job_id || "document"}.pdf`);
    },
    [data, loadPdfFont, getHiddenLabelsForPage, isItemVisible],
  );

  /**
   * Generate and download a PDF file from current OCR data.
   */
  const handleExportPdf = useCallback(
    async (
      startPage?: number,
      endPage?: number,
      format: "layout-pdf" | "semantic-pdf" = "layout-pdf",
      includeChanges: boolean = true,
      mergeHyphens: boolean = true,
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

        if (format === "semantic-pdf") {
          await generateSemanticPdf(pagesToExport, includeChanges, mergeHyphens);
        } else {
          // Default: layout-pdf
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
        }
      } catch (error) {
        console.error("Export Error:", error);
        alert("Dosya oluşturulurken hata oluştu.");
      } finally {
        setIsExporting(false);
      }
    },
    [
      data,
      getPagesToExport,
      generateSemanticPdf,
      loadPdfFont,
      getPageDimensions,
      renderPage,
    ],
  );

  return { handleExportPdf, isExporting };
}
