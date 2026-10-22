import { serverClient, requiredEnv, rateKey } from "../_shared/server.ts";
import { normalizePhone, validateBooking } from "../_shared/validation.ts";
import { processQueue } from "../_shared/whatsapp.ts";

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!origin || !allowed.includes(origin))
    return Response.json({ error: "ORIGIN_NOT_ALLOWED" }, { status: 403 });
  const headers = {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Cache-Control": "no-store",
  };
  const reply = (body: unknown, status: number) =>
    Response.json(body, { status, headers });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (request.method !== "POST")
    return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return reply({ error: "INVALID_BOOKING" }, 413);
    // Limit streamed bodies too; a missing Content-Length must not bypass the limit.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "INVALID_BOOKING" }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) {
        await reader.cancel();
        return reply({ error: "INVALID_BOOKING" }, 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    let body;
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return reply({ error: "INVALID_BOOKING" }, 400);
    }
    const input = validateBooking(body);
    const db = serverClient();
    const { data, error } = await db.rpc("create_booking_atomic", {
      p_request_id: input.request_id,
      p_client_name: input.client_name,
      p_client_phone: input.client_phone,
      p_barber_id: input.barber_id,
      p_service_id: input.service_id,
      p_date: input.date,
      p_time: input.time,
      p_admin_phone: normalizePhone(requiredEnv("ADMIN_WHATSAPP_TO")),
      p_rate_key: await rateKey(request),
      p_consent: true,
    });
    if (error) {
      const known = [
        "SLOT_TAKEN",
        "RATE_LIMIT",
        "INVALID_DATE",
        "INVALID_SERVICE",
        "INVALID_BARBER",
        "BARBER_UNAVAILABLE",
        "OUTSIDE_SCHEDULE",
        "INVALID_BOOKING",
        "REQUEST_MISMATCH",
      ];
      const code = known.find((c) => error.message.includes(c));
      if (!code) {
        console.error("BOOKING_DATABASE_ERROR", error.code);
        return reply({ error: "SAVE_FAILED" }, 500);
      }
      return reply(
        { error: code },
        code === "SLOT_TAKEN" ? 409 : code === "RATE_LIMIT" ? 429 : 400,
      );
    }
    // Queue entries already committed. A notification failure can never undo or duplicate this booking.
    EdgeRuntime.waitUntil(
      processQueue(db, data.id).catch(() =>
        console.error("WHATSAPP_PENDING_CHECK_WORKER"),
      ),
    );
    return reply({ booking: data }, 201);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (["INVALID_PHONE", "INVALID_BOOKING"].includes(code))
      return reply({ error: code }, 400);
    console.error("BOOKING_SERVER_CONFIGURATION_OR_RUNTIME_ERROR");
    return reply({ error: "SERVER_CONFIGURATION" }, 503);
  }
});
