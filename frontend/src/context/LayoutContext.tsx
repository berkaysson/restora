import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

interface LayoutContextType {
  leftPanelWidth: number;
  setLeftPanelWidth: (width: number | ((prev: number) => number)) => void;
  isFileListOpen: boolean;
  setIsFileListOpen: (open: boolean) => void;
  isOverlayOpen: boolean;
  setIsOverlayOpen: (open: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (msg: string) => void;
  progress: number;
  setProgress: (progress: number | ((prev: number) => number)) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  startResizing: (e: React.MouseEvent) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isFileListOpen, setIsFileListOpen] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("İşleniyor...");
  const [progress, setProgress] = useState(0);

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
    }),
    [
      leftPanelWidth,
      isFileListOpen,
      isOverlayOpen,
      loading,
      loadingMessage,
      progress,
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
