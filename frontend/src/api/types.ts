// Document Status Types
export type DocumentStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface OCRResultDTO {
  text: string;
  confidence: number;
  processing_time: number;
}

export interface LayoutBlock {
  [key: string]: unknown;
}

export interface LayoutLine {
  [key: string]: unknown;
}

export interface LayoutDataDTO {
  width: number;
  height: number;
  blocks: LayoutBlock[];
  lines: LayoutLine[];
}

export interface PageDTO {
  document_id: string;
  page_number: number;
  status: DocumentStatus | string;
  image_path?: string;
  ocr_result?: OCRResultDTO;
  layout_data?: LayoutDataDTO;
  error_message?: string;
}

export interface DocumentDTO {
  id: string;
  filename: string;
  total_pages: number;
  file_path: string;
  status: DocumentStatus | string;
  processed_pages: number;
  pages: PageDTO[];
  created_at: string;
  updated_at: string;
}
