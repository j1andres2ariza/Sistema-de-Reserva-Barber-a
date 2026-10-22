import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const DEMO_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "demo@barberia.local",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "demo" },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00.000Z",
};
const PUBLIC = new Set(["barbers", "barber_schedules", "services"]);
const TABLES = new Set([
  ...PUBLIC,
  "user_roles",
  "bookings",
  "whatsapp_notifications",
  "products",
  "stock_movements",
  "sales",
  "sale_items",
  "expenses",
]);
const nowIso = () => new Date().toISOString();
function fail(code, status = 400) {
  throw Object.assign(new Error(code), { status });
}
function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
  }).format(new Date());
}
function minutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export class DemoStore {
  constructor(directory) {
    mkdirSync(directory, { recursive: true });
    this.db = new DatabaseSync(join(directory, "barberia-demo.sqlite"));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS records(dataset TEXT NOT NULL,id TEXT NOT NULL,body TEXT NOT NULL CHECK(json_valid(body)),PRIMARY KEY(dataset,id)) STRICT;
      CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value INTEGER NOT NULL) STRICT;
      INSERT OR IGNORE INTO metadata(key,value) VALUES('revision',0);`);
    this.readRows = this.db.prepare("SELECT body FROM records WHERE dataset=?");
    this.writeRow = this.db.prepare(
      "INSERT INTO records(dataset,id,body) VALUES(?,?,?) ON CONFLICT(dataset,id) DO UPDATE SET body=excluded.body",
    );
    this.deleteRow = this.db.prepare(
      "DELETE FROM records WHERE dataset=? AND id=?",
    );
    if (
      !this.db
        .prepare("SELECT value FROM metadata WHERE key='initialized'")
        .get()
    )
      this.transaction(() => {
        const barbers = [
          ["jainer", "Jainer Cuenta"],
          ["edwin", "Edwin Zambrano"],
          ["diego", "Diego Pérez"],
          ["andres", "Andrés García"],
        ];
        barbers.forEach(([id, name], i) => {
          this.put("barbers", {
            id,
            name,
            position: i + 1,
            photo_url: null,
            is_active: true,
            commission_rate: 50,
          });
          this.seedSchedules(id);
        });
        const services = JSON.parse(
          readFileSync(
            new URL("../shared/catalog.json", import.meta.url),
            "utf8",
          ),
        );
        services.forEach((s) =>
          this.put("services", {
            ...s,
            duration_minutes: s.duration,
            is_active: true,
          }),
        );
        this.put("user_roles", { user_id: DEMO_USER.id, role: "admin" });
        this.put("products", {
          name: "Cera para cabello (demo)",
          category: "estilizado",
          unit: "unidad",
          price: 25000,
          cost: 15000,
          stock: 10,
          min_stock: 2,
          is_active: true,
        });
        this.db.exec("INSERT INTO metadata(key,value) VALUES('initialized',1)");
      });
  }
  all(table) {
    if (!TABLES.has(table)) fail("INVALID_TABLE");
    return this.readRows.all(table).map((r) => JSON.parse(r.body));
  }
  put(table, row) {
    const record = { created_at: nowIso(), ...row, id: row.id ?? randomUUID() };
    this.writeRow.run(table, record.id, JSON.stringify(record));
    return record;
  }
  revision() {
    return this.db
      .prepare("SELECT value FROM metadata WHERE key='revision'")
      .get().value;
  }
  transaction(action) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = action();
      this.db.exec(
        "UPDATE metadata SET value=value+1 WHERE key='revision';COMMIT",
      );
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  seedSchedules(barberId) {
    for (let day = 0; day < 7; day++)
      this.put("barber_schedules", {
        barber_id: barberId,
        day_of_week: day,
        is_available: true,
        open_time: "09:00",
        close_time: day === 0 ? "17:00" : "19:30",
        updated_at: nowIso(),
      });
  }
  query(q, admin = false) {
    if (
      !q ||
      !TABLES.has(q.table) ||
      !["select", "insert", "update", "delete"].includes(q.op)
    )
      fail("INVALID_QUERY");
    if (!admin && (q.op !== "select" || !PUBLIC.has(q.table)))
      fail("FORBIDDEN", 403);
    if (
      ["bookings", "whatsapp_notifications", "services", "user_roles"].includes(
        q.table,
      ) &&
      q.op !== "select"
    )
      fail("USE_BOOKING_ENDPOINT", 403);
    const filters = q.filters ?? [];
    if (
      !Array.isArray(filters) ||
      filters.length > 15 ||
      filters.some(
        (f) => !f || typeof f.key !== "string" || !/^[a-z_]+$/.test(f.key),
      )
    )
      fail("INVALID_QUERY");
    const matches = (row) => filters.every((f) => row[f.key] === f.value);
    let rows = this.all(q.table).filter(matches);
    if (q.op === "select") {
      const orders = q.orders ?? [];
      if (!Array.isArray(orders) || orders.length > 8) fail("INVALID_QUERY");
      rows.sort((a, b) => {
        for (const { key, ascending = true } of orders) {
          if (a[key] === b[key]) continue;
          return (a[key] > b[key] ? 1 : -1) * (ascending ? 1 : -1);
        }
        return 0;
      });
      rows = rows.slice(
        0,
        Math.max(0, Math.min(Number(q.limit ?? 2000), 2000)),
      );
    } else {
      if ((q.op === "update" || q.op === "delete") && filters.length === 0)
        fail("FILTER_REQUIRED");
      rows = this.transaction(() => {
        if (q.op === "delete") {
          for (const row of rows) {
            this.deleteRow.run(q.table, row.id);
            if (q.table === "sales")
              for (const item of this.all("sale_items").filter(
                (i) => i.sale_id === row.id,
              ))
                this.deleteRow.run("sale_items", item.id);
            if (q.table === "products")
              for (const item of this.all("stock_movements").filter(
                (i) => i.product_id === row.id,
              ))
                this.deleteRow.run("stock_movements", item.id);
            if (q.table === "barbers")
              for (const schedule of this.all("barber_schedules").filter(
                (s) => s.barber_id === row.id,
              ))
                this.deleteRow.run("barber_schedules", schedule.id);
          }
          return rows;
        }
        const values = Array.isArray(q.values) ? q.values : [q.values];
        if (
          values.length > 100 ||
          values.some((v) => !v || typeof v !== "object" || Array.isArray(v))
        )
          fail("INVALID_VALUES");
        const save = (value) => {
          const defaults =
            q.table === "products"
              ? {
                  category: "general",
                  unit: "unidad",
                  price: 0,
                  cost: 0,
                  stock: 0,
                  min_stock: 0,
                  is_active: true,
                }
              : q.table === "barbers"
                ? { photo_url: null, is_active: true, commission_rate: 50 }
                : {};
          const result = this.put(q.table, {
            ...defaults,
            ...value,
            updated_at: nowIso(),
          });
          if (q.table === "barbers" && q.op === "insert")
            this.seedSchedules(result.id);
          return result;
        };
        return q.op === "insert"
          ? values.map(save)
          : rows.map((row) => save({ ...row, ...values[0], id: row.id }));
      });
    }
    if (q.columns && q.columns !== "*") {
      const keys = q.columns.split(",").map((s) => s.trim());
      rows = rows.map((row) =>
        Object.fromEntries(
          keys.filter((k) => k in row).map((k) => [k, row[k]]),
        ),
      );
    }
    if (q.single) {
      if (rows.length > 1 || (q.single === "single" && rows.length !== 1))
        fail("ROW_NOT_FOUND", 404);
      return rows[0] ?? null;
    }
    return rows;
  }
  availability() {
    return this.all("bookings")
      .filter((b) => b.date >= today())
      .map((b) => ({
        barber_id: b.barber_id,
        booking_date: b.date,
        booking_time: b.time,
        duration_minutes: b.duration_minutes,
      }));
  }
  createBooking(input) {
    if (
      !input ||
      typeof input.request_id !== "string" ||
      !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(
        input.request_id,
      ) ||
      typeof input.client_name !== "string" ||
      input.client_name.trim().length < 2 ||
      input.client_name.trim().length > 100 ||
      Array.from(input.client_name).some((c) => c.charCodeAt(0) < 32) ||
      input.whatsapp_consent !== true ||
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      !/^([01]\d|2[0-3]):(00|30)$/.test(input.time) ||
      typeof input.client_phone !== "string" ||
      !/^\+?[\d\s().-]+$/.test(input.client_phone)
    )
      fail("INVALID_BOOKING");
    let phone = input.client_phone.replace(/\D/g, "");
    if (phone.length === 10 && phone.startsWith("3")) phone = "57" + phone;
    if (!/^[1-9]\d{7,14}$/.test(phone)) fail("INVALID_PHONE");
    return this.transaction(() => {
      const body = {
        client_name: input.client_name.trim(),
        client_phone: phone,
        barber_id: input.barber_id,
        service_id: input.service_id,
        date: input.date,
        time: input.time,
      };
      const prior = this.all("bookings").find(
        (b) => b.request_id === input.request_id,
      );
      if (prior) {
        if (Object.entries(body).some(([key, value]) => prior[key] !== value))
          fail("REQUEST_MISMATCH");
        return {
          id: prior.id,
          date: prior.date,
          time: prior.time,
          notifications: "simulated",
        };
      }
      const date = new Date(`${input.date}T${input.time}:00-05:00`);
      const maxDate = new Date(`${today()}T12:00:00Z`);
      maxDate.setUTCDate(maxDate.getUTCDate() + 13);
      if (
        !Number.isFinite(date.getTime()) ||
        input.date < today() ||
        input.date > maxDate.toISOString().slice(0, 10) ||
        date <= new Date() ||
        new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota" }).format(
          date,
        ) !== input.date
      )
        fail("INVALID_DATE");
      const service = this.all("services").find(
        (s) => s.id === input.service_id && s.is_active,
      );
      const barber = this.all("barbers").find(
        (b) => b.id === input.barber_id && b.is_active,
      );
      if (!service) fail("INVALID_SERVICE");
      if (!barber) fail("INVALID_BARBER");
      const day = new Date(`${input.date}T12:00:00Z`).getUTCDay();
      const schedule = this.all("barber_schedules").find(
        (s) => s.barber_id === barber.id && s.day_of_week === day,
      );
      if (!schedule?.is_available) fail("BARBER_UNAVAILABLE");
      const start = minutes(input.time),
        end = start + Math.ceil(service.duration_minutes / 30) * 30;
      if (
        start < minutes(schedule.open_time) ||
        end > minutes(schedule.close_time)
      )
        fail("OUTSIDE_SCHEDULE");
      if (
        this.all("bookings").some(
          (b) =>
            b.barber_id === barber.id &&
            b.date === input.date &&
            minutes(b.time) < end &&
            minutes(b.time) + Math.ceil(b.duration_minutes / 30) * 30 > start,
        )
      )
        fail("SLOT_TAKEN", 409);
      const booking = this.put("bookings", {
        ...body,
        request_id: input.request_id,
        duration_minutes: service.duration_minutes,
        whatsapp_consent_at: nowIso(),
      });
      const payload = {
        ...body,
        service_name: service.name,
        barber_name: barber.name,
        price: service.price,
        booking_id: booking.id,
      };
      for (const recipient of ["admin", "client"])
        this.put("whatsapp_notifications", {
          booking_id: booking.id,
          recipient,
          phone: recipient === "admin" ? "573015070012" : phone,
          payload,
          status: "simulated",
          attempts: 0,
          next_attempt_at: nowIso(),
          locked_until: null,
          lease_token: null,
          provider_message_id: null,
          last_error_code: "DEMO_NO_SEND",
          accepted_at: null,
        });
      return {
        id: booking.id,
        date: booking.date,
        time: booking.time,
        notifications: "simulated",
      };
    });
  }
  deleteBooking(id) {
    return this.transaction(() => {
      this.deleteRow.run("bookings", id);
      for (const n of this.all("whatsapp_notifications").filter(
        (n) => n.booking_id === id,
      ))
        this.deleteRow.run("whatsapp_notifications", n.id);
    });
  }
  close() {
    this.db.close();
  }
}
