import { LogProvider } from "./context/LogContext";
import { LayoutProvider } from "./context/LayoutContext";
import { AnalysisProvider } from "./context/AnalysisContext";
import { EditorProvider } from "./context/EditorContext";
import { MainLayout } from "./components/MainLayout";

function App() {
  return (
    <LogProvider>
      <LayoutProvider>
        <AnalysisProvider>
          <EditorProvider>
            <MainLayout />
          </EditorProvider>
        </AnalysisProvider>
      </LayoutProvider>
    </LogProvider>
  );
}

export default App;
