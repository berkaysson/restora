import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { TextLine } from "../../../types";
import { useAnalysis } from "../../../context/AnalysisContext";
import { useZoom } from "./useZoom";
import { useDragToPan } from "./useDragToPan";

import { stripHtmlTags } from "../../../utils/textUtils";
import type { EditorViewMode } from "../components/EditorHeader";

export const useTextEditorLogic = () => {
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

  return {
    // Data
    data,
    textLines: text_lines,
    layoutBlocks: layout_blocks,
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
    
    // Derived from AnalysisContext
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
    updateTextLine,
    deleteTextLine,
  };
};
