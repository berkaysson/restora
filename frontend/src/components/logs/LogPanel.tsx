import React, { useState, useCallback, useEffect } from "react";
import { Logs } from "../Logs";

export const LogPanel: React.FC = () => {
  const [height, setHeight] = useState(192); // Default h-48 = 192px
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "ns-resize";
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = "default";
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        // Limit height between 100px and 600px
        if (newHeight > 100 && newHeight < 600) {
          setHeight(newHeight);
        }
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return (
    <div
      className="relative border-t border-gray-800 shrink-0"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute top-0 left-0 z-50 w-full h-1 transition-colors cursor-ns-resize hover:bg-indigo-500/50 group"
        onMouseDown={startResizing}
      >
        <div className="absolute w-8 h-1 -translate-x-1/2 -translate-y-1/2 bg-gray-700 rounded-full top-1/2 left-1/2 group-hover:bg-indigo-400" />
      </div>
      <Logs />
    </div>
  );
};
