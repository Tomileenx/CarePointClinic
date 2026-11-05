// Server-only: forwards requests to the Spring Boot API and attaches X-API-Key.
const BASE_URL = "https://booking-api-ngrf.onrender.com";

try {
  process.loadEnvFile?.();
} catch {
  // Ignore if .env is missing or already loaded
}

export type ProxyResult =
  | { ok: true; status: number; json: string }
  | { ok: false; status: number; error?: string; code?: string };

export async function callBookingApi(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<ProxyResult> {
  const apiKey = process.env["BOOKING_API_KEY"];
  if (!apiKey) {
    console.error("BOOKING_API_KEY is not configured");
    return { ok: false, status: 0, code: "CONFIG" };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
  } catch {
    console.error("Booking API unreachable");
    return { ok: false, status: 0, code: "NETWORK" };
  }

  const text = await res.text().catch(() => "");
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }

  if (!res.ok) {
    const b = (body && typeof body === "object" ? body : {}) as { error?: unknown; code?: unknown };
    console.error("Booking API error", res.status);
    return {
      ok: false,
      status: res.status,
      // Only pass through short, string error messages — never raw bodies.
      ...(typeof b.error === "string" && b.error.length < 200 ? { error: b.error } : {}),
      ...(typeof b.code === "string" && b.code.length < 64 ? { code: b.code } : {}),
    };
  }
  return { ok: true, status: res.status, json: text };
}
