import React from "react";
import { Scan, FolderOpen, Upload, Trash2 } from "lucide-react";
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
    <div className="navbar min-h-16 border-b border-base-content/10 bg-base-300/50 backdrop-blur-sm px-6">
      <div className="flex-1 gap-2">
        <Scan className="w-6 h-6 text-primary" />
        <h1 className="text-lg font-bold tracking-tight text-transparent bg-linear-to-r from-primary to-secondary bg-clip-text">
          Restora{" "}
          <span className="font-mono text-xs text-base-content/50 opacity-70">
            v.0.1
          </span>
        </h1>
      </div>

      <div className="flex-none gap-4">
        <button
          onClick={onOpenFileList}
          disabled={loading}
          className={`btn btn-sm ${loading ? "btn-disabled" : "btn-ghost"}`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Dosyalar</span>
        </button>

        <label
          className={`btn btn-sm btn-primary ${loading ? "btn-disabled" : ""}`}
        >
          {loading ? (
            <span className="loading loading-spinner loading-xs"></span>
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
            className={`btn btn-sm btn-error btn-outline ${
              loading ? "btn-disabled" : ""
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
