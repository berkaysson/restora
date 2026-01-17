import React from "react";
import { FileText } from "lucide-react";
import type { PageData, TextLine } from "../../types";

interface TextEditorProps {
  data: PageData | null;
  highlightIndex: number | null;
  setHighlightIndex: (index: number | null) => void;
  hiddenLabels: string[];
  onToggleLabel: (label: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  data,
  highlightIndex,
  setHighlightIndex,
  hiddenLabels,
  onToggleLabel,
}) => {
  // Extract all unique labels from the current document
  const availableLabels = React.useMemo(() => {
    if (!data?.layout?.text_lines) return [];
    const labels = new Set<string>();
    data.layout.text_lines.forEach((line) => {
      line.layout_labels?.forEach((lbl) => labels.add(lbl));
    });
    return Array.from(labels).sort();
  }, [data]);

  return (
    <div className="flex flex-col w-1/2 p-0 bg-base-100">
      <div className="flex flex-col gap-2 p-4 border-b border-base-content/10 bg-base-200/50">
        <div className="flex justify-between font-mono text-xs text-base-content/50">
          <span>DETECTED TEXT</span>
          <span>UTF-8</span>
        </div>

        {/* Filter Switches */}
        {availableLabels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {availableLabels.map((label) => {
              const isHidden = hiddenLabels.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => onToggleLabel(label)}
                  className={`btn btn-xs normal-case border-0 ${
                    isHidden
                      ? "btn-ghost text-base-content/40 decoration-line-through bg-base-300"
                      : "btn-primary text-primary-content"
                  }`}
                  title={isHidden ? "Show" : "Hide"}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 p-8 overflow-auto font-mono text-sm leading-7 text-base-content cursor-default">
        {data ? (
          data.layout?.text_lines?.map((line: TextLine, idx: number) => {
            // Check if line should be hidden
            const isHidden = line.layout_labels?.some((lbl) =>
              hiddenLabels.includes(lbl),
            );
            if (isHidden) return null;

            return (
              <div
                key={idx}
                contentEditable={false}
                spellCheck={false}
                className={`rounded px-2 -mx-2 transition-colors duration-200 cursor-default ${
                  highlightIndex === idx
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-base-200"
                }`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseLeave={() => setHighlightIndex(null)}
              >
                {line.text}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-base-content/30">
            <FileText className="w-16 h-16 opacity-20" />
            <p>Henüz metin çıkarılmadı</p>
          </div>
        )}
      </div>
    </div>
  );
};
