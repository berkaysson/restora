import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize,
} from "lucide-react";
import type { PageData, TextLine } from "../../types";

interface ImagePreviewProps {
  data: PageData | null;
  highlightIndex: number | null;
  setHighlightIndex: (index: number | null) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  data,
  highlightIndex,
  setHighlightIndex,
}) => {
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(prev + 0.2, 5)),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(prev - 0.2, 0.2)),
    []
  );
  const handleResetZoom = useCallback(() => setZoom(1), []);

  const handleFitContent = useCallback(() => {
    if (!containerRef.current || !imgSize.w || !imgSize.h) return;

    const container = containerRef.current;
    const padding = 64; // Horizontal and vertical buffer
    const availableWidth = container.clientWidth - padding;
    const availableHeight = container.clientHeight - padding;

    const scaleX = availableWidth / imgSize.w;
    const scaleY = availableHeight / imgSize.h;

    const newZoom = Math.min(scaleX, scaleY);
    setZoom(Math.max(0.1, Math.min(newZoom, 3)));

    // Scroll to center the image
    const totalW = imgSize.w * newZoom + 1000;
    const totalH = imgSize.h * newZoom + 1000;

    container.scrollTo({
      left: totalW / 2 - container.clientWidth / 2,
      top: totalH / 2 - container.clientHeight / 2,
      behavior: "smooth",
    });
  }, [imgSize]);

  const scrollBy = (dx: number, dy: number) => {
    if (containerRef.current) {
      containerRef.current.scrollBy({
        left: dx,
        top: dy,
        behavior: "smooth",
      });
    }
  };

  // Ctrl + Mouse Wheel Zoom
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
  }, [handleZoomIn, handleZoomOut]);

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
  }, [isDragging, dragStart]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if left click
    if (e.button !== 0) return;
    e.preventDefault(); // Prevent text selection

    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const newSize = { w: img.naturalWidth, h: img.naturalHeight };
    setImgSize(newSize);

    // Auto-fit on first load
    if (containerRef.current) {
      const container = containerRef.current;
      const padding = 64;
      const scaleX = (container.clientWidth - padding) / newSize.w;
      const scaleY = (container.clientHeight - padding) / newSize.h;
      const fitZoom = Math.min(scaleX, scaleY);
      const targetZoom = Math.max(0.1, Math.min(fitZoom, 3));
      setZoom(targetZoom);

      // Instant center on load (no smooth behavior for first load)
      const totalW = newSize.w * targetZoom + 1000;
      const totalH = newSize.h * targetZoom + 1000;
      setTimeout(() => {
        container.scrollTo({
          left: totalW / 2 - container.clientWidth / 2,
          top: totalH / 2 - container.clientHeight / 2,
        });
      }, 10);
    }
  };

  return (
    <div className="relative flex w-1/2 overflow-hidden border-r border-base-content/10 bg-base-200/50 group">
      {data && (
        <div className="absolute z-20 flex flex-col items-center gap-4 -translate-x-1/2 bottom-8 left-1/2">
          {/* Main Control Island */}
          <div className="flex items-center gap-2 p-1 border shadow-2xl bg-base-300/90 backdrop-blur-xl rounded-2xl border-white/10 ring-1 ring-black/20">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 px-2 border-r border-white/5">
              <button
                onClick={handleZoomOut}
                className="transition-colors btn btn-ghost btn-circle btn-sm hover:bg-primary/20 hover:text-primary"
                title="Uzaklaştır (Ctrl + Scroll)"
              >
                <ZoomOut size={18} />
              </button>
              <div className="flex flex-col items-center min-w-12">
                <span className="font-mono text-xs font-black text-primary">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <button
                onClick={handleZoomIn}
                className="transition-colors btn btn-ghost btn-circle btn-sm hover:bg-primary/20 hover:text-primary"
                title="Yakınlaştır (Ctrl + Scroll)"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={handleResetZoom}
                className="transition-colors btn btn-ghost btn-circle btn-sm text-error hover:bg-warning/20"
                title="100% (Sıfırla)"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={handleFitContent}
                className="transition-colors btn btn-ghost btn-circle btn-sm text-success hover:bg-success/20"
                title="Ekrana Sığdır"
              >
                <Maximize size={16} />
              </button>
            </div>

            {/* Navigation Pad */}
            <div className="flex items-center gap-1 px-1">
              <div className="grid grid-cols-3 gap-0.5">
                <div />
                <button
                  onClick={() => scrollBy(0, -150)}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
                >
                  <ChevronUp size={16} />
                </button>
                <div />
                <button
                  onClick={() => scrollBy(-150, 0)}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center justify-center p-0.5 rounded-full bg-primary/10">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                </div>
                <button
                  onClick={() => scrollBy(150, 0)}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
                >
                  <ChevronRight size={16} />
                </button>
                <div />
                <button
                  onClick={() => scrollBy(0, 150)}
                  className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
                >
                  <ChevronDown size={16} />
                </button>
                <div />
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full overflow-auto transition-colors select-none cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40"
        onMouseDown={handleMouseDown}
      >
        {data ? (
          <div
            className="p-[50vh] min-w-full min-h-full flex items-start justify-start"
            style={{
              width: imgSize.w ? imgSize.w * zoom + 1000 : "auto",
              height: imgSize.h ? imgSize.h * zoom + 1000 : "auto",
            }}
          >
            <div
              className="relative inline-block transition-transform duration-200 ease-out origin-top-left rounded-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/5"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              <img
                src={`http://localhost:8000/${data.clean_image}`}
                alt="Scan"
                className="block max-w-none hover:cursor-crosshair"
                onLoad={onImageLoad}
                draggable={false}
              />
              {data.layout?.text_lines?.map((line: TextLine, idx: number) => {
                const [x0, y0, x1, y1] = line.bbox;
                return (
                  <div
                    key={idx}
                    className={`absolute border-2 transition-all duration-150 ${
                      highlightIndex === idx
                        ? "border-primary bg-primary/20 z-10 scale-[1.02] shadow-lg shadow-primary/20"
                        : "border-transparent hover:border-primary/40 hover:bg-primary/5"
                    }`}
                    style={{
                      left: x0,
                      top: y0,
                      width: x1 - x0,
                      height: y1 - y0,
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseLeave={() => setHighlightIndex(null)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-600">
            <ImageIcon className="w-16 h-16 opacity-10 animate-pulse" />
            <p className="text-sm font-medium tracking-widest uppercase opacity-30">
              Belge Bekleniyor
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
