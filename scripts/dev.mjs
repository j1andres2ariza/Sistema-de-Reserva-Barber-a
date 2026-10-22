import { createServer, loadEnv } from "vite";
import { resolve } from "node:path";
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error("Instala Node.js 22.13 o superior para iniciar el proyecto.");
  process.exit(1);
}
const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
const placeholder = /TU_PROYECTO|TU_REFERENCIA|TU_CLAVE|PEGA_|EJEMPLO/i;
const configured = Boolean(
  env.VITE_SUPABASE_URL &&
    env.VITE_SUPABASE_PUBLISHABLE_KEY &&
    !placeholder.test(env.VITE_SUPABASE_URL) &&
    !placeholder.test(env.VITE_SUPABASE_PUBLISHABLE_KEY),
);
let demo, vite;
try {
  if (!configured) {
    const { startDemoServer } = await import("../server/demo-server.mjs");
    demo = await startDemoServer({
      directory: resolve(
        process.cwd(),
        process.env.BARBERIA_DEMO_DATA_DIR || ".data",
      ),
    });
  }
  vite = await createServer({
    server: {
      host: "127.0.0.1",
      port: 8080,
      strictPort: true,
      open: process.argv.includes("--open"),
      proxy: demo
        ? {
            "/__demo-api": {
              target: `http://127.0.0.1:${demo.port}`,
              changeOrigin: false,
            },
          }
        : undefined,
    },
  });
  await vite.listen();
  console.log("\nBARBERIA EDWIN ZAMBRANO");
  console.log("Sitio: http://localhost:8080");
  console.log("Administrador: http://localhost:8080/admin");
  console.log(
    demo
      ? "Demostracion local activa. Datos persistentes en .data/barberia-demo.sqlite. WhatsApp simulado."
      : "Conexion propia de Supabase configurada.",
  );
} catch (error) {
  console.error(error.message);
  if (demo) await demo.close();
  process.exit(1);
}
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  await vite?.close();
  await demo?.close();
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
