import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";

interface EditorContextType {
  fontSize: number;
  setFontSize: (size: number) => void;
  isWordWrap: boolean;
  setIsWordWrap: (wrap: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

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
