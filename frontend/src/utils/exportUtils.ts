import type { TextLine } from "../types";

export interface SemanticGroup {
  label: string;
  position: number;
  lines: TextLine[];
}

/**
 * Sorts layout text lines based on their reading order position.
 * If position is not valid/present, falls back to vertical bounding box coordinate.
 */
export const getSortedLines = (lines: TextLine[]): TextLine[] => {
  return [...lines].sort((a, b) => {
    const posA = a.position !== undefined ? a.position : 0;
    const posB = b.position !== undefined ? b.position : 0;

    if (posA > 0 && posB > 0) {
      if (posA !== posB) return posA - posB;
      return a.bbox[1] - b.bbox[1];
    }
    return a.bbox[1] - b.bbox[1];
  });
};

/**
 * Groups sorted text lines into semantic paragraph/header blocks
 * based on reading order positions and layout labels.
 */
export const groupLines = (sortedLines: TextLine[]): SemanticGroup[] => {
  const groups: SemanticGroup[] = [];
  let currentGroup: SemanticGroup | null = null;

  for (const line of sortedLines) {
    const label = line.layout_labels?.[0] || "Text";
    const pos = line.position || 0;

    if (!currentGroup) {
      currentGroup = { label, position: pos, lines: [line] };
      groups.push(currentGroup);
    } else {
      const samePosition = pos > 0 && currentGroup.position === pos;
      const sameLabel = currentGroup.label === label;

      if (samePosition || (currentGroup.position === 0 && pos === 0 && sameLabel)) {
        currentGroup.lines.push(line);
      } else {
        currentGroup = { label, position: pos, lines: [line] };
        groups.push(currentGroup);
      }
    }
  }
  return groups;
};

/**
 * Resolves hyphenated word breaks at satır sonu (line ends) inside a text block.
 * Reconnects words split by line breaks while preserving mid-line compound words
 * and parenthetical thought dashes.
 */
export const mergeHyphenatedLineBreaks = (textWithNewlines: string): string => {
  // Scenario 3: Harf + Tire + (Optional Spaces) + Line End + (Optional Spaces) + Harf
  const cleanedText = textWithNewlines.replace(/(\p{L}+)-\s*\r?\n\s*(\p{L}+)/gu, "$1$2");
  // Replace remaining newlines with space to form a continuous paragraph
  return cleanedText.replace(/\r?\n/g, " ");
};
