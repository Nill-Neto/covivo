import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrandMetadata } from "@/config/branding-metadata";

applyBrandMetadata();

createRoot(document.getElementById("root")!).render(<App />);
