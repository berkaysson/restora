import React, { useEffect, useRef } from "react";
import { useLogs } from "../../context/LogContext";
import { X, CheckCircle2 } from "lucide-react";

interface LoadingOverlayProps {
  isOpen: boolean;
  loading: boolean;
  message?: string;
  progress?: number;
  processedPages?: number;
  totalPages?: number;
  onClose: () => void;
  onCancel?: () => void;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isOpen,
  loading,
  message = "İşleniyor...",
  progress = 0,
  processedPages = 0,
  totalPages = 0,
  onClose,
  onCancel,
}) => {
  const { logs } = useLogs();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  if (!isOpen) return null;

  const isCompleted = progress >= 100;
  // Recent logs (last 5)
  const recentLogs = logs.slice(-10); // Show more logs if inspecting

  return (
    <div className="absolute inset-0 z-100 flex items-center justify-center duration-200 bg-base-300/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative border shadow-xl card w-lg bg-base-100 border-base-content/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute z-10 btn btn-sm btn-circle btn-ghost right-2 top-2"
          title="Kapat"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="items-center pt-8 text-center card-body">
          <div className="relative mb-4">
            {isCompleted ? (
              <CheckCircle2 className="w-16 h-16 duration-300 text-success animate-in zoom-in" />
            ) : (
              <>
                <div className="absolute inset-0 rounded-full blur-lg bg-primary/20 animate-pulse"></div>
                <span className="relative loading loading-spinner loading-lg text-primary"></span>
              </>
            )}
          </div>

          <h2 className="mb-2 text-xl font-bold card-title text-base-content">
            {isCompleted ? "İşlem Tamamlandı" : "AI İşleniyor"}
          </h2>

          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-xs font-medium text-base-content/60">
              <span>
                {isCompleted ? "Belge başarıyla analiz edildi" : message}
              </span>
              <span>
                {totalPages > 0
                  ? `${processedPages} / ${totalPages} Sayfa`
                  : `${Math.round(progress)}%`}
              </span>
            </div>
            <progress
              className={`w-full h-3 progress ${
                isCompleted ? "progress-success" : "progress-primary"
              }`}
              value={progress}
              max="100"
            ></progress>
          </div>

          {/* Logs Console */}
          <div className="w-full mt-6 text-left border rounded-lg bg-base-200 border-base-content/10">
            <div className="flex items-center px-3 py-2 text-xs font-bold border-b bg-base-300/50 text-base-content/70 border-base-content/10">
              <span
                className={`w-2 h-2 mr-2 rounded-full ${
                  loading ? "bg-success animate-pulse" : "bg-base-content/20"
                }`}
              ></span>
              Sistem Günlükleri
            </div>
            <div
              ref={scrollRef}
              className="h-48 p-3 overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin scrollbar-thumb-base-content/10"
            >
              {recentLogs.length === 0 ? (
                <span className="italic text-base-content/40">
                  Henüz günlük kaydı yok...
                </span>
              ) : (
                recentLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-base-content/40 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`break-all ${
                        log.source === "backend"
                          ? "text-secondary"
                          : log.source === "system"
                            ? "text-accent"
                            : "text-primary"
                      }`}
                    >
                      {log.source === "frontend" && "> "}
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {!isCompleted && loading && onCancel && (
            <div className="justify-center w-full mt-4 card-actions">
              <button
                onClick={onCancel}
                className="btn btn-error btn-outline btn-block text-error hover:text-white"
                disabled={message === "İşlem iptal ediliyor..."}
              >
                {message === "İşlem iptal ediliyor..." ? (
                  <>
                    <span className="loading loading-spinner loading-xs mr-2"></span>
                    İptal Ediliyor...
                  </>
                ) : (
                  "İşlemi İptal Et"
                )}
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="justify-center w-full mt-4 card-actions">
              <button onClick={onClose} className="btn btn-primary btn-block">
                Devam Et
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
