import { loadEnv } from "vite";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const url = env.VITE_SUPABASE_URL || "";
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
if (
  !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) ||
  /TU_PROYECTO/i.test(url) ||
  !key ||
  /TU_CLAVE/i.test(key)
) {
  console.error(
    "Configura .env con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY de TU proyecto antes de compilar. Consulta INSTALACION.md.",
  );
  process.exit(1);
}
if (key.startsWith("sb_secret_"))
  throw new Error("La clave secreta no puede usarse como clave pública.");
if (key.startsWith("eyJ")) {
  const payload = JSON.parse(
    Buffer.from(key.split(".")[1], "base64url").toString(),
  );
  if (payload.role !== "anon")
    throw new Error("Usa la clave pública anon, nunca service_role.");
}
console.log("Configuración pública validada.");
