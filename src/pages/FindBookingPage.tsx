import { useEffect, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, SearchX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DetailRow, ErrorNotice, StatusBadge } from "@/components/booking/Feedback";
import { bookingService } from "@/services/bookingService";
import { ApiError } from "@/services/apiClient";
import { formatDateTime, isValidEmail } from "@/lib/booking-utils";
import type { BookingResponse } from "@/types/booking";
import { slotsQueryKey } from "./BookingPage";

export function FindBookingPage({
  initialRef,
  initialEmail,
}: {
  initialRef?: string;
  initialEmail?: string;
}) {
  const [reference, setReference] = useState(initialRef ?? "");
  const [inputError, setInputError] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState<string | null>(
    initialEmail && isValidEmail(initialEmail) ? initialEmail.trim() : null,
  );

  const lookup = useMutation({
    mutationFn: (id: string) => bookingService.getBooking(id),
    onMutate: () => setBooking(null),
    onSuccess: setBooking,
  });

  const list = useInfiniteQuery({
    queryKey: ["bookings", searchEmail],
    enabled: !!searchEmail,
    retry: false,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      if (!searchEmail) throw new Error("An email is required.");
      return bookingService.listBookings(searchEmail, 10, pageParam);
    },
    getNextPageParam: (last) => last.next_cursor || undefined,
  });

  const search = (e?: React.FormEvent) => {
    e?.preventDefault();
    const ref = reference.trim();
    if (!ref) return setInputError("Please enter your booking reference.");
    setInputError(null);
    lookup.mutate(ref);
  };

  const searchByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setEmailError("Please enter a valid email address.");
    setEmailError(null);
    const nextEmail = email.trim();
    if (nextEmail === searchEmail) list.refetch();
    else setSearchEmail(nextEmail);
  };

  useEffect(() => {
    if (initialRef) lookup.mutate(initialRef);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  const notFound = lookup.error instanceof ApiError && lookup.error.kind === "notFound";
  const items = list.data?.pages.flatMap((p) => p.items ?? []) ?? [];

  return (
    <div>
      <section className="bg-hero border-b">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal">Manage</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Find your booking
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Look up a booking by its reference, or see all bookings made with your email address.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-10 sm:px-6">
        <form noValidate onSubmit={search} className="rounded-2xl border bg-card p-6 shadow-soft">
          <Label htmlFor="reference">Booking reference</Label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-invalid={!!inputError}
              className="h-10 font-mono"
            />
            <Button type="submit" size="lg" disabled={lookup.isPending}>
              {lookup.isPending ? <Loader2 className="animate-spin" /> : <Search />} Find booking
            </Button>
          </div>
          {inputError && <p className="mt-2 text-sm text-destructive">{inputError}</p>}
        </form>

        <div aria-live="polite" className="space-y-4">
          {notFound && (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-10 text-center">
              <SearchX className="size-10 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-medium">No booking found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the reference and try again.
              </p>
            </div>
          )}
          {lookup.isError && !notFound && (
            <ErrorNotice title="Lookup failed" error={lookup.error} onRetry={() => search()} />
          )}
          {booking && <BookingCard booking={booking} onChange={setBooking} />}
        </div>

        <form
          noValidate
          onSubmit={searchByEmail}
          className="rounded-2xl border bg-card p-6 shadow-soft"
        >
          <Label htmlFor="lookup-email">Email address</Label>
          <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
            <Input
              id="lookup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!emailError}
              className="h-10"
            />
            <Button
              type="submit"
              size="lg"
              variant="outline"
              disabled={list.isFetching && !list.isFetchingNextPage}
            >
              <Search /> Show my bookings
            </Button>
          </div>
          {emailError && <p className="mt-2 text-sm text-destructive">{emailError}</p>}
        </form>

        {searchEmail && (
          <div aria-live="polite" className="space-y-4">
            {list.isPending ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading bookings…
              </p>
            ) : list.isError && items.length === 0 ? (
              <ErrorNotice
                title="Couldn't load bookings"
                error={list.error}
                onRetry={() => list.refetch()}
              />
            ) : items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No bookings found for {searchEmail}.
              </p>
            ) : (
              <>
                {items.map((b) => (
                  <BookingCard key={b.id} booking={b} onChange={() => list.refetch()} />
                ))}
                {list.isError && (
                  <ErrorNotice
                    title="Couldn't load more"
                    error={list.error}
                    onRetry={() => list.fetchNextPage()}
                  />
                )}
                {list.hasNextPage && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={list.isFetchingNextPage}
                    onClick={() => list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? <Loader2 className="animate-spin" /> : null} Load
                    more
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({
  booking,
  onChange,
}: {
  booking: BookingResponse;
  onChange: (b: BookingResponse) => void;
}) {
  const qc = useQueryClient();
  const [cancelled, setCancelled] = useState(false);
  const cancel = useMutation({
    mutationFn: (id: string) => bookingService.cancelBooking(id),
    onSuccess: (b) => {
      setCancelled(true);
      onChange(b);
      qc.invalidateQueries({ queryKey: slotsQueryKey, refetchType: "all" });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return (
    <article className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Booking details</h2>
        <StatusBadge status={booking.status} />
      </div>
      <dl className="mt-3 divide-y">
        <DetailRow
          label="Reference"
          value={<span className="break-all font-mono">{booking.id}</span>}
        />
        <DetailRow label="Patient" value={booking.name} />
        <DetailRow label="Email" value={booking.email} />
        <DetailRow
          label="Slot"
          value={<span className="break-all font-mono">{booking.slotId}</span>}
        />
        {booking.createdAt && (
          <DetailRow label="Booked on" value={formatDateTime(booking.createdAt)} />
        )}
      </dl>
      {cancelled && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success"
        >
          <CheckCircle2 className="size-4" /> Your booking has been cancelled.
        </p>
      )}
      {cancel.isError && (
        <div className="mt-4">
          <ErrorNotice title="Cancellation failed" error={cancel.error} />
        </div>
      )}
      {booking.status === "CONFIRMED" && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="mt-5 w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={cancel.isPending}
            >
              {cancel.isPending ? (
                <>
                  <Loader2 className="animate-spin" /> Cancelling…
                </>
              ) : (
                "Cancel booking"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep booking</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => cancel.mutate(booking.id)}
              >
                Yes, cancel
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </article>
  );
}
