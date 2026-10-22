import { createClient } from "npm:@supabase/supabase-js@2.118.0";
export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value || /REEMPLAZAR|TOKEN_PERMANENTE|ID_DEL_NUMERO/.test(value))
    throw new Error("SERVER_CONFIGURATION");
  return value;
}
export function serverClient() {
  return createClient(
    requiredEnv("SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
export async function rateKey(request: Request): Promise<string> {
  const salt = requiredEnv("RATE_LIMIT_SALT");
  if (salt.length < 32) throw new Error("SERVER_CONFIGURATION");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const hash = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ip),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
