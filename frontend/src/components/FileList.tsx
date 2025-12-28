import { useEffect, useState } from "react";
import axios from "axios";
import { X, Trash2, FileText, Loader2 } from "lucide-react";

interface FileListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (filename: string) => void;
}

export function FileList({ isOpen, onClose, onSelect }: FileListProps) {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8000/list-uploads");
      setFiles(res.data.files);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setDeleting(filename);
    try {
      await axios.delete(`http://localhost:8000/delete-upload/${filename}`);
      setFiles(files.filter((f) => f !== filename));
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file");
    } finally {
      setDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden duration-200 bg-gray-900 border border-gray-800 shadow-2xl rounded-xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">
            Yüklenen Dosyalar
          </h2>
          <button
            onClick={onClose}
            className="p-1 transition-colors rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Dosya bulunamadı
            </div>
          ) : (
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file}
                  className="flex items-center justify-between p-3 transition-colors border border-gray-800 rounded-lg bg-gray-950/50 hover:border-indigo-500/30 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-4 h-4 text-indigo-400 transition-colors shrink-0 group-hover:text-indigo-300" />
                    <span
                      className="text-sm text-gray-300 truncate"
                      title={file}
                    >
                      {file}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelect(file)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-md transition-colors"
                    >
                      Aç
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      disabled={deleting === file}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      {deleting === file ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
