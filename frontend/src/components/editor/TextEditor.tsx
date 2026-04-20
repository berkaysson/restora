import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import type { TextLine, LayoutBlock } from "../../types";
import { useAnalysis } from "../../context/AnalysisContext";
import { useEditor } from "../../context/EditorContext";

// Hooks
import { useZoom, useDragToPan } from "./hooks";
import { stripHtmlTags } from "../../utils/textUtils";

// Components
import {
  EditorEmptyState,
  EditorHeader,
  PositionedTextLine,
  ListTextLine,
} from "./components";
import { PositionedLayoutBlock } from "./components/PositionedLayoutBlock";
import type { EditorViewMode } from "./components/EditorHeader";

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
    highlightedBlockIndex,
    setHighlightedBlockIndex,
    hiddenLabels,
    toggleLabel,
    editingIndex,
    setEditingIndex,
    updateTextLine,
    deleteTextLine,
    selectedIndex,
    setSelectedIndex,
    globalHiddenLabels,
    toggleGlobalLabel,
    allLabels,
  } = useAnalysis();
  const { fontSize } = useEditor();
  const [editText, setEditText] = useState("");
  const [viewMode, setViewMode] = useState<EditorViewMode>("text-lines");

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
  const { width, height, text_lines, layout_blocks } = data?.layout || {};
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

  // Calculate median line height for font normalization
  const medianLineHeight = useMemo(() => {
    if (!data?.layout?.text_lines || data.layout.text_lines.length === 0)
      return 0;
    const heights = data.layout.text_lines
      .map((line) => {
        const [, y1, , y2] = line.bbox;
        return y2 - y1;
      })
      .sort((a, b) => a - b);
    const mid = Math.floor(heights.length / 2);
    return heights.length % 2 !== 0
      ? heights[mid]
      : (heights[mid - 1] + heights[mid]) / 2;
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
      setEditText(stripHtmlTags(currentText));
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
        blockCount={layout_blocks?.length ?? 0}
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
        allLabels={allLabels}
        globalHiddenLabels={globalHiddenLabels}
        onToggleGlobalLabel={toggleGlobalLabel}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
          viewMode === "text-lines" ? (
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
              medianLineHeight={medianLineHeight}
            />
          ) : (
            <LayoutBlocksView
              layoutBlocks={layout_blocks ?? []}
              textLines={text_lines ?? []}
              zoom={zoom}
              aspectRatio={aspectRatio!}
              documentWidth={width!}
              documentHeight={height!}
              highlightedBlockIndex={highlightedBlockIndex}
              onHighlightChange={setHighlightedBlockIndex}
              medianLineHeight={medianLineHeight}
              isLineHidden={isLineHidden}
            />
          )
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
  medianLineHeight: number;
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

// =====================================================
// Layout Blocks View
// =====================================================

interface LayoutBlocksViewProps {
  layoutBlocks: LayoutBlock[];
  zoom: number;
  aspectRatio: number;
  documentWidth: number;
  documentHeight: number;
  highlightedBlockIndex: number | null;
  onHighlightChange: (idx: number | null) => void;
  textLines: TextLine[];
  medianLineHeight: number;
  isLineHidden: (line: TextLine) => boolean | undefined;
}

/**
 * Renders all layout_blocks as colored bounding box overlays on the document canvas.
 * Read-only — no editing or deletion, only hover highlight.
 */
const LayoutBlocksView: React.FC<LayoutBlocksViewProps> = ({
  layoutBlocks,
  textLines,
  zoom,
  aspectRatio,
  documentWidth,
  documentHeight,
  highlightedBlockIndex,
  onHighlightChange,
  medianLineHeight,
  isLineHidden,
}) => {
  return (
    <div
      className="mx-auto transition-all origin-top"
      style={{
        width: `${1000 * zoom}px`,
        aspectRatio: `${aspectRatio}`,
      }}
    >
      <div
        className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5"
        style={{
          width: `1000px`,
          height: `${1000 / aspectRatio}px`,
          transform: `scale(${zoom})`,
        }}
      >
        {layoutBlocks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-base-content/40">
              <span className="font-mono text-sm">
                Mizanpaj bloğu bulunamadı
              </span>
              <span className="text-xs">
                Bu sayfa için layout analizi mevcut değil
              </span>
            </div>
          </div>
        )}

        {/* Layer 1: Layout Blocks */}
        {layoutBlocks.map((block: LayoutBlock, idx: number) => (
          <PositionedLayoutBlock
            key={idx}
            block={block}
            idx={idx}
            documentWidth={documentWidth}
            documentHeight={documentHeight}
            isHighlighted={highlightedBlockIndex === idx}
            onMouseEnter={() => onHighlightChange(idx)}
            onMouseLeave={() => onHighlightChange(null)}
          />
        ))}

        {/* Layer 2: Text Overlay (rendered on top of all blocks) */}
        <div className="absolute inset-0 pointer-events-none select-none">
          {textLines.map((line, idx) => {
            if (isLineHidden(line)) return null;

            const [lx1, ly1, lx2, ly2] = line.bbox;
            const left = (lx1 / documentWidth) * 100;
            const top = (ly1 / documentHeight) * 100;
            const wPct = ((lx2 - lx1) / documentWidth) * 100;
            const hPct = ((ly2 - ly1) / documentHeight) * 100;

            // Replicate Font Size Logic
            const lineH_abs = ly2 - ly1;
            const isBodyText =
              medianLineHeight > 0 &&
              Math.abs(lineH_abs - medianLineHeight) / medianLineHeight < 0.25;
            const effectiveH = isBodyText ? medianLineHeight : lineH_abs;
            const renderedDocHeight = 1000 / aspectRatio;
            const heightBasedSize =
              (effectiveH / documentHeight) * renderedDocHeight * 0.82;
            const renderedBboxWidth = ((lx2 - lx1) / documentWidth) * 1000;
            const plainText = stripHtmlTags(line.text);
            const charCount = plainText.length || 1;
            const AVG_CHAR_WIDTH_RATIO = 0.52;
            const widthBasedSize =
              renderedBboxWidth / (charCount * AVG_CHAR_WIDTH_RATIO);
            const fontSize = Math.min(heightBasedSize, widthBasedSize);

            return (
              <div
                key={idx}
                className="absolute overflow-visible font-serif transition-opacity whitespace-nowrap text-base-content"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${wPct}%`,
                  height: `${hPct}%`,
                  opacity: 1, // Always fully readable
                  fontSize: `${fontSize}px`,
                  lineHeight: 1,
                  transition: "opacity 150ms",
                  textShadow: "0px 0px 1px rgba(255,255,255,0.5)", // Better contrast against colored blocks
                }}
                dangerouslySetInnerHTML={{ __html: line.text }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
