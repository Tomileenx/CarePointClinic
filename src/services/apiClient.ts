import type { ProxyResult } from "@/lib/booking-api.server";
import type { z } from "zod";

export type ApiErrorKind =
  | "config"
  | "network"
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "unprocessable"
  | "rateLimited"
  | "unavailable"
  | "server";

/** Safe, user-facing error. Never carries stack traces or raw server internals. */
export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get retryable() {
    return ["network", "server", "rateLimited", "unavailable"].includes(this.kind);
  }
}

export function errorFromStatus(status: number, apiMessage?: string, code?: string): ApiError {
  const msg = (fallback: string) => apiMessage || fallback;
  switch (status) {
    case 400:
      return new ApiError(
        "validation",
        msg("The request was rejected by the backend (400 Bad Request). Please check your inputs."),
        status,
        code,
      );
    case 401:
      return new ApiError(
        "unauthorized",
        msg("The booking service rejected this site's API credentials (401 Unauthorized)."),
        status,
        code,
      );
    case 403:
      return new ApiError("forbidden", msg("Access forbidden (403 Forbidden)."), status, code);
    case 404:
      return new ApiError(
        "notFound",
        msg("The requested resource was not found (404 Not Found)."),
        status,
        code,
      );
    case 409:
      return new ApiError(
        "conflict",
        msg("Conflict with existing booking data (409 Conflict)."),
        status,
        code,
      );
    case 422:
      return new ApiError(
        "unprocessable",
        msg("That slot can no longer be processed (422 Unprocessable)."),
        status,
        code,
      );
    case 429:
      return new ApiError(
        "rateLimited",
        msg("Too many requests (429 Rate Limit). Please wait a moment before trying again."),
        status,
        code,
      );
    case 500:
      return new ApiError(
        "server",
        msg("Internal server error from booking API (500). Please check backend logs."),
        status,
        code,
      );
    case 502:
    case 503:
    case 504:
      return new ApiError(
        "unavailable",
        msg(`The booking service is unavailable (HTTP ${status}). Please try again shortly.`),
        status,
        code,
      );
    default:
      return new ApiError(
        "server",
        apiMessage || `Booking service error (HTTP ${status}). Please try again.`,
        status,
        code,
      );
  }
}

/** Unwraps a proxy result into data or a typed ApiError. All error mapping lives here. */
export async function unwrap<T>(
  call: Promise<ProxyResult>,
  schema: z.ZodType<T>,
  expectedStatus: number,
): Promise<T> {
  let res: ProxyResult;
  try {
    res = await call;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error) {
      if (error.name === "ZodError" || error.message.includes("validation")) {
        throw new ApiError("validation", `Validation error: ${error.message}`, 400);
      }
      throw new ApiError("network", error.message || "Failed to reach booking service.");
    }
    throw new ApiError(
      "network",
      "We couldn't reach the booking service. Check your connection and try again.",
    );
  }
  if (res.ok) {
    if (res.status !== expectedStatus)
      throw new ApiError(
        "server",
        `The booking service returned HTTP ${res.status} (expected ${expectedStatus}).`,
        res.status,
      );
    try {
      const parsedJson = JSON.parse(res.json);
      const result = schema.safeParse(parsedJson);
      if (!result.success) throw new Error("Invalid response format");
      return result.data;
    } catch {
      throw new ApiError(
        "server",
        `The booking service returned an unexpected response format: ${String(res.json).slice(0, 100)}`,
        res.status,
      );
    }
  }
  if (res.code === "CONFIG")
    throw new ApiError("config", "The booking service is not configured yet.");
  if (res.status === 0)
    throw new ApiError(
      "network",
      "We couldn't reach the booking service. It may be starting up — please try again.",
    );
  throw errorFromStatus(res.status, res.error, res.code);
}
