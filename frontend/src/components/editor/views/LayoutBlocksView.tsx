import React from "react";
import type { TextLine, LayoutBlock } from "../../../types";
import { PositionedLayoutBlock } from "../components/PositionedLayoutBlock";
import { calculateTextLayout } from "../../../hooks/useTextLayout";

interface LayoutBlocksViewProps {
  layoutBlocks: LayoutBlock[];
  zoom: number;
  aspectRatio: number;
  documentWidth: number;
  documentHeight: number;
  highlightedBlockIndex: number | null;
  onHighlightChange: (idx: number | null) => void;
  textLines: TextLine[];
  medianLineHeight: number;
  isLineHidden: (line: TextLine) => boolean | undefined;
}

/**
 * Renders all layout_blocks as colored bounding box overlays on the document canvas.
 * Read-only — no editing or deletion, only hover highlight.
 */
export const LayoutBlocksView: React.FC<LayoutBlocksViewProps> = ({
  layoutBlocks,
  textLines,
  zoom,
  aspectRatio,
  documentWidth,
  documentHeight,
  highlightedBlockIndex,
  onHighlightChange,
  medianLineHeight,
  isLineHidden,
}) => {
  return (
    <div
      className="mx-auto transition-all origin-top"
      style={{
        width: `${1000 * zoom}px`,
        aspectRatio: `${aspectRatio}`,
      }}
    >
      <div
        className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5"
        style={{
          width: `1000px`,
          height: `${1000 / aspectRatio}px`,
          transform: `scale(${zoom})`,
        }}
      >
        {layoutBlocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-base-content/40">
              <span className="font-mono text-base font-medium">
                Mizanpaj bloğu bulunamadı
              </span>
              <span className="text-sm">
                Bu sayfa için layout analizi mevcut değil
              </span>
            </div>
          </div>
        )}

        {/* Layer 1: Layout Blocks */}
        {layoutBlocks.map((block: LayoutBlock, idx: number) => (
          <PositionedLayoutBlock
            key={idx}
            block={block}
            idx={idx}
            documentWidth={documentWidth}
            documentHeight={documentHeight}
            isHighlighted={highlightedBlockIndex === idx}
            onMouseEnter={() => onHighlightChange(idx)}
            onMouseLeave={() => onHighlightChange(null)}
          />
        ))}

        {/* Layer 2: Text Overlay (rendered on top of all blocks) */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {textLines.map((line, idx) => {
            if (isLineHidden(line)) return null;

            const { position, fontSize } = calculateTextLayout({
              bbox: line.bbox,
              text: line.text,
              documentWidth,
              documentHeight,
              targetWidth: 1000,
              targetHeight: 1000 / aspectRatio,
              medianLineHeight,
            });

            const {
              leftPct: left,
              topPct: top,
              widthPct: wPct,
              heightPct: hPct,
            } = position;

            return (
              <div
                key={idx}
                className="absolute overflow-visible font-serif transition-opacity whitespace-nowrap text-base-content"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${wPct}%`,
                  height: `${hPct}%`,
                  opacity: 1, // Always fully readable
                  fontSize: `${fontSize}px`,
                  lineHeight: 1,
                  transition: "opacity 150ms",
                  textShadow: "0px 0px 1px rgba(255,255,255,0.5)", // Better contrast against colored blocks
                }}
                dangerouslySetInnerHTML={{ __html: line.text }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
