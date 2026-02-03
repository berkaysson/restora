/**
 * @fileoverview PDF export hook for searchable PDF generation.
 *
 * Creates searchable PDFs from OCR results by positioning extracted
 * text at the original coordinates from the source document.
 *
 * @module hooks/usePdfExport
 */

import { useCallback } from "react";
import { jsPDF } from "jspdf";
import { useAnalysis } from "../context/AnalysisContext";
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
  const { data } = useAnalysis();

  /**
   * Generate and download a searchable PDF from current OCR data.
   * Uses the clean image dimensions to match the source document layout.
   */
  const handleExportPdf = useCallback(async () => {
    if (!data || !data.layout?.text_lines) {
      alert("OCR verisi bulunamadı.");
      return;
    }

    try {
      let pdfWidth = 595.28;
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
  }, [data]);

  return { handleExportPdf };
}
