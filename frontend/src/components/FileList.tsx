import { useEffect, useState } from "react";
import axios from "axios";
import { X, Trash2, FileText, Calendar } from "lucide-react";

import type { UploadJob } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface FileListProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (jobId: string) => void;
}

export function FileList({ isOpen, onClose, onSelect }: FileListProps) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setSelectedIds(new Set()); // Reset selection on open
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/v2/ocr/list-uploads`);
      const mappedJobs: UploadJob[] = res.data.map((doc: any) => ({
        id: doc.id,
        upload_date: new Date(doc.created_at).toLocaleString("tr-TR"),
        original_file: doc.file_path,
        processed_files: doc.pages?.map((p: any) => p.image_path).filter(Boolean) || [],
        filename: doc.filename,
        total_pages: doc.total_pages,
        type: doc.total_pages > 1 ? "pdf" : "single_page",
      }));
      setJobs(mappedJobs);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (jobId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const deleteJobApi = async (jobId: string) => {
    await axios.delete(`${BASE_URL}/api/v2/ocr/delete-upload/${jobId}`);
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm(`Are you sure you want to delete this job?`)) return;
    setDeleting(jobId);
    try {
      await deleteJobApi(jobId);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } catch (error) {
      console.error("Error deleting job:", error);
      alert("Error deleting job");
    } finally {
      setDeleting(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedIds.size} selected job(s)?`,
      )
    )
      return;

    setBulkDeleting(true);
    const idsToDelete = Array.from(selectedIds);

    try {
      // Loop through and delete sequentially or parallel
      // Sequential might be better for UI feedback if we wanted per-item status,
      // but Promise.all is faster. User said "loop the processes", usually means sequential or just "do it".
      // Let's do parallel for speed, or sequential if we want to update the list one by one.
      // Updating list one by one looks cooler/more responsive.

      for (const id of idsToDelete) {
        try {
          // Visual feedback: set specific deleting state?
          // For now, global bulkDeleting covers the disabled state.
          await deleteJobApi(id);
          setJobs((prev) => prev.filter((j) => j.id !== id));
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        } catch (error) {
          console.error(`Failed to delete job ${id}`, error);
          // Continue deleting others? Yes.
        }
      }
    } catch (error) {
      console.error("Error in bulk delete:", error);
      alert("Error occurred during bulk deletion");
    } finally {
      setBulkDeleting(false);
    }
  };

  const getFileName = (job: UploadJob) => {
    return (
      job.filename || job.original_file.split("/").pop() || job.original_file
    );
  };

  if (!isOpen) return null;

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="w-11/12 max-w-5xl border modal-box bg-base-200 border-base-content/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-base-content">
              Yüklenen İşler
            </h3>
            {jobs.length > 0 && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={selectedIds.size === jobs.length && jobs.length > 0}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate =
                        selectedIds.size > 0 && selectedIds.size < jobs.length;
                    }
                  }}
                  onChange={toggleSelectAll}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="gap-2 text-white btn btn-sm btn-error"
              >
                {bulkDeleting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete ({selectedIds.size})
              </button>
            )}
            <button
              onClick={onClose}
              className="btn btn-sm btn-circle btn-ghost"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                  className={`flex items-center justify-between p-3 transition-colors border rounded-lg bg-base-100 border-base-content/5 hover:border-primary/30 group ${
                    selectedIds.has(job.id)
                      ? "border-primary/50 bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex flex-col flex-1 gap-1 overflow-hidden">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={selectedIds.has(job.id)}
                        onChange={() => toggleSelect(job.id)}
                      />
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span
                        className="text-sm font-medium truncate cursor-pointer text-base-content"
                        title={job.filename || job.original_file}
                        onClick={() => onSelect(job.id)}
                      >
                        {getFileName(job)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pl-8 text-xs text-base-content/50">
                      <Calendar className="w-3 h-3" />
                      <span>{job.upload_date}</span>
                      {job.total_pages && job.total_pages > 1 && (
                        <span className="ml-2 badge badge-xs badge-ghost">
                          {job.total_pages} Sayfa
                        </span>
                      )}
                      {job.type === "single_page" && (
                        <span className="ml-2 badge badge-xs badge-ghost">
                          Tek Sayfa
                        </span>
                      )}
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
                      disabled={deleting === job.id || bulkDeleting}
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
