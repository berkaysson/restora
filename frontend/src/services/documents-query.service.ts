import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { BaseService } from "./base.service";
import { ENDPOINTS } from "../api/endpoints";
import type { DocumentDTO, PageDTO } from "../api/types";

/**
 * Service for handling Document query operations (GET)
 * Maps to /documents backend endpoints
 */
export class DocumentsQueryService extends BaseService {
  /**
   * List all documents
   */
  public static async listDocuments(
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO[]>> {
    return this.get<DocumentDTO[]>(ENDPOINTS.DOCUMENTS.BASE, config);
  }

  /**
   * Get specific document details
   * @param jobId The job identifier
   */
  public static async getDocument(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<DocumentDTO>> {
    return this.get<DocumentDTO>(ENDPOINTS.DOCUMENTS.GET_BY_ID(jobId), config);
  }

  /**
   * List pages of a document
   * @param jobId The job identifier
   */
  public static async listPages(
    jobId: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<PageDTO[]>> {
    return this.get<PageDTO[]>(ENDPOINTS.DOCUMENTS.GET_PAGES(jobId), config);
  }

  /**
   * Get OCR data of a specific page
   * @param jobId The job identifier
   * @param pageNumber The page number
   */
  public static async getPage(
    jobId: string,
    pageNumber: number,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<PageDTO>> {
    return this.get<PageDTO>(
      ENDPOINTS.DOCUMENTS.GET_PAGE(jobId, pageNumber),
      config,
    );
  }
}
