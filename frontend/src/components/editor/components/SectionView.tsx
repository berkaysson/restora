import React from "react";
import type { Block } from "../../../types";

interface SectionViewProps {
  blocks: Block[];
  zoom: number;
  aspectRatio: number;
  highlightIndex: number | null;
  selectedIndex: number | null;
  onHighlightChange: (idx: number | null) => void;
  onSelect: (idx: number | null) => void;
  availableLabels: string[];
  hiddenLabels: string[];
  globalHiddenLabels: string[];
}

export const SectionView: React.FC<SectionViewProps> = ({
  blocks,
  zoom,
  aspectRatio,
  highlightIndex,
  selectedIndex,
  onHighlightChange,
  onSelect,
  hiddenLabels,
  globalHiddenLabels,
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
        className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5 text-base-content"
        style={{
          width: `1000px`,
          height: `${1000 / aspectRatio}px`,
          transform: `scale(${zoom})`,
        }}
      >
        {blocks.map((block, idx) => {
          // Check if block should be hidden
          if (
            hiddenLabels.includes(block.layout_label) ||
            globalHiddenLabels.includes(block.layout_label)
          ) {
            return null;
          }

          const [x1, y1, x2, y2] = block.bbox;
          const width = x2 - x1;
          const height = y2 - y1;

          const isHighlighted = highlightIndex === idx;
          const isSelected = selectedIndex === idx;

          return (
            <div
              key={idx}
              className={`absolute border transition-all duration-200 group ${
                isSelected
                  ? "border-primary bg-primary/10 z-20"
                  : isHighlighted
                    ? "border-primary/50 bg-primary/5 z-10"
                    : "border-transparent hover:border-base-300"
              }`}
              style={{
                left: `${x1}px`,
                top: `${y1}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
              onMouseEnter={() => onHighlightChange(idx)}
              onMouseLeave={() => onHighlightChange(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSelected ? null : idx);
              }}
            >
              {/* Layout Label Badge */}
              <div
                className={`absolute -top-3 left-0 px-1 text-[10px] leading-3 text-white rounded opacity-0 transition-opacity ${
                  isSelected || isHighlighted
                    ? "opacity-100 bg-primary"
                    : "group-hover:opacity-100 bg-base-content/50"
                }`}
              >
                {block.layout_label}
              </div>

              {/* Text Content */}
              <div
                className="w-full h-full overflow-hidden text-transparent whitespace-pre-wrap select-none"
                style={{ fontSize: `${height * 0.5}px`, lineHeight: 1 }}
              >
                {block.text}
              </div>

              {/* Visual Text Overlay (for readability if needed, but we keep it clean for now) */}
              <div className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden text-xs text-center pointer-events-none text-base-content/70">
                {/* Optional: Show text preview on hover or always? 
                      For now, adhering to instruction: "Use turkish in ui bu english in code"
                      Maybe just a visual block indicator.
                  */}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
