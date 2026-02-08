import React, { useState } from "react";
import { Logs } from "../Logs";
import { Terminal, Activity, Download } from "lucide-react";

interface LogPanelProps {
  onOpenOverlay: () => void;
  showOverlayButton?: boolean;
  showExportButton?: boolean;
  onExportPdf?: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({
  onOpenOverlay,
  showOverlayButton = false,
  showExportButton = false,
  onExportPdf,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Buttons Container */}
      <div
        className={`fixed bottom-4 right-4 z-40 flex gap-2 transition-all duration-300 ${
          isOpen ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {/* PDF Export Button */}
        {onExportPdf && showExportButton && (
          <button
            onClick={onExportPdf}
            className="btn btn-circle btn-primary shadow-xl"
            title="PDF Olarak İndir"
          >
            <Download className="w-5 h-5" />
          </button>
        )}

        {/* Overlay Trigger Button */}
        {showOverlayButton && (
          <button
            onClick={onOpenOverlay}
            className="btn btn-circle btn-secondary shadow-xl"
            title="Yükleme Durumunu Görüntüle"
          >
            <Activity className="w-5 h-5" />
          </button>
        )}

        {/* System Logs Trigger Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="btn btn-circle btn-primary shadow-xl"
          title="Sistem Günlüklerini Aç"
        >
          <Terminal className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 h-96 transition-transform duration-300 ease-in-out bg-base-300 border-t border-base-content/10 shadow-2xl ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <Logs onClose={() => setIsOpen(false)} />
      </div>
    </>
  );
};
