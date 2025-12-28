import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

export type LogSource = "frontend" | "backend" | "system";

export interface LogEntry {
  timestamp: string;
  message: string;
  source: LogSource;
}

interface LogContextType {
  logs: LogEntry[];
  addLog: (message: string, source?: LogSource) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogs must be used within a LogProvider");
  }
  return context;
};

export const LogProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, source: LogSource = "frontend") => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      message,
      source,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    // Connect to WebSocket
    const socket = new WebSocket("ws://localhost:8000/ws/logs");

    socket.onopen = () => {
      addLog("Connected to Backend WebSocket", "system");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Backend sends timestamp, but we can respect it or use local time.
        // Let's rely on backend packet structure if it matches LogEntry
        setLogs((prev) => [...prev, data]);
      } catch (err) {
        console.error("Failed to parse log message", err);
      }
    };

    socket.onclose = () => {
      addLog("Disconnected from Backend WebSocket", "system");
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <LogContext.Provider value={{ logs, addLog, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};
