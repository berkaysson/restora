/**
 * @fileoverview Text processing utilities for Turkish language support.
 *
 * Provides helper functions for cleaning and processing Turkish text
 * extracted from OCR.
 *
 * @module utils/textUtils
 */

/**
 * Fix Turkish hyphenated words split across lines.
 *
 * OCR of scanned documents often produces hyphenated word breaks where
 * a word is split at the end of a line. This function rejoins such
 * words by removing the hyphen and newline.
 *
 * @param text - The OCR text to process (may be null/undefined)
 * @returns Cleaned text with rejoined hyphenated words, or empty string if null
 *
 * @example
 * ```ts
 * const text = "Türki-\nye";
 * fixTurkishHyphens(text); // "Türkiye"
 * ```
 */
export const fixTurkishHyphens = (text: string | null | undefined): string => {
  if (!text) return "";
  // Rejoin words split with hyphen at line end
  return text.replace(/(\w+)-\s*\n\s*([a-zğüşıöç]+)/g, "$1$2");
};
