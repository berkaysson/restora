import React from "react";
import { Scan, FolderOpen, Loader2, Upload, Trash2 } from "lucide-react";
import type { PageData } from "../../types";

interface HeaderProps {
  loading: boolean;
  data: PageData | null;
  onOpenFileList: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  loading,
  data,
  onOpenFileList,
  onUpload,
  onClear,
}) => {
  return (
    <div className="flex items-center justify-between h-16 px-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-2">
        <Scan className="w-6 h-6 text-indigo-400" />
        <h1 className="text-lg font-bold tracking-tight text-transparent bg-linear-to-r from-indigo-400 to-cyan-400 bg-clip-text">
          Restora{" "}
          <span className="font-mono text-xs text-gray-500 opacity-70">
            v.0.1
          </span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onOpenFileList}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm text-gray-300 transition-all bg-gray-800 rounded-lg ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-gray-700 hover:text-white"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Dosyalar</span>
        </button>

        <label
          className={`flex items-center gap-2 px-4 py-2 text-sm text-white transition-all bg-indigo-600 rounded-lg shadow-lg ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:bg-indigo-500 shadow-indigo-500/20 active:scale-95"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>{loading ? "İşleniyor..." : "PDF/Resim Yükle"}</span>
          <input
            type="file"
            onChange={onUpload}
            className="hidden"
            accept="image/*,.pdf"
            disabled={loading}
          />
        </label>

        {data && (
          <button
            onClick={onClear}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-sm text-red-400 transition-all border rounded-lg bg-red-900/20 border-red-900/50 ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-red-900/30 hover:text-red-300 active:scale-95"
            }`}
            title="Mevcut çalışmayı temizle ve dosyayı sil"
          >
            <Trash2 className="w-4 h-4" />
            <span>Temizle</span>
          </button>
        )}
      </div>
    </div>
  );
};
