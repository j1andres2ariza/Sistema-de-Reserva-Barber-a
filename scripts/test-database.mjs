import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const db = new PGlite();
let checks = 0;
const check = (value) => {
  assert.ok(value);
  checks++;
};
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
 $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE SCHEMA storage;
 CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);
 CREATE TABLE storage.objects(id uuid,bucket_id text);
 ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
`);
if (process.env.SCHEMA_BUNDLE === "1") {
  await db.exec(await readFile("supabase/setup/01-schema.sql", "utf8"));
} else {
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  }
}
check(true);
const [{ date }] = (
  await db.query(
    "SELECT to_char((now() AT TIME ZONE 'America/Bogota')::date+1,'YYYY-MM-DD') AS date",
  )
).rows;
const base = {
  request: randomUUID(),
  name: "Cliente Prueba",
  phone: "573015550001",
  barber: "edwin",
  service: "recorte",
  date,
  time: "09:00",
  admin: "573015070012",
  key: "a".repeat(64),
  consent: true,
};
async function booking(overrides = {}) {
  const b = { ...base, ...overrides };
  const result = await db.query(
    "SELECT public.create_booking_atomic($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS booking",
    Object.values(b),
  );
  return result.rows[0].booking;
}
async function rejects(fn, pattern) {
  await assert.rejects(fn, pattern);
  checks++;
}
await db.exec("SET ROLE service_role");
const first = await booking();
check(Boolean(first.id));
check(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.whatsapp_notifications",
    )
  ).rows[0].n === 2,
);
check((await booking()).id === first.id);
check(
  (await db.query("SELECT count(*)::int AS n FROM public.bookings")).rows[0]
    .n === 1,
);
await rejects(() => booking({ name: "Otro" }), /REQUEST_MISMATCH/);
await rejects(
  () => booking({ request: randomUUID(), time: "09:30" }),
  /SLOT_TAKEN/,
);
await rejects(
  () => booking({ request: randomUUID(), time: "23:30" }),
  /OUTSIDE_SCHEDULE/,
);
await rejects(
  () => booking({ request: randomUUID(), time: "10:00", consent: false }),
  /INVALID_BOOKING/,
);
await rejects(
  () => booking({ request: randomUUID(), time: "10:00", service: "inventado" }),
  /INVALID_SERVICE/,
);
check(
  (await db.query("SELECT count(*)::int AS n FROM public.bookings")).rows[0]
    .n === 1,
);
const second = await booking({ request: randomUUID(), time: "10:00" });
check(Boolean(second.id));
let jobs = (
  await db.query("SELECT * FROM public.claim_whatsapp_jobs($1::uuid)", [
    first.id,
  ])
).rows;
check(
  jobs.length === 2 &&
    jobs.every((j) => j.status === "processing" && j.attempts === 1),
);
check(
  (
    await db.query("SELECT * FROM public.claim_whatsapp_jobs($1::uuid)", [
      first.id,
    ])
  ).rows.length === 0,
);
await db.query(
  "UPDATE public.whatsapp_notifications SET locked_until=now()-interval '1 minute' WHERE id=$1",
  [jobs[0].id],
);
check(
  (
    await db.query("SELECT * FROM public.claim_whatsapp_jobs($1::uuid)", [
      first.id,
    ])
  ).rows.length === 1,
);
await db.query(
  "UPDATE public.whatsapp_notifications SET locked_until=now()-interval '1 minute',attempts=5 WHERE booking_id=$1",
  [first.id],
);
await db.query("SELECT * FROM public.claim_whatsapp_jobs($1::uuid)", [
  first.id,
]);
check(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.whatsapp_notifications WHERE booking_id=$1 AND status='failed'",
      [first.id],
    )
  ).rows[0].n === 2,
);
for (let i = 0; i < 10; i++) {
  const t = 9 * 60 + i * 30;
  await booking({
    request: randomUUID(),
    barber: "jainer",
    service: "cerquillo",
    phone: `5730155501${String(i).padStart(2, "0")}`,
    time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
    key: "b".repeat(64),
  });
}
await rejects(
  () =>
    booking({
      request: randomUUID(),
      barber: "jainer",
      service: "cerquillo",
      phone: "573015550199",
      time: "14:00",
      key: "b".repeat(64),
    }),
  /RATE_LIMIT/,
);
await db.exec("RESET ROLE; SET ROLE anon");
await rejects(
  () =>
    db.query(
      "INSERT INTO public.bookings(client_name,client_phone,barber_id,service_id,date,time) VALUES('Intruso','573015550001','edwin','recorte',$1,'12:00')",
      [date],
    ),
  /permission denied/,
);
await rejects(
  () => booking({ request: randomUUID(), time: "12:00" }),
  /permission denied/,
);
await rejects(
  () => db.query("SELECT * FROM public.bookings"),
  /permission denied/,
);
await rejects(
  () => db.query("SELECT * FROM public.whatsapp_notifications"),
  /permission denied/,
);
const availability = (
  await db.query("SELECT * FROM public.get_public_availability()")
).rows;
check(
  availability.length > 0 &&
    !("client_name" in availability[0]) &&
    !("client_phone" in availability[0]),
);
await db.exec("RESET ROLE");
const adminId = randomUUID(),
  userId = randomUUID();
await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4)", [
  adminId,
  "admin@example.test",
  userId,
  "user@example.test",
]);
await db.query(
  "INSERT INTO public.user_roles(user_id,role) VALUES($1,'admin')",
  [adminId],
);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [userId]);
await db.exec("SET ROLE authenticated");
check((await db.query("SELECT * FROM public.bookings")).rows.length === 0);
await rejects(
  () =>
    db.query("SELECT public.retry_whatsapp_notification($1::uuid)", [
      jobs[0].id,
    ]),
  /FORBIDDEN/,
);
await db.exec("RESET ROLE");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [
  adminId,
]);
await db.exec("SET ROLE authenticated");
check((await db.query("SELECT * FROM public.bookings")).rows.length === 12);
await db.query("SELECT public.retry_whatsapp_notification($1::uuid)", [
  jobs[0].id,
]);
check(
  (
    await db.query(
      "SELECT status FROM public.whatsapp_notifications WHERE id=$1",
      [jobs[0].id],
    )
  ).rows[0].status === "pending",
);
await db.exec("RESET ROLE");
await db.exec(
  "INSERT INTO public.barbers(id,name,position) VALUES('nuevo','Nuevo',5)",
);
check(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.barber_schedules WHERE barber_id='nuevo'",
    )
  ).rows[0].n === 7,
);
// Verify a database reload retains bookings and jobs (not browser memory).
const archive = await db.dumpDataDir();
await db.close();
const restored = new PGlite({ loadDataDir: archive });
check(
  (await restored.query("SELECT count(*)::int AS n FROM public.bookings"))
    .rows[0].n === 12,
);
check(
  (
    await restored.query(
      "SELECT count(*)::int AS n FROM public.whatsapp_notifications",
    )
  ).rows[0].n === 24,
);
await restored.close();
console.log(
  `${checks} database checks passed, including migrations, privacy, retries and persistence.`,
);
