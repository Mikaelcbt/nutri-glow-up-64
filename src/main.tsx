import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initWaterReminder } from "./lib/waterReminder";

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update();
        // Initialize water reminder after SW is ready
        initWaterReminder();
      })
      .catch(() => {});
  });
}