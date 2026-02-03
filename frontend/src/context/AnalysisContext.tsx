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
  /** Layout labels currently hidden from view */
  hiddenLabels: string[];
  /** Set the hidden labels array */
  setHiddenLabels: (labels: string[]) => void;
  /** Toggle visibility of a specific layout label */
  toggleLabel: (label: string) => void;
  /** Clear all analysis data and reset state */
  clearAnalysis: () => void;
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
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [hiddenLabels, setHiddenLabels] = useState<string[]>([]);

  const toggleLabel = useCallback((label: string) => {
    setHiddenLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  }, []);

  const clearAnalysis = useCallback(() => {
    setData(null);
    setHighlightIndex(null);
    setHiddenLabels([]);
  }, []);

  const value = useMemo(
    () => ({
      data,
      setData,
      highlightIndex,
      setHighlightIndex,
      hiddenLabels,
      setHiddenLabels,
      toggleLabel,
      clearAnalysis,
    }),
    [data, highlightIndex, hiddenLabels, toggleLabel, clearAnalysis],
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
