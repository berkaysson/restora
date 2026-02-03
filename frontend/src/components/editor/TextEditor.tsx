import React, { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Pencil, Check, X, Trash2 } from "lucide-react";
import { ZoomController } from "../common/ZoomController";
import type { TextLine } from "../../types";
import { useAnalysis } from "../../context/AnalysisContext";
import { useEditor } from "../../context/EditorContext";

export const TextEditor: React.FC = () => {
  const {
    data,
    highlightIndex,
    setHighlightIndex,
    hiddenLabels,
    toggleLabel,
    editingIndex,
    setEditingIndex,
    updateTextLine,
    deleteTextLine,
  } = useAnalysis();
  const { fontSize } = useEditor();
  const [editText, setEditText] = useState("");

  const [zoom, setZoom] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(3, prev + 0.2)),
    [],
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(0.2, prev - 0.2)),
    [],
  );
  const handleResetZoom = useCallback(() => setZoom(1), []);

  const scrollBy = useCallback((dx: number, dy: number) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: dx,
        top: dy,
        behavior: "smooth",
      });
    }
  }, []);

  // Ctrl+Scroll Zoom
  useEffect(() => {
    const container = scrollContainerRef.current;
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
  }, [data, handleZoomIn, handleZoomOut]);

  // Drag to Pan
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current) return;
      const dx = e.pageX - dragStart.x;
      const dy = e.pageY - dragStart.y;
      scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - dx;
      scrollContainerRef.current.scrollTop = dragStart.scrollTop - dy;
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
    if (e.button !== 0) return;
    e.preventDefault();

    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.pageX,
      y: e.pageY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    });
  };

  // Extract all unique labels from the current document
  const availableLabels = React.useMemo(() => {
    if (!data?.layout?.text_lines) return [];
    const labels = new Set<string>();
    data.layout.text_lines.forEach((line) => {
      line.layout_labels?.forEach((lbl) => labels.add(lbl));
    });
    return Array.from(labels).sort();
  }, [data]);

  // Editing handlers
  const startEditing = useCallback(
    (idx: number, currentText: string) => {
      setEditingIndex(idx);
      setEditText(currentText);
    },
    [setEditingIndex],
  );

  const saveEdit = useCallback(() => {
    if (editingIndex !== null) {
      updateTextLine(editingIndex, editText);
      setEditingIndex(null);
      setEditText("");
    }
  }, [editingIndex, editText, updateTextLine, setEditingIndex]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditText("");
  }, [setEditingIndex]);

  // Handle keyboard shortcuts for editing
  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit();
      } else if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit],
  );

  const { width, height, text_lines } = data?.layout || {};
  const hasDimensions = !!(width && height);
  const aspectRatio = hasDimensions
    ? (width as number) / (height as number)
    : undefined;

  const handleFitToPage = React.useCallback(() => {
    if (!scrollContainerRef.current || !hasDimensions || !aspectRatio) return;
    const container = scrollContainerRef.current;

    const availableWidth = container.clientWidth - 64;
    const availableHeight = container.clientHeight - 64;

    const baseWidth = 1000;
    const baseHeight = baseWidth / aspectRatio;

    const zoomX = availableWidth / baseWidth;
    const zoomY = availableHeight / baseHeight;

    setZoom(Math.min(zoomX, zoomY));
  }, [hasDimensions, aspectRatio]);

  // Auto-fit on load
  useEffect(() => {
    if (data?.layout) {
      const timer = setTimeout(handleFitToPage, 50);
      return () => clearTimeout(timer);
    }
  }, [data, handleFitToPage]);

  if (!data || !data.layout?.text_lines || !text_lines) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full h-full gap-6 overflow-hidden border-l bg-base-200/50 text-base-content/40 border-base-200">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="p-8 rounded-full shadow-xl bg-base-100 ring-1 ring-base-content/5">
          <FileText className="w-12 h-12 opacity-50" />
        </div>
        <div className="space-y-1 text-center">
          <h3 className="text-lg font-semibold text-base-content/70">
            Henüz metin yok
          </h3>
          <p className="text-sm max-w-50">
            İşlem yapmak için bir belge yükleyin veya OCR işlemini başlatın.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-base-100">
      <div className="sticky top-0 z-20 flex flex-col gap-3 p-3 border-b shadow-sm border-base-content/5 bg-base-100">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-xs text-base-content/50">
              DETECTED TEXT ({text_lines.length} lines)
            </span>
            <span className="font-mono text-[10px] text-base-content/30">
              {hasDimensions ? `${width}x${height}px` : "RAW FLOW"}
            </span>
          </div>

          <ZoomController
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            onFitContent={handleFitToPage}
            onScroll={scrollBy}
          />
        </div>

        {availableLabels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {availableLabels.map((label) => {
              const isHidden = hiddenLabels.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleLabel(label)}
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

      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-auto p-8 relative transition-colors select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } bg-base-200/50 text-base-content/20`}
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onMouseDown={handleMouseDown}
      >
        {hasDimensions ? (
          <div
            className="mx-auto transition-all origin-top"
            style={{
              width: `${1000 * zoom}px`,
              aspectRatio: `${aspectRatio}`,
            }}
          >
            <div
              className="relative transition-all origin-top-left rounded-sm shadow-xl bg-base-100 ring-1 ring-base-content/5 text-base-content"
              style={{
                width: `1000px`,
                height: `${1000 / (aspectRatio || 1)}px`,
                transform: `scale(${zoom})`,
              }}
            >
              {text_lines.map((line: TextLine, idx: number) => {
                const isHidden = line.layout_labels?.some((lbl: string) =>
                  hiddenLabels.includes(lbl),
                );

                if (isHidden) return null;

                const [x1, y1, x2, y2] = line.bbox;
                const w = x2 - x1;
                const h = y2 - y1;

                const left = (x1 / width!) * 100;
                const top = (y1 / height!) * 100;
                const wPct = (w / width!) * 100;
                const hPct = (h / height!) * 100;

                return (
                  <div
                    key={idx}
                    className={`absolute flex items-center hover:z-50 group border border-transparent hover:border-primary/50 rounded transition-colors ${
                      highlightIndex === idx
                        ? "bg-primary/20 text-primary z-50 border-primary"
                        : "hover:bg-primary/5 text-base-content"
                    } ${editingIndex === idx ? "z-[60] border-primary bg-primary/10" : ""}`}
                    style={{
                      left: `${left}%`,
                      top: `${top}%`,
                      width: `${wPct}%`,
                      height: `${hPct}%`,
                      fontSize: `${(h / height!) * (1000 / (aspectRatio || 1))}px`,
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseLeave={() => setHighlightIndex(null)}
                  >
                    {editingIndex === idx ? (
                      // Editing mode
                      <div
                        className="absolute inset-0 flex items-center gap-1 p-1 -m-1 rounded bg-base-100 shadow-lg ring-2 ring-primary"
                        style={{ minWidth: "300px" }}
                      >
                        <input
                          type="text"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="flex-1 px-2 py-1 text-sm border rounded input input-sm input-bordered bg-base-100 text-base-content"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEdit();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="btn btn-xs btn-success btn-circle"
                          title="Kaydet (Enter)"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="btn btn-xs btn-error btn-circle"
                          title="İptal (Escape)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      // Normal display
                      <>
                        <span
                          className="block w-full h-full px-px"
                          style={{
                            fontSize: "clamp(6px, 100%, 48px)",
                          }}
                        >
                          {line.text}
                        </span>
                        {/* Action buttons - visible on hover, top-right */}
                        <div className="absolute flex gap-1 transition-opacity opacity-0 -top-1 -right-1 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(idx, line.text);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-content hover:bg-primary-focus shadow-md"
                            title="Metni düzenle"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTextLine(idx);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="flex items-center justify-center w-5 h-5 rounded bg-error text-error-content hover:bg-error/80 shadow-md"
                            title="Satırı sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="absolute left-0 hidden px-2 py-1 text-xs rounded shadow-xl pointer-events-none -top-8 group-hover:block bg-neutral text-neutral-content whitespace-nowrap z-100">
                          {line.text} (
                          {line.layout_labels?.join(", ") || "No Label"})
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 font-mono text-sm">
            <div className="py-2 mb-4 text-xs alert alert-warning">
              Warning: Image dimensions missing. Showing list view.
            </div>
            {text_lines.map((line: TextLine, idx: number) => {
              const isHidden = line.layout_labels?.some((lbl: string) =>
                hiddenLabels.includes(lbl),
              );
              if (isHidden) return null;

              return (
                <div
                  key={idx}
                  className={`relative rounded px-2 py-1 transition-colors duration-200 cursor-default group ${
                    highlightIndex === idx
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-base-200"
                  } ${editingIndex === idx ? "bg-primary/10 ring-2 ring-primary" : ""}`}
                  style={{ fontSize: `${fontSize}px` }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseLeave={() => setHighlightIndex(null)}
                >
                  {editingIndex === idx ? (
                    // Editing mode
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        className="flex-1 px-2 py-1 text-sm border rounded input input-sm input-bordered bg-base-100 text-base-content"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="btn btn-xs btn-success btn-circle"
                        title="Kaydet (Enter)"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEdit();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="btn btn-xs btn-error btn-circle"
                        title="İptal (Escape)"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    // Normal display
                    <>
                      {line.text}
                      {/* Action buttons - visible on hover, top-right */}
                      <div className="absolute flex gap-1 transition-opacity opacity-0 top-1 right-1 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(idx, line.text);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex items-center justify-center w-5 h-5 rounded bg-primary text-primary-content hover:bg-primary-focus shadow-md"
                          title="Metni düzenle"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTextLine(idx);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="flex items-center justify-center w-5 h-5 rounded bg-error text-error-content hover:bg-error/80 shadow-md"
                          title="Satırı sil"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
