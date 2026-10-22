import { test, expect } from "@playwright/test";
async function mockBackend(
  page: import("@playwright/test").Page,
  failFirst = false,
) {
  await page.routeWebSocket("**", (ws) => ws.close());
  let calls = 0;
  const bodies: Record<string, unknown>[] = [];
  await page.route("https://test.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "content-type": "application/json",
    };
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (path.endsWith("/create-booking")) {
      calls++;
      bodies.push(route.request().postDataJSON());
      if (failFirst && calls === 1)
        return route.fulfill({
          status: 503,
          headers,
          body: JSON.stringify({ error: "SAVE_FAILED" }),
        });
      return route.fulfill({
        status: 201,
        headers,
        body: JSON.stringify({
          booking: {
            id: "test-booking-id",
            date: "2026-10-23",
            time: "10:00",
            notifications: "queued",
          },
        }),
      });
    }
    let body: unknown = [];
    if (path.endsWith("/barbers"))
      body = [
        {
          id: "edwin",
          name: "Edwin Zambrano",
          position: 2,
          photo_url: null,
          is_active: true,
        },
      ];
    if (path.endsWith("/barber_schedules"))
      body = Array.from({ length: 7 }, (_, day_of_week) => ({
        id: String(day_of_week),
        barber_id: "edwin",
        day_of_week,
        is_available: true,
        open_time: "10:00",
        close_time: "17:00",
      }));
    return route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });
  return bodies;
}
async function fillBooking(page: import("@playwright/test").Page) {
  await page.goto("/");
  const booking = page.locator("#reservar");
  await booking
    .getByRole("button", { name: /^Recorte de cabello/ })
    .first()
    .click();
  await booking.getByRole("button", { name: /Edwin Zambrano/ }).click();
  await booking
    .getByRole("button", { name: /^[a-záéíóú]{3}/i })
    .filter({ hasText: /\d/ })
    .nth(1)
    .click();
  await booking.getByRole("button", { name: "10:00", exact: true }).click();
  await booking.getByPlaceholder("Tu nombre").fill("Cliente de Prueba");
  await booking
    .getByPlaceholder("300 123 4567 o +código de país")
    .fill("3015550000");
  return booking;
}
test("saves server-side and shows a reference without opening a WhatsApp chat", async ({
  page,
}) => {
  const bodies = await mockBackend(page);
  const booking = await fillBooking(page);
  await expect(
    booking.getByRole("button", { name: "Confirmar reserva", exact: true }),
  ).toBeDisabled();
  await booking.getByRole("checkbox").check();
  await booking
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(booking.getByRole("status")).toContainText(
    "¡Tu reserva está guardada!",
  );
  expect(bodies).toHaveLength(1);
  expect(bodies[0].client_phone).toBe("573015550000");
  expect(bodies[0].whatsapp_consent).toBe(true);
  expect(bodies[0]).not.toHaveProperty("duration_minutes");
  expect(page.context().pages()).toHaveLength(1);
});
test("reuses the same request after an uncertain server response", async ({
  page,
}) => {
  const bodies = await mockBackend(page, true);
  const booking = await fillBooking(page);
  await booking.getByRole("checkbox").check();
  await booking
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(
    page.getByText("No se pudo confirmar", { exact: true }),
  ).toBeVisible();
  await booking
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(booking.getByRole("status")).toContainText("test-booking-id");
  expect(bodies).toHaveLength(2);
  expect(bodies[0].request_id).toBe(bodies[1].request_id);
});
test("admin supports your own email and password", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/admin");
  await expect(page.getByPlaceholder("Correo del administrador")).toBeVisible();
  await expect(
    page.getByPlaceholder("Contraseña", { exact: true }),
  ).toBeVisible();
});
