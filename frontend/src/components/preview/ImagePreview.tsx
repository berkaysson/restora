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

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag if left click
    if (e.button !== 0) return;

    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const dx = e.pageX - dragStart.x;
    const dy = e.pageY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => setIsDragging(false);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div className="relative flex w-1/2 overflow-hidden border-r border-gray-800 bg-gray-900/50 group">
      {data && (
        <>
          {/* Zoom Controls */}
          <div className="absolute z-20 flex items-center gap-2 p-2 transition-all -translate-x-1/2 border rounded-full shadow-2xl bottom-8 left-1/2 bg-gray-800/90 backdrop-blur-md border-gray-700/50 opacity-40 hover:opacity-100">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-gray-700 rounded-full transition-colors text-gray-300 hover:text-white"
              title="Uzaklaştır (Ctrl + Scroll)"
            >
              <ZoomOut size={18} />
            </button>
            <span className="font-mono text-xs font-bold text-center text-indigo-400 min-w-14">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-gray-700 rounded-full transition-colors text-gray-300 hover:text-white"
              title="Yakınlaştır (Ctrl + Scroll)"
            >
              <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 mx-1 bg-gray-700" />
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-gray-700 rounded-full transition-colors text-gray-300 hover:text-white"
              title="Sıfırla"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Scroll Controls (Directional) */}
          <div className="absolute z-30 flex flex-col gap-1 transition-opacity opacity-0 bottom-8 right-8 group-hover:opacity-100">
            <div className="flex justify-center">
              <button
                onClick={() => scrollBy(0, -100)}
                className="p-2 text-white border border-gray-700 rounded-full shadow-lg bg-gray-800/80 hover:bg-indigo-600 backdrop-blur-sm"
              >
                <ChevronUp size={20} />
              </button>
            </div>
            <div className="flex justify-center gap-1">
              <button
                onClick={() => scrollBy(-100, 0)}
                className="p-2 text-white border border-gray-700 rounded-full shadow-lg bg-gray-800/80 hover:bg-indigo-600 backdrop-blur-sm"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => scrollBy(100, 0)}
                className="p-2 text-white border border-gray-700 rounded-full shadow-lg bg-gray-800/80 hover:bg-indigo-600 backdrop-blur-sm"
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="flex justify-center">
              <button
                onClick={() => scrollBy(0, 100)}
                className="p-2 text-white border border-gray-700 rounded-full shadow-lg bg-gray-800/80 hover:bg-indigo-600 backdrop-blur-sm"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>
        </>
      )}

      <div
        ref={containerRef}
        className="w-full h-full overflow-auto select-none cursor-grab active:cursor-grabbing scroll-smooth scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {data ? (
          <div
            className="p-[20vh] min-w-full min-h-full flex items-start justify-start"
            style={{
              width: imgSize.w ? imgSize.w * zoom + 1000 : "auto",
              height: imgSize.h ? imgSize.h * zoom + 1000 : "auto",
            }}
          >
            <div
              className="relative inline-block transition-transform duration-200 ease-out origin-top-left rounded-lg shadow-2xl shadow-black/80"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              <img
                src={`http://localhost:8000/${data.clean_image}`}
                alt="Scan"
                className="block max-w-none hover:cursor-crosshair ring-1 ring-white/10"
                onLoad={onImageLoad}
                draggable={false}
              />
              {/* Surya Kutucuklarını Çiz */}
              {data.layout?.text_lines?.map((line: TextLine, idx: number) => {
                const [x0, y0, x1, y1] = line.bbox;
                return (
                  <div
                    key={idx}
                    className={`absolute border cursor-pointer transition-all duration-200 ${
                      highlightIndex === idx
                        ? "border-indigo-400 bg-indigo-500/30 ring-2 ring-indigo-400/20"
                        : "border-transparent hover:border-indigo-500/50 hover:bg-indigo-500/10"
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
            <ImageIcon className="w-16 h-16 opacity-20" />
            <p className="text-sm font-medium text-gray-400 opacity-50">
              Görüntülenecek belge yok
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
