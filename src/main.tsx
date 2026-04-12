import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrandMetadata } from "@/config/branding-metadata";

applyBrandMetadata();

const navigationEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
const initialNavigationType = navigationEntries[0]?.type;
if (initialNavigationType === "reload" || initialNavigationType === "back_forward") {
  console.info("[navigation-diagnostics]", {
    source: "main",
    event: "navigation-entry",
    navigationType: initialNavigationType,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  });
}

createRoot(document.getElementById("root")!).render(<App />);
