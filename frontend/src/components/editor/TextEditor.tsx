import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { TextLine } from "../../types";
import { useAnalysis } from "../../context/AnalysisContext";
import { useEditor } from "../../context/EditorContext";

// Hooks
import { useZoom, useDragToPan } from "./hooks";

// Components
import {
  EditorEmptyState,
  EditorHeader,
  PositionedTextLine,
  ListTextLine,
} from "./components";

/**
 * TextEditor component for viewing and editing OCR-detected text.
 * Supports two view modes:
 * - Positioned view: Text lines positioned according to their bounding boxes
 * - List view: Simple list of text lines (fallback when dimensions unavailable)
 */
export const TextEditor: React.FC = () => {
  const {
    data,
    highlightIndex,
    setHighlightIndex,
    hiddenLabels,
    toggleLabel,
    editingIndex,
    setEditingIndex,
    updateTextLine,
    deleteTextLine,
  } = useAnalysis();
  const { fontSize } = useEditor();
  const [editText, setEditText] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom hooks for zoom and pan
  const { zoom, setZoom, handleZoomIn, handleZoomOut, handleResetZoom } =
    useZoom(scrollContainerRef, {
      initialZoom: 1,
      minZoom: 0.2,
      maxZoom: 3,
      step: 0.2,
      triggerDependency: data, // Re-attach wheel listener when data loads
    });
  const { isDragging, handleMouseDown, scrollBy } =
    useDragToPan(scrollContainerRef);

  // Document dimensions
  const { width, height, text_lines } = data?.layout || {};
  const hasDimensions = !!(width && height);
  const aspectRatio = hasDimensions
    ? (width as number) / (height as number)
    : undefined;

  // Extract unique labels from current document
  const availableLabels = useMemo(() => {
    if (!data?.layout?.text_lines) return [];
    const labels = new Set<string>();
    data.layout.text_lines.forEach((line) => {
      line.layout_labels?.forEach((lbl) => labels.add(lbl));
    });
    return Array.from(labels).sort();
  }, [data]);

  // Fit to page handler
  const handleFitToPage = useCallback(() => {
    if (!scrollContainerRef.current || !hasDimensions || !aspectRatio) return;
    const container = scrollContainerRef.current;

    const availableWidth = container.clientWidth - 64;
    const availableHeight = container.clientHeight - 64;

    const baseWidth = 1000;
    const baseHeight = baseWidth / aspectRatio;

    const zoomX = availableWidth / baseWidth;
    const zoomY = availableHeight / baseHeight;

    setZoom(Math.min(zoomX, zoomY));
  }, [hasDimensions, aspectRatio, setZoom]);

  // Auto-fit on load
  useEffect(() => {
    if (data?.layout) {
      const timer = setTimeout(handleFitToPage, 50);
      return () => clearTimeout(timer);
    }
  }, [data, handleFitToPage]);

  // Editing handlers
  const startEditing = useCallback(
    (idx: number, currentText: string) => {
      setEditingIndex(idx);
      setEditText(currentText);
    },
    [setEditingIndex],
  );

  const saveEdit = useCallback(() => {
    if (editingIndex !== null) {
      updateTextLine(editingIndex, editText);
      setEditingIndex(null);
      setEditText("");
    }
  }, [editingIndex, editText, updateTextLine, setEditingIndex]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditText("");
  }, [setEditingIndex]);

  // Filter hidden lines helper
  const isLineHidden = useCallback(
    (line: TextLine) =>
      line.layout_labels?.some((lbl: string) => hiddenLabels.includes(lbl)),
    [hiddenLabels],
  );

  // Empty state
  if (!data || !data.layout?.text_lines || !text_lines) {
    return <EditorEmptyState />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-base-100">
      <EditorHeader
        lineCount={text_lines.length}
        width={width}
        height={height}
        hasDimensions={hasDimensions}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitContent={handleFitToPage}
        onScroll={scrollBy}
        availableLabels={availableLabels}
        hiddenLabels={hiddenLabels}
        onToggleLabel={toggleLabel}
      />

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto p-8 relative transition-colors select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } bg-base-200/50 text-base-content/20`}
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          // Deselect when clicking on the background (not on a text line)
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).closest("[data-text-line]") === null
          ) {
            setSelectedIndex(null);
          }
        }}
      >
        {hasDimensions ? (
          <PositionedView
            textLines={text_lines}
            zoom={zoom}
            aspectRatio={aspectRatio!}
            documentWidth={width!}
            documentHeight={height!}
            highlightIndex={highlightIndex}
            selectedIndex={selectedIndex}
            editingIndex={editingIndex}
            editText={editText}
            isLineHidden={isLineHidden}
            onHighlightChange={setHighlightIndex}
            onSelect={setSelectedIndex}
            onEditTextChange={setEditText}
            onStartEditing={startEditing}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDeleteLine={deleteTextLine}
          />
        ) : (
          <ListView
            textLines={text_lines}
            fontSize={fontSize}
            highlightIndex={highlightIndex}
            selectedIndex={selectedIndex}
            editingIndex={editingIndex}
            editText={editText}
            isLineHidden={isLineHidden}
            onHighlightChange={setHighlightIndex}
            onSelect={setSelectedIndex}
            onEditTextChange={setEditText}
            onStartEditing={startEditing}
            onSaveEdit={saveEdit}
            onCancelEdit={cancelEdit}
            onDeleteLine={deleteTextLine}
          />
        )}
      </div>
    </div>
  );
};

// =====================================================
// Internal View Components
// =====================================================

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
}

/**
 * Positioned view renders text lines at their exact document positions
 */
const PositionedView: React.FC<PositionedViewProps> = ({
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
          />
        );
      })}
    </div>
  </div>
);

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
const ListView: React.FC<ListViewProps> = ({
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
