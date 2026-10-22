export { normalizePhone } from "../../supabase/functions/_shared/validation";

export function bogotaToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function slotsForSchedule(
  date: string,
  open: string,
  close: string,
  duration: number,
  occupied: Set<string>,
  now = new Date(),
): string[] {
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const block = Math.ceil(duration / 30) * 30;
  const slots: string[] = [];
  for (
    let start = Math.ceil(minutes(open) / 30) * 30;
    start + block <= minutes(close);
    start += 30
  ) {
    const time = `${String(Math.floor(start / 60)).padStart(2, "0")}:${String(start % 60).padStart(2, "0")}`;
    if (new Date(`${date}T${time}:00-05:00`) <= now) continue;
    let free = true;
    for (let offset = 0; offset < block; offset += 30) {
      const t = start + offset;
      if (
        occupied.has(
          `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`,
        )
      )
        free = false;
    }
    if (free) slots.push(time);
  }
  return slots;
}
