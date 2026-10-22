import { test, expect } from "@playwright/test";
test("starts with no credentials, saves a booking and opens all admin sections", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByLabel("Modo de demostración")).toContainText(
    "WhatsApp está simulado",
  );
  const section = page.locator("#reservar");
  await section
    .getByRole("button", { name: /^Recorte de cabello/ })
    .first()
    .click();
  await section.getByRole("button", { name: /Edwin Zambrano/ }).click();
  await section
    .getByRole("button", { name: /^[a-záéíóú]{3}/i })
    .filter({ hasText: /\d/ })
    .nth(1)
    .click();
  const timeButton = section
    .getByRole("button")
    .filter({ hasText: /^\d{2}:\d{2}$/ })
    .first();
  await timeButton.click();
  const name = `Prueba navegador ${Date.now()}`;
  await section.getByPlaceholder("Tu nombre").fill(name);
  await section
    .getByPlaceholder("300 123 4567 o +código de país")
    .fill("3015550000");
  await section.getByRole("checkbox").check();
  await section
    .getByRole("button", { name: "Confirmar reserva", exact: true })
    .click();
  await expect(section.getByRole("status")).toContainText(
    "Los dos avisos de WhatsApp son simulados",
  );
  await page.goto("/admin");
  await page.getByRole("button", { name: "Entrar a la demostración" }).click();
  await page.getByRole("button", { name: "Reservas", exact: true }).click();
  // The admin opens on today; select tomorrow to find this reservation.
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
  }).format(new Date());
  const tomorrow = new Date(parts + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await page
    .locator("input[type=date]")
    .fill(tomorrow.toISOString().slice(0, 10));
  await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Simulado (sin envío)" }).first(),
  ).toBeVisible();
  for (const tab of [
    "Caja",
    "Inventario",
    "Contabilidad",
    "Comisiones",
    "Horarios",
    "Barberos",
    "Dashboard",
  ]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
    await expect(
      page.getByRole("button", { name: tab, exact: true }),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});
