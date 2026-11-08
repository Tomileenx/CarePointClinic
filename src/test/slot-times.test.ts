import { describe, expect, it } from "vitest";
import {
  dateKey,
  formatDateTime,
  formatTime,
  groupSlotsByDate,
  isSlotAvailable,
  lagosToUtcIso,
  utcIsoToLagos,
} from "@/lib/booking-utils";
import type { AppointmentSlot } from "@/types/booking";

describe("appointment time display", () => {
  it("shows 08:00 UTC as 9:00 AM Lagos time", () => {
    expect(formatTime("2026-11-02T08:00:00Z")).toBe("9:00 AM");
    expect(formatTime("2026-11-02T08:30:00Z")).toBe("9:30 AM");
  });

  it("respects timestamps already carrying an offset", () => {
    expect(formatTime("2026-11-02T16:30:00+01:00")).toBe("4:30 PM");
  });

  it("always uses a 12-hour clock, including midnight and noon", () => {
    // 12:00 AM Lagos is 23:00 UTC the previous day, and must not be shown as 23:00
    expect(formatTime("2026-11-01T23:00:00Z")).toBe("12:00 AM");
    expect(formatTime("2026-11-01T23:30:00Z")).toBe("12:30 AM");
    expect(formatTime("2026-11-02T11:00:00Z")).toBe("12:00 PM");
    expect(formatTime("2026-11-02T22:00:00Z")).toBe("11:00 PM");
  });

  it("formats a date and 12-hour time together in Lagos time", () => {
    expect(formatDateTime("2026-11-02T08:00:00Z")).toBe("Nov 2, 2026, 9:00 AM");
  });

  it("groups slots by the clinic's (Lagos) calendar date", () => {
    expect(dateKey("2026-11-02T08:00:00Z")).toBe("2026-11-02");
    // 12:00 AM on 2 Nov in Lagos is 23:00 UTC on 1 Nov, but belongs to 2 Nov
    expect(dateKey("2026-11-01T23:00:00Z")).toBe("2026-11-02");
  });

  it("identifies past slots as unavailable", () => {
    const pastSlot: AppointmentSlot = {
      id: "past-slot",
      provider: "Dr Ade",
      start: "2026-11-04T09:00:00Z",
      end: "2026-11-04T09:30:00Z",
      available: true,
    };
    const futureSlot: AppointmentSlot = {
      id: "future-slot",
      provider: "Dr Ade",
      start: "2026-11-06T09:00:00Z",
      end: "2026-11-06T09:30:00Z",
      available: true,
    };
    const now = new Date("2026-11-05T08:00:00Z");
    expect(isSlotAvailable(pastSlot, now)).toBe(false);
    expect(isSlotAvailable(futureSlot, now)).toBe(true);
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

  describe("Africa/Lagos to UTC ISO 8601 conversion", () => {
    it("accurately converts 18 October 2026, 10:30 AM Lagos to 2026-10-18T09:30:00.000Z", () => {
      const utc = lagosToUtcIso("2026-10-18", "10:30", "AM");
      expect(utc).toBe("2026-10-18T09:30:00.000Z");
    });

    it("accurately converts 18 October 2026, 09:30 AM Lagos to 2026-10-18T08:30:00.000Z", () => {
      const utc = lagosToUtcIso("2026-10-18", "09:30", "AM");
      expect(utc).toBe("2026-10-18T08:30:00.000Z");
    });

    it("accurately converts 18 October 2026, 10:00 AM Lagos to 2026-10-18T09:00:00.000Z", () => {
      const utc = lagosToUtcIso("2026-10-18", "10:00", "AM");
      expect(utc).toBe("2026-10-18T09:00:00.000Z");
    });

    it("handles 12 PM (noon) and 12 AM (midnight) correctly in Lagos", () => {
      // 12:00 PM Lagos -> 11:00 AM UTC
      expect(lagosToUtcIso("2026-10-18", "12:00", "PM")).toBe("2026-10-18T11:00:00.000Z");
      // 12:30 AM Lagos -> 11:30 PM UTC previous day
      expect(lagosToUtcIso("2026-10-18", "12:30", "AM")).toBe("2026-10-17T23:30:00.000Z");
    });

    it("round-trips UTC ISO back to Africa/Lagos time", () => {
      const lagos = utcIsoToLagos("2026-10-18T09:30:00.000Z");
      expect(lagos).toEqual({
        date: "2026-10-18",
        time: "10:30",
        period: "AM",
      });
    });

    it("rejects invalid inputs gracefully", () => {
      expect(lagosToUtcIso("", "10:30", "AM")).toBeNull();
      expect(lagosToUtcIso("2026-10-18", "99:99", "AM")).toBeNull();
      expect(lagosToUtcIso("2026-10-18", "invalid", "AM")).toBeNull();
    });
  });
});
