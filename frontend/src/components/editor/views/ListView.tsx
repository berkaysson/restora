import React from "react";
import type { TextLine } from "../../../types";
import { ListTextLine } from "../components";

interface ListViewProps {
  textLines: TextLine[];
  fontSize: number;
  highlightIndex: number | null;
  selectedIndex: number | null;
  editingIndex: number | null;
  editText: string;
  isLineHidden: (line: TextLine) => boolean | undefined;
  onHighlightChange: (idx: number | null) => void;
  onSelect: (idx: number | null) => void;
  onEditTextChange: (text: string) => void;
  onStartEditing: (idx: number, text: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteLine: (idx: number) => void;
}

/**
 * List view renders text lines in a simple vertical list (fallback mode)
 */
export const ListView: React.FC<ListViewProps> = ({
  textLines,
  fontSize,
  highlightIndex,
  selectedIndex,
  editingIndex,
  editText,
  isLineHidden,
  onHighlightChange,
  onSelect,
  onEditTextChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDeleteLine,
}) => (
  <div className="flex flex-col gap-1 font-mono text-sm">
    <div className="py-2 mb-4 text-xs alert alert-warning">
      Warning: Image dimensions missing. Showing list view.
    </div>
    {textLines.map((line: TextLine, idx: number) => {
      if (isLineHidden(line)) return null;

      return (
        <ListTextLine
          key={idx}
          line={line}
          idx={idx}
          isHighlighted={highlightIndex === idx}
          isSelected={selectedIndex === idx}
          isEditing={editingIndex === idx}
          editText={editText}
          fontSize={fontSize}
          onMouseEnter={() => onHighlightChange(idx)}
          onMouseLeave={() => onHighlightChange(null)}
          onClick={() => onSelect(selectedIndex === idx ? null : idx)}
          onEditTextChange={onEditTextChange}
          onSave={onSaveEdit}
          onCancel={onCancelEdit}
          onStartEdit={() => onStartEditing(idx, line.text)}
          onDelete={() => onDeleteLine(idx)}
        />
      );
    })}
  </div>
);
