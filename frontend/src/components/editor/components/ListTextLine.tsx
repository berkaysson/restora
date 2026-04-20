import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { TextLine } from "../../../types";
import { TextLineEdit } from "./TextLineEdit";

interface ListTextLineProps {
  line: TextLine;
  idx: number;
  isHighlighted: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editText: string;
  fontSize: number;
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
 * A text line displayed in list format (fallback when no dimensions available).
 * Supports click-to-select behavior where actions persist until deselected.
 */
export const ListTextLine: React.FC<ListTextLineProps> = ({
  line,
  idx,
  isHighlighted,
  isSelected,
  isEditing,
  editText,
  fontSize,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEditTextChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}) => {
  // Determine if actions should be visible
  const isActive = isHighlighted || isSelected;

  // Determine visual state classes
  const stateClasses = isEditing
    ? "bg-primary/10 ring-2 ring-primary"
    : isSelected
      ? "bg-primary/15 text-primary ring-1 ring-primary/80"
      : isHighlighted
        ? "bg-primary/20 text-primary"
        : "hover:bg-base-200";

  return (
    <div
      key={idx}
      data-text-line
      className={`relative rounded px-2 py-1 transition-colors duration-200 cursor-pointer group ${stateClasses}`}
      style={{ fontSize: `${fontSize}px` }}
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
          variant="list"
        />
      ) : (
        <>
          <span dangerouslySetInnerHTML={{ __html: line.text }} />
          <div
            className={`absolute flex gap-2 transition-opacity top-1 right-1 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-9 h-9 rounded-lg shadow-xl bg-primary text-primary-content hover:bg-primary-focus"
              title="Metni düzenle"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-9 h-9 rounded-lg shadow-xl bg-error text-error-content hover:bg-error/80"
              title="Satırı sil"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
