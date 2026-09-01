import React from "react";
import { createRoot } from "react-dom/client";
import BaseballSim from "../BaseballSim-deck-5.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BaseballSim />
  </React.StrictMode>,
);
