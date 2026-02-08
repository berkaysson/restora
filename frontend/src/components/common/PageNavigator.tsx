import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLayout } from "../../context/LayoutContext";

export const PageNavigator: React.FC = () => {
  const { currentPage, totalPages, setCurrentPage } = useLayout();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-0.5 p-1 bg-base-300/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl h-9 ring-1 ring-black/20">
      <button
        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
        className="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-0 hover:bg-base-200/50 text-base-content/70 disabled:bg-transparent disabled:opacity-20"
        title="Önceki Sayfa"
      >
        <ChevronLeft size={16} />
      </button>

      <div className="flex items-center px-1 gap-1 h-full select-none">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) {
              setCurrentPage(Math.min(Math.max(1, val), totalPages));
            }
          }}
          onFocus={(e) => e.target.select()}
          className="w-8 p-0 text-center bg-transparent border-0 focus:ring-0 focus:outline-none font-semibold text-sm text-primary appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm text-base-content/40 font-medium select-none">
          / {totalPages}
        </span>
      </div>

      <button
        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-0 hover:bg-base-200/50 text-base-content/70 disabled:bg-transparent disabled:opacity-20"
        title="Sonraki Sayfa"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
};
