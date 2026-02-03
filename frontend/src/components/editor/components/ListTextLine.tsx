import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { TextLine } from "../../../types";
import { TextLineEdit } from "./TextLineEdit";

interface ListTextLineProps {
  line: TextLine;
  idx: number;
  isHighlighted: boolean;
  isEditing: boolean;
  editText: string;
  fontSize: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onEditTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}

/**
 * A text line displayed in list format (fallback when no dimensions available)
 */
export const ListTextLine: React.FC<ListTextLineProps> = ({
  line,
  idx,
  isHighlighted,
  isEditing,
  editText,
  fontSize,
  onMouseEnter,
  onMouseLeave,
  onEditTextChange,
  onSave,
  onCancel,
  onStartEdit,
  onDelete,
}) => {
  return (
    <div
      key={idx}
      className={`relative rounded px-2 py-1 transition-colors duration-200 cursor-default group ${
        isHighlighted ? "bg-primary/20 text-primary" : "hover:bg-base-200"
      } ${isEditing ? "bg-primary/10 ring-2 ring-primary" : ""}`}
      style={{ fontSize: `${fontSize}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
          {line.text}
          <div className="absolute flex gap-1 transition-opacity opacity-0 top-1 right-1 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartEdit();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-content hover:bg-primary-focus shadow-md"
              title="Metni düzenle"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center w-5 h-5 rounded bg-error text-error-content hover:bg-error/80 shadow-md"
              title="Satırı sil"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
