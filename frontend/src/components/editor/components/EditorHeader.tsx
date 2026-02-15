import React from "react";
import { ZoomController } from "../../common/ZoomController";
import { PageNavigator } from "../../common/PageNavigator";
import { Layers, FileText } from "lucide-react";

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
  allLabels: string[];
  globalHiddenLabels: string[];
  onToggleGlobalLabel: (label: string) => void;
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
  allLabels,
  globalHiddenLabels,
  onToggleGlobalLabel,
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

        <div className="flex items-center gap-2">
          <PageNavigator />
          <ZoomController
            zoom={zoom}
            onZoomIn={onZoomIn}
            onZoomOut={onZoomOut}
            onResetZoom={onResetZoom}
            onFitContent={onFitContent}
            onScroll={onScroll}
          />
        </div>
      </div>

      {/* Global section toggle — all pages */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-lg bg-base-200/60 border border-base-content/5">
          <div className="flex items-center gap-1 mr-1">
            <Layers size={12} className="text-secondary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-secondary">
              Tüm Sayfalar
            </span>
          </div>
          {allLabels.map((label) => {
            const isHidden = globalHiddenLabels.includes(label);
            return (
              <button
                key={`global-${label}`}
                onClick={() => onToggleGlobalLabel(label)}
                className={`btn btn-xs normal-case ${
                  isHidden
                    ? "btn-ghost text-base-content/40 line-through bg-base-300 border-base-content/10"
                    : "btn-secondary text-secondary-content border-0"
                }`}
                title={
                  isHidden
                    ? `Tüm sayfalarda göster: ${label}`
                    : `Tüm sayfalarda gizle: ${label}`
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Per-page section toggle */}
      {availableLabels.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-lg bg-base-200/40 border border-base-content/5">
          <div className="flex items-center gap-1 mr-1">
            <FileText size={12} className="text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Bu Sayfa
            </span>
          </div>{" "}
          {availableLabels.map((label) => {
            const isHidden = hiddenLabels.includes(label);
            return (
              <button
                key={label}
                onClick={() => onToggleLabel(label)}
                className={`btn btn-xs normal-case border-0 ${
                  isHidden
                    ? "btn-ghost text-base-content/40 line-through bg-base-300"
                    : "btn-primary text-primary-content"
                }`}
                title={isHidden ? "Göster" : "Gizle"}
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
