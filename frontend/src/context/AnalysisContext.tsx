/**
 * @fileoverview Analysis Context for OCR data state management.
 *
 * Provides global state for storing and manipulating OCR analysis results,
 * including text line highlighting and layout label filtering.
 *
 * @module context/AnalysisContext
 */

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { TextLine } from "../types";
import type { PageData } from "../types";

/**
 * Shape of the Analysis context value.
 */
interface AnalysisContextType {
  /** Current OCR analysis data, null if no document loaded */
  data: PageData | null;
  /** Update the OCR data state */
  setData: (data: PageData | null) => void;
  /** Index of currently highlighted text line (for hover sync) */
  highlightIndex: number | null;
  /** Set the highlighted line index */
  setHighlightIndex: (index: number | null) => void;
  /** Index of the currently highlighted layout block */
  highlightedBlockIndex: number | null;
  /** Set the highlighted layout block index */
  setHighlightedBlockIndex: (index: number | null) => void;
  /** Layout labels currently hidden from view */
  hiddenLabels: string[];
  /** Set the hidden labels array */
  setHiddenLabels: (labels: string[]) => void;
  /** Toggle visibility of a specific layout label */
  toggleLabel: (label: string) => void;
  /** Clear all analysis data and reset state */
  clearAnalysis: () => void;
  /** Index of the text line currently being edited, null if not editing */
  editingIndex: number | null;
  /** Set the editing line index */
  setEditingIndex: (index: number | null) => void;
  /** Update the text content of a specific line */
  updateTextLine: (index: number, newText: string) => void;
  /** Delete a text line completely */
  deleteTextLine: (index: number) => void;
  /** All pages data for multi-page documents */
  allPages: PageData[];
  /** Set all pages data */
  setAllPages: (pages: PageData[]) => void;
  /** Index of the currently selected text line */
  selectedIndex: number | null;
  /** Set the selected line index */
  setSelectedIndex: (index: number | null) => void;
  /** Layout labels hidden globally across all pages */
  globalHiddenLabels: string[];
  /** Toggle global visibility of a specific layout label */
  toggleGlobalLabel: (label: string) => void;
  /** All unique labels across all pages */
  allLabels: string[];
  /** Original pages data (before any edits) */
  originalPages: PageData[];
  /** Set original pages data */
  setOriginalPages: (pages: PageData[]) => void;
  /** Hidden labels per page (page number -> label array) */
  pageHiddenLabels: Record<number, string[]>;
  /** Set hidden labels for a specific page */
  setPageHiddenLabels: (
    pageNumber: number,
    labels: string[] | ((prev: string[]) => string[]),
  ) => void;
  /** Reset all label filters (local and global) */
  resetFilters: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(
  undefined,
);

/**
 * Provider component for OCR analysis state.
 *
 * Wraps the application to provide access to OCR data, highlighting state,
 * and layout label filtering throughout the component tree.
 *
 * @param children - Child components to wrap
 *
 * @example
 * ```tsx
 * <AnalysisProvider>
 *   <App />
 * </AnalysisProvider>
 * ```
 */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PageData | null>(null);
  console.log("🚀 ~ AnalysisProvider ~ data:", data);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [highlightedBlockIndex, setHighlightedBlockIndex] = useState<
    number | null
  >(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [allPages, setAllPages] = useState<PageData[]>([]);
  const [originalPages, setOriginalPages] = useState<PageData[]>([]);
  const [pageHiddenLabels, setPageHiddenLabelsState] = useState<
    Record<number, string[]>
  >({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [globalHiddenLabels, setGlobalHiddenLabels] = useState<string[]>([]);

  const pageNumber = data?.page_number ?? (data ? 1 : undefined);

  // Derive hiddenLabels for the current page
  const hiddenLabels = useMemo(() => {
    if (pageNumber === undefined) return [];
    return pageHiddenLabels[pageNumber] || [];
  }, [pageNumber, pageHiddenLabels]);

  const toggleLabel = useCallback(
    (label: string) => {
      if (pageNumber === undefined) return;
      setPageHiddenLabelsState((prev) => {
        const currentLabels = prev[pageNumber] || [];
        const newLabels = currentLabels.includes(label)
          ? currentLabels.filter((l: string) => l !== label)
          : [...currentLabels, label];
        return { ...prev, [pageNumber]: newLabels };
      });
    },
    [pageNumber],
  );

  const toggleGlobalLabel = useCallback(
    (label: string) => {
      setGlobalHiddenLabels((prev) => {
        const isCurrentlyHidden = prev.includes(label);
        const nextGlobalHidden = isCurrentlyHidden
          ? prev.filter((l: string) => l !== label)
          : [...prev, label];

        // Propagate to all pages
        setPageHiddenLabelsState((prevPhl) => {
          const nextPhl = { ...prevPhl };
          allPages.forEach((page) => {
            const pageNum = page.page_number;
            if (pageNum === undefined) return;
            const currentLabels = prevPhl[pageNum] || [];
            if (!isCurrentlyHidden) {
              // Hiding globally -> Hide on all pages
              if (!currentLabels.includes(label)) {
                nextPhl[pageNum] = [...currentLabels, label];
              }
            } else {
              // Showing globally -> Show on all pages
              if (currentLabels.includes(label)) {
                nextPhl[pageNum] = currentLabels.filter(
                  (l: string) => l !== label,
                );
              }
            }
          });
          return nextPhl;
        });

        return nextGlobalHidden;
      });
    },
    [allPages],
  );

  // Compute all unique labels across all pages
  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    // Use original pages to get all possible labels, as edits might remove them?
    // Actually better to use current allPages to reflect current state
    allPages.forEach((page) => {
      page.layout?.text_lines?.forEach((line: TextLine) => {
        line.layout_labels?.forEach((lbl: string) => labels.add(lbl));
      });
    });
    return Array.from(labels).sort();
  }, [allPages]);

  const clearAnalysis = useCallback(() => {
    setData(null);
    setHighlightIndex(null);
    setEditingIndex(null);
    setAllPages([]);
    setOriginalPages([]);
    setPageHiddenLabelsState({});
    setSelectedIndex(null);
    setGlobalHiddenLabels([]);
  }, []);

  const resetFilters = useCallback(() => {
    setPageHiddenLabelsState({});
    setGlobalHiddenLabels([]);
  }, []);

  const updateTextLine = useCallback((index: number, newText: string) => {
    setData((prev) => {
      if (!prev || !prev.layout?.text_lines) return prev;
      const newTextLines = [...prev.layout.text_lines];
      newTextLines[index] = { ...newTextLines[index], text: newText };

      const newData = {
        ...prev,
        layout: {
          ...prev.layout,
          text_lines: newTextLines,
        },
      };

      // Sync with allPages
      setAllPages((prevAllPages) =>
        prevAllPages.map((p) =>
          p.page_number === prev.page_number ? newData : p,
        ),
      );

      return newData;
    });
  }, []);

  const deleteTextLine = useCallback(
    (index: number) => {
      setData((prev) => {
        if (!prev || !prev.layout?.text_lines) return prev;
        const newTextLines = prev.layout.text_lines.filter(
          (_, i) => i !== index,
        );

        const newData = {
          ...prev,
          layout: {
            ...prev.layout,
            text_lines: newTextLines,
          },
        };

        // Sync with allPages
        setAllPages((prevAllPages) =>
          prevAllPages.map((p) =>
            p.page_number === prev.page_number ? newData : p,
          ),
        );

        return newData;
      });
      // Clear editing state if deleted line was being edited
      setEditingIndex(null);
      if (selectedIndex === index) setSelectedIndex(null);
    },
    [selectedIndex],
  );

  const setPageHiddenLabels = useCallback(
    (pageNumber: number, labels: string[] | ((prev: string[]) => string[])) => {
      setPageHiddenLabelsState((prev) => {
        const currentLabels = prev[pageNumber] || [];
        const newLabels =
          typeof labels === "function" ? labels(currentLabels) : labels;
        return { ...prev, [pageNumber]: newLabels };
      });
    },
    [],
  );

  const setHiddenLabels = useCallback(
    (labels: string[]) => {
      if (pageNumber !== undefined) {
        setPageHiddenLabelsState((prev) => ({
          ...prev,
          [pageNumber]: labels,
        }));
      }
    },
    [pageNumber],
  );

  const value = useMemo(
    () => ({
      data,
      setData,
      highlightIndex,
      setHighlightIndex,
      highlightedBlockIndex,
      setHighlightedBlockIndex,
      hiddenLabels,
      setHiddenLabels,
      toggleLabel,
      clearAnalysis,
      editingIndex,
      setEditingIndex,
      updateTextLine,
      deleteTextLine,
      allPages,
      setAllPages,
      selectedIndex,
      setSelectedIndex,
      globalHiddenLabels,
      toggleGlobalLabel,
      allLabels,
      originalPages,
      setOriginalPages,
      pageHiddenLabels,
      setPageHiddenLabels,
      resetFilters,
    }),
    [
      data,
      highlightIndex,
      highlightedBlockIndex,
      hiddenLabels,
      toggleLabel,
      clearAnalysis,
      editingIndex,
      updateTextLine,
      deleteTextLine,
      allPages,
      selectedIndex,
      globalHiddenLabels,
      toggleGlobalLabel,
      allLabels,
      originalPages,
      pageHiddenLabels,
      setPageHiddenLabels,
      setHiddenLabels,
      resetFilters,
    ],
  );

  return (
    <AnalysisContext.Provider value={value}>
      {children}
    </AnalysisContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}
