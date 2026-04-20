/**
 * Color map per layout label for visual distinction across the editor
 */
export const LABEL_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  "Section-header": {
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.7)",
    text: "#8b5cf6",
  },
  Text: {
    bg: "rgba(59, 130, 246, 0.10)",
    border: "rgba(59, 130, 246, 0.6)",
    text: "#3b82f6",
  },
  Table: {
    bg: "rgba(34, 197, 94, 0.12)",
    border: "rgba(34, 197, 94, 0.7)",
    text: "#22c55e",
  },
  Figure: {
    bg: "rgba(251, 146, 60, 0.12)",
    border: "rgba(251, 146, 60, 0.7)",
    text: "#fb923c",
  },
  Caption: {
    bg: "rgba(236, 72, 153, 0.10)",
    border: "rgba(236, 72, 153, 0.6)",
    text: "#ec4899",
  },
  List: {
    bg: "rgba(20, 184, 166, 0.10)",
    border: "rgba(20, 184, 166, 0.6)",
    text: "#14b8a6",
  },
  Footnote: {
    bg: "rgba(234, 179, 8, 0.10)",
    border: "rgba(234, 179, 8, 0.6)",
    text: "#eab308",
  },
};

export const DEFAULT_COLOR = {
  bg: "rgba(100, 116, 139, 0.10)",
  border: "rgba(100, 116, 139, 0.6)",
  text: "#64748b",
};
