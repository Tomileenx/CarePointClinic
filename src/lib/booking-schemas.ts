import { z } from "zod";

// Incoming request validation and documented response fields share one boundary.
export const bookingRequestSchema = z
  .object({
    slotId: z.string().trim().min(1),
    name: z.string().trim().min(1),
    email: z.string().trim().min(1).email(),
  })
  .strict();
export const bookingIdSchema = z.object({ id: z.string().trim().min(1) }).strict();
export const slotsRequestSchema = z.object({ provider: z.string().optional() }).strict();
export const bookingsRequestSchema = z
  .object({
    email: z.string().trim().email(),
    limit: z.number().int().positive().max(2147483647).default(10),
    cursor: z.string().optional(),
  })
  .strict();
export const createBookingSchema = bookingRequestSchema.extend({
  idempotencyKey: z.string().uuid(),
});

export const slotInputSchema = z.object({
  provider: z.string().trim().min(1, "Provider name is required"),
  start: z.string().trim().min(1, "Start time is required"),
  end: z.string().trim().min(1, "End time is required"),
});

export const resetSlotsRequestSchema = z
  .object({
    slots: z.array(slotInputSchema),
  })
  .strict();

const timestamp = z
  .string()
  .datetime({ offset: true })
  .or(
    z
      .string()
      .refine((val) => !isNaN(Date.parse(val)) && (val.includes("T") || val.includes("-")), {
        message: "Invalid date-time",
      }),
  );
export const slotSchema = z.object({
  id: z.string(),
  provider: z.string(),
  start: timestamp,
  end: timestamp,
  available: z.boolean().optional().default(true),
});

export const resetSlotsResponseSchema = z.union([
  slotSchema.array(),
  z.object({ slots: slotSchema.array() }).transform((v) => v.slots),
  z.string(),
]);
export const bookingResponseSchema = z.object({
  id: z.string(),
  slotId: z.string(),
  name: z.string(),
  email: z.string(),
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  createdAt: timestamp,
});
// Existing cursor contract, explicitly confirmed in the user's redeployment brief.
// Normalizes arrays and cursor responses into items + next_cursor.
export const bookingPageSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) {
      return { items: val, next_cursor: null };
    }
    if (val && typeof val === "object" && "items" in val) {
      const obj = val as Record<string, unknown>;
      return {
        items: obj["items"],
        next_cursor: obj["next_cursor"] ?? obj["nextCursor"] ?? null,
      };
    }
    return val;
  },
  z.object({
    items: z.array(bookingResponseSchema),
    next_cursor: z.string().nullish(),
  }),
);
