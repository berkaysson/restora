import React from "react";
import type { TextLine } from "../../../types";
import { PositionedTextLine } from "../components";

interface PositionedViewProps {
  textLines: TextLine[];
  zoom: number;
  aspectRatio: number;
  documentWidth: number;
  documentHeight: number;
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
  medianLineHeight: number;
}

/**
 * Positioned view renders text lines at their exact document positions
 */
export const PositionedView: React.FC<PositionedViewProps> = ({
  textLines,
  zoom,
  aspectRatio,
  documentWidth,
  documentHeight,
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
  medianLineHeight,
}) => (
  <div
    className="mx-auto transition-all origin-top"
    style={{
      width: `${1000 * zoom}px`,
      aspectRatio: `${aspectRatio}`,
    }}
  >
    <div
      className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5 text-base-content"
      style={{
        width: `1000px`,
        height: `${1000 / aspectRatio}px`,
        transform: `scale(${zoom})`,
      }}
    >
      {textLines.map((line: TextLine, idx: number) => {
        if (isLineHidden(line)) return null;

        return (
          <PositionedTextLine
            key={idx}
            line={line}
            idx={idx}
            isHighlighted={highlightIndex === idx}
            isSelected={selectedIndex === idx}
            isEditing={editingIndex === idx}
            editText={editText}
            documentWidth={documentWidth}
            documentHeight={documentHeight}
            aspectRatio={aspectRatio}
            onMouseEnter={() => onHighlightChange(idx)}
            onMouseLeave={() => onHighlightChange(null)}
            onClick={() => onSelect(selectedIndex === idx ? null : idx)}
            onEditTextChange={onEditTextChange}
            onSave={onSaveEdit}
            onCancel={onCancelEdit}
            onStartEdit={() => onStartEditing(idx, line.text)}
            onDelete={() => onDeleteLine(idx)}
            medianLineHeight={medianLineHeight}
          />
        );
      })}
    </div>
  </div>
);
