import React from "react";
import { Pencil, Trash2 } from "lucide-react";

interface TextLineActionsProps {
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Action buttons (edit/delete) for text lines
 */
export const TextLineActions: React.FC<TextLineActionsProps> = ({
  onEdit,
  onDelete,
}) => {
  return (
    <div className="absolute flex gap-1 transition-opacity opacity-0 -top-1 -right-1 group-hover:opacity-100">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center justify-center w-5 h-5 rounded shadow-md bg-primary text-primary-content hover:bg-primary-focus"
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
        className="flex items-center justify-center w-5 h-5 rounded shadow-md bg-error text-error-content hover:bg-error/80"
        title="Satırı sil"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};
