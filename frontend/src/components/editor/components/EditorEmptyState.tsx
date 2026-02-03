import React from "react";
import { FileText } from "lucide-react";

/**
 * Empty state component displayed when no text data is available
 */
export const EditorEmptyState: React.FC = () => {
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
};
