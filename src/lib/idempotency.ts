import type { BookingRequest } from "@/types/booking";

/**
 * Holds one Idempotency-Key per booking attempt. The same key is reused only when
 * retrying the exact same request (same slot, name and email); any change, or a
 * completed attempt, produces a new key.
 */
export class IdempotencyKeys {
  private current: { fingerprint: string; key: string } | null = null;
  constructor(private generate: () => string = () => crypto.randomUUID()) {}

  keyFor(req: BookingRequest): string {
    const fingerprint = JSON.stringify([req.slotId, req.name, req.email]);
    if (!this.current || this.current.fingerprint !== fingerprint) {
      this.current = { fingerprint, key: this.generate() };
    }
    return this.current.key;
  }

  /** Call after an attempt finishes definitively (success, or a non-retryable error). */
  reset() {
    this.current = null;
  }
}
