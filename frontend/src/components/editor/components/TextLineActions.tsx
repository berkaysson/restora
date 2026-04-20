import React from "react";
import { Pencil, Trash2 } from "lucide-react";

interface TextLineActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  /** When true, actions are always visible. When false/undefined, show on hover only. */
  isVisible?: boolean;
}

/**
 * Action buttons (edit/delete) for text lines.
 * Can be controlled to stay visible via isVisible prop (for selected state).
 */
export const TextLineActions: React.FC<TextLineActionsProps> = ({
  onEdit,
  onDelete,
  isVisible = false,
}) => {
  return (
    <div
      className={`absolute flex gap-2 transition-opacity -top-4 -right-4 ${isVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
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
  );
};
