export function formatIstDate(d: Date = new Date()): string {
  return d.toLocaleString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 10);
}

export function istHour(d: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value;
  return hour ? parseInt(hour, 10) : 0;
}

export function parseIstDateOnly(dateStr: string): Date {
  const [yStr, mStr, dStr] = dateStr.split("-");
  const y = parseInt(yStr ?? "1970", 10);
  const m = parseInt(mStr ?? "1", 10);
  const day = parseInt(dStr ?? "1", 10);
  return new Date(Date.UTC(y, m - 1, day));
}

/** Next calendar day in Asia/Kolkata (no DST). */
export function addIstCalendarDays(days: number, from: Date = new Date()): string {
  const d = new Date(from.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
