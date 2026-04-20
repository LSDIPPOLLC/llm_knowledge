import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { printColophon } from "./lib/delight";
import { applyTheme, readStoredTheme } from "./state/theme";
import "./styles/app.css";

// Apply theme before first paint to avoid FOUC.
applyTheme(readStoredTheme());

printColophon(null);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
