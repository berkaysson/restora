import React from "react";
import { ZoomController } from "../../common/ZoomController";

interface EditorHeaderProps {
  lineCount: number;
  width?: number;
  height?: number;
  hasDimensions: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitContent: () => void;
  onScroll: (dx: number, dy: number) => void;
  availableLabels: string[];
  hiddenLabels: string[];
  onToggleLabel: (label: string) => void;
}

/**
 * Header component with zoom controls and label filters
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
  lineCount,
  width,
  height,
  hasDimensions,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitContent,
  onScroll,
  availableLabels,
  hiddenLabels,
  onToggleLabel,
}) => {
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-3 p-3 border-b shadow-sm border-base-content/5 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs text-base-content/50">
            DETECTED TEXT ({lineCount} lines)
          </span>
          <span className="font-mono text-[10px] text-base-content/30">
            {hasDimensions ? `${width}x${height}px` : "RAW FLOW"}
          </span>
        </div>

        <ZoomController
          zoom={zoom}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          onFitContent={onFitContent}
          onScroll={onScroll}
        />
      </div>

      {availableLabels.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {availableLabels.map((label) => {
            const isHidden = hiddenLabels.includes(label);
            return (
              <button
                key={label}
                onClick={() => onToggleLabel(label)}
                className={`btn btn-xs normal-case border-0 ${
                  isHidden
                    ? "btn-ghost text-base-content/40 decoration-line-through bg-base-300"
                    : "btn-primary text-primary-content"
                }`}
                title={isHidden ? "Show" : "Hide"}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
