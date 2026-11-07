import { describe, expect, it } from "vitest";
import {
  bookingIdSchema,
  bookingPageSchema,
  bookingRequestSchema,
  bookingResponseSchema,
  createBookingSchema,
  resetSlotsRequestSchema,
  resetSlotsResponseSchema,
  slotsRequestSchema,
} from "@/lib/booking-schemas";

import { errorFromStatus, unwrap } from "@/services/apiClient";

const booking = {
  id: "reference",
  slotId: "slot",
  name: "Audit",
  email: "audit@example.com",
  status: "CONFIRMED",
  createdAt: "2026-11-04T09:00:00Z",
};
describe("documented booking contract", () => {
  it("requires exactly slotId, name and email and rejects reset fields", () => {
    expect(
      bookingRequestSchema.safeParse({ slotId: "slot", name: "Audit", email: "audit@example.com" })
        .success,
    ).toBe(true);
    expect(
      bookingRequestSchema.safeParse({
        slotId: "slot",
        name: "Audit",
        email: "audit@example.com",
        slots: [],
      }).success,
    ).toBe(false);
    expect(
      bookingRequestSchema.safeParse({ name: "Audit", email: "audit@example.com" }).success,
    ).toBe(false);
  });
  it("rejects invalid idempotency keys before proxying", () => {
    expect(
      createBookingSchema.safeParse({
        slotId: "slot",
        name: "Audit",
        email: "audit@example.com",
        idempotencyKey: "invalid",
      }).success,
    ).toBe(false);
  });
  it("accepts only the documented provider filter", () => {
    expect(slotsRequestSchema.safeParse({ provider: "Dr Ade" }).success).toBe(true);
    expect(slotsRequestSchema.safeParse({ sort: "provider" }).success).toBe(false);
  });
  it("rejects empty booking lookup IDs", () => {
    expect(bookingIdSchema.safeParse({ id: " " }).success).toBe(false);
  });
  it("accepts POST success only with status 201 and BookingResponse", async () => {
    await expect(
      unwrap(
        Promise.resolve({ ok: true, status: 201, json: JSON.stringify(booking) }),
        bookingResponseSchema,
        201,
      ),
    ).resolves.toEqual(booking);
    await expect(
      unwrap(
        Promise.resolve({ ok: true, status: 200, json: JSON.stringify(booking) }),
        bookingResponseSchema,
        201,
      ),
    ).rejects.toThrow();
  });
  it("does not report an incomplete booking as confirmed", async () => {
    await expect(
      unwrap(
        Promise.resolve({ ok: true, status: 201, json: '{"id":"reference"}' }),
        bookingResponseSchema,
        201,
      ),
    ).rejects.toThrow();
  });
  it("validates the user-confirmed cursor booking list", () => {
    expect(bookingPageSchema.safeParse({ items: [booking], next_cursor: null }).success).toBe(true);
    expect(bookingPageSchema.safeParse(booking).success).toBe(false);
  });
  it("validates reset slots request schema", () => {
    expect(resetSlotsRequestSchema.safeParse({}).success).toBe(false);
    expect(resetSlotsRequestSchema.safeParse({ slots: [] }).success).toBe(true);
    expect(
      resetSlotsRequestSchema.safeParse({
        slots: [
          {
            id: "s1",
            provider: "Dr Ade",
            start: "2026-11-06T09:00:00Z",
            end: "2026-11-06T09:30:00Z",
          },
        ],
      }).success,
    ).toBe(true);
    expect(resetSlotsRequestSchema.safeParse({ unexpected: true }).success).toBe(false);
  });

  it("validates slots without id allowing backend UUID generation", () => {
    const payloadWithoutId = {
      slots: [
        {
          provider: "Dr Anu",
          start: "2026-11-10T09:00:00Z",
          end: "2026-11-10T09:30:00Z",
        },
      ],
    };
    const parsed = resetSlotsRequestSchema.safeParse(payloadWithoutId);
    expect(parsed.success).toBe(true);
  });

  it("validates submitting 3 new slots in AppointmentSlotResetRequest format", () => {
    const threeSlotsPayload = {
      slots: [
        {
          provider: "Dr Sarah Jenkins",
          start: "2026-11-10T09:00:00Z",
          end: "2026-11-10T09:30:00Z",
        },
        {
          provider: "Dr Sarah Jenkins",
          start: "2026-11-10T09:30:00Z",
          end: "2026-11-10T10:00:00Z",
        },
        {
          provider: "Dr Marcus Vance",
          start: "2026-11-10T10:00:00Z",
          end: "2026-11-10T10:30:00Z",
        },
      ],
    };
    const parsed = resetSlotsRequestSchema.safeParse(threeSlotsPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slots).toHaveLength(3);
      expect(parsed.data.slots[0].provider).toBe("Dr Sarah Jenkins");
      expect(parsed.data.slots[1].provider).toBe("Dr Sarah Jenkins");
      expect(parsed.data.slots[2].provider).toBe("Dr Marcus Vance");
    }
  });

  it("handles reset response as slots array, wrapped object, or plain string", () => {
    const directArray = [
      {
        id: "slot-1",
        provider: "Dr Sarah Jenkins",
        start: "2026-11-10T09:00:00Z",
        end: "2026-11-10T09:30:00Z",
        available: true,
      },
    ];
    expect(resetSlotsResponseSchema.safeParse(directArray).success).toBe(true);
    expect(resetSlotsResponseSchema.safeParse({ slots: directArray }).success).toBe(true);
    expect(resetSlotsResponseSchema.safeParse("Done").success).toBe(true);
  });

  it.each([
    [400, "validation"],
    [404, "notFound"],
    [409, "conflict"],
    [422, "unprocessable"],
    [429, "rateLimited"],
    [500, "server"],
    [503, "unavailable"],
  ])("maps HTTP %i safely", (status, kind) => {
    expect(errorFromStatus(Number(status)).kind).toBe(kind);
  });
});
