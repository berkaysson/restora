import React from "react";
import type { LayoutBlock } from "../../../types";
import { LABEL_COLORS, DEFAULT_COLOR } from "../constants";

interface PositionedLayoutBlockProps {
  block: LayoutBlock;
  idx: number;
  documentWidth: number;
  documentHeight: number;
  isHighlighted: boolean;
  showDetails: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * Renders a single layout block as an absolutely-positioned bounding box overlay.
 * Shows label badge and confidence percentage on hover.
 * Read-only — no editing actions.
 */
export const PositionedLayoutBlock: React.FC<PositionedLayoutBlockProps> = ({
  block,
  idx,
  documentWidth,
  documentHeight,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [x1, y1, x2, y2] = block.bbox;
  const w = x2 - x1;
  const h = y2 - y1;

  const left = (x1 / documentWidth) * 100;
  const top = (y1 / documentHeight) * 100;
  const wPct = (w / documentWidth) * 100;
  const hPct = (h / documentHeight) * 100;

  const colors = LABEL_COLORS[block.label] ?? DEFAULT_COLOR;
  const confidencePct = Math.round((block.confidence ?? 1) * 100);

  return (
    <div
      data-layout-block
      className="absolute transition-all duration-150 group"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${wPct}%`,
        height: `${hPct}%`,
        backgroundColor: isHighlighted
          ? colors.bg.replace("0.1", "0.22").replace("0.12", "0.24")
          : colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "3px",
        zIndex: isHighlighted ? 50 : 10,
        transition:
          "background-color 150ms, border-color 150ms, box-shadow 150ms",
        boxShadow: isHighlighted
          ? `0 0 0 2px ${colors.border}, 0 4px 20px rgba(0,0,0,0.15)`
          : "none",
        cursor: "default",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Label badge – top left corner */}
      <div
        className="absolute flex items-center gap-2 pointer-events-none"
        style={{
          top: "-12px",
          left: "-12px",
          transform: "translateY(-100%)",
          paddingBottom: "6px",
        }}
      >
        <span
          className={`text-[13px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap transition-opacity duration-150 ${
            isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            backgroundColor: colors.border,
            color: "#fff",
            letterSpacing: "0.1em",
          }}
        >
          {block.label}
        </span>
        <span
          className={`text-[13px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap transition-opacity duration-150 ${
            isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            backgroundColor: "rgb(17, 24, 39)",
            color: "#fff",
          }}
        >
          Doğruluk:
          {confidencePct}%
        </span>
      </div>

      {/* Corner index indicator */}
      <span
        className={`absolute bottom-0 right-0 w-11 h-11 rounded-full font-black font-mono pointer-events-none transition-all duration-300 flex items-center justify-center text-xl opacity-75 scale-130`}
        style={{
          backgroundColor: colors.border,
          color: "#fff",
          borderColor: "rgba(255, 255, 255, 0.45)",
        }}
      >
        {block.position || idx + 1}
      </span>
    </div>
  );
};
