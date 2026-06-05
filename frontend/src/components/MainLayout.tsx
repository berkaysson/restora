import { FileList } from "./FileList";
import { Header } from "./header/Header";
import { LoadingOverlay } from "./ui/LoadingOverlay";
import { ImagePreview } from "./preview/ImagePreview";
import { TextEditor } from "./editor/TextEditor";
import { LogPanel } from "./logs/LogPanel";
import { useLayout } from "../context/LayoutContext";
import { useAnalysis } from "../context/AnalysisContext";
import { useFileProcessing } from "../hooks/useFileProcessing";
import { usePdfExport } from "../hooks/usePdfExport";
import { PdfExportDialog } from "./modals/PdfExportDialog";
import { PanelTopOpen, PanelTopClose } from "lucide-react";
import { useState } from "react";

export const MainLayout = () => {
  const {
    leftPanelWidth,
    isFileListOpen,
    setIsFileListOpen,
    isOverlayOpen,
    setIsOverlayOpen,
    loading,
    loadingMessage,
    progress,
    processedPages,
    totalPages,
    containerRef,
    startResizing,
    isHeaderCompact,
    setIsHeaderCompact,
  } = useLayout();

  const { data, clearAnalysis } = useAnalysis();
  const { handleUpload, handleOpenFile, handleCancel } = useFileProcessing();
  const { handleExportPdf } = usePdfExport();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleOpenExportDialog = () => {
    setIsExportDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-screen font-sans text-base-content bg-base-100 selection:bg-primary/30">
      <FileList
        isOpen={isFileListOpen}
        onClose={() => setIsFileListOpen(false)}
        onSelect={handleOpenFile}
      />

      <Header
        loading={loading}
        data={data}
        onOpenFileList={() => setIsFileListOpen(true)}
        onUpload={handleUpload}
        onClear={clearAnalysis}
      />

      {isHeaderCompact ? (
        <button
          onClick={() => setIsHeaderCompact(false)}
          className="fixed top-2 left-2 z-60 btn btn-sm btn-circle btn-primary shadow-lg hover:scale-110 transition-all duration-200"
          title="Başlığı Göster"
        >
          <PanelTopOpen className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => setIsHeaderCompact(true)}
          className="fixed top-2 left-2 z-60 btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-content/10"
          title="Başlığı Gizle"
          aria-label="Toggle Compact Mode"
        >
          <PanelTopClose className="w-4 h-4" />
        </button>
      )}

      <div className="relative flex flex-1 overflow-hidden" ref={containerRef}>
        <LoadingOverlay
          isOpen={isOverlayOpen}
          loading={loading}
          message={loadingMessage}
          progress={progress}
          processedPages={processedPages}
          totalPages={totalPages}
          onClose={() => setIsOverlayOpen(false)}
          onCancel={handleCancel}
        />

        {/* Left Panel: Visual Analysis */}
        <div
          style={{ width: `${leftPanelWidth}%` }}
          className="h-full relative shrink-0 transition-[width] duration-75 ease-out will-change-[width]"
        >
          <ImagePreview />
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1.5 h-full cursor-col-resize bg-base-200 hover:bg-primary/50 active:bg-primary z-40 transition-colors flex flex-col justify-center items-center shadow-sm select-none shrink-0"
          onMouseDown={startResizing}
        >
          <div className="w-0.5 h-8 bg-base-content/20 rounded-full" />
        </div>

        {/* Right Panel: Content Editor */}
        <div
          className="h-full relative shrink-0 bg-base-100 transition-[width] duration-75 ease-out will-change-[width]"
          style={{ width: `calc(100% - ${leftPanelWidth}% - 6px)` }}
        >
          <TextEditor />
        </div>
      </div>

      <LogPanel
        onOpenOverlay={() => setIsOverlayOpen(true)}
        showOverlayButton={!!data || loading}
        showExportButton={!!data && !loading}
        onExportPdf={handleOpenExportDialog}
      />

      {data && isExportDialogOpen && (
        <PdfExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
          onExport={handleExportPdf}
          totalPages={totalPages}
        />
      )}
    </div>
  );
};
