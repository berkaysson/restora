import React from "react";
import { Check, X } from "lucide-react";

interface TextLineEditProps {
  editText: string;
  onEditTextChange: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
  variant?: "positioned" | "list";
}

/**
 * Inline text editing component for text lines
 */
export const TextLineEdit: React.FC<TextLineEditProps> = ({
  editText,
  onEditTextChange,
  onSave,
  onCancel,
  variant = "positioned",
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const containerClass =
    variant === "positioned"
      ? "absolute inset-0 flex items-center gap-1 p-1 -m-1 rounded bg-base-100 shadow-lg ring-2 ring-primary"
      : "flex items-center gap-2";

  return (
    <div
      className={containerClass}
      style={variant === "positioned" ? { minWidth: "300px" } : undefined}
    >
      <input
        type="text"
        value={editText}
        onChange={(e) => onEditTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 px-4 py-3 text-lg border-2 rounded-xl input input-lg input-bordered bg-base-100 text-base-content"
        autoFocus
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSave();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="btn btn-md btn-success btn-circle shadow-lg"
        title="Kaydet (Enter)"
      >
        <Check className="w-5 h-5 transition-transform hover:scale-110" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="btn btn-md btn-error btn-circle shadow-lg"
        title="İptal (Escape)"
      >
        <X className="w-5 h-5 transition-transform hover:scale-110" />
      </button>
    </div>
  );
};
