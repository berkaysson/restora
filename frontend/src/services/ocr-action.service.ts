import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { BaseService } from "./base.service";
import { ENDPOINTS } from "../api/endpoints";
import type { DocumentDTO } from "../api/types";

/**
 * Service for handling OCR and document mutation operations
 * Maps to /ocr backend endpoints
 */
export class OcrActionService extends BaseService {
  /**
   * Upload and process a document
   * @param data FormData containing the file
   */
  public static async uploadDocument(
    data: FormData,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.post<DocumentDTO>(ENDPOINTS.OCR.UPLOAD, data, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers,
      },
    });
  }

  /**
   * List all uploaded documents
   */
  public static async listUploads(
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO[]>> {
    return this.get<DocumentDTO[]>(ENDPOINTS.OCR.LIST_UPLOADS, config);
  }

  /**
   * Delete an uploaded document and its files
   * @param jobId The job identifier
   */
  public static async deleteUpload(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ status: string; message: string }>> {
    return this.delete<{ status: string; message: string }>(
      ENDPOINTS.OCR.DELETE_UPLOAD(jobId),
      config,
    );
  }

  /**
   * Reprocess an existing document
   * @param jobId The job identifier
   */
  public static async reprocessDocument(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.post<DocumentDTO>(
      ENDPOINTS.OCR.PROCESS_EXISTING(jobId),
      undefined,
      config,
    );
  }
}
