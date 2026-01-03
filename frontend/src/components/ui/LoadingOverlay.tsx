import React from "react";

interface LoadingOverlayProps {
  loading: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center duration-200 bg-base-300/80 backdrop-blur-sm animate-in fade-in">
      <div className="border shadow-xl card w-96 bg-base-100 border-base-content/10">
        <div className="items-center text-center card-body">
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-lg bg-primary/20 animate-pulse"></div>
            <span className="relative loading loading-spinner loading-lg text-primary"></span>
          </div>
          <h2 className="mt-4 card-title text-base-content">AI İşleniyor</h2>
          <p className="text-base-content/60">
            Belge analiz ediliyor, lütfen bekleyin...
          </p>
        </div>
      </div>
    </div>
  );
};
