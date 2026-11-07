import type { AppointmentSlot } from "@/types/booking";

export interface BookingFormValues {
  name: string;
  email: string;
}
export type BookingFormErrors = { [K in keyof BookingFormValues | "slot"]?: string | undefined };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (e: string) => EMAIL_RE.test(e.trim());

/** UX-only validation. The proxy and backend validate independently. */
export function validateBooking(
  values: BookingFormValues,
  slotId: string | null,
): BookingFormErrors {
  const errors: BookingFormErrors = {};
  if (!values.name.trim()) errors.name = "Please enter your full name.";
  if (!values.email.trim()) errors.email = "Please enter your email address.";
  else if (!isValidEmail(values.email)) errors.email = "Please enter a valid email address.";
  if (slotId === null) errors.slot = "Please select an appointment slot.";
  return errors;
}

/**
 * Check if a slot is available to be booked.
 * A slot is NOT available if marked available: false OR if its start time is in the past.
 */
export function isSlotAvailable(slot: AppointmentSlot, now = new Date()): boolean {
  if (!slot.available) return false;
  const startMs = new Date(slot.start).getTime();
  return !isNaN(startMs) && startMs > now.getTime();
}

/**
 * Clinic timezone configuration. The backend stores UTC timestamps matching clinic hours.
 */
export const CLINIC_TIME_ZONE = "UTC";

export function dateKey(iso: string) {
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && match[1]) return match[1];
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Groups slots by day, preserving the order the API returned them in. */
export function groupSlotsByDate(slots: AppointmentSlot[]) {
  const groups = new Map<string, AppointmentSlot[]>();
  for (const s of slots) {
    const k = dateKey(s.start);
    const existing = groups.get(k);
    if (existing) existing.push(s);
    else groups.set(k, [s]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, slots: items }));
}

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: CLINIC_TIME_ZONE,
  });
export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: CLINIC_TIME_ZONE,
  });
export const formatTime = (iso: string) => {
  const match = iso.match(/T(\d{2}:\d{2})/);
  if (match && match[1]) return match[1];
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLINIC_TIME_ZONE,
  });
};
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLINIC_TIME_ZONE,
  });

/**
 * Lagos timezone (West Africa Time, UTC+1, strictly no daylight saving).
 */
export const LAGOS_TIME_ZONE = "Africa/Lagos";

/**
 * Converts a date (YYYY-MM-DD), 12-hour time (HH:MM or H:MM), and AM/PM in Africa/Lagos timezone
 * to an authentic UTC ISO 8601 string (e.g. "2026-10-18T09:30:00Z").
 *
 * Example:
 * lagosToUtcIso("2026-10-18", "10:30", "AM") -> "2026-10-18T09:30:00Z"
 * lagosToUtcIso("2026-10-18", "09:30", "AM") -> "2026-10-18T08:30:00Z"
 */
export function lagosToUtcIso(
  dateStr: string,
  time12Str: string,
  period: "AM" | "PM",
): string | null {
  if (!dateStr || !time12Str) return null;
  const match = time12Str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  let h = parseInt(match[1]!, 10);
  const m = parseInt(match[2]!, 10);
  if (h < 1 || h > 12 || m < 0 || m > 59) return null;

  if (period === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  // Africa/Lagos is strictly UTC+01:00 with zero DST offsets
  const localIsoWithOffset = `${dateStr}T${pad(h)}:${pad(m)}:00+01:00`;
  const timestamp = Date.parse(localIsoWithOffset);
  if (isNaN(timestamp)) return null;
  const d = new Date(timestamp);
  return d.toISOString();
}

/**
 * Converts a UTC ISO string to Africa/Lagos date, 12-hour time, and AM/PM.
 */
export function utcIsoToLagos(
  utcIsoStr: string,
): { date: string; time: string; period: "AM" | "PM" } | null {
  if (!utcIsoStr) return null;
  const d = new Date(utcIsoStr);
  if (isNaN(d.getTime())) return null;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: LAGOS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const parts = formatter.formatToParts(d);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const dayPeriod = (getPart("dayPeriod") || "AM").toUpperCase();
  return {
    date: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    period: dayPeriod.includes("PM") ? "PM" : "AM",
  };
}
