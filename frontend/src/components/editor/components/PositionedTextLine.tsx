import React from "react";
import type { TextLine } from "../../../types";
import { TextLineEdit } from "./TextLineEdit";
import { TextLineActions } from "./TextLineActions";

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
}) => {
  const [x1, y1, x2, y2] = line.bbox;
  const w = x2 - x1;
  const h = y2 - y1;

  const left = (x1 / documentWidth) * 100;
  const top = (y1 / documentHeight) * 100;
  const wPct = (w / documentWidth) * 100;
  const hPct = (h / documentHeight) * 100;

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
      className={`absolute flex items-center hover:z-50 group border border-transparent hover:border-primary/50 rounded transition-colors cursor-pointer ${stateClasses}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${wPct}%`,
        height: `${hPct}%`,
        fontSize: `${(h / documentHeight) * (1000 / aspectRatio)}px`,
        lineHeight: 1,
        whiteSpace: "nowrap",
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
            className="block w-full h-full px-px"
            style={{
              fontSize: "clamp(6px, 100%, 48px)",
            }}
          >
            {line.text}
          </span>
          <TextLineActions
            onEdit={onStartEdit}
            onDelete={onDelete}
            isVisible={isActive}
          />
          <div
            className={`absolute left-0 px-2 py-1 text-xs rounded shadow-xl pointer-events-none -top-8 bg-neutral text-neutral-content whitespace-nowrap z-100 ${isActive ? "block" : "hidden group-hover:block"}`}
          >
            {line.text} ({line.layout_labels?.join(", ") || "No Label"})
          </div>
        </>
      )}
    </div>
  );
};
