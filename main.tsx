import React from "react";
import ReactDOM from "react-dom/client";

function showError(err) {
  const root = document.getElementById("root");
  root.innerHTML =
    '<div style="font-family: monospace; padding: 20px; color: #b00020; white-space: pre-wrap; font-size: 14px;">' +
    "FEHLER BEIM START DER APP:\n\n" +
    (err && err.stack ? err.stack : String(err)) +
    "</div>";
}

window.addEventListener("error", (e) => showError(e.error || e.message));
window.addEventListener("unhandledrejection", (e) => showError(e.reason));

try {
  const App = (await import("./App.jsx")).default;
  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err) {
  showError(err);
}
