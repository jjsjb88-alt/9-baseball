import React from "react";
import { createRoot } from "react-dom/client";
import LastLight from "./reboot/App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LastLight />
  </React.StrictMode>,
);
