import { useState, useCallback, useEffect, type RefObject } from "react";

interface UseZoomOptions {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  /** Optional dependency that triggers re-evaluation of container ref */
  triggerDependency?: unknown;
}

interface UseZoomReturn {
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
}

/**
 * Custom hook for managing zoom state and controls
 */
export const useZoom = (
  containerRef: RefObject<HTMLElement | null>,
  options: UseZoomOptions = {},
): UseZoomReturn => {
  const {
    initialZoom = 1,
    minZoom = 0.2,
    maxZoom = 3,
    step = 0.2,
    triggerDependency,
  } = options;

  const [zoom, setZoom] = useState(initialZoom);

  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(maxZoom, prev + step)),
    [maxZoom, step],
  );

  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(minZoom, prev - step)),
    [minZoom, step],
  );

  const handleResetZoom = useCallback(
    () => setZoom(initialZoom),
    [initialZoom],
  );

  // Ctrl+Scroll Zoom - depends on triggerDependency to re-attach when container becomes available
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) handleZoomIn();
        else handleZoomOut();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerDependency, handleZoomIn, handleZoomOut]);

  return {
    zoom,
    setZoom,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
  };
};
