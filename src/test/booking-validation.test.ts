import { describe, expect, it } from "vitest";
import { validateBooking } from "@/lib/booking-utils";
import { IdempotencyKeys } from "@/lib/idempotency";

describe("booking form validation", () => {
  it("rejects a blank full name", () => {
    expect(validateBooking({ name: "   ", email: "a@b.com" }, "s1").name).toBeDefined();
  });
  it("rejects an invalid email", () => {
    expect(validateBooking({ name: "Jo", email: "jo@nope" }, "s1").email).toBeDefined();
  });
  it("requires a selected slot", () => {
    expect(validateBooking({ name: "Jo", email: "jo@x.com" }, null).slot).toBeDefined();
  });
  it("accepts valid input", () => {
    expect(validateBooking({ name: "John Doe", email: "john@example.com" }, "s1")).toEqual({});
  });
});

describe("idempotency keys", () => {
  const make = () => {
    let n = 0;
    return new IdempotencyKeys(() => `key-${++n}`);
  };
  const req = { slotId: "s1", name: "Jo", email: "jo@x.com" };

  it("reuses the key when retrying the exact same attempt", () => {
    const k = make();
    expect(k.keyFor(req)).toBe("key-1");
    expect(k.keyFor({ ...req })).toBe("key-1");
  });
  it("generates a new key when the slot changes", () => {
    const k = make();
    k.keyFor(req);
    expect(k.keyFor({ ...req, slotId: "s2" })).toBe("key-2");
  });
  it("generates a new key when the email changes", () => {
    const k = make();
    k.keyFor(req);
    expect(k.keyFor({ ...req, email: "other@x.com" })).toBe("key-2");
  });
  it("generates a new key after an attempt is reset", () => {
    const k = make();
    k.keyFor(req);
    k.reset();
    expect(k.keyFor(req)).toBe("key-2");
  });
});
