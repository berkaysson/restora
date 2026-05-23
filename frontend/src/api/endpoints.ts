/**
 * API Endpoints configuration
 * Centralizes all endpoint paths to avoid hardcoding strings in services
 */
/**
 * API Endpoints configuration
 * Centralizes all endpoint paths to avoid hardcoding strings in services
 */
export const ENDPOINTS = {
  // Legacy / existing endpoints (kept for backward compatibility during transition)
  LEGACY: {
    UPLOAD: "/upload",
    UPLOAD_PDF: "/upload-pdf",
    LIST_DOCUMENTS: "/documents",
    ALL_PAGES: (jobId: string) => `/document/${jobId}/all-pages`,
    STATUS: (jobId: string) => `/document/${jobId}/status`,
    PAGES: (jobId: string) => `/document/${jobId}/pages`,
    PAGE: (jobId: string, pageNumber: number) => `/document/${jobId}/page/${pageNumber}`,
    CANCEL: (jobId: string) => `/document/${jobId}/cancel`,
    RETRY_FAILED: (jobId: string) => `/document/${jobId}/retry-failed`,
    DELETE: (jobId: string) => `/document/${jobId}`,
    PROCESS_EXISTING: (jobId: string) => `/process-existing/${jobId}`,
  },

  // New Clean Architecture Endpoints (v2)
  DOCUMENTS: {
    BASE: "/api/v2/documents",
    GET_BY_ID: (jobId: string) => `/api/v2/documents/${jobId}`,
    GET_PAGES: (jobId: string) => `/api/v2/documents/${jobId}/pages`,
    GET_PAGE: (jobId: string, pageNumber: number) =>
      `/api/v2/documents/${jobId}/pages/${pageNumber}`,
  },

  OCR: {
    UPLOAD: "/api/v2/ocr/upload",
    LIST_UPLOADS: "/api/v2/ocr/list-uploads",
    DELETE_UPLOAD: (jobId: string) => `/api/v2/ocr/delete-upload/${jobId}`,
    PROCESS_EXISTING: (jobId: string) => `/api/v2/ocr/process-existing/${jobId}`,
  },

  // WebSocket Endpoints
  WS: {
    LOGS: "/api/v2/ws/logs",
    PROGRESS: (jobId: string) => `/api/v2/ws/progress/${jobId}`,
  },
};
