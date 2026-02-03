/**
 * @fileoverview Editor Context for text editor settings.
 *
 * Manages editor preferences like font size and word wrap settings
 * for the extracted text display panel.
 *
 * @module context/EditorContext
 */

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";

/**
 * Shape of the Editor context value.
 */
interface EditorContextType {
  /** Current font size in pixels */
  fontSize: number;
  /** Set the font size */
  setFontSize: (size: number) => void;
  /** Whether word wrap is enabled */
  isWordWrap: boolean;
  /** Toggle word wrap setting */
  setIsWordWrap: (wrap: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

/**
 * Provider component for text editor settings.
 *
 * Manages editor preferences that persist across the session.
 *
 * @param children - Child components to wrap
 */
export function EditorProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSize] = useState(14);
  const [isWordWrap, setIsWordWrap] = useState(true);

  const value = useMemo(
    () => ({
      fontSize,
      setFontSize,
      isWordWrap,
      setIsWordWrap,
    }),
    [fontSize, isWordWrap],
  );

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
}
