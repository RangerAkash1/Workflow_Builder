import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./style.css";

// Entry point for the React app; React 18 root API.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
