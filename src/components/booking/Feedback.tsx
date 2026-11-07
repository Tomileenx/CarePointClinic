import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/types/booking";
import { ApiError } from "@/services/apiClient";

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    if (typeof o["message"] === "string" && o["message"].trim()) return o["message"];
    if (typeof o["error"] === "string" && o["error"].trim()) return o["error"];
  }
  return "Something unexpected happened. Please try again.";
}

export function ErrorNotice({
  error,
  onRetry,
  title,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const canRetry = onRetry && (!(error instanceof ApiError) || error.retryable);
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <div className="flex-1">
        <p className="font-medium text-foreground">{title ?? "Something went wrong"}</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      </div>
      {canRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const cls =
    status === "CONFIRMED" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${cls}`}
    >
      {status === "CONFIRMED" ? "Confirmed" : "Cancelled"}
    </span>
  );
}

export function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground sm:text-right">{value}</dd>
    </div>
  );
}
