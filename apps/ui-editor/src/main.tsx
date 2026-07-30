import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppRouter } from "./app/router";
import { EditorProvider } from "./app/providers/editor-provider";
import { ThemeProvider } from "./app/providers/theme-provider";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <EditorProvider>
          <AppRouter />
        </EditorProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);