/**
 * @fileoverview Layout Context for UI layout state management.
 *
 * Manages panel sizes, loading states, and overlay visibility
 * for the main application layout.
 *
 * @module context/LayoutContext
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Shape of the Layout context value.
 */
interface LayoutContextType {
  /** Width of the left panel as percentage (0-100) */
  leftPanelWidth: number;
  /** Set left panel width */
  setLeftPanelWidth: (width: number | ((prev: number) => number)) => void;
  /** Whether the file list sidebar is open */
  isFileListOpen: boolean;
  /** Toggle file list visibility */
  setIsFileListOpen: (open: boolean) => void;
  /** Whether the loading overlay is visible */
  isOverlayOpen: boolean;
  /** Toggle overlay visibility */
  setIsOverlayOpen: (open: boolean) => void;
  /** Whether a processing operation is in progress */
  loading: boolean;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Current loading status message */
  loadingMessage: string;
  /** Set loading message */
  setLoadingMessage: (msg: string) => void;
  /** Current progress percentage (0-100) */
  progress: number;
  /** Set progress value */
  setProgress: (progress: number | ((prev: number) => number)) => void;
  /** Reference to the main container element */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Handler to start panel resizing */
  startResizing: (e: React.MouseEvent) => void;
  /** Number of pages processed so far */
  processedPages: number;
  /** Set processed pages count */
  setProcessedPages: (pages: number) => void;
  /** Total number of pages in the document */
  totalPages: number;
  /** Set total pages count */
  setTotalPages: (pages: number) => void;
  /** Current page number being viewed (1-indexed) */
  currentPage: number;
  /** Set current page number */
  setCurrentPage: (page: number) => void;
  /** Whether the header is in compact mode */
  isHeaderCompact: boolean;
  /** Toggle header compact mode */
  setIsHeaderCompact: (compact: boolean) => void;
  /** Current active processing job ID */
  currentJobId: string | null;
  /** Set current active processing job ID */
  setCurrentJobId: (jobId: string | null) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

/**
 * Provider component for application layout state.
 *
 * Manages:
 * - Panel resizing with drag handle
 * - Loading overlay and progress
 * - File list sidebar visibility
 *
 * @param children - Child components to wrap
 */
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isFileListOpen, setIsFileListOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("İşleniyor...");
  const [progress, setProgress] = useState(0);
  const [processedPages, setProcessedPages] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, 20), 80));
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "default";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  const value = useMemo(
    () => ({
      leftPanelWidth,
      setLeftPanelWidth,
      isFileListOpen,
      setIsFileListOpen,
      isOverlayOpen,
      setIsOverlayOpen,
      loading,
      setLoading,
      loadingMessage,
      setLoadingMessage,
      progress,
      setProgress,
      containerRef,
      startResizing,
      processedPages,
      setProcessedPages,
      totalPages,
      setTotalPages,
      currentPage,
      setCurrentPage,
      isHeaderCompact,
      setIsHeaderCompact,
      currentJobId,
      setCurrentJobId,
    }),
    [
      leftPanelWidth,
      isFileListOpen,
      isOverlayOpen,
      loading,
      loadingMessage,
      progress,
      processedPages,
      totalPages,
      currentPage,
      isHeaderCompact,
      currentJobId,
    ],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
}
