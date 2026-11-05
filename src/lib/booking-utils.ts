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
 * ISO timestamps represent instants. Render and group them in the clinic's
 * timezone, independent of the visitor's location (including date rollover).
 */
export const CLINIC_TIME_ZONE = "Africa/Lagos";

export function dateKey(iso: string) {
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
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: CLINIC_TIME_ZONE,
  });
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLINIC_TIME_ZONE,
  });
