import axios from "axios";
import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosError,
} from "axios";

// Base API URL
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Creates and configures the Axios instance.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60 seconds timeout
});

/**
 * Request Interceptor
 * You can attach tokens, modify headers, or log requests here.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Example: Attach auth token if available
    // const token = localStorage.getItem('token');
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor
 * You can handle global errors, token refreshes, etc.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Return just the response data or handle it based on your structure
    return response;
  },
  (error: AxiosError) => {
    // Handle global errors here (e.g., 401 Unauthorized, 500 Internal Server Error)
    if (error.response) {
      console.error(`API Error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      console.error("API Error: No response received", error.request);
    } else {
      console.error("API Error:", error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
