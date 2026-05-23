import type { AxiosRequestConfig, AxiosResponse } from "axios";
import apiClient from "../api/client";

/**
 * Generic Base Service to handle repetitive CRUD operations
 * and provide a standardized way to interact with the API client.
 */
export class BaseService {
  /**
   * Generic GET request
   */
  protected static async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return apiClient.get<T>(url, config);
  }

  /**
   * Generic POST request
   */
  protected static async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return apiClient.post<T>(url, data, config);
  }

  /**
   * Generic PUT request
   */
  protected static async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return apiClient.put<T>(url, data, config);
  }

  /**
   * Generic DELETE request
   */
  protected static async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return apiClient.delete<T>(url, config);
  }

  /**
   * Generic PATCH request
   */
  protected static async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return apiClient.patch<T>(url, data, config);
  }
}
