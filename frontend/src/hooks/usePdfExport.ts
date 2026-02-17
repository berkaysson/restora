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
import type { PageData, Block, TextLine } from "../types";
import RobotoRegular from "../assets/Roboto-Regular.ttf";

/**
 * Hook for exporting OCR results as searchable PDF documents.
 *
 * Generates a PDF with text positioned at the original bounding box
 * coordinates from the OCR analysis. The resulting PDF maintains
 * the visual layout while being fully searchable.
 *
 * Features:
 * - Preserves original document dimensions
 * - Uses Roboto font for Turkish character support
 * - Text positioned at OCR-detected coordinates
 *
 * @returns Object containing the export function
 *
 * @example
 * ```tsx
 * const { handleExportPdf } = usePdfExport();
 *
 * <button onClick={handleExportPdf}>Export Searchable PDF</button>
 * ```
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
   * Uses the clean image dimensions to match the source document layout.
   */
  const handleExportPdf = useCallback(
    async (
      startPage?: number,
      endPage?: number,
      useBlocks: boolean = true,
      includeChanges: boolean = true,
    ) => {
      // Determine pages to export
      let pagesToExport: PageData[] = [];

      setIsExporting(true);

      try {
        const sourcePages =
          includeChanges || originalPages.length === 0
            ? allPages
            : originalPages;

        if (sourcePages && sourcePages.length > 0) {
          // Multi-page document
          const start = startPage || 1;
          const end = endPage || sourcePages.length;
          pagesToExport = sourcePages
            .filter(
              (p) =>
                (p.page_number || 0) >= start && (p.page_number || 0) <= end,
            )
            .sort((a, b) => (a.page_number || 0) - (b.page_number || 0));
        } else if (data) {
          // Single page or current page only (fallback)
          pagesToExport = [data];
        }

        if (pagesToExport.length === 0) {
          alert("Dışa aktarılacak sayfa bulunamadı.");
          return;
        }

        // Create PDF document
        // We'll use the dimensions of the first page to initialize, but updates per page
        const doc = new jsPDF({
          orientation: "portrait",
          unit: "px",
          format: "a4", // Default, will change per page
        });
        doc.deletePage(1); // Remove initial page

        // Load Font
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

        // Process each page
        for (const pageData of pagesToExport) {
          let pdfWidth = 595.28;
          let pdfHeight = 841.89;

          if (pageData.clean_image) {
            const imgUrl = `http://localhost:8000/${pageData.clean_image}`;
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                pdfWidth = img.naturalWidth;
                pdfHeight = img.naturalHeight;
                resolve();
              };
              img.onerror = () => {
                console.warn(
                  "Failed to load image for dimensions, using default.",
                );
                resolve();
              };
              img.src = imgUrl;
            });
          }

          doc.addPage(
            [pdfWidth, pdfHeight],
            pdfWidth > pdfHeight ? "landscape" : "portrait",
          );
          doc.setFont("Roboto", "normal");

          // Determine hidden labels for this page
          const hiddenOnThisPage = includeChanges
            ? [
                ...globalHiddenLabels,
                ...(pageHiddenLabels[pageData.page_number || 0] || []),
              ]
            : [];

          const isLineVisible = (line: TextLine) => {
            if (!includeChanges) return true;
            if (!line.layout_labels) return true;
            return !line.layout_labels.some((lbl) =>
              hiddenOnThisPage.includes(lbl),
            );
          };

          // Use blocks if available (better for read-aloud)
          if (
            useBlocks &&
            pageData.layout?.blocks &&
            pageData.layout.blocks.length > 0
          ) {
            pageData.layout.blocks.forEach((block: Block) => {
              // Check visibility of block based on its lines or its own label (if block has label)
              // Since block has layout_label, we can check that too.
              // But currently Block interface has layout_label.
              if (
                includeChanges &&
                hiddenOnThisPage.includes(block.layout_label)
              ) {
                return;
              }

              const { bbox, text, line_indices } = block;
              if (!bbox) return;

              const x = bbox[0];
              const y = bbox[1];
              const width = bbox[2] - bbox[0];

              // Calculate average line height for font size
              let avgHeight = 12; // Default
              if (line_indices && pageData.layout.text_lines) {
                const lines = line_indices
                  .map((idx: number) => pageData.layout.text_lines[idx])
                  .filter(Boolean);
                if (lines.length > 0) {
                  // Check if any line in block is hidden?
                  // Usually if block label is hidden, whole block is hidden.
                  // If individual lines are hidden but block is not...
                  // For now assume block label controls block visibility.

                  const totalHeight = lines.reduce(
                    (sum: number, l: TextLine) => sum + (l.bbox[3] - l.bbox[1]),
                    0,
                  );
                  avgHeight = totalHeight / lines.length;
                }
              }

              doc.setFontSize(avgHeight);
              doc.text(text, x, y + avgHeight * 0.75, {
                maxWidth: width,
              });
            });
          } else if (pageData.layout?.text_lines) {
            // Fallback to individual lines
            pageData.layout.text_lines.forEach(
              (line: {
                bbox: number[];
                text: string;
                layout_labels?: string[];
              }) => {
                // Check visibility
                if (!isLineVisible(line as TextLine)) return;

                const { bbox, text } = line;
                if (!bbox) return;

                const x = bbox[0];
                const y = bbox[1];
                const height = bbox[3] - bbox[1];

                doc.setFontSize(height);
                doc.text(text, x, y + height * 0.75);
              },
            );
          }
        }

        doc.save(`export_${data?.job_id || "document"}.pdf`);
      } catch (error) {
        console.error("PDF Export Error:", error);
        alert("PDF oluşturulurken hata oluştu.");
      } finally {
        setIsExporting(false);
      }
    },
    [data, allPages, originalPages, globalHiddenLabels, pageHiddenLabels],
  );

  return { handleExportPdf, isExporting };
}
