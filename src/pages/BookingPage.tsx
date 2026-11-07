import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetSlotsDialog } from "@/components/booking/ResetSlotsDialog";

import { SlotPicker } from "@/components/booking/SlotPicker";
import { DetailRow, ErrorNotice, StatusBadge } from "@/components/booking/Feedback";
import { bookingService } from "@/services/bookingService";
import { ApiError } from "@/services/apiClient";
import { IdempotencyKeys } from "@/lib/idempotency";
import {
  formatDate,
  formatTime,
  isSlotAvailable,
  validateBooking,
  type BookingFormErrors,
  type BookingFormValues,
} from "@/lib/booking-utils";

import type { AppointmentSlot, BookingRequest, BookingResponse } from "@/types/booking";

export const slotsQueryKey = ["slots"] as const;

interface Confirmed {
  booking: BookingResponse;
  slot: AppointmentSlot;
  request: BookingRequest;
}

export function BookingPage() {
  const qc = useQueryClient();
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [knownProviders, setKnownProviders] = useState<string[]>([]);
  const slotsQuery = useQuery({
    queryKey: [...slotsQueryKey, providerFilter] as const,
    queryFn: () => bookingService.listSlots(providerFilter || undefined),
    retry: false,
    refetchInterval: 30_000,
    refetchOnMount: "always",
  });
  const [selected, setSelected] = useState<AppointmentSlot | null>(null);
  const [values, setValues] = useState<BookingFormValues>({ name: "", email: "" });
  const [errors, setErrors] = useState<BookingFormErrors>({});

  const [confirmed, setConfirmed] = useState<Confirmed | null>(null);

  useEffect(() => {
    if (slotsQuery.data) {
      const list = Array.from(new Set(slotsQuery.data.map((s) => s.provider).filter(Boolean)));
      if (list.length > 0) {
        setKnownProviders((prev) => Array.from(new Set([...prev, ...list])));
      }
    }
  }, [slotsQuery.data]);

  const keys = useRef(new IdempotencyKeys());
  const slotsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const create = useMutation({
    mutationFn: ({ req, key }: { req: BookingRequest; key: string; slot: AppointmentSlot }) =>
      bookingService.createBooking(req, key),
    onSuccess: (booking, { req, slot }) => {
      keys.current.reset();
      setConfirmed({ booking, slot, request: req });
      setSelected(null);
      setValues({ name: "", email: "" });
      qc.setQueryData<AppointmentSlot[]>(slotsQueryKey, (slots) =>
        slots?.map((s) => (s.id === booking.slotId ? { ...s, available: false } : s)),
      );
      qc.invalidateQueries({ queryKey: slotsQueryKey });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err) => {
      // Keep the key only for retryable failures, so "Try again" repeats the same attempt.
      if (!(err instanceof ApiError && err.retryable)) keys.current.reset();
      if (
        err instanceof ApiError &&
        (err.kind === "unprocessable" || err.kind === "conflict" || err.kind === "notFound")
      )
        qc.invalidateQueries({ queryKey: slotsQueryKey });
    },
  });

  useEffect(() => {
    if (
      selected &&
      slotsQuery.data &&
      !slotsQuery.data.some((s) => s.id === selected.id && isSlotAvailable(s))
    ) {
      setSelected(null);
      setErrors((e) => ({
        ...e,
        slot: "That appointment is no longer available. Please select another time.",
      }));
    }
  }, [selected, slotsQuery.data]);

  const selectSlot = (s: AppointmentSlot) => {
    if (!isSlotAvailable(s) || create.isPending) return;
    keys.current.reset();
    setSelected(s);
    setErrors((e) => ({ ...e, slot: undefined }));
    create.reset();
    if (window.innerWidth < 1024)
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (create.isPending) return;
    const v = validateBooking(values, selected?.id ?? null);
    setErrors(v);
    if (Object.keys(v).length || !selected) return;
    const req: BookingRequest = {
      slotId: selected.id,
      name: values.name.trim(),
      email: values.email.trim(),
    };
    create.mutate({ req, key: keys.current.keyFor(req), slot: selected });
  };

  if (confirmed) return <Confirmation data={confirmed} onBack={() => setConfirmed(null)} />;

  const data = slotsQuery.data;

  return (
    <div>
      <section className="bg-hero border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal">Appointments</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Book your appointment
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Choose a date, pick an available time, then enter your name and email to confirm. You'll
            get a booking reference you can use to look up or cancel your appointment.
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_380px]">
        <section ref={slotsRef} aria-labelledby="slots-heading" className="min-w-0 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 id="slots-heading" className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-5 text-primary" aria-hidden /> Available slots
              {slotsQuery.isFetching && !slotsQuery.isPending && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Updating"
                />
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {knownProviders.length > 1 && (
                <div className="flex items-center gap-2 text-sm">
                  <label
                    htmlFor="provider-filter"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Provider:
                  </label>
                  <select
                    id="provider-filter"
                    value={providerFilter}
                    onChange={(e) => {
                      setProviderFilter(e.target.value);
                      setSelected(null);
                    }}
                    className="h-8 rounded-lg border border-input bg-card px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">All providers</option>
                    {knownProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <ResetSlotsDialog onSuccess={() => setSelected(null)} />
            </div>
          </div>

          {slotsQuery.isPending ? (
            <div aria-busy="true" aria-label="Loading slots" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Loading appointments… the first load can take a little while.
              </p>
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-28 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            </div>
          ) : slotsQuery.isError && !data ? (
            <ErrorNotice
              title="We couldn't load appointment slots"
              error={slotsQuery.error}
              onRetry={() => slotsQuery.refetch()}
            />
          ) : data ? (
            <>
              {slotsQuery.isError && (
                <div className="mb-4">
                  <ErrorNotice
                    title="Couldn't refresh slots"
                    error={slotsQuery.error}
                    onRetry={() => slotsQuery.refetch()}
                  />
                </div>
              )}
              <SlotPicker slots={data} selectedId={selected?.id ?? null} onSelect={selectSlot} />
            </>
          ) : null}
        </section>

        <aside ref={formRef} aria-labelledby="form-heading" className="scroll-mt-24">
          <div className="rounded-2xl border bg-card p-6 shadow-soft lg:sticky lg:top-24">
            <h2 id="form-heading" className="text-lg font-semibold">
              Your details
            </h2>
            <div className="mt-4 rounded-xl bg-secondary p-4">
              {selected ? (
                <div className="flex items-start gap-3">
                  <CalendarCheck className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Selected appointment
                    </p>
                    <p className="mt-1 font-semibold">{formatDate(selected.start)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(selected.start)} – {formatTime(selected.end)}
                    </p>
                    <p className="text-sm text-muted-foreground">{selected.provider}</p>
                  </div>
                </div>
              ) : (
                <p
                  className={`text-sm ${errors.slot ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {errors.slot ?? "Select an available time to continue."}
                </p>
              )}
            </div>

            <form noValidate onSubmit={submit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  value={values.name}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                  className="h-10"
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive">
                    {errors.name}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                  className="h-10"
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {create.isError && (
                <ErrorNotice
                  title="Booking not completed"
                  error={create.error}
                  onRetry={() => submit()}
                />
              )}

              <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
                {create.isPending ? (
                  <>
                    <Loader2 className="animate-spin" /> Booking…
                  </>
                ) : (
                  "Confirm booking"
                )}
              </Button>
              {selected && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => slotsRef.current?.scrollIntoView({ behavior: "smooth" })}
                >
                  <ArrowLeft /> Choose a different time
                </Button>
              )}
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Confirmation({ data, onBack }: { data: Confirmed; onBack: () => void }) {
  const { booking, slot, request } = data;
  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <div className="rounded-2xl border bg-card p-8 shadow-soft">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="size-8 text-success" aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-3xl font-medium">Your appointment is booked</h1>
          <p className="mt-2 text-muted-foreground">
            Keep your booking reference to look up or cancel this appointment.
          </p>
        </div>
        <dl className="mt-6 divide-y">
          <DetailRow
            label="Booking reference"
            value={<span className="break-all font-mono">{booking.id}</span>}
          />
          <DetailRow label="Patient" value={booking.name} />
          <DetailRow label="Email" value={booking.email} />
          <DetailRow label="Date" value={formatDate(slot.start)} />
          <DetailRow label="Time" value={`${formatTime(slot.start)} – ${formatTime(slot.end)}`} />
          <DetailRow label="Provider" value={slot.provider} />
          <DetailRow label="Status" value={<StatusBadge status={booking.status} />} />
        </dl>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={onBack}>
            <ArrowLeft /> Back to available slots
          </Button>
          <Button asChild className="flex-1">
            <Link to="/find-booking" search={{ ref: booking.id }}>
              <Search /> Look up booking
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
