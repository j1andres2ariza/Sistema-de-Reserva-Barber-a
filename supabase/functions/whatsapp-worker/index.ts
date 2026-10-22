import { serverClient, requiredEnv } from "../_shared/server.ts";
import { processQueue } from "../_shared/whatsapp.ts";
Deno.serve(async (request: Request) => {
  if (request.method !== "POST")
    return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
  try {
    const expected = requiredEnv("WHATSAPP_WORKER_SECRET");
    const received = request.headers.get("x-worker-secret") || "";
    if (expected.length < 32 || received.length !== expected.length)
      return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    let diff = 0;
    for (let i = 0; i < expected.length; i++)
      diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const result = await processQueue(serverClient());
    return Response.json(result, {
      status: result.persistenceErrors ? 500 : 200,
    });
  } catch {
    return Response.json(
      { error: "WORKER_CONFIGURATION_OR_DATABASE_ERROR" },
      { status: 503 },
    );
  }
});
