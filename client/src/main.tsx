import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { register } from "./lib/serviceWorkerRegistration";
import { Toaster } from "@/components/ui/toaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);

// Service worker registration with update management
register({
  onSuccess: (registration) => {
    console.log("Service Worker registered successfully:", registration);
  },
  onUpdate: (registration) => {
    // Show a notification to inform the user of the update
    if (registration && registration.waiting) {
      // Create a communication channel with the service worker
      const channel = new MessageChannel();

      channel.port1.onmessage = () => {
        // Reload the page once the service worker takes control
        window.location.reload();
      };

      // Ask the service worker to activate the update
      registration.waiting.postMessage({ type: "SKIP_WAITING" }, [
        channel.port2,
      ]);
    }
  },
});
