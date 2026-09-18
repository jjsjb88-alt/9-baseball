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
import "./duel/combat-readability.js";
import "./duel/combat-readability.css";
import "./duel/v10-relic-ui.js";
import "./duel/v10-relic-ui.css";
import "./duel/landscape-declutter.js";
import "./duel/landscape-declutter.css";
import "./duel/golden-master.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Duel />
  </React.StrictMode>,
);
