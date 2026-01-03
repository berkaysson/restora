import React, { useEffect, useState } from "react";
import { Scan, FolderOpen, Upload, Trash2, Moon, Sun } from "lucide-react";
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
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "nord"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "nord" ? "sunset" : "nord"));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b shadow-sm backdrop-blur-md bg-base-100/80 border-base-content/10 supports-backdrop-filter:bg-base-100/60">
      <div className="container flex items-center justify-between h-16 px-4 mx-auto max-w-7xl md:px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-3 cursor-default select-none group">
          <div className="flex items-center justify-center p-2 transition-colors rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20">
            <Scan className="w-6 h-6" />
          </div>
          <div className="flex flex-col leading-none">
            <h1 className="text-xl font-bold tracking-tight text-transparent bg-linear-to-r from-primary to-secondary bg-clip-text">
              Restora
            </h1>
          </div>
        </div>

        {/* Actions Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Main Actions */}
          <div className="flex items-center gap-1 pr-1 md:pr-4 md:border-r md:gap-2 border-base-content/10">
            {data && (
              <button
                onClick={onClear}
                disabled={loading}
                className="hidden btn btn-sm btn-ghost text-error/80 hover:bg-error/10 hover:text-error md:flex"
                title="Çalışmayı Temizle"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden lg:inline">Temizle</span>
              </button>
            )}

            <button
              onClick={onOpenFileList}
              disabled={loading}
              className="btn btn-sm btn-ghost text-base-content/70 hover:text-base-content"
              title="Dosyaları Görüntüle"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Dosyalar</span>
            </button>

            <label
              className={`btn btn-sm btn-primary shadow-sm gap-2 ${
                loading ? "btn-disabled" : ""
              }`}
            >
              {loading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {loading ? "İşleniyor..." : "Yükle"}
              </span>
              <input
                type="file"
                onChange={onUpload}
                className="hidden"
                accept="image/*,.pdf"
                disabled={loading}
              />
            </label>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="btn btn-sm btn-circle btn-ghost text-base-content/60 hover:text-base-content hover:bg-base-content/10"
            title={`Switch to ${theme === "nord" ? "Dark" : "Light"} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === "nord" ? (
              <Moon className="w-5 h-5" />
            ) : (
              <Sun className="w-5 h-5" />
            )}
          </button>

          {/* Mobile Clear Button (only shown on small screens if data exists) */}
          {data && (
            <button
              onClick={onClear}
              disabled={loading}
              className="flex btn btn-sm btn-square btn-ghost text-error/80 hover:bg-error/10 hover:text-error md:hidden"
              title="Çalışmayı Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
