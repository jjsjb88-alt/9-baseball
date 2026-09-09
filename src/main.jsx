import React from "react";
import { createRoot } from "react-dom/client";
import Duel from "./duel/App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Duel />
  </React.StrictMode>,
);
