function assert(value: unknown) {
  if (!value) throw new Error("Assertion failed");
}
assert.equal = (actual: unknown, expected: unknown) => {
  if (actual !== expected)
    throw new Error(`Expected ${expected}, got ${actual}`);
};
assert.ok = assert;
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.118.0";
import { deliverJob, templatePayload } from "./whatsapp.ts";
const config = {
  token: "fake",
  phoneId: "12345",
  version: "v23.0",
  clientTemplate: "reserva_confirmada",
  adminTemplate: "nueva_reserva_admin",
  language: "es_CO",
};
const job = {
  id: "job",
  recipient: "client" as const,
  phone: "573015550000",
  attempts: 1,
  lease_token: "lease",
  payload: {
    client_name: "Prueba",
    client_phone: "573015550000",
    service_name: "Recorte",
    barber_name: "Edwin",
    date: "2026-10-23",
    time: "10:00",
    price: 23000,
    booking_id: "ref",
  },
};
function fakeDb() {
  const writes: Record<string, unknown>[] = [];
  const chain = {
    eq: () => chain,
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve({ error: null }).then(resolve),
  };
  return {
    writes,
    db: {
      from: () => ({
        update: (value: Record<string, unknown>) => {
          writes.push(value);
          return chain;
        },
      }),
    } as unknown as SupabaseClient,
  };
}
Deno.test("uses approved positional templates for both recipients", () => {
  const payload = templatePayload(job, config);
  assert.equal(payload.to, job.phone);
  assert.equal(payload.template.name, config.clientTemplate);
  assert.equal(payload.template.components[0].parameters.length, 8);
  assert.equal(
    templatePayload({ ...job, recipient: "admin" }, config).template.name,
    config.adminTemplate,
  );
});
Deno.test("records API acceptance separately from delivery", async () => {
  const f = fakeDb();
  let calls = 0;
  const send = (async () => {
    calls++;
    return Response.json({ messages: [{ id: "wamid.test" }] });
  }) as typeof fetch;
  await deliverJob(f.db, job, config, send);
  assert.equal(calls, 1);
  assert.equal(f.writes[0].status, "accepted");
  assert.equal(f.writes[0].provider_message_id, "wamid.test");
});
Deno.test(
  "retries failures, preserving a separate job for the other recipient",
  async () => {
    const f = fakeDb();
    await deliverJob(f.db, job, config, (async () =>
      Response.json(
        { error: { code: 190 } },
        { status: 401 },
      )) as typeof fetch);
    assert.equal(f.writes[0].status, "pending");
    assert.equal(f.writes[0].last_error_code, "META_190");
    assert.ok(!JSON.stringify(f.writes).includes("fake"));
  },
);
Deno.test("stops automatic retries at attempt five", async () => {
  const f = fakeDb();
  await deliverJob(f.db, { ...job, attempts: 5 }, config, (async () => {
    throw new Error("offline");
  }) as typeof fetch);
  assert.equal(f.writes[0].status, "failed");
});
