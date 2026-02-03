/**
 * Type definitions for the Restora OCR application.
 *
 * These interfaces define the data structures used throughout the application
 * for representing OCR results, layout analysis, and job management.
 *
 * @module types
 */

/**
 * Represents a single character extracted by OCR.
 * Contains character-level text, position, and confidence data.
 */
export interface Char {
  /** The recognized character */
  text: string;

  /** OCR confidence score (0-1) for this character */
  confidence: number;

  /** Bounding box coordinates [x1, y1, x2, y2] in pixels */
  bbox: number[];

  /** Whether the bounding box coordinates are valid */
  bbox_valid: boolean;

  /** Polygon vertices defining the character boundary */
  polygon: number[][];
}

/**
 * Represents a single line of text extracted by OCR.
 * Contains text content, position, confidence, and layout classification.
 */
export interface TextLine {
  /** The recognized text content of the line */
  text: string;

  /** OCR confidence score (0-1) for this line */
  confidence: number;

  /** Bounding box coordinates [x1, y1, x2, y2] in pixels */
  bbox: number[];

  /** Polygon vertices for non-rectangular text regions */
  polygon: number[][];

  /** Individual character details within this line */
  chars: Char[];

  /** Whether the original text quality was sufficient for OCR */
  original_text_good: boolean;

  /** Word-level segmentation (currently unused) */
  words: unknown[];

  /**
   * Semantic layout labels assigned to this line.
   * Examples: ["Header"], ["Text"], ["Table"]
   */
  layout_labels?: string[];
}

/**
 * Represents a semantic region in the document layout.
 * Used for identifying headers, tables, figures, etc.
 */
export interface LayoutBlock {
  /**
   * The semantic label for this block.
   * Possible values: "Header", "Text", "Table", "Figure", "Caption", etc.
   */
  label: string;

  /** Confidence score (0-1) for the layout classification */
  confidence: number;

  /** Bounding box coordinates [x1, y1, x2, y2] in pixels */
  bbox: number[];

  /** Polygon vertices defining the block boundary */
  polygon: number[][];
}

/**
 * Complete layout analysis result for a document page.
 * Contains all extracted text lines and semantic blocks.
 */
export interface Layout {
  /** All text lines detected in the document */
  text_lines: TextLine[];

  /** Semantic layout blocks (headers, tables, etc.) */
  layout_blocks?: LayoutBlock[];

  /** Original image width in pixels */
  width?: number;

  /** Original image height in pixels */
  height?: number;
}

/**
 * Complete OCR processing result for a single page/document.
 * Returned by the /upload and /process-existing API endpoints.
 */
export interface PageData {
  /** Processing status: "success" or "error" */
  status: string;

  /** Unique identifier for this processing job */
  job_id: string;

  /** Relative path to the processed/cleaned image */
  clean_image: string;

  /** Full extracted text content (lines joined by newlines) */
  text: string;

  /** Structured layout analysis result */
  layout: Layout;

  /** List of potentially misspelled words (optional) */
  typos?: string[];
}

/**
 * Metadata for a previously uploaded and processed document.
 * Used in the file gallery/history view.
 */
export interface UploadJob {
  /** Unique job identifier (UUID) */
  id: string;

  /** Timestamp when the file was uploaded */
  upload_date: string;

  /** Relative path to the original uploaded file */
  original_file: string;

  /** List of generated files (clean images, JSON results) */
  processed_files: string[];
}
