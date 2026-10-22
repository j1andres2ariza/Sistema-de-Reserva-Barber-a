import { describe, it, expect } from "vitest";
import { bogotaToday, normalizePhone, slotsForSchedule } from "@/lib/booking";
import { validateBooking } from "../../supabase/functions/_shared/validation";
describe("Booking rules", () => {
  it("uses the Colombian date across the UTC date boundary", () => {
    expect(bogotaToday(new Date("2026-10-23T02:00:00Z"))).toBe("2026-10-22");
  });
  it("normalizes Colombian phones and preserves international numbers", () => {
    expect(normalizePhone("301 507 0012")).toBe("573015070012");
    expect(normalizePhone("+57 (301) 507-0012")).toBe("573015070012");
    expect(normalizePhone("+1 202 555 0123")).toBe("12025550123");
    expect(() => normalizePhone("hola 3015070012")).toThrow();
    expect(() => normalizePhone("123")).toThrow();
  });
  it("uses opening times and blocks full 40-minute services in a 30-minute calendar", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    expect(
      slotsForSchedule(
        "2026-10-23",
        "10:00",
        "12:00",
        40,
        new Set(["10:30"]),
        now,
      ),
    ).toEqual(["11:00"]);
    expect(
      slotsForSchedule("2026-10-23", "10:15", "11:30", 30, new Set(), now),
    ).toEqual(["10:30", "11:00"]);
  });
  it("does not offer past appointment times", () => {
    expect(
      slotsForSchedule(
        "2026-10-22",
        "09:00",
        "11:00",
        30,
        new Set(),
        new Date("2026-10-22T15:10:00Z"),
      ),
    ).toEqual(["10:30"]);
  });
  it("requires consent, a valid request ID and clean input", () => {
    const input = {
      request_id: "6b39126a-82d0-4b3f-aac2-94ae1d51d500",
      client_name: "Prueba",
      client_phone: "3015070012",
      barber_id: "edwin",
      service_id: "recorte",
      date: "2026-10-23",
      time: "09:00",
      whatsapp_consent: true,
    };
    expect(validateBooking(input).client_phone).toBe("573015070012");
    expect(() =>
      validateBooking({ ...input, whatsapp_consent: false }),
    ).toThrow();
    expect(() =>
      validateBooking({ ...input, client_name: "Ana\nOtra línea" }),
    ).toThrow();
    expect(() => validateBooking({ ...input, time: "09:15" })).toThrow();
  });
});
