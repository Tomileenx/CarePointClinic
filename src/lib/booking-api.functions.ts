import { createServerFn } from "@tanstack/react-start";
import { callBookingApi } from "./booking-api.server";
import {
  bookingIdSchema,
  bookingsRequestSchema,
  createBookingSchema,
  resetSlotsRequestSchema,
  slotsRequestSchema,
} from "./booking-schemas";

// GET /slots returns all slots as a plain array; the only documented parameter
// is the optional `provider` filter. Preserve the backend's returned order.
export const proxyListSlots = createServerFn({ method: "GET" })
  .inputValidator((d) => slotsRequestSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const q = new URLSearchParams();
    if (data.provider) q.set("provider", data.provider);
    const qs = q.toString();
    return callBookingApi(`/slots${qs ? `?${qs}` : ""}`);
  });

export const proxyCreateBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => createBookingSchema.parse(d))
  .handler(async ({ data }) =>
    callBookingApi("/bookings", {
      method: "POST",
      body: { slotId: data.slotId, name: data.name, email: data.email },
      headers: { "Idempotency-Key": data.idempotencyKey },
    }),
  );

export const proxyGetBooking = createServerFn({ method: "GET" })
  .inputValidator((d) => bookingIdSchema.parse(d))
  .handler(async ({ data }) => callBookingApi(`/bookings/${encodeURIComponent(data.id)}`));

export const proxyCancelBooking = createServerFn({ method: "POST" })
  .inputValidator((d) => bookingIdSchema.parse(d))
  .handler(async ({ data }) =>
    callBookingApi(`/bookings/${encodeURIComponent(data.id)}`, { method: "DELETE" }),
  );

export const proxyListBookings = createServerFn({ method: "GET" })
  .inputValidator((d) => bookingsRequestSchema.parse(d))
  .handler(async ({ data }) => {
    const q = new URLSearchParams({ email: data.email, limit: String(data.limit) });
    if (data.cursor) q.set("cursor", data.cursor);
    return callBookingApi(`/bookings?${q}`);
  });

export const proxyResetSlots = createServerFn({ method: "POST" })
  .inputValidator((d) => resetSlotsRequestSchema.parse(d))
  .handler(async ({ data }) =>
    callBookingApi("/reset", {
      method: "POST",
      body: { slots: data.slots },
    }),
  );
