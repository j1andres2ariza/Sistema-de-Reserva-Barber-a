import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createDemoClient } from "../demo/client";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const placeholder = /TU_PROYECTO|TU_REFERENCIA|TU_CLAVE|PEGA_|EJEMPLO/i;
export const databaseConfigured = Boolean(
  url && key && !placeholder.test(url) && !placeholder.test(key),
);
// Development falls back to a LOCAL SQLite server. It is never enabled in a production build.
export const demoMode = import.meta.env.DEV && !databaseConfigured;
export const supabase = demoMode
  ? createDemoClient()
  : createClient<Database>(
      databaseConfigured ? url : "https://unconfigured.supabase.co",
      databaseConfigured ? key : "unconfigured-public-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
