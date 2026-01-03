export interface Char {
  text: string;
  confidence: number;
  bbox: number[];
  bbox_valid: boolean;
  polygon: number[][];
}

export interface TextLine {
  text: string;
  confidence: number;
  bbox: number[];
  polygon: number[][];
  chars: Char[];
  original_text_good: boolean;
  words: unknown[];
}

export interface Layout {
  text_lines: TextLine[];
}

export interface PageData {
  status: string;
  job_id: string;
  clean_image: string;
  text: string;
  layout: Layout;
  typos?: string[];
}

export interface UploadJob {
  id: string;
  upload_date: string;
  original_file: string;
  processed_files: string[];
}
