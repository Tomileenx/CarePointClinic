import { describe, expect, it } from "vitest";
import { dateKey, formatTime, groupSlotsByDate } from "@/lib/booking-utils";
import type { AppointmentSlot } from "@/types/booking";

// Nigeria uses Africa/Lagos, UTC+1; ISO Z timestamps are UTC instants.
describe("appointment time display", () => {
  it("shows 09:00 UTC as 10:00 Lagos time", () => {
    expect(formatTime("2026-11-02T09:00:00Z")).toBe("10:00");
  });

  it("respects timestamps already carrying the Nigeria offset", () => {
    expect(formatTime("2026-11-02T16:30:00+01:00")).toBe("16:30");
  });

  it("groups slots by the backend's calendar date", () => {
    expect(dateKey("2026-11-02T09:00:00Z")).toBe("2026-11-02");
  });
  it("groups UTC evening slots into the next Lagos calendar day", () => {
    expect(dateKey("2026-11-02T23:30:00Z")).toBe("2026-11-03");
  });

  it("keeps the backend's slot order when grouping", () => {
    const slot = (id: string, start: string): AppointmentSlot => ({
      id,
      provider: "Dr Ade",
      start,
      end: start,
      available: true,
    });
    const slots = [
      slot("a", "2026-11-02T09:00:00Z"),
      slot("b", "2026-11-02T10:00:00Z"),
      slot("c", "2026-11-03T09:00:00Z"),
    ];
    const groups = groupSlotsByDate(slots);
    expect(groups.map((g) => g.key)).toEqual(["2026-11-02", "2026-11-03"]);
    expect(groups[0]?.slots.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
