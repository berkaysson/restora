import React from "react";
import type { TextLine } from "../../../types";
import { stripHtmlTags } from "../../../utils/textUtils";
import { LABEL_COLORS, DEFAULT_COLOR } from "../constants";

interface ConfidenceViewProps {
  textLines: TextLine[];
  zoom: number;
  aspectRatio: number;
  documentWidth: number;
  documentHeight: number;
  isLineHidden: (line: TextLine) => boolean | undefined;
  medianLineHeight: number;
}

/**
 * Returns an rgba color string for a confidence value (0–1).
 * Red-to-Orange heatmap that only activates below 90% confidence.
 */
function confidenceToColor(confidence: number): string {
  const c = Math.max(0, Math.min(1, confidence));
  // 90% ve üzeri tamamen temiz/şeffaf kalsın
  if (c >= 0.9) return "transparent";

  // 0.9 barajına göre normalize edilmiş değer (0'dan 1'e)
  const normalizedC = c / 0.9;
  const intensity = 1 - normalizedC;

  // Görünürlük: %90'ın hemen altında %30 opaklıkla başlasın (daha belirgin)
  // %0'da %90 opaklığa ulaşsın
  const alpha = 0.3 + intensity * 0.6;

  // Renk: %0 iken 0 (Kırmızı), %90'a yaklaşırken 35 (Turuncu)
  const hue = normalizedC * 35;

  return `hsla(${hue}, 100%, 45%, ${alpha.toFixed(3)})`;
}

/**
 * ConfidenceView — positions every text line on the document canvas and
 * overlays a colour gradient that visualises OCR confidence.
 * Red (<50%) -> Orange (90%) -> Transparent (>90%).
 */
export const ConfidenceView: React.FC<ConfidenceViewProps> = ({
  textLines,
  zoom,
  aspectRatio,
  documentWidth,
  documentHeight,
  isLineHidden,
  medianLineHeight,
}) => {
  const scaleX = 1000 / documentWidth;
  const renderedDocHeight = 1000 / aspectRatio;

  return (
    <div
      className="mx-auto transition-all origin-top"
      style={{
        width: `${1000 * zoom}px`,
        aspectRatio: `${aspectRatio}`,
      }}
    >
      <div
        className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5 text-base-content"
        style={{
          width: `1000px`,
          height: `${1000 / aspectRatio}px`,
          transform: `scale(${zoom})`,
        }}
      >
        {textLines.map((line: TextLine, idx: number) => {
          if (isLineHidden(line)) return null;

          const [x1, y1, x2, y2] = line.bbox;
          const w = x2 - x1;
          const h = y2 - y1;
          const lineW = w * scaleX;

          // Font Normalization Logic (matching PositionedTextLine)
          const isBodyText =
            medianLineHeight > 0 &&
            Math.abs(h - medianLineHeight) / medianLineHeight < 0.25;
          const effectiveH = isBodyText ? medianLineHeight : h;

          const heightBasedSize =
            (effectiveH / documentHeight) * renderedDocHeight * 0.82;

          const plainText = stripHtmlTags(line.text);
          const charCount = plainText.length || 1;
          const AVG_CHAR_WIDTH_RATIO = 0.52;
          const widthBasedSize = lineW / (charCount * AVG_CHAR_WIDTH_RATIO);

          const fontSize = Math.min(heightBasedSize, widthBasedSize);

          const bg = confidenceToColor(line.confidence);
          const pct = Math.round(line.confidence * 100);

          const primaryLabel = line.layout_labels?.[0] || "No Label";
          const colors = LABEL_COLORS[primaryLabel] ?? DEFAULT_COLOR;

          // Akıllı Tooltip Konumlandırma: Üstte veya Sağda yer kalmazsa yön değiştir
          const isAtTop = y1 / documentHeight < 0.1;
          const isAtRight = x2 / documentWidth > 0.75;

          return (
            <div
              key={idx}
              className="absolute flex items-center group hover:z-50"
              style={{
                left: `${(x1 / documentWidth) * 100}%`,
                top: `${(y1 / documentHeight) * 100}%`,
                width: `${(w / documentWidth) * 100}%`,
                height: `${(h / documentHeight) * 100}%`,
                fontSize: `${fontSize}px`,
                lineHeight: 1,
              }}
            >
              {/* Confidence colour band — Üstte (z-20) */}
              <div
                className="absolute inset-0 z-20 transition-opacity pointer-events-none rounded-xs"
                style={{ background: bg }}
              />

              {/* Text label — Altta (z-0) */}
              <span
                className="relative z-0 block w-full h-full px-px font-serif leading-none text-base-content"
                style={{
                  width: "100%",
                  display: "block",
                  whiteSpace: "nowrap",
                }}
                dangerouslySetInnerHTML={{ __html: line.text }}
              />

              {/* Confidence badge — Akıllı konumlandırma ile görünürlüğü korur */}
              <div
                className={`absolute flex items-center gap-2 transition-all duration-150 opacity-0 pointer-events-none z-100 group-hover:opacity-100 whitespace-nowrap
                  ${isAtTop ? "top-full mt-4" : "-top-14"}
                  ${isAtRight ? "right-0" : "left-0"}
                `}
              >
                <span
                  className="text-[13px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-2xl"
                  style={{
                    backgroundColor: colors.border,
                    color: "#fff",
                    letterSpacing: "0.1em",
                  }}
                >
                  {line.layout_labels?.join(", ") || "No Label"}
                </span>
                <span
                  className="text-[13px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-2xl"
                  style={{
                    backgroundColor: "rgb(17, 24, 39)",
                    color: "#fff",
                  }}
                >
                  Doğruluk: {pct}%
                </span>
              </div>
            </div>
          );
        })}

        {/* Legend / Legend Scale */}
        <div className="absolute z-20 flex items-center gap-2 px-3 py-2 border rounded-lg shadow-lg bottom-3 right-3 bg-base-300/80 backdrop-blur-sm border-base-content/10">
          <span className="text-[10px] font-bold font-mono text-base-content/50 uppercase tracking-widest">
            Kritik (%0)
          </span>
          <div
            className="w-32 h-3 rounded-full"
            style={{
              background:
                "linear-gradient(to right, hsla(0,100%,45%,0.9), hsla(35,100%,45%,0.6), transparent)",
            }}
          />
          <span className="text-[10px] font-bold font-mono text-base-content/50 uppercase tracking-widest">
            Güvenli (%90+)
          </span>
        </div>
      </div>
    </div>
  );
};
