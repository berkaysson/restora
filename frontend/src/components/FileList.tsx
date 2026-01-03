import { useEffect, useState } from "react";
import axios from "axios";
import { X, Trash2, FileText, Calendar } from "lucide-react";
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
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box bg-base-200 border border-base-content/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-base-content">
            Yüklenen İşler (Jobs)
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-8 text-center text-base-content/50">
              Dosya/İş bulunamadı
            </div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-base-100 border border-base-content/5 hover:border-primary/30 transition-colors group"
                >
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span
                        className="text-sm font-medium text-base-content truncate"
                        title={job.original_file}
                      >
                        {getFileName(job.original_file)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-base-content/50">
                      <Calendar className="w-3 h-3" />
                      <span>{job.upload_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onSelect(job.id)}
                      className="btn btn-xs btn-primary btn-outline"
                    >
                      Aç
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      className="btn btn-xs btn-ghost btn-square text-error"
                    >
                      {deleting === job.id ? (
                        <span className="loading loading-spinner loading-xs"></span>
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
        <form method="dialog" className="modal-backdrop">
          <button onClick={onClose}>close</button>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
