import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

document.title = "mycelium.kb";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);