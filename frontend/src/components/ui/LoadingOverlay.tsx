import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  loading: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-2xl">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-lg bg-indigo-500/20 animate-pulse"></div>
          <Loader2 className="relative w-12 h-12 text-indigo-400 animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-xl font-bold tracking-tight text-white">
            AI İşleniyor
          </h3>
          <p className="text-sm text-gray-400">
            Belge analiz ediliyor, lütfen bekleyin...
          </p>
        </div>
      </div>
    </div>
  );
};
