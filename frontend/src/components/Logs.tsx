import { useEffect, useRef } from "react";
import { useLogs } from "../context/LogContext";
import { Terminal, Trash2, X } from "lucide-react";

interface LogsProps {
  onClose?: () => void;
}

export const Logs = ({ onClose }: LogsProps) => {
  const { logs, clearLogs } = useLogs();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-base-100 font-mono text-xs">
      {/* Header */}
      <div className="navbar min-h-12 bg-base-300 px-4 border-b border-base-content/10">
        <div className="flex-1 gap-2 text-base-content">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider uppercase">
            System Logs
          </span>
        </div>
        <div className="flex-none gap-2">
          <button
            onClick={clearLogs}
            className="btn btn-ghost btn-sm btn-square text-error"
            title="Clear Logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-square"
              title="Close Logs"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Log List */}
      <div className="flex-1 p-4 overflow-auto custom-scrollbar bg-base-200">
        <ul className="space-y-1">
          {logs.length === 0 ? (
            <li className="italic text-base-content/50 select-none">
              No logs yet... waiting operations...
            </li>
          ) : (
            logs.map((log, index) => {
              let badgeClass = "badge-neutral";
              if (log.source === "frontend") badgeClass = "badge-info";
              if (log.source === "backend") badgeClass = "badge-success";

              return (
                <li
                  key={index}
                  className="flex gap-3 hover:bg-base-300/50 p-1 rounded transition-colors"
                >
                  <span className="text-base-content/50 shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="break-all flex-1 text-base-content/80">
                    <span
                      className={`badge badge-xs mr-2 uppercase ${badgeClass} font-bold text-white`}
                    >
                      {log.source === "system"
                        ? "SYS"
                        : log.source === "backend"
                        ? "API"
                        : "UI"}
                    </span>
                    {log.message}
                  </span>
                </li>
              );
            })
          )}
          <div ref={bottomRef} />
        </ul>
      </div>
    </div>
  );
};
