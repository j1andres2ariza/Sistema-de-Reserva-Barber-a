import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { databaseConfigured, demoMode } from "./integrations/supabase/client";
import DemoBanner from "./components/DemoBanner";
createRoot(document.getElementById("root")!).render(
  databaseConfigured || demoMode ? (
    <div className={demoMode ? "pb-20" : ""}>
      <App />
      {demoMode && <DemoBanner />}
    </div>
  ) : (
    <main className="min-h-screen grid place-content-center p-8 text-center">
      <h1 className="text-2xl font-bold">Barbería Edwin Zambrano</h1>
      <p className="mt-4">
        El sistema de reservas está en configuración. Intenta más tarde.
      </p>
    </main>
  ),
);
