import React from "react";
import { useEditor } from "../../context/EditorContext";

// Hooks
import { useTextEditorLogic } from "./hooks";

// Components
import { EditorEmptyState, EditorHeader } from "./components";
import { PositionedView, ListView, LayoutBlocksView, ConfidenceView } from "./views";

/**
 * TextEditor component for viewing and editing OCR-detected text.
 * Supports three view modes:
 * - Positioned view: Text lines positioned according to their bounding boxes
 * - Layout blocks view: Document layout visualisation with block regions
 * - Confidence view: Heatmap overlay showing OCR confidence per line
 */
export const TextEditor: React.FC = () => {
  const { fontSize } = useEditor();
  const {
    data,
    textLines,
    layoutBlocks,
    width,
    height,
    hasDimensions,
    aspectRatio,
    availableLabels,
    medianLineHeight,
    isLineHidden,

    // State
    viewMode,
    setViewMode,
    zoom,
    isDragging,
    editText,
    setEditText,

    // Context State
    highlightIndex,
    setHighlightIndex,
    highlightedBlockIndex,
    setHighlightedBlockIndex,
    hiddenLabels,
    toggleLabel,
    editingIndex,
    selectedIndex,
    setSelectedIndex,
    globalHiddenLabels,
    toggleGlobalLabel,
    allLabels,

    // Refs
    scrollContainerRef,

    // Handlers
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleFitToPage,
    handleMouseDown,
    scrollBy,
    startEditing,
    saveEdit,
    cancelEdit,
    deleteTextLine,
  } = useTextEditorLogic();

  // Empty state
  if (!data || !data.layout?.text_lines || !textLines) {
    return <EditorEmptyState />;
  }

  return (
    <div className="flex flex-col w-full h-full bg-base-100">
      <EditorHeader
        lineCount={textLines.length}
        blockCount={layoutBlocks?.length ?? 0}
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
        className={`flex-1 overflow-auto pt-3 px-8 pb-20 relative transition-colors select-none ${
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
              textLines={textLines}
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
          ) : viewMode === "layout-blocks" ? (
            <LayoutBlocksView
              layoutBlocks={layoutBlocks ?? []}
              textLines={textLines ?? []}
              zoom={zoom}
              aspectRatio={aspectRatio!}
              documentWidth={width!}
              documentHeight={height!}
              highlightedBlockIndex={highlightedBlockIndex}
              onHighlightChange={setHighlightedBlockIndex}
              medianLineHeight={medianLineHeight}
              isLineHidden={isLineHidden}
            />
          ) : (
            <ConfidenceView
              textLines={textLines}
              zoom={zoom}
              aspectRatio={aspectRatio!}
              documentWidth={width!}
              documentHeight={height!}
              isLineHidden={isLineHidden}
              medianLineHeight={medianLineHeight}
            />
          )
        ) : (
          <ListView
            textLines={textLines}
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
