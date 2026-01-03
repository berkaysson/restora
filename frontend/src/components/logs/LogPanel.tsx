import React, { useState } from "react";
import { Logs } from "../Logs";
import { Terminal } from "lucide-react";

export const LogPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`btn btn-circle btn-primary fixed bottom-4 right-4 z-40 shadow-xl transition-all duration-300 ${
          isOpen ? "translate-y-20 opacity-0" : "translate-y-0 opacity-100"
        }`}
        title="Open System Logs"
      >
        <Terminal className="w-5 h-5" />
      </button>

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
