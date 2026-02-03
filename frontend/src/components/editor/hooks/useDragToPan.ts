import { useState, useEffect, useCallback, type RefObject } from "react";

interface DragState {
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
}

interface UseDragToPanReturn {
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
  scrollBy: (dx: number, dy: number) => void;
}

/**
 * Custom hook for drag-to-pan functionality in scrollable containers
 */
export const useDragToPan = (
  containerRef: RefObject<HTMLElement | null>,
): UseDragToPanReturn => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<DragState>({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const scrollBy = useCallback(
    (dx: number, dy: number) => {
      if (containerRef.current) {
        containerRef.current.scrollBy({
          left: dx,
          top: dy,
          behavior: "smooth",
        });
      }
    },
    [containerRef],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      if (!containerRef.current) return;
      setIsDragging(true);
      setDragStart({
        x: e.pageX,
        y: e.pageY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
    },
    [containerRef],
  );

  // Handle mouse move and mouse up globally
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const dx = e.pageX - dragStart.x;
      const dy = e.pageY - dragStart.y;
      containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
      containerRef.current.scrollTop = dragStart.scrollTop - dy;
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, dragStart, containerRef]);

  return {
    isDragging,
    handleMouseDown,
    scrollBy,
  };
};
