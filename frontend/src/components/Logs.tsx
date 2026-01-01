import { useEffect, useRef } from "react";
import { useLogs } from "../context/LogContext";
import { Terminal, Trash2 } from "lucide-react";

export const Logs = () => {
  const { logs, clearLogs } = useLogs();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-gray-950/90 font-mono text-xs shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2 text-gray-400">
          <Terminal className="w-4 h-4" />
          <span className="font-bold tracking-wider uppercase">
            System Logs
          </span>
        </div>
        <button
          onClick={clearLogs}
          className="p-1 transition-colors rounded hover:bg-gray-800 hover:text-red-400 text-gray-500"
          title="Clear Logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Log List */}
      <div className="flex-1 p-4 overflow-auto space-y-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-gray-600 italic select-none">
            No logs yet...等待 operations...
          </div>
        ) : (
          logs.map((log, index) => {
            // Determine Color
            let colorClass = "text-gray-400"; // Default/System
            if (log.source === "frontend") colorClass = "text-blue-400";
            if (log.source === "backend") colorClass = "text-green-400";

            return (
              <div
                key={index}
                className="flex gap-3 hover:bg-gray-900/50 p-0.5 rounded"
              >
                <span className="text-gray-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`break-all ${colorClass}`}>
                  <span className="opacity-50 mr-2 uppercase text-[10px] border border-current px-1 rounded">
                    {log.source === "system"
                      ? "SYS"
                      : log.source === "backend"
                      ? "API"
                      : "UI"}
                  </span>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
