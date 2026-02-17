import React, { useState } from "react";
import { Download, X } from "lucide-react";
import { DualRangeSlider } from "../ui/DualRangeSlider";

interface PdfExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (
    startPage: number,
    endPage: number,
    useBlocks: boolean,
    includeChanges: boolean,
  ) => Promise<void>;
  totalPages: number;
}

export const PdfExportDialog: React.FC<PdfExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  totalPages,
}) => {
  const [range, setRange] = useState<[number, number]>([1, totalPages]);
  const [startInput, setStartInput] = useState<string>("1");
  const [endInput, setEndInput] = useState<string>(totalPages.toString());
  const [useBlocks, setUseBlocks] = useState(true);
  const [includeChanges, setIncludeChanges] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // State initializes on mount when dialog opens (controlled by key or conditional rendering in parent)

  const handleSliderChange = (newRange: [number, number]) => {
    if (isLoading) return;
    setRange(newRange);
    setStartInput(newRange[0].toString());
    setEndInput(newRange[1].toString());
  };

  const handleStartBlur = () => {
    if (isLoading) return;
    let val = parseInt(startInput);
    if (isNaN(val)) val = 1;
    val = Math.max(1, Math.min(val, range[1]));
    setRange([val, range[1]]);
    setStartInput(val.toString());
  };

  const handleEndBlur = () => {
    if (isLoading) return;
    let val = parseInt(endInput);
    if (isNaN(val)) val = totalPages;
    val = Math.max(range[0], Math.min(val, totalPages));
    setRange([range[0], val]);
    setEndInput(val.toString());
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    handler: () => void,
  ) => {
    if (e.key === "Enter") {
      handler();
    }
  };

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsLoading(true);
    await onExport(range[0], range[1], useBlocks, includeChanges);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="relative w-11/12 max-w-md modal-box">
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 btn btn-sm btn-circle btn-ghost disabled:bg-transparent disabled:text-base-content/20"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="flex items-center gap-2 mb-6 text-lg font-bold">
          <Download className="w-5 h-5 text-primary" />
          PDF Olarak İndir
        </h3>

        <div className="space-y-6">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Başlangıç: {range[0]}</span>
            <span>Bitiş: {range[1]}</span>
          </div>

          <div className="px-2">
            <DualRangeSlider
              min={1}
              max={totalPages}
              value={range}
              onChange={handleSliderChange}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-4">
            <div className="w-full form-control">
              <label className="label">
                <span className="label-text">Başlangıç Sayfası</span>
              </label>
              <input
                type="number"
                min={1}
                max={range[1]}
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                onBlur={handleStartBlur}
                onKeyDown={(e) => handleKeyDown(e, handleStartBlur)}
                className="w-full input input-bordered"
                disabled={isLoading}
              />
            </div>
            <div className="w-full form-control">
              <label className="label">
                <span className="label-text">Bitiş Sayfası</span>
              </label>
              <input
                type="number"
                min={range[0]}
                max={totalPages}
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                onBlur={handleEndBlur}
                onKeyDown={(e) => handleKeyDown(e, handleEndBlur)}
                className="w-full input input-bordered"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Options Section */}
          <div className="pt-2 border-t border-base-content/10">
            <label className="flex items-center gap-3 pr-4 cursor-pointer label">
              <span className="flex-1 label-text">
                <span className="block font-medium">Akıllı Paragraf Modu</span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={useBlocks}
                onChange={(e) => setUseBlocks(e.target.checked)}
                disabled={isLoading}
              />
            </label>
            <span className="block text-xs text-base-content/60 mt-0.5">
              Metinleri paragraf blokları halinde dışa aktarır (Sesli okuma için
              önerilir).
            </span>
          </div>

          <div className="pt-4 border-t border-base-content/10">
            <label className="flex items-center gap-3 pr-4 cursor-pointer label">
              <span className="flex-1 label-text">
                <span className="block font-medium">
                  Değişiklikleri Dahil Et
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={includeChanges}
                onChange={(e) => setIncludeChanges(e.target.checked)}
                disabled={isLoading}
              />
            </label>
            <span className="block text-xs text-base-content/60 mt-0.5">
              Editörde yapılan düzenlemeleri, silinen satırları ve gizlenen
              bölümleri PDF'e yansıtır. Kapalıyken orijinal metin kullanılır.
            </span>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              İptal
            </button>
            <button
              onClick={handleExport}
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isLoading
                ? "Hazırlanıyor..."
                : `İndir (${range[1] - range[0] + 1} Sayfa)`}
            </button>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </div>
  );
};
