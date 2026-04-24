import React from "react";
import { ZoomController } from "../../common/ZoomController";
import { PageNavigator } from "../../common/PageNavigator";
import {
  Layers,
  FileText,
  AlignLeft,
  LayoutTemplate,
  Gauge,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEditor } from "../../../context/EditorContext";

export type EditorViewMode = "text-lines" | "layout-blocks" | "confidence";

interface EditorHeaderProps {
  lineCount: number;
  blockCount: number;
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
  onResetFilters: () => void;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
}

/**
 * Header component with zoom controls and label filters
 */
export const EditorHeader: React.FC<EditorHeaderProps> = ({
  lineCount,
  blockCount,
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
  onResetFilters,
  viewMode,
  onViewModeChange,
}) => {
  const { showLayoutDetails, setShowLayoutDetails } = useEditor();
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-1 p-2 border-b shadow-sm border-base-content/5 bg-base-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-sm font-black leading-tight tracking-tighter uppercase text-base-content/80">
              {viewMode === "text-lines"
                ? `${lineCount} SATIR`
                : viewMode === "layout-blocks"
                  ? `${blockCount} BLOK`
                  : `${lineCount} SATIR`}
            </span>
            <span className="font-mono text-[11px] font-bold leading-tight text-base-content/50">
              {hasDimensions ? `${width}x${height}px` : "RAW FLOW"}
            </span>
          </div>
          <div className="hidden w-px h-4 bg-base-content/10 sm:block" />
          <PageNavigator />
          {viewMode === "layout-blocks" && (
            <>
              <div className="hidden w-px h-4 bg-base-content/10 sm:block" />
              <div
                className="flex items-center gap-2 px-2 py-1 transition-all rounded-lg cursor-pointer bg-secondary/5 hover:bg-secondary/10 group/toggle"
                onClick={() => setShowLayoutDetails(!showLayoutDetails)}
                title={
                  showLayoutDetails
                    ? "Okuma sırası numarasını gizle"
                    : "Okuma sırası numarasını göster"
                }
              >
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${
                    showLayoutDetails ? "bg-secondary" : "bg-base-content/20"
                  }`}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 shadow-sm"
                    style={{ left: showLayoutDetails ? "18px" : "2px" }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {showLayoutDetails ? (
                    <Eye size={12} className="text-secondary" />
                  ) : (
                    <EyeOff size={12} className="text-base-content/40" />
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      showLayoutDetails
                        ? "text-secondary"
                        : "text-base-content/40"
                    }`}
                  >
                    Okuma Sırası
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="p-1 join bg-base-200/50">
            <button
              onClick={() => onViewModeChange("text-lines")}
              className={`join-item btn btn-xs h-8 px-3 transition-all duration-200 ${
                viewMode === "text-lines"
                  ? "btn-primary shadow-lg scale-105 z-10"
                  : "btn-ghost text-base-content/50 hover:text-base-content/80"
              }`}
              title="Metin Satırları Görünümü"
            >
              <AlignLeft size={14} />
              <span className="hidden sm:inline">Metin</span>
            </button>
            <button
              onClick={() => onViewModeChange("layout-blocks")}
              className={`join-item btn btn-xs h-8 px-3 transition-all duration-200 ${
                viewMode === "layout-blocks"
                  ? "btn-secondary shadow-lg scale-105 z-10"
                  : "btn-ghost text-base-content/50 hover:text-base-content/80"
              }`}
              title="Mizanpaj Blokları Görünümü"
            >
              <LayoutTemplate size={14} />
              <span className="hidden sm:inline">Mizanpaj</span>
            </button>
            <button
              onClick={() => onViewModeChange("confidence")}
              className={`join-item btn btn-xs h-8 px-3 transition-all duration-200 ${
                viewMode === "confidence"
                  ? "btn-warning shadow-lg scale-105 z-10"
                  : "btn-ghost text-base-content/50 hover:text-base-content/80"
              }`}
              title="Güven Haritası Görünümü"
            >
              <Gauge size={14} />
              <span className="hidden sm:inline">Güven</span>
            </button>
          </div>

          <div className="w-px h-4 bg-base-content/10" />

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

      {/* Labels Management Accordion */}
      {(allLabels.length > 0 || availableLabels.length > 0) && (
        <details className="overflow-hidden border rounded-lg collapse collapse-arrow bg-base-200/30 border-base-content/5 group">
          <summary className="flex items-center min-h-0 gap-3 px-3 py-2 text-xs font-black transition-colors cursor-pointer collapse-title hover:bg-base-content/5">
            <Layers size={16} className="text-secondary" />
            <span className="tracking-tight uppercase">
              Katman ve Etiket Yönetimi
            </span>

            {(hiddenLabels.length > 0 || globalHiddenLabels.length > 0) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onResetFilters();
                }}
                className="z-30 btn btn-ghost btn-xs btn-square text-secondary tooltip tooltip-left"
                data-tip="Ayarları Sıfırla"
              >
                <RotateCcw size={14} strokeWidth={3} />
              </button>
            )}
          </summary>
          <div className="collapse-content pb-2! px-2! flex flex-col gap-2 mt-1">
            {/* Global section toggle — all pages */}
            {allLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-lg bg-base-200/60 border border-base-content/5">
                <div className="flex items-center gap-1.5 mr-2">
                  <Layers size={14} className="text-secondary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
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
                <div className="flex items-center gap-1.5 mr-2">
                  <FileText size={14} className="text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
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
        </details>
      )}
    </div>
  );
};
