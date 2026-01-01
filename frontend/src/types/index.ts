export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TextLine {
  text_content: string;
  bbox: [number, number, number, number]; // Surya formatı
}

export interface OCRResult {
  text_lines: TextLine[];
  image_bbox: [number, number, number, number];
}

export interface PageData {
  clean_image: string;
  text: string;
  layout: OCRResult; // JSON string ise parse edilmeli
  typos?: string[];
}

export interface UploadJob {
  id: string;
  upload_date: string;
  original_file: string;
  processed_files: string[];
}
