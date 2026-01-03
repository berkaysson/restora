import React from "react";
import { FileText } from "lucide-react";
import type { PageData, TextLine } from "../../types";

interface TextEditorProps {
  data: PageData | null;
  highlightIndex: number | null;
  setHighlightIndex: (index: number | null) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  data,
  highlightIndex,
  setHighlightIndex,
}) => {
  return (
    <div className="flex flex-col w-1/2 p-0 bg-base-100">
      <div className="flex justify-between p-4 font-mono text-xs text-base-content/50 border-b border-base-content/10 bg-base-200/50">
        <span>DETECTED TEXT</span>
        <span>UTF-8</span>
      </div>
      <div className="flex-1 p-8 overflow-auto font-mono text-sm leading-7 text-base-content cursor-default">
        {data ? (
          data.layout?.text_lines?.map((line: TextLine, idx: number) => (
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
          ))
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
