/**
 * @fileoverview Log Context for real-time log streaming.
 *
 * Manages WebSocket connection to backend and provides log entries
 * to the application for display in the log panel.
 *
 * @module context/LogContext
 */

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Source of a log entry */
export type LogSource = "frontend" | "backend" | "system";

/**
 * Structure of a single log entry.
 */
export interface LogEntry {
  /** ISO timestamp when the log was created */
  timestamp: string;
  /** Log message content */
  message: string;
  /** Origin of the log (frontend/backend/system) */
  source: LogSource;
}

/**
 * Shape of the Log context value.
 */
interface LogContextType {
  /** Array of all log entries */
  logs: LogEntry[];
  /** Add a new log entry */
  addLog: (message: string, source?: LogSource) => void;
  /** Clear all log entries */
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

/**
 * Hook to access log context.
 *
 * @returns The log context with logs array and manipulation functions
 * @throws Error if used outside of LogProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useLogs = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLogs must be used within a LogProvider");
  }
  return context;
};

/**
 * Provider component for log state and WebSocket connection.
 *
 * Establishes WebSocket connection to backend at ws://localhost:8000/ws/logs
 * and streams incoming log messages to all consuming components.
 *
 * @param children - Child components to wrap
 */
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
