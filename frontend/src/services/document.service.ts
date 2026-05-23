import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { BaseService } from "./base.service";
import { ENDPOINTS } from "../api/endpoints";
import type { DocumentDTO, PageDTO } from "../api/types";

/**
 * Service for handling Legacy Document related API operations.
 */
export class DocumentService extends BaseService {
  /**
   * Upload an image document
   */
  public static async upload(
    data: FormData,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.post<DocumentDTO>(ENDPOINTS.LEGACY.UPLOAD, data, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers,
      },
    });
  }

  /**
   * Upload a PDF document
   */
  public static async uploadPdf(
    data: FormData,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.post<DocumentDTO>(ENDPOINTS.LEGACY.UPLOAD_PDF, data, {
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...config?.headers,
      },
    });
  }

  /**
   * List all documents (Legacy)
   */
  public static async listDocuments(
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ documents: DocumentDTO[]; total: number }>> {
    return this.get<{ documents: DocumentDTO[]; total: number }>(
      ENDPOINTS.LEGACY.LIST_DOCUMENTS,
      config,
    );
  }

  /**
   * Get all pages for a document job
   */
  public static async getAllPages(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ pages: PageDTO[] }>> {
    return this.get<{ pages: PageDTO[] }>(
      ENDPOINTS.LEGACY.ALL_PAGES(jobId),
      config,
    );
  }

  /**
   * Get status of a document job
   */
  public static async getStatus(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.get<DocumentDTO>(ENDPOINTS.LEGACY.STATUS(jobId), config);
  }

  /**
   * List document pages (paginated)
   */
  public static async listPages(
    jobId: string,
    page: number = 1,
    limit: number = 50,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ pages: PageDTO[]; total: number }>> {
    return this.get<{ pages: PageDTO[]; total: number }>(
      ENDPOINTS.LEGACY.PAGES(jobId),
      {
        ...config,
        params: { page, limit, ...config?.params },
      },
    );
  }

  /**
   * Get specific page data
   */
  public static async getPage(
    jobId: string,
    pageNumber: number,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<PageDTO>> {
    return this.get<PageDTO>(ENDPOINTS.LEGACY.PAGE(jobId, pageNumber), config);
  }

  /**
   * Cancel ongoing processing
   */
  public static async cancel(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ status: string; message: string }>> {
    return this.post<{ status: string; message: string }>(
      ENDPOINTS.LEGACY.CANCEL(jobId),
      undefined,
      config,
    );
  }

  /**
   * Retry failed pages
   */
  public static async retryFailed(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ status: string; message: string; count: number }>> {
    return this.post<{ status: string; message: string; count: number }>(
      ENDPOINTS.LEGACY.RETRY_FAILED(jobId),
      undefined,
      config,
    );
  }

  /**
   * Delete document
   */
  public static async deleteDocument(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<{ status: string; message: string }>> {
    return this.delete<{ status: string; message: string }>(
      ENDPOINTS.LEGACY.DELETE(jobId),
      config,
    );
  }

  /**
   * Process an existing document job
   */
  public static async processExisting(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.post<DocumentDTO>(
      ENDPOINTS.LEGACY.PROCESS_EXISTING(jobId),
      undefined,
      config,
    );
  }
}
