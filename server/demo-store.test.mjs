import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DemoStore } from "./demo-store.mjs";
import { startDemoServer } from "./demo-server.mjs";
function temp() {
  return mkdtempSync(join(tmpdir(), "barberia-test-"));
}
function input(overrides = {}) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return {
    request_id: randomUUID(),
    client_name: "Cliente Demo",
    client_phone: "3015550000",
    barber_id: "edwin",
    service_id: "recorte",
    date: date.toISOString().slice(0, 10),
    time: "09:00",
    whatsapp_consent: true,
    ...overrides,
  };
}
test("local reservations and two simulated jobs survive reopening the database", () => {
  const dir = temp();
  let store;
  try {
    store = new DemoStore(dir);
    const body = input();
    const saved = store.createBooking(body);
    assert.equal(saved.notifications, "simulated");
    assert.equal(store.createBooking(body).id, saved.id);
    assert.equal(store.all("bookings").length, 1);
    assert.equal(store.all("whatsapp_notifications").length, 2);
    assert.ok(
      store
        .all("whatsapp_notifications")
        .every(
          (n) =>
            n.status === "simulated" &&
            n.attempts === 0 &&
            n.provider_message_id === null,
        ),
    );
    store.close();
    store = new DemoStore(dir);
    assert.equal(store.all("bookings")[0].id, saved.id);
    assert.equal(store.all("whatsapp_notifications").length, 2);
    assert.equal(store.all("barbers").length, 4);
  } finally {
    store?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("local calendar validates overlap, duration, consent and opening time", () => {
  const dir = temp();
  const store = new DemoStore(dir);
  try {
    const body = input();
    store.createBooking(body);
    assert.throws(
      () =>
        store.createBooking({
          ...body,
          request_id: randomUUID(),
          time: "09:30",
        }),
      /SLOT_TAKEN/,
    );
    assert.throws(
      () =>
        store.createBooking({
          ...body,
          request_id: randomUUID(),
          time: "08:00",
        }),
      /OUTSIDE_SCHEDULE/,
    );
    assert.throws(
      () =>
        store.createBooking({
          ...body,
          request_id: randomUUID(),
          time: "10:00",
          whatsapp_consent: false,
        }),
      /INVALID_BOOKING/,
    );
    assert.throws(
      () => store.createBooking({ ...body, client_name: "Otro" }),
      /REQUEST_MISMATCH/,
    );
    assert.equal(store.all("bookings").length, 1);
    const publicRows = store.availability();
    assert.equal(publicRows[0].duration_minutes, 40);
    assert.ok(!("client_phone" in publicRows[0]));
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("local administration persists edits, inventory, sales, expenses and new schedules", () => {
  const dir = temp();
  let store = new DemoStore(dir);
  try {
    const query = (table, op, values, filters = []) =>
      store.query({ table, op, values, filters }, true);
    const product = query("products", "insert", {
      name: "Producto prueba",
      price: 5000,
      cost: 2500,
      stock: 3,
    })[0];
    const sale = query("sales", "insert", {
      date: input().date,
      total: 5000,
      payment_method: "efectivo",
    })[0];
    query("sale_items", "insert", {
      sale_id: sale.id,
      item_type: "product",
      item_ref: product.id,
      name: product.name,
      quantity: 1,
      unit_price: 5000,
      subtotal: 5000,
    });
    query("stock_movements", "insert", {
      product_id: product.id,
      type: "out",
      quantity: 1,
      reason: "Venta",
    });
    query("products", "update", { stock: 2 }, [
      { key: "id", value: product.id },
    ]);
    query("expenses", "insert", {
      date: input().date,
      description: "Gasto prueba",
      amount: 1000,
      category: "general",
    });
    query("barbers", "insert", {
      id: "nuevo",
      name: "Barbero nuevo",
      position: 5,
    });
    assert.equal(
      store.all("barber_schedules").filter((s) => s.barber_id === "nuevo")
        .length,
      7,
    );
    store.close();
    store = new DemoStore(dir);
    assert.equal(
      store.all("products").find((p) => p.id === product.id).stock,
      2,
    );
    assert.equal(store.all("sales").length, 1);
    assert.equal(store.all("sale_items").length, 1);
    assert.equal(store.all("stock_movements").length, 1);
    assert.equal(store.all("expenses").length, 1);
    query("sales", "delete", undefined, [{ key: "id", value: sale.id }]);
    assert.equal(store.all("sale_items").length, 0);
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("local HTTP API protects admin data and only allows the local application origin", async () => {
  const dir = temp();
  let app;
  try {
    app = await startDemoServer({ directory: dir });
    const base = `http://127.0.0.1:${app.port}/__demo-api`;
    const post = (path, body, cookie) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:8080",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await fetch(base + "/query", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "https://otro.example",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (await post("/query", { table: "bookings", op: "select" })).status,
      403,
    );
    assert.equal(
      (await post("/query", { table: "barbers", op: "select" })).status,
      200,
    );
    const created = await post("/create-booking", input());
    assert.equal(created.status, 201);
    const login = await post("/login", {});
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const result = await post(
      "/query",
      { table: "bookings", op: "select" },
      cookie,
    );
    assert.equal(result.status, 200);
    assert.equal((await result.json()).data.length, 1);
    const session = await fetch(base + "/session", {
      headers: { Cookie: cookie },
    });
    assert.equal(
      (await session.json()).session.user.email,
      "demo@barberia.local",
    );
    await post("/logout", {}, cookie);
    assert.equal(
      (await post("/query", { table: "bookings", op: "select" }, cookie))
        .status,
      403,
    );
  } finally {
    await app?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
