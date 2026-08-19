import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initBrowserObservability, installObservedFetch } from "@/lib/observability";

initBrowserObservability();
installObservedFetch();

createRoot(document.getElementById("root")!).render(<App />);
