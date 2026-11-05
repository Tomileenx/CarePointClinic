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
        msg("Some details were not accepted. Please check and try again."),
        status,
        code,
      );
    case 401:
      return new ApiError(
        "unauthorized",
        "The booking service rejected this site's credentials.",
        status,
        code,
      );
    case 403:
      return new ApiError(
        "forbidden",
        "You are not permitted to perform this action.",
        status,
        code,
      );
    case 404:
      return new ApiError(
        "notFound",
        msg("We couldn't find what you were looking for."),
        status,
        code,
      );
    case 409:
      return new ApiError(
        "conflict",
        msg("This conflicts with an existing booking."),
        status,
        code,
      );
    case 422:
      return new ApiError(
        "unprocessable",
        msg("That slot can no longer be booked. Please choose another time."),
        status,
        code,
      );
    case 429:
      return new ApiError(
        "rateLimited",
        "Too many requests. Please wait a moment before trying again.",
        status,
        code,
      );
    case 503:
      return new ApiError(
        "unavailable",
        "The booking service is temporarily unavailable. Please try again shortly.",
        status,
        code,
      );
    default:
      return new ApiError(
        "server",
        "Something went wrong on our side. Please try again.",
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
    if (error instanceof Error && error.name === "ZodError")
      throw new ApiError(
        "validation",
        "Some details were not accepted. Please check and try again.",
        400,
      );
    throw new ApiError(
      "network",
      "We couldn't reach the booking service. Check your connection and try again.",
    );
  }
  if (res.ok) {
    if (res.status !== expectedStatus)
      throw new ApiError(
        "server",
        "The booking service returned an unexpected response status.",
        res.status,
      );
    try {
      const result = schema.safeParse(JSON.parse(res.json));
      if (!result.success) throw new Error("Invalid response");
      return result.data;
    } catch {
      throw new ApiError(
        "server",
        "The booking service returned an incomplete or unreadable response.",
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
