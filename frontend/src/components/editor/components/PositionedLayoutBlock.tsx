import React from "react";
import type { LayoutBlock } from "../../../types";

// Color map per layout label for visual distinction
const LABEL_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  "Section-header": {
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.7)",
    text: "#8b5cf6",
  },
  Text: {
    bg: "rgba(59, 130, 246, 0.10)",
    border: "rgba(59, 130, 246, 0.6)",
    text: "#3b82f6",
  },
  Table: {
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.7)",
    text: "#22c55e",
  },
  Figure: {
    bg: "rgba(251, 146, 60, 0.12)",
    border: "rgba(251, 146, 60, 0.7)",
    text: "#fb923c",
  },
  Caption: {
    bg: "rgba(236, 72, 153, 0.10)",
    border: "rgba(236, 72, 153, 0.6)",
    text: "#ec4899",
  },
  List: {
    bg: "rgba(20, 184, 166, 0.10)",
    border: "rgba(20, 184, 166, 0.6)",
    text: "#14b8a6",
  },
  Footnote: {
    bg: "rgba(234, 179, 8, 0.10)",
    border: "rgba(234, 179, 8, 0.6)",
    text: "#eab308",
  },
};

const DEFAULT_COLOR = {
  bg: "rgba(100, 116, 139, 0.10)",
  border: "rgba(100, 116, 139, 0.6)",
  text: "#64748b",
};

interface PositionedLayoutBlockProps {
  block: LayoutBlock;
  idx: number;
  documentWidth: number;
  documentHeight: number;
  isHighlighted: boolean;
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
        className={`absolute bottom-2 right-2 text-xs font-black font-mono pointer-events-none transition-opacity duration-150 ${
          isHighlighted ? "opacity-100" : "opacity-0 group-hover:opacity-60"
        }`}
        style={{ color: colors.text, textShadow: "0 0 10px white" }}
      >
        #{idx + 1}
      </span>
    </div>
  );
};
