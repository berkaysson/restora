import { useEffect, useState } from "react";
import axios from "axios";
import { X, Trash2, FileText, Loader2, Calendar } from "lucide-react";
import type { UploadJob } from "../types";

interface FileListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (jobId: string) => void;
}

export function FileList({ isOpen, onClose, onSelect }: FileListProps) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
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
      setJobs(res.data.jobs);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm(`Are you sure you want to delete this job?`)) return;
    setDeleting(jobId);
    try {
      await axios.delete(`http://localhost:8000/delete-upload/${jobId}`);
      setJobs(jobs.filter((j) => j.id !== jobId));
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Error deleting job");
    } finally {
      setDeleting(null);
    }
  };

  const getFileName = (path: string) => {
    return path.split("/").pop() || path;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden duration-200 bg-gray-900 border border-gray-800 shadow-2xl rounded-xl animate-in fade-in zoom-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-lg font-semibold text-white">
            Yüklenen İşler (Jobs)
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
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Dosya/İş bulunamadı
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between p-3 transition-colors border border-gray-800 rounded-lg bg-gray-950/50 hover:border-indigo-500/30 group"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-indigo-400 transition-colors shrink-0 group-hover:text-indigo-300" />
                      <span
                        className="text-sm font-medium text-gray-300 truncate"
                        title={job.original_file}
                      >
                        {getFileName(job.original_file)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{job.upload_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelect(job.id)}
                      className="px-3 py-1.5 text-xs font-medium text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-md transition-colors"
                    >
                      Aç
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      {deleting === job.id ? (
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
