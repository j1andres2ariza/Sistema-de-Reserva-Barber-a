import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { requiredEnv } from "./server.ts";

interface Notification {
  id: string;
  recipient: "admin" | "client";
  phone: string;
  attempts: number;
  lease_token: string;
  payload: {
    client_name: string;
    client_phone: string;
    service_name: string;
    barber_name: string;
    date: string;
    time: string;
    price: number;
    booking_id: string;
  };
}
export interface WhatsAppConfig {
  token: string;
  phoneId: string;
  version: string;
  clientTemplate: string;
  adminTemplate: string;
  language: string;
}
export function getConfig(): WhatsAppConfig {
  const config = {
    token: requiredEnv("WHATSAPP_ACCESS_TOKEN"),
    phoneId: requiredEnv("WHATSAPP_PHONE_NUMBER_ID"),
    version: requiredEnv("WHATSAPP_API_VERSION"),
    clientTemplate: requiredEnv("WHATSAPP_TEMPLATE_CLIENT"),
    adminTemplate: requiredEnv("WHATSAPP_TEMPLATE_ADMIN"),
    language: requiredEnv("WHATSAPP_TEMPLATE_LANGUAGE"),
  };
  if (
    !/^v\d+\.\d+$/.test(config.version) ||
    !/^\d+$/.test(config.phoneId) ||
    !/^[a-z0-9_]+$/.test(config.clientTemplate) ||
    !/^[a-z0-9_]+$/.test(config.adminTemplate)
  )
    throw new Error("SERVER_CONFIGURATION");
  return config;
}
export function templatePayload(job: Notification, config: WhatsAppConfig) {
  const p = job.payload;
  const [y, m, d] = p.date.split("-");
  // Both templates use the SAME eight positional BODY parameters, with no header/buttons.
  const values = [
    p.client_name,
    p.service_name,
    p.barber_name,
    `${d}/${m}/${y}`,
    p.time,
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(p.price),
    p.booking_id,
    p.client_phone,
  ];
  return {
    messaging_product: "whatsapp",
    to: job.phone,
    type: "template",
    template: {
      name:
        job.recipient === "admin"
          ? config.adminTemplate
          : config.clientTemplate,
      language: { code: config.language },
      components: [
        {
          type: "body",
          parameters: values.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };
}
export async function deliverJob(
  db: SupabaseClient,
  job: Notification,
  config: WhatsAppConfig,
  send: typeof fetch = fetch,
) {
  let result: Record<string, unknown>;
  try {
    const response = await send(
      `https://graph.facebook.com/${config.version}/${config.phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload(job, config)),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.messages?.[0]?.id) {
      // Only store error codes, never tokens or provider response bodies containing client data.
      throw new Error(`META_${Number(body.error?.code) || response.status}`);
    }
    result = {
      status: "accepted",
      provider_message_id: body.messages[0].id,
      accepted_at: new Date().toISOString(),
      last_error_code: null,
    };
  } catch (error) {
    const code =
      error instanceof Error && /^META_\d+$/.test(error.message)
        ? error.message
        : "NETWORK_OR_TIMEOUT";
    result = {
      status: job.attempts >= 5 ? "failed" : "pending",
      last_error_code: code,
      next_attempt_at: new Date(
        Date.now() + Math.min(2 ** (job.attempts - 1), 30) * 60000,
      ).toISOString(),
    };
  }
  const { error } = await db
    .from("whatsapp_notifications")
    .update({ ...result, locked_until: null, lease_token: null })
    .eq("id", job.id)
    .eq("lease_token", job.lease_token)
    .eq("status", "processing");
  if (error) throw new Error("NOTIFICATION_RESULT_NOT_SAVED");
}
export async function processQueue(db: SupabaseClient, bookingId?: string) {
  // Validate before claiming: missing credentials leave jobs pending for later activation.
  const config = getConfig();
  const { data, error } = await db.rpc("claim_whatsapp_jobs", {
    p_booking_id: bookingId ?? null,
  });
  if (error) throw new Error("NOTIFICATION_CLAIM_FAILED");
  const results = await Promise.allSettled(
    (data ?? []).map((job: Notification) => deliverJob(db, job, config)),
  );
  return {
    processed: results.length,
    persistenceErrors: results.filter((r) => r.status === "rejected").length,
  };
}
