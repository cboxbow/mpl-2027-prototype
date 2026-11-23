import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { DemoStoreProvider } from "@/lib/demo-store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider><I18nProvider><DemoStoreProvider><TooltipProvider delayDuration={150}>
      <HashRouter><App /></HashRouter><Toaster richColors position="top-center" />
    </TooltipProvider></DemoStoreProvider></I18nProvider></ThemeProvider>
  </React.StrictMode>,
);
