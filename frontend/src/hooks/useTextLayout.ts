import { useMemo } from "react";
import { stripHtmlTags } from "../utils/textUtils";
import type { TextLine } from "../types";

export interface TextLayoutOptions {
  bbox: number[];
  text: string;
  documentWidth: number;
  documentHeight: number;
  targetWidth: number;
  targetHeight: number;
  medianLineHeight: number;
}

/**
 * Pure utility function to calculate text position and font size.
 * Shared between UI components and PDF export.
 */
export function calculateTextLayout(options: TextLayoutOptions) {
  const {
    bbox,
    text,
    documentWidth,
    documentHeight,
    targetWidth,
    targetHeight,
    medianLineHeight,
  } = options;

  const [x1, y1, x2, y2] = bbox;
  const w = x2 - x1;
  const h = y2 - y1;

  // Relative positions in percentages (useful for CSS)
  const leftPct = (x1 / documentWidth) * 100;
  const topPct = (y1 / documentHeight) * 100;
  const widthPct = (w / documentWidth) * 100;
  const heightPct = (h / documentHeight) * 100;

  // Absolute positions in target coordinate space (px)
  const left = (x1 / documentWidth) * targetWidth;
  const top = (y1 / documentHeight) * targetHeight;
  const width = (w / documentWidth) * targetWidth;
  const height = (h / documentHeight) * targetHeight;

  // Font Normalization Logic
  const isBodyText =
    medianLineHeight > 0 &&
    Math.abs(h - medianLineHeight) / medianLineHeight < 0.25;

  const effectiveH = isBodyText ? medianLineHeight : h;

  // Height-based font size: scale the bbox height to target coordinate space
  // We use FONT_HEIGHT_MULTIPLIER as a standard multiplier to give text some breathing room in the box
  const FONT_HEIGHT_MULTIPLIER = 0.88;
  const heightBasedSize =
    (effectiveH / documentHeight) * targetHeight * FONT_HEIGHT_MULTIPLIER;

  // Width-based font size: ensure the text string fits within the rendered width.
  // Average serif character width ≈ 0.48× the font size.
  const plainText = stripHtmlTags(text);
  const charCount = plainText.length || 1;
  const AVG_CHAR_WIDTH_RATIO = 0.48;
  const widthBasedSize = width / (charCount * AVG_CHAR_WIDTH_RATIO);

  // Use the smaller of the two constraints so text fits both dimensions.
  const fontSize = Math.min(heightBasedSize, widthBasedSize);

  return {
    position: {
      left,
      top,
      width,
      height,
      leftPct,
      topPct,
      widthPct,
      heightPct,
    },
    fontSize,
    isBodyText,
    effectiveH,
  };
}

/**
 * Utility to calculate median line height from a list of text lines.
 */
export function calculateMedianLineHeight(textLines: TextLine[]) {
  if (!textLines || textLines.length === 0) return 0;
  const heights = textLines
    .map((line) => {
      const [, y1, , y2] = line.bbox;
      return y2 - y1;
    })
    .sort((a, b) => a - b);
  const mid = Math.floor(heights.length / 2);
  return heights.length % 2 !== 0
    ? heights[mid]
    : (heights[mid - 1] + heights[mid]) / 2;
}

/**
 * React hook that wraps calculateTextLayout with useMemo.
 */
export function useTextLayout(options: TextLayoutOptions) {
  return useMemo(() => calculateTextLayout(options), [options]);
}
