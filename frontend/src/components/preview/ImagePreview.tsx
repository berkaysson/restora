import React, { useState, useRef, useEffect, useCallback } from "react";
import { Image as ImageIcon } from "lucide-react";
import { ZoomController } from "../common/ZoomController";

import type { TextLine, LayoutBlock } from "../../types";
import { useAnalysis } from "../../context/AnalysisContext";

export const ImagePreview: React.FC = () => {
  const { data, highlightIndex, setHighlightIndex, highlightedBlockIndex, setHighlightedBlockIndex, hiddenLabels } =
    useAnalysis();
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
    [],
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(prev - 0.2, 0.2)),
    [],
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
        const wheelStep = 0.05;
        if (e.deltaY < 0) {
          setZoom((prev) => Math.min(5, prev + wheelStep));
        } else {
          setZoom((prev) => Math.max(0.1, prev - wheelStep));
        }
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
    <div className="relative flex w-full h-full overflow-hidden bg-base-200/50 group">
      {data && (
        <div className="absolute z-20 flex items-center gap-2 -translate-x-1/2 bottom-8 left-1/2">
          {/* Main Control Island */}
          <ZoomController
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onFitContent={handleFitContent}
            onScroll={scrollBy}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={`w-full h-full overflow-auto transition-colors select-none scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20 hover:scrollbar-thumb-primary/40 ${
          data ? "cursor-grab active:cursor-grabbing" : ""
        }`}
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
                const isHidden = line.layout_labels?.some((lbl: string) =>
                  hiddenLabels.includes(lbl),
                );
                if (isHidden) return null;

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
              {/* Layout blocks overlay */}
              {data.layout?.layout_blocks?.map((block: LayoutBlock, idx: number) => {
                const [bx0, by0, bx1, by1] = block.bbox;
                const isHl = highlightedBlockIndex === idx;

                // Simple label-to-color mapping mirroring PositionedLayoutBlock
                const BORDER_COLORS: Record<string, string> = {
                  "Section-header": "rgba(139,92,246,0.75)",
                  "Text": "rgba(59,130,246,0.65)",
                  "Table": "rgba(34,197,94,0.75)",
                  "Figure": "rgba(251,146,60,0.75)",
                  "Caption": "rgba(236,72,153,0.65)",
                  "List": "rgba(20,184,166,0.65)",
                  "Footnote": "rgba(234,179,8,0.65)",
                };
                const BG_COLORS: Record<string, string> = {
                  "Section-header": "rgba(139,92,246,0.12)",
                  "Text": "rgba(59,130,246,0.10)",
                  "Table": "rgba(34,197,94,0.12)",
                  "Figure": "rgba(251,146,60,0.12)",
                  "Caption": "rgba(236,72,153,0.10)",
                  "List": "rgba(20,184,166,0.10)",
                  "Footnote": "rgba(234,179,8,0.10)",
                };
                const borderColor = BORDER_COLORS[block.label] ?? "rgba(100,116,139,0.65)";
                const bgColor = BG_COLORS[block.label] ?? "rgba(100,116,139,0.10)";

                return (
                  <div
                    key={`lb-${idx}`}
                    className="absolute transition-all duration-150"
                    style={{
                      left: bx0,
                      top: by0,
                      width: bx1 - bx0,
                      height: by1 - by0,
                      border: `1.5px solid ${borderColor}`,
                      backgroundColor: isHl ? bgColor.replace("0.1", "0.22").replace("0.12", "0.24") : bgColor,
                      borderRadius: "3px",
                      zIndex: isHl ? 20 : 5,
                      boxShadow: isHl ? `0 0 0 2px ${borderColor}` : "none",
                      pointerEvents: "auto",
                    }}
                    onMouseEnter={() => setHighlightedBlockIndex(idx)}
                    onMouseLeave={() => setHighlightedBlockIndex(null)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative flex flex-col items-center justify-center w-full h-full gap-6 overflow-hidden bg-base-200/50 text-base-content/40">
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="p-8 rounded-full shadow-xl bg-base-100 ring-1 ring-base-content/5">
              <ImageIcon className="w-12 h-12 opacity-50" />
            </div>
            <div className="space-y-1 text-center">
              <h3 className="text-lg font-semibold text-base-content/70">
                Henüz belge yok
              </h3>
              <p className="text-sm max-w-50">
                İşlem yapmak için bir belge yükleyin veya OCR işlemini başlatın.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
