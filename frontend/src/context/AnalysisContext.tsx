import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import type { PageData } from "../types";

interface AnalysisContextType {
  data: PageData | null;
  setData: (data: PageData | null) => void;
  highlightIndex: number | null;
  setHighlightIndex: (index: number | null) => void;
  hiddenLabels: string[];
  setHiddenLabels: (labels: string[]) => void;
  toggleLabel: (label: string) => void;
  clearAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextType | undefined>(
  undefined,
);

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
