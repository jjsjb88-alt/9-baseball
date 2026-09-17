import React from "react";
import { createRoot } from "react-dom/client";
import Duel from "./duel/App.jsx";
import "./duel/stack-direct-tap.js";
import "./duel/landscape-first.css";
import "./duel/landscape-scroll-fix.css";
import "./duel/character-master.css";
import "./duel/responsive-master.css";
import "./duel/sts-battleboard.js";
import "./duel/sts-battleboard.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Duel />
  </React.StrictMode>,
);
