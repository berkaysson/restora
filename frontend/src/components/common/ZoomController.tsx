import React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ZoomControllerProps {
  zoom: number;
  isNavigationPadVisible?: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitContent?: () => void;
  onScroll?: (dx: number, dy: number) => void;
}

export const ZoomController: React.FC<ZoomControllerProps> = ({
  zoom,
  isNavigationPadVisible = false,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitContent,
  onScroll,
}) => {
  return (
    <div className="flex items-center gap-2 p-1 border shadow-2xl bg-base-300/90 backdrop-blur-xl rounded-2xl border-white/10 ring-1 ring-black/20">
      {/* Zoom Controls */}
      <div
        className={`flex items-center gap-1 px-2 ${onScroll && isNavigationPadVisible ? "border-r border-white/5" : ""}`}
      >
        <button
          onClick={onZoomOut}
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
          onClick={onZoomIn}
          className="transition-colors btn btn-ghost btn-circle btn-sm hover:bg-primary/20 hover:text-primary"
          title="Yakınlaştır (Ctrl + Scroll)"
        >
          <ZoomIn size={18} />
        </button>
        <button
          onClick={onResetZoom}
          className="transition-colors btn btn-ghost btn-circle btn-sm text-error hover:bg-warning/20"
          title="100% (Sıfırla)"
        >
          <RotateCcw size={16} />
        </button>
        {onFitContent && (
          <button
            onClick={onFitContent}
            className="transition-colors btn btn-ghost btn-circle btn-sm hover:bg-success/20"
            title="Ekrana Sığdır"
          >
            <Maximize size={16} />
          </button>
        )}
      </div>

      {/* Navigation Pad */}
      {onScroll && isNavigationPadVisible && (
        <div className="flex items-center gap-1 px-1">
          <div className="grid grid-cols-3 gap-0.5">
            <div />
            <button
              onClick={() => onScroll(0, -150)}
              className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
            >
              <ChevronUp size={16} />
            </button>
            <div />
            <button
              onClick={() => onScroll(-150, 0)}
              className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center justify-center p-0.5 rounded-full bg-primary/10">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            </div>
            <button
              onClick={() => onScroll(150, 0)}
              className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
            >
              <ChevronRight size={16} />
            </button>
            <div />
            <button
              onClick={() => onScroll(0, 150)}
              className="btn btn-ghost btn-xs btn-circle hover:bg-primary/20"
            >
              <ChevronDown size={16} />
            </button>
            <div />
          </div>
        </div>
      )}
    </div>
  );
};
