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

// Enregistrement du service worker avec gestion des mises à jour
register({
  onSuccess: (registration) => {
    console.log("Service Worker enregistré avec succès:", registration);
  },
  onUpdate: (registration) => {
    // Afficher une notification pour informer l'utilisateur de la mise à jour
    if (registration && registration.waiting) {
      // Créer un canal de communication avec le service worker
      const channel = new MessageChannel();

      channel.port1.onmessage = () => {
        // Recharger la page une fois que le service worker a pris le contrôle
        window.location.reload();
      };

      // Demander au service worker d'activer la mise à jour
      registration.waiting.postMessage({ type: "SKIP_WAITING" }, [
        channel.port2,
      ]);
    }
  },
});
