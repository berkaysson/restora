import React from "react";
import type { TextLine } from "../../../types";
import { useTextLayout } from "../../../hooks/useTextLayout";
import { TextLineEdit } from "./TextLineEdit";
import { TextLineActions } from "./TextLineActions";
import { LABEL_COLORS, DEFAULT_COLOR } from "../constants";

interface PositionedTextLineProps {
  line: TextLine;
  idx: number;
  isHighlighted: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editText: string;
  documentWidth: number;
  documentHeight: number;
  aspectRatio: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onEditTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  medianLineHeight: number;
}

/**
 * A text line positioned absolutely based on its bounding box coordinates.
 * Supports click-to-select behavior where actions persist until deselected.
 */
export const PositionedTextLine: React.FC<PositionedTextLineProps> = ({
  line,
  idx,
  isHighlighted,
  isSelected,
  isEditing,
  editText,
  documentWidth,
  documentHeight,
  aspectRatio,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEditTextChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
  medianLineHeight,
}) => {
  const { position, fontSize } = useTextLayout({
    bbox: line.bbox,
    text: line.text,
    documentWidth,
    documentHeight,
    targetWidth: 1000,
    targetHeight: 1000 / aspectRatio,
    medianLineHeight,
  });

  const { leftPct: left, topPct: top, widthPct: wPct, heightPct: hPct } =
    position;

  const confidencePct = Math.round((line.confidence ?? 1) * 100);

  const primaryLabel = line.layout_labels?.[0] || "No Label";
  const colors = LABEL_COLORS[primaryLabel] ?? DEFAULT_COLOR;

  // Determine visual state classes
  const isActive = isHighlighted || isSelected;
  const stateClasses = isEditing
    ? "z-60 border-primary bg-primary/10"
    : isSelected
      ? "z-50 border-primary/80 bg-primary/15 text-primary"
      : isHighlighted
        ? "bg-primary/20 text-primary z-50 border-primary"
        : "hover:bg-primary/5 text-base-content";

  return (
    <div
      key={idx}
      data-text-line
      className={`absolute flex items-center hover:z-50 group hover:ring-1 hover:ring-primary/50 rounded transition-colors cursor-pointer ${stateClasses}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${wPct}%`,
        height: `${hPct}%`,
        fontSize: `${fontSize}px`,
        lineHeight: 1,
        overflow: "visible",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {isEditing ? (
        <TextLineEdit
          editText={editText}
          onEditTextChange={onEditTextChange}
          onSave={onSave}
          onCancel={onCancel}
          variant="positioned"
        />
      ) : (
        <>
          <span
            className="block w-full h-full px-px font-serif leading-none"
            style={{
              width: "100%",
              display: "block",
              whiteSpace: "nowrap",
            }}
            dangerouslySetInnerHTML={{ __html: line.text }}
          />
          <TextLineActions
            onEdit={onStartEdit}
            onDelete={onDelete}
            isVisible={isActive}
          />
          <div
            className={`absolute flex items-center gap-2 pointer-events-none -top-14 left-0 transition-opacity duration-150 z-100 ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <span
              className="text-[13px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap"
              style={{
                backgroundColor: colors.border,
                color: "#fff",
                letterSpacing: "0.1em",
              }}
            >
              {line.layout_labels?.join(", ") || "No Label"}
            </span>
            <span
              className="text-[13px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap"
              style={{
                backgroundColor: "rgb(17, 24, 39)",
                color: "#fff",
              }}
            >
              Doğruluk: {confidencePct}%
            </span>
          </div>
        </>
      )}
    </div>
  );
};
