import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Set the document title
document.title = "mycelium.kb";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);