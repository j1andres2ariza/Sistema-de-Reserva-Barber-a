export function normalizePhone(value: unknown): string {
  if (typeof value !== "string" || !/^[+\d\s().-]+$/.test(value))
    throw new Error("INVALID_PHONE");
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("3")) digits = "57" + digits;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw new Error("INVALID_PHONE");
  return digits;
}

export interface BookingInput {
  request_id: string;
  client_name: string;
  client_phone: string;
  barber_id: string;
  service_id: string;
  date: string;
  time: string;
  whatsapp_consent: true;
}
export function validateBooking(body: unknown): BookingInput {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("INVALID_BOOKING");
  const b = body as Record<string, unknown>;
  if (
    typeof b.request_id !== "string" ||
    !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
      b.request_id,
    ) ||
    typeof b.client_name !== "string" ||
    b.client_name.trim().length < 2 ||
    b.client_name.trim().length > 100 ||
    Array.from(b.client_name).some((c) => c.charCodeAt(0) < 32) ||
    typeof b.barber_id !== "string" ||
    !/^[a-z0-9-]{1,64}$/.test(b.barber_id) ||
    typeof b.service_id !== "string" ||
    !/^[a-z0-9-]{1,64}$/.test(b.service_id) ||
    typeof b.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(b.date) ||
    typeof b.time !== "string" ||
    !/^([01]\d|2[0-3]):(00|30)$/.test(b.time) ||
    b.whatsapp_consent !== true
  )
    throw new Error("INVALID_BOOKING");
  return {
    request_id: b.request_id,
    client_name: b.client_name.trim(),
    client_phone: normalizePhone(b.client_phone),
    barber_id: b.barber_id,
    service_id: b.service_id,
    date: b.date,
    time: b.time,
    whatsapp_consent: true,
  };
}
